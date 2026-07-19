import texts from "../../texts.json";
import galleryRearrange from "../galleryRearrange.css";
import type { GalleryOperationsDom } from "./gallery";
import type {
  GalleryCategoryAppearance,
  GalleryFavoriteInfo,
  GalleryRatingInfo,
  GalleryTagData,
} from "../types";
import { galleryTagNameFromUrl } from "../url";
import { updateGalleryFavorite } from "../request";
import {
  createAnchor,
  createManagedElement,
  documentHead,
  DomNode,
  type ManagedDomElements,
  type ManagedDomNode,
} from "./core";
import type { GalleryPreviewData } from "./gallery";
import * as EhSyringe from "./ehSyringe";

const TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID =
  "ehpeek-touch-gallery-page-rearrange-style";

/** Reads and takes ownership of E-H's gallery header for GalleryInfoPanel. */
export function extractGalleryInfo(
  preview: GalleryPreviewData | null,
  operations: GalleryOperationsDom,
) {
  if (!DomNode.from(document).one(`#${TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID}`)) {
    const style = createManagedElement("style").attribute(
      "id",
      TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID,
    );
    style.setTextUnlessInput(galleryRearrange);
    documentHead()?.append(style);
  }
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

  const readMeta = () =>
    new Map(
      page
        .all<HTMLTableRowElement>("#gdd tr")
        .map((row) => {
          const cells = row.all<HTMLTableCellElement>("td, th");
          const label = (cells[0]?.text() ?? "")
            .replace(/:$/, "")
            .toLowerCase();
          const value = cells
            .slice(1)
            .map((cell) => cell.text())
            .filter(Boolean)
            .join(" ");
          return [label, value] as const;
        })
        .filter(([label, value]) => label && value),
    );

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
    const parsed = Number(match?.[1]);
    const value = match && Number.isFinite(parsed) ? parsed : null;
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

  const manageTagGroups = (): GalleryInfoTagGroup[] => readTagGroups().map((group) => ({
    namespace: group.namespace,
    tags: group.tags.flatMap(({ data: tag, source }) => {
      const contentSource = source.owned() ?? source.inplace();
      return contentSource ? [{ ...tag, contentSource }] : [];
    }),
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
  const totalPages = preview?.totalImages ?? null;
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
      meta.get("language"),
      totalPages
        ? `${totalPages} ${texts.reader.pages.toLowerCase()}`
        : undefined,
      meta.get("file size") ?? meta.get("size"),
      meta.get("favorited"),
      meta.get("posted") ?? meta.get("parent"),
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
  const sources = [
    host,
    ...hostChildSources,
    ...actionSources.map(({ node }) => node),
    ...tagContentSources,
    ...(coverUrl && coverSource ? [coverSource] : []),
    ...(newTag && newTagButton && newTagField && newTagForm
      ? [newTag, newTagButton, newTagField, newTagForm]
      : []),
  ];
  if (
    sources.some(
      (source, index) =>
        !source.manageable() ||
        sources.slice(0, index).some((previous) => source.sameNode(previous)),
    )
  ) {
    return null;
  }

  const coverElem = coverUrl
    ? (coverSource ?? DomNode.from(document.createElement("img"))).clone()
    : null;
  const actionElems = actionSources
    .map(({ node }) => node.clone(false))
    .filter((action) => action !== null);
  const newTagButtonElem = newTagButton?.inplace() ?? null;
  const newTagFieldElem = newTagField?.inplace() ?? null;
  const newTagFormElem = newTagForm?.inplace() ?? null;
  const newTagElem =
    newTagButtonElem && newTagFieldElem && newTagFormElem
      ? (newTag?.move() ?? null)
      : null;
  const hostChildElems = hostChildSources
    .map((child) => child.inplace())
    .filter((child) => child !== null);
  const hostElem = host.inplace();
  const tagContents = tagContentSources
    .map((source) => source.inplace())
    .filter((content) => content !== null);
  if (
    (coverUrl && !coverElem) ||
    actionElems.length !== actionSources.length ||
    hostChildElems.length !== hostChildSources.length ||
    (newTag && newTagButton && newTagField && newTagForm && !newTagElem) ||
    !hostElem ||
    tagContents.length !== tagContentSources.length
  ) {
    return null;
  }
  const elems = {
    actions: actionElems,
    cover: coverElem,
    host: hostElem,
    hostChildren: hostChildElems,
    mount,
    newTag: newTagElem,
    newTagButton: newTagButtonElem,
    newTagField: newTagFieldElem,
    newTagForm: newTagFormElem,
    tagContents,
  } satisfies ManagedDomElements;

  const transforms = {
    cover(className: string) {
      coverElem?.transform({
        attributes: {
          remove: ["id", "style", "width", "height"],
          set: {
            alt: "",
            decoding: "async",
            loading: "eager",
            src: coverUrl,
          },
        },
        classes: { replace: className },
      });
    },
    actions(className: string) {
      actionElems.forEach((action, index) => {
        action.transform({
          attributes: { remove: ["id"] },
          classes: { replace: className },
          styles: { remove: "all" },
        });
        action.setTextUnlessInput(actionSources[index]?.label ?? "");
      });
    },
    newTag(classes: {
      button: string;
      container: string;
      field: string;
      form: string;
    }) {
      newTagElem?.transform({
        classes: { add: classes.container.split(" ") },
        hidden: false,
        styles: { remove: ["display"] },
      });
      newTagButtonElem?.transform({
        classes: { add: classes.button.split(" ") },
      });
      newTagFieldElem?.transform({
        attributes: { remove: ["size"] },
        classes: { add: classes.field.split(" ") },
      });
      newTagFormElem?.transform({
        classes: { add: classes.form.split(" ") },
      });
    },
    host(className: string) {
      hostElem.transform({ classes: { add: [className] } });
      hostChildElems.forEach((child) => child.transform({ hidden: true }));
      hostElem.prepend(mount);
    },
  };

  const actions = {
    async favoriteOptions(actionUrl: string, favorited: boolean) {
      return operations.actions.favoriteOptions(actionUrl, favorited);
    },
    async favoriteTag(
      ...args: Parameters<GalleryOperationsDom["actions"]["favoriteTag"]>
    ): Promise<void> {
      await operations.actions.favoriteTag(...args);
    },
    observeTagGroups(onChange: (groups: GalleryInfoTagGroup[]) => void) {
      const tagList = page.one<HTMLElement>("#taglist");
      const managedTagList = tagList?.owned() ?? tagList?.inplace();
      return managedTagList?.observe(() => onChange(manageTagGroups())) ?? (() => undefined);
    },
    reuseNewTagInput(): void {
      if (elems.newTagField) {
        elems.newTagField = EhSyringe.reuseTagTipInput(elems.newTagField);
      }
    },
    async rate(value: number) {
      return operations.actions.rate(value);
    },
    async removeFavoriteTag(tag: GalleryTagData): Promise<void> {
      await operations.actions.removeFavoriteTag(tag);
    },
    async tagAction(tag: GalleryTagData, action: import("../types").GalleryTagAction): Promise<void> {
      await operations.actions.tagAction(tag, action);
    },
    async updateFavorite(actionUrl: string, value: string): Promise<void> {
      await updateGalleryFavorite(actionUrl, value);
    },
  };

  return { actions, data, elems, transforms };
}

export type GalleryInfoDom = NonNullable<ReturnType<typeof extractGalleryInfo>>;
export type GalleryInfoTagGroup = {
  namespace: string;
  tags: Array<GalleryTagData & { contentSource: ManagedDomNode }>;
};

/** Converts Gallery Comments score details from hover interaction to touch interaction. */
export function extractGalleryCommentsTouch() {
  const items = DomNode.from(document).all<HTMLElement>("#cdiv .c5")
    .filter((trigger) => trigger.attribute("data-ehpeek-touch-comment-score") !== "true")
    .map((trigger) => ({
      trigger,
      details: trigger.closest<HTMLElement>(".c1")?.one<HTMLElement>(".c7[id^='cvotes_']") ?? null,
    }))
    .filter((item): item is { trigger: DomNode<HTMLElement>; details: DomNode<HTMLElement> } => item.details !== null)
    .map(({ trigger, details }) => ({
      details: details.owned() ?? details.inplace(),
      detailsId: details.attribute("id") ?? "",
      expanded: false,
      trigger: trigger.owned() ?? trigger.inplace(),
    }))
    .filter((item) => item.details !== null && item.trigger !== null);

  const setExpanded = (item: (typeof items)[number], expanded: boolean) => {
    item.expanded = expanded;
    item.trigger?.attribute("aria-expanded", String(expanded));
    item.details?.attribute("aria-hidden", String(!expanded));
    item.details?.styles({ display: expanded ? "" : "none" });
  };

  for (const item of items) {
    if (!item.trigger || !item.details) {
      continue;
    }

    item.trigger.transform({
      attributes: {
        remove: ["onmouseover", "onmouseout", "onclick"],
        set: {
          "data-ehpeek-touch-comment-score": "true",
          role: "button",
          tabindex: "0",
          "aria-controls": item.detailsId,
        },
      },
      classes: { add: ["whitespace-nowrap"] },
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

  return {
    elems: {
      details: items.flatMap((item) => (item.details ? [item.details] : [])),
      triggers: items.flatMap((item) => (item.trigger ? [item.trigger] : [])),
    },
  };
}
