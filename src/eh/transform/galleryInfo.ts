import texts from "../../texts.json";
import {
  readGalleryTagApiInfo,
  readGalleryTagGroups,
  readShowingRange,
} from "../dom";
import type {
  GalleryCategoryAppearance,
  GalleryFavoriteInfo,
  GalleryRatingInfo,
} from "../types";
import { createAnchor, DomNode, type ManagedDomElements } from "./core";

/** Reads and takes ownership of E-H's gallery header for GalleryInfoPanel. */
export function galleryInfo() {
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
  const actions = readActions();
  const tagContentSources: DomNode<HTMLElement>[] = [];
  const tagGroups = readGalleryTagGroups().map((group) => ({
    ...group,
    tags: group.tags.map(({ contentSource, ...tag }) => {
      const contentSourceIndex =
        tagContentSources.push(DomNode.from(contentSource)) - 1;
      return { ...tag, contentSourceIndex };
    }),
  }));
  const totalPages = readShowingRange(document)?.total;
  const data = {
    available: true,
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
    tagApi: readGalleryTagApiInfo(),
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
    ...actions.map(({ node }) => node),
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
  const actionElems = actions
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
    actionElems.length !== actions.length ||
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
        action.setTextUnlessInput(actions[index]?.label ?? "");
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

  return { data, elems, transforms };
}

export type GalleryInfoResult = NonNullable<ReturnType<typeof galleryInfo>>;
