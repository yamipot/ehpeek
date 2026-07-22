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
  GalleryHistoryInfo,
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
import { domClass } from "./domClass";

/** Extracts Gallery display fields persisted with local reading history. */
export function extractGalleryHistoryInfo(): GalleryHistoryInfo {
  const page = DomNode.from(document);
  const source = page.use(domClass.gallery.info);
  const category = source.category.one();
  const categoryClass = (
    category?.one(domClass.gallery.info.category.appearance)?.attribute("class") ??
    category?.attribute("class") ??
    ""
  ).split(/\s+/).find((className) => /^ct[1-9a]$/.test(className));
  const rows = source.details.rows
    .all()
    .map((detailRow) => detailRow.all(domClass.gallery.info.details.rows.cells)
      .slice(1)
      .map((detailCell) => detailCell.text())
      .filter(Boolean)
      .join(" "));
  const ratingMatch = (
    page.all(domClass.common.scripts).map((pageScript) => pageScript.text())
      .find((script) => script.includes("display_rating")) ?? ""
  ).match(/\bdisplay_rating\s*=\s*(-?\d+(?:\.\d+)?)/);
  const rating = Number(ratingMatch?.[1]);
  const cover = source.cover.one();
  let coverUrl = source.cover.image.one()?.attribute("src") ?? "";
  if (!coverUrl && cover) {
    for (const node of [cover, ...cover.all(domClass.common.descendants)]) {
      const match = node.computedStyle().backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if (match?.[1]) {
        coverUrl = match[1];
        break;
      }
    }
  }
  return {
    category: category?.text() || undefined,
    categoryClass,
    coverUrl: coverUrl || undefined,
    language: rows[3] || undefined,
    posted: rows[0] || undefined,
    rating: ratingMatch && Number.isFinite(rating) ? rating : undefined,
    title: source.titleMain.one()?.text() || undefined,
    titleSub: source.titleSub.one()?.text() || undefined,
    uploader: source.uploader.one()?.text() || undefined,
  };
}

/** Manages E-H's gallery header for GalleryInfoPanel. */
export function manageGalleryInfo(
  preview: GalleryPreviewData | null,
) {
  const mount = createAnchor("gallery-info");
  if (!mount) {
    return null;
  }

  const page = DomNode.from(document);
  const gallery = page.use(domClass.gallery);
  const source = gallery.info;
  const original = source.original.one();
  const host =
    original?.parent() ?? source.hostFallback.one()?.parent() ?? null;
  if (!original || !host) {
    return null;
  }

  const readMeta = () => {
    // E-H keeps these rows in a fixed order; their labels may already be translated.
    const rows = source.details.rows
      .all()
      .map((detailRow) => {
        const cells = detailRow.all(domClass.gallery.info.details.rows.cells);
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
    for (const node of cover ? [cover, ...cover.all(domClass.common.descendants)] : []) {
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
      element?.one(domClass.gallery.info.favorite.link)?.text() ||
      element?.one(domClass.gallery.info.favorite.titled)?.attribute("title")?.trim() ||
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
          rated: image?.matches(domClass.gallery.info.rating.rated) ?? false,
          value,
        }
      : null;
  };

  const readActions = () =>
    gallery.actions.items
      .all()
      .filter((node) => {
        const href = node.attribute("href")?.trim() ?? "";
        return (
          node.hasAttribute("onclick") ||
          Boolean(href && href !== "#" && !/^javascript:/i.test(href))
        );
      })
      .slice(0, 6);

  const readTag = (tag: DomNode<HTMLAnchorElement>) => {
    const label = tag.text() || tag.attribute("ehs-tag")?.trim() || tag.attribute("title")?.trim() || "";
    const href = tag.attribute("href") ?? "";
    const name = galleryTagNameFromUrl(href);
    if (!label || !name || !href) {
      return null;
    }
    const container = tag.closest(domClass.gallery.tagContainer) ?? tag;
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
    const rows = gallery.tags.rows.all();
    if (rows.length > 0) {
      return rows
        .map((row) => ({
          namespace: row.one(domClass.gallery.tags.rows.namespace)?.text().replace(/:$/, "") || "tag",
          tags: row.all(domClass.gallery.tags.rows.links).map(readTag).filter((tag) => tag !== null).slice(0, 30),
        }))
        .filter((group) => group.tags.length > 0);
    }
    return [{
      namespace: "tag",
      tags: gallery.tags.links.all().map(readTag).filter((tag) => tag !== null).slice(0, 60),
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
    DomNode.from(doc).use(domClass.myTags).favoriteOptions.all().map((favoriteInput) => {
      const row = favoriteInput.closest(domClass.myTags.favoriteOptionRow);
      const value = favoriteInput.inputValue();
      return {
        color: favoriteColor(value),
        label: row?.text().replace(/\s+/g, " ") || value,
        selected: favorited && favoriteInput.checked(),
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
  const category = source.category.one();
  const categoryStyle = source.category.appearance.one() ?? category;
  const cover = source.cover.one();
  const coverSource = source.cover.image.one();
  const favorite = source.favorite.one();
  const ratingCount = source.rating.count.one();
  const ratingImage = source.rating.image.one();
  const ratingLabel = source.rating.label.one();
  const ratingActions = source.rating.actions.all();
  const newTagButton =
    source.newTag.button.one();
  const newTagField = source.newTag.field.one();
  const newTagForm = source.newTag.form.one();
  const scripts = page.all(domClass.common.scripts).map((pageScript) => pageScript.text());
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
    titleMain: source.titleMain.one()?.text() ?? "",
    titleSub: source.titleSub.one()?.text() ?? "",
  };

  const coverUrl = readCoverUrl(cover, coverSource);
  const managedCover = coverUrl
    ? (source.cover.image.clone()?.replaceClasses("").apply("fit") ??
      createManagedElement("img", { fit: "ehpeek-fit-gallery-cover" }).apply("fit"))
    : null;
  managedCover
    ?.removeAttributes("id", "style", "width", "height")
    .setAttributes({ alt: "", decoding: "async", loading: "eager", src: coverUrl });
  const managedNewTag = newTagButton && newTagField && newTagForm
    ? source.newTag.move()?.apply("layout") ?? null
    : null;
  const hostApply = { hide: "ehpeek-hide-original-gallery-info" } as const;
  managedNewTag
    ?.setHidden(false)
    .removeStyles("display");
  const elems = {
    actionItems: actionSources.map((item) =>
      item.move(domClass.gallery.actions.items.apply).apply("layout")),
    cover: managedCover,
    host: host.inplace(hostApply).apply("hide"),
    mount,
    newTag: managedNewTag,
    ratingActions: ratingActions.map((action) => action.inplace()),
    tagContents: tagContentSources.map((source) => source.inplace()),
    tagList: gallery.tags.inplace(),
    tagMenuAction: source.tagMenu.inplace(),
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
    /** Hides original GalleryInfo children and installs the component mount. */
    installGalleryInfoPanel() {
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
      return elems.tagList?.observe(() => {
        gallery.tags.rows.requery();
        gallery.tags.links.requery();
        onChange(manageTagGroups());
      }) ?? (() => undefined);
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
    ): void {
      if (!elems.tagMenuAction) {
        throw new Error("Gallery tag actions are unavailable.");
      }

      // E-H only creates the action links when its original tag anchor is activated.
      activateTagMenu(tag.contentSource);
      elems.newTag?.setHidden(false).removeStyles("display");
      const actions = elems.tagMenuAction.all(domClass.gallery.info.tagMenu.actions);
      if (actions.length === 0) {
        activateTagMenu(tag.contentSource);
        elems.newTag?.setHidden(false).removeStyles("display");
        throw new Error("Gallery tag actions could not be opened.");
      }

      selectedTagSource = tag.contentSource;
      elems.tagMenuAction.apply("layout");

      const addNewTag = actions.find((action) =>
        action.readAttribute("onclick")?.includes("toggle_tagmenu"));
      addNewTag?.remove();
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
  const source = DomNode.from(document).use(domClass.gallery.comments);
  source.inplace()?.apply("touchScore");
  const items = source.score.all()
    .filter((trigger) => trigger.attribute("data-ehpeek-touch-comment-score") !== "true")
    .map((trigger) => ({
      trigger,
      details: trigger.closest(domClass.gallery.comments.scoreComment)
        ?.one(domClass.gallery.comments.scoreComment.details) ?? null,
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
  };

  for (const item of items) {
    item.trigger
      .removeAttributes("onmouseover", "onmouseout", "onclick")
      .setAttributes({
        "data-ehpeek-touch-comment-score": "true",
        role: "button",
        tabindex: "0",
        "aria-controls": item.detailsId,
      });
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
