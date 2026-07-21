import texts from "../../texts.json";
import type { MyTagMode } from "../request";
import {
  addMyTag,
  deleteMyTag,
  requestPage,
  updateGalleryFavorite,
} from "../request";
import type {
  GalleryCategoryAppearance,
  GalleryFavoriteOption,
  GalleryFavoriteInfo,
  GalleryRatingInfo,
  GalleryTagData,
} from "../types";
import { galleryTagNameFromUrl } from "../url";
import {
  createAnchor,
  createManagedElement,
  DomNode,
  type ManagedDomElements,
  type ManagedDomNode,
} from "./core";
import { extractMyTagsPageData, type GalleryPreviewData } from "./gallery";

/** Manages E-H's gallery header for GalleryInfoPanel. */
export function manageGalleryInfo(
  preview: GalleryPreviewData | null,
) {
  const mount = createAnchor("gallery-info");
  if (!mount) {
    return null;
  }

  const page = DomNode.from(document);
  const original = page.one<HTMLElement>("#gmid");
  const host =
    original?.parent() ?? page.one<HTMLElement>("#gleft")?.parent() ?? null;
  if (!original || !host) {
    return null;
  }

  const readMeta = () => {
    // E-H keeps these rows in a fixed order; their labels may already be translated.
    const rows = page
      .all<HTMLTableRowElement>("#gdd tr")
      .map((row) => {
        const cells = row.all<HTMLTableCellElement>("td, th");
        return {
          label: cells[0]?.text() ?? "",
          value: cells.slice(1).map((cell) => cell.text()).filter(Boolean).join(" "),
        };
      });
    return {
      favorited: rows[6]?.value
        ? [rows[6].label, rows[6].value].filter(Boolean).join(" ")
        : undefined,
      fileSize: rows[4]?.value,
      language: rows[3]?.value,
      parent: rows[1]?.value,
      posted: rows[0]?.value,
    };
  };

  const readCategory = (
    node: DomNode<HTMLElement> | null,
  ): GalleryCategoryAppearance => {
    const style = node?.computedStyle();
    return {
      "background-color": style?.backgroundColor ?? "",
      "background-image": style?.backgroundImage ?? "",
      "border-color": style?.borderColor ?? "",
      color: style?.color ?? "",
    };
  };

  const readCoverUrl = (
    cover: DomNode<HTMLElement> | null,
    source: DomNode<HTMLImageElement> | null,
  ) => {
    const direct = source?.attribute("src") ?? "";
    if (direct) {
      return direct;
    }
    for (const node of cover ? [cover, ...cover.all<HTMLElement>("*")] : []) {
      const match = node
        .computedStyle()
        .backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if (match?.[1]) {
        return match[1];
      }
    }
    return "";
  };

  const readFavorite = (
    element: DomNode<HTMLElement> | null,
    scripts: string[],
  ): GalleryFavoriteInfo => {
    const displayed =
      element?.one<HTMLElement>("#favoritelink")?.text() ||
      element?.one<HTMLElement>("[title]")?.attribute("title")?.trim() ||
      "";
    const slot = displayed.match(/(?:^|\D)([0-9])(?:\D|$)/)?.[1];
    const favorited = slot !== undefined || /^favorited$/i.test(displayed);
    const script =
      scripts.find(
        (item) => item.includes("popbase") && item.includes("addfav"),
      ) ?? "";
    const match = script.match(
      /popbase\s*=\s*base_url\s*\+\s*"gallerypopups\.php\?gid=(\d+)&t=([^"]+)&act="/,
    );
    return {
      actionUrl: match
        ? `/gallerypopups.php?gid=${match[1]}&t=${match[2]}&act=addfav`
        : "",
      color: slot === undefined ? null : `var(--color-site-favorite-${slot})`,
      favorited,
      label: favorited ? displayed : "Not Favorited",
    };
  };

  const readRating = (
    count: DomNode<HTMLElement> | null,
    image: DomNode<HTMLElement> | null,
    labelNode: DomNode<HTMLElement> | null,
    scripts: string[],
  ): GalleryRatingInfo | null => {
    const label = labelNode?.text() ?? "";
    const match = (
      scripts.find((item) => item.includes("display_rating")) ?? ""
    ).match(/\bdisplay_rating\s*=\s*(-?\d+(?:\.\d+)?)/);
    const scriptValue = Number(match?.[1]);
    const value = match && Number.isFinite(scriptValue) ? scriptValue : null;
    return label && value !== null
      ? {
          count: count?.text() ?? "",
          label,
          rated: ["irb", "irg", "irr"].some((className) =>
            image?.hasClass(className),
          ),
          value,
        }
      : null;
  };

  const readActions = () =>
    page
      .all<HTMLElement>(
        "#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']",
      )
      .filter((node) => {
        const href = node.attribute("href")?.trim() ?? "";
        return (
          node.hasAttribute("onclick") ||
          Boolean(href && href !== "#" && !/^javascript:/i.test(href))
        );
      })
      .slice(0, 6)
      .map((node) => ({
        label:
          node.text() ||
          node.attribute("title")?.trim() ||
          node.attribute("aria-label")?.trim() ||
          "",
        node,
      }));

  const readTag = (tag: DomNode<HTMLAnchorElement>) => {
    const label = tag.text() || tag.attribute("ehs-tag")?.trim() || tag.attribute("title")?.trim() || "";
    const href = tag.attribute("href") ?? "";
    const name = galleryTagNameFromUrl(href);
    if (!label || !name || !href) {
      return null;
    }
    const container = tag.closest<HTMLElement>("div.gt, div.gtl, div.gtw") ?? tag;
    const tagStyle = tag.computedStyle();
    const containerStyle = container.computedStyle();
    const myTagId = tag.attribute("data-ehpeek-my-tag-id");
    const myTagSet = tag.attribute("data-ehpeek-my-tag-set");
    return {
      data: {
        appearance: {
          backgroundColor: containerStyle.backgroundColor,
          borderColor: containerStyle.borderColor,
          color: tagStyle.color,
        },
        label,
        myTag: myTagId && myTagSet ? { id: myTagId, tagSet: myTagSet } : null,
        name,
        url: href,
      },
      source: tag,
    };
  };

  const readTagGroups = () => {
    const rows = page.all<HTMLTableRowElement>("#taglist tr");
    if (rows.length > 0) {
      return rows
        .map((row) => ({
          namespace: row.one<HTMLElement>(".tc, td:first-child")?.text().replace(/:$/, "") || "tag",
          tags: row.all<HTMLAnchorElement>("a").map(readTag).filter((tag) => tag !== null).slice(0, 30),
        }))
        .filter((group) => group.tags.length > 0);
    }
    return [{
      namespace: "tag",
      tags: page.all<HTMLAnchorElement>("#taglist a").map(readTag).filter((tag) => tag !== null).slice(0, 60),
    }].filter((group) => group.tags.length > 0);
  };

  const favoriteColor = (value: string): string | null => {
    const slot = value.match(/^(?:fav)?([0-9])$/i)?.[1]
      ?? value.match(/^favorites?\s+([0-9])$/i)?.[1];
    return slot === undefined ? null : `var(--color-site-favorite-${slot})`;
  };

  const readFavoriteOptions = (
    doc: Document,
    favorited: boolean,
  ): GalleryFavoriteOption[] =>
    DomNode.from(doc).all<HTMLInputElement>("input[name='favcat']").map((input) => {
      const row = input.closest<HTMLElement>("div[style*='height']");
      const value = input.inputValue();
      return {
        color: favoriteColor(value),
        label: row?.text().replace(/\s+/g, " ") || value,
        selected: favorited && input.checked(),
        value,
      };
    });

  const manageTagGroups = (): GalleryInfoTagGroup[] => readTagGroups().map((group) => ({
    namespace: group.namespace,
    tags: group.tags.map(({ data: tag, source }) => ({
      ...tag,
      contentSource: source.inplace(),
    })),
  }));

  const meta = readMeta();
  const category = page.one<HTMLElement>("#gdc");
  const categoryStyle = category?.one<HTMLElement>("[class*='ct']") ?? category;
  const cover = page.one<HTMLElement>("#gd1");
  const coverSource = cover?.one<HTMLImageElement>("img") ?? null;
  const favorite = page.one<HTMLElement>("#fav");
  const ratingCount = page.one<HTMLElement>("#rating_count");
  const ratingImage = page.one<HTMLElement>("#rating_image");
  const ratingLabel = page.one<HTMLElement>("#rating_label");
  const ratingActions = page.all<HTMLAreaElement>('map[name="rating"] area');
  const tagMenuAction = page.one<HTMLElement>("#tagmenu_act");
  const newTag = page.one<HTMLElement>("#tagmenu_new");
  const newTagButton =
    newTag?.one<HTMLInputElement | HTMLButtonElement>("#newtagbutton") ?? null;
  const newTagField = newTag?.one<HTMLInputElement>("#newtagfield") ?? null;
  const newTagForm = newTag?.one<HTMLFormElement>("form") ?? null;
  const scripts = page
    .all<HTMLScriptElement>("script")
    .map((script) => script.text());
  const actionSources = readActions();
  const tagContentSources: DomNode<HTMLElement>[] = [];
  const tagGroups = readTagGroups().map((group) => ({
    namespace: group.namespace,
    tags: group.tags.map(({ data: tag, source }) => {
      const contentSourceIndex = tagContentSources.push(source) - 1;
      return { ...tag, contentSourceIndex };
    }),
  }));
  const data = {
    category: category?.text() ?? "",
    categoryAppearance: readCategory(categoryStyle),
    favorite: readFavorite(favorite, scripts),
    rating: readRating(ratingCount, ratingImage, ratingLabel, scripts),
    summary: [
      meta.language,
      preview?.totalImages
        ? `${preview.totalImages} ${texts.reader.pages.toLowerCase()}`
        : undefined,
      meta.fileSize,
      meta.favorited,
      meta.posted ?? meta.parent,
    ]
      .filter((value): value is string => Boolean(value))
      .slice(0, 6)
      .map((value) => ({ value })),
    tagGroups,
    titleMain: page.one<HTMLElement>("#gn")?.text() ?? "",
    titleSub: page.one<HTMLElement>("#gj")?.text() ?? "",
  };

  const coverUrl = readCoverUrl(cover, coverSource);
  const hostChildSources = host
    .all<HTMLElement>(":scope > *")
    .filter((child) => !newTag?.sameNode(child));
  const elems = {
    actionItems: actionSources.map(({ node }) => node.move()),
    cover: coverUrl
      ? (coverSource?.clone() ?? createManagedElement("img"))
      : null,
    host: host.inplace(),
    hostChildren: hostChildSources.map((child) => child.inplace()),
    mount,
    newTag: newTagButton && newTagField && newTagForm
      ? (newTag?.move() ?? null)
      : null,
    newTagButton: newTagButton?.inplace() ?? null,
    newTagField: newTagField?.inplace() ?? null,
    newTagForm: newTagForm?.inplace() ?? null,
    ratingActions: ratingActions.map((action) => action.inplace()),
    tagContents: tagContentSources.map((source) => source.inplace()),
    tagList: page.one<HTMLElement>("#taglist")?.inplace() ?? null,
    tagMenuAction: tagMenuAction?.inplace() ?? null,
  } satisfies ManagedDomElements;
  let selectedTagSource: ManagedDomNode | null = null;
  const activateTagMenu = (source: ManagedDomNode) => {
    const stopNavigation = source.listen("click", (event) => {
      event.preventDefault();
    }, { once: true });
    source.click();
    stopNavigation();
  };

  const handle = {
    /** Normalizes the original cover for GalleryInfoPanel's responsive layout. */
    updateCoverVisual(className: string) {
      elems.cover
        ?.removeAttributes("id", "style", "width", "height")
        .setAttributes({ alt: "", decoding: "async", loading: "eager", src: coverUrl })
        .replaceClasses(className);
    },
    /** Converts original Gallery actions into consistently styled component items. */
    updateActionItemsVisual(className: string) {
      elems.actionItems.forEach((action, index) => {
        action.removeAttributes("id").replaceClasses(className).removeAllStyles();
        action.setTextUnlessInput(actionSources[index]?.label ?? "");
      });
    },
    /** Fits the original New Tag form into GalleryInfoPanel's tag controls. */
    updateNewTagVisual(classes: {
      button: string;
      container: string;
      field: string;
      form: string;
    }) {
      elems.newTag
        ?.addClasses(...classes.container.split(" "))
        .setHidden(false)
        .removeStyles("display");
      elems.newTagButton?.addClasses(...classes.button.split(" "));
      elems.newTagField?.removeAttributes("size").addClasses(...classes.field.split(" "));
      elems.newTagForm?.addClasses(...classes.form.split(" "));
    },
    /** Hides original GalleryInfo children and installs the component mount. */
    installGalleryInfoPanel(className: string) {
      elems.host.addClasses(className);
      elems.hostChildren.forEach((child) => {
        child.setHidden(true);
        child.styles({ display: "none" }, "important");
      });
      elems.host.prepend(elems.mount);
    },
    /** Loads the original favorite dialog choices for EhPeek's favorite modal. */
    async loadGalleryFavoriteOptions(actionUrl: string, favorited: boolean) {
      const response = await requestPage(actionUrl);
      return readFavoriteOptions(response.document, favorited);
    },
    /** Submits a tag to the chosen My Tags collection and validates the response. */
    async submitFavoriteTag(
      tag: GalleryTagData,
      tagSet: string,
      mode: MyTagMode,
    ) {
      const response = await addMyTag(tag.name, tagSet, mode);
      return extractMyTagsPageData(response.document, tagSet);
    },
    /** Keeps component tag groups synchronized with original-page tag updates. */
    observeGalleryTagGroups(onChange: (groups: GalleryInfoTagGroup[]) => void) {
      return elems.tagList?.observe(() => onChange(manageTagGroups())) ?? (() => undefined);
    },
    /** Activates E-H's original rating area and lets its page script submit the vote. */
    submitGalleryRating(value: number): void {
      const rating = Math.round(value * 2);
      if (rating < 1 || rating > 10) {
        throw new RangeError("Gallery rating must be between 0.5 and 5 stars.");
      }
      const action = elems.ratingActions[rating - 1];
      if (!action) {
        throw new Error("Gallery rating action is unavailable.");
      }
      action.click();
    },
    /** Removes the selected tag from its stored My Tags collection. */
    async removeFavoriteTag(tag: GalleryTagData) {
      if (!tag.myTag) {
        throw new Error("The tag is not in My Tags.");
      }
      const response = await deleteMyTag(tag.myTag.id, tag.myTag.tagSet);
      return extractMyTagsPageData(response.document, tag.myTag.tagSet);
    },
    /** Opens E-H's original tag actions and only adapts their presentation. */
    openGalleryTagMenu(
      tag: GalleryInfoTagGroup["tags"][number],
      containerClassName: string,
      itemClassName: string,
    ): void {
      if (!elems.tagMenuAction) {
        throw new Error("Gallery tag actions are unavailable.");
      }

      // E-H only creates the action links when its original tag anchor is activated.
      activateTagMenu(tag.contentSource);
      elems.newTag?.setHidden(false).removeStyles("display");
      const actions = elems.tagMenuAction.all<HTMLAnchorElement>("a");
      if (actions.length === 0) {
        activateTagMenu(tag.contentSource);
        elems.newTag?.setHidden(false).removeStyles("display");
        throw new Error("Gallery tag actions could not be opened.");
      }

      selectedTagSource = tag.contentSource;
      elems.tagMenuAction.replaceClasses(containerClassName);
      elems.tagMenuAction.all<HTMLImageElement>("img").forEach((image) => {
        image.setHidden(true);
      });
      actions.forEach((action) => {
        action.replaceClasses(itemClassName).removeAllStyles();
      });

      const addNewTag = actions.find((action) =>
        action.readAttribute("onclick")?.includes("toggle_tagmenu"));
      addNewTag?.setHidden(true);
    },
    /** Closes E-H's selected tag without replacing its action DOM. */
    closeGalleryTagMenu(): void {
      if (selectedTagSource) {
        activateTagMenu(selectedTagSource);
      }
      elems.newTag?.setHidden(false).removeStyles("display");
      selectedTagSource = null;
    },
    /** Updates the Gallery favorite state through the original site endpoint. */
    updateGalleryFavorite,
  };

  return { data, elems, handle };
}

export type GalleryInfoDom = NonNullable<ReturnType<typeof manageGalleryInfo>>;
export type GalleryInfoTagGroup = {
  namespace: string;
  tags: Array<GalleryTagData & { contentSource: ManagedDomNode }>;
};

/** Converts Gallery Comments score details from hover interaction to touch interaction. */
export function mutateGalleryCommentsTouch() {
  const items = DomNode.from(document).all<HTMLElement>("#cdiv .c5")
    .filter((trigger) => trigger.attribute("data-ehpeek-touch-comment-score") !== "true")
    .map((trigger) => ({
      trigger,
      details: trigger.closest<HTMLElement>(".c1")?.one<HTMLElement>(".c7[id^='cvotes_']") ?? null,
    }))
    .filter((item): item is { trigger: DomNode<HTMLElement>; details: DomNode<HTMLElement> } => item.details !== null)
    .map(({ trigger, details }) => ({
      details: details.inplace(),
      detailsId: details.attribute("id") ?? "",
      expanded: false,
      trigger: trigger.inplace(),
    }));

  const setExpanded = (item: (typeof items)[number], expanded: boolean) => {
    item.expanded = expanded;
    item.trigger.attribute("aria-expanded", String(expanded));
    item.details.attribute("aria-hidden", String(!expanded));
    item.details.styles({ display: expanded ? "" : "none" });
  };

  for (const item of items) {
    item.trigger
      .removeAttributes("onmouseover", "onmouseout", "onclick")
      .setAttributes({
        "data-ehpeek-touch-comment-score": "true",
        role: "button",
        tabindex: "0",
        "aria-controls": item.detailsId,
      })
      .addClasses("whitespace-nowrap");
    setExpanded(item, false);

    const toggle = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const shouldExpand = !item.expanded;

      for (const candidate of items) {
        setExpanded(candidate, candidate === item && shouldExpand);
      }
    };

    item.trigger.listen("click", toggle);
    item.trigger.listen("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        toggle(event);
      }
    });
  }
}
