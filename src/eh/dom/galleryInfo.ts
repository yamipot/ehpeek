import texts from "../../texts.json";
import type { MyTagMode } from "../request";
import {
  addMyTag,
  deleteMyTag,
  requestPage,
  updateGalleryFavorite,
  updateGalleryRating,
  updateGalleryTagVote,
} from "../request";
import type {
  GalleryCategoryAppearance,
  GalleryFavoriteOption,
  GalleryFavoriteInfo,
  GalleryRatingInfo,
  GalleryTagAction,
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
import {
  extractGalleryTagApiInfo,
  extractMyTagsPageData,
  type GalleryPreviewData,
} from "./gallery";
import * as EhSyringe from "./ehSyringe";

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
    const values = page
      .all<HTMLTableRowElement>("#gdd tr")
      .map((row) => row
        .all<HTMLTableCellElement>("td, th")
        .slice(1)
        .map((cell) => cell.text())
        .filter(Boolean)
        .join(" "));
    return {
      favorited: values[6],
      fileSize: values[4],
      language: values[3],
      parent: values[1],
      posted: values[0],
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
    const favorited = /^favorites?\s+\d+/i.test(displayed);
    const slot = displayed.match(/^favorites?\s+([0-9])/i)?.[1];
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
        definitionHref: `https://ehwiki.org/wiki/${encodeURIComponent(name.replace(/^[a-z]+:\s*/i, ""))}`,
        href,
        label,
        myTag: myTagId && myTagSet ? { id: myTagId, tagSet: myTagSet } : null,
        name,
        vote: tag.hasClass("tup") ? "up" as const : tag.hasClass("tdn") ? "down" as const : null,
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
    rating: readRating(
      page.one<HTMLElement>("#rating_count"),
      page.one<HTMLElement>("#rating_image"),
      page.one<HTMLElement>("#rating_label"),
      scripts,
    ),
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
    tagContents: tagContentSources.map((source) => source.inplace()),
    tagList: page.one<HTMLElement>("#taglist")?.inplace() ?? null,
  } satisfies ManagedDomElements;

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
    ): Promise<void> {
      const response = await addMyTag(tag.name, tagSet, mode);
      extractMyTagsPageData(response.document, tagSet);
    },
    /** Keeps component tag groups synchronized with original-page tag updates. */
    observeGalleryTagGroups(onChange: (groups: GalleryInfoTagGroup[]) => void) {
      return elems.tagList?.observe(() => onChange(manageTagGroups())) ?? (() => undefined);
    },
    /** Lets EhSyringe continue owning autocomplete behavior on the moved tag input. */
    reuseNewTagAutocomplete(): void {
      if (elems.newTagField) {
        elems.newTagField = EhSyringe.reuseTagTipInput(elems.newTagField);
      }
    },
    /** Sends a Gallery rating through the captured original Gallery API session. */
    async submitGalleryRating(value: number) {
      const rating = Math.round(value * 2);
      if (rating < 1 || rating > 10) {
        throw new RangeError("Gallery rating must be between 0.5 and 5 stars.");
      }
      const api = extractGalleryTagApiInfo();
      return updateGalleryRating(api, value);
    },
    /** Removes the selected tag from its stored My Tags collection. */
    async removeFavoriteTag(tag: GalleryTagData): Promise<void> {
      if (!tag.myTag) {
        return;
      }
      const response = await deleteMyTag(tag.myTag.id, tag.myTag.tagSet);
      extractMyTagsPageData(response.document, tag.myTag.tagSet);
    },
    /** Applies an upvote, downvote, or vote removal and refreshes the tag pane. */
    async submitGalleryTagAction(tag: GalleryTagData, action: GalleryTagAction): Promise<void> {
      const api = extractGalleryTagApiInfo();
      const vote = action === "voteUp"
        ? 1
        : action === "voteDown"
          ? -1
          : tag.vote === "up"
            ? -1
            : tag.vote === "down"
              ? 1
              : 0;
      const tagPane = await updateGalleryTagVote(api, tag.name, vote);
      if (!elems.tagList) {
        throw new Error("Gallery tag list is unavailable.");
      }
      const template = document.createElement("template");
      template.innerHTML = tagPane;
      elems.tagList.replaceChildren(...Array.from(template.content.childNodes));
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
