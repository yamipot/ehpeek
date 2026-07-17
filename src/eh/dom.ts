import type { ReaderPage } from "../readerTypes";
import texts from "../texts.json";
import { normalizeUrl } from "../utils";
import galleryRearrange from "./galleryRearrange.css";

const TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID = "ehpeek-touch-gallery-page-rearrange-style";
const TOUCH_COMMENT_SCORE_CLASS_NAME = "!inline-flex min-h-lg items-center !px-md !border !border-[var(--color-site-border)] rounded-md !bg-[var(--color-site-elevated)] cursor-pointer [touch-action:manipulation] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-2px";
const TOUCH_COMMENT_SCORE_DETAILS_CLASS_NAME = "!static box-border !w-full !mx-0 !mt-sm !mb-0 !p-md !border !border-[var(--color-site-border)] rounded-md !bg-[var(--color-site-elevated)]";
const TOUCH_FAVORITES_PAGE_CLASS_NAME = "!min-w-0 !max-w-full !overflow-x-hidden";
const TOUCH_FAVORITES_CONTENT_CLASS_NAME = "box-border !min-w-0 !w-full !max-w-full !overflow-x-hidden";
const TOUCH_FAVORITES_NAV_CLASS_NAME = "box-border !max-w-full overflow-x-auto";
const TOUCH_FAVORITES_RESULTS_CLASS_NAME = "ehpeek-touch-favorites-results box-border !min-w-0 !w-full !max-w-full overflow-x-auto";
const TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME = "!min-w-0 !w-full !max-w-full";
const TOUCH_FAVORITES_CATEGORIES_CLASS_NAME = "box-border !grid !h-auto !w-full !max-w-full grid-cols-[repeat(5,minmax(0,1fr))] !p-0";
const TOUCH_FAVORITES_CATEGORY_CLASS_NAME = "!static !float-none !w-full !m-0";
const TOUCH_FAVORITES_ALL_CATEGORY_CLASS_NAME = "!col-span-full !w-[140px] justify-self-center";

export type PreviewSnapshot = {
  description: Node | null;
  thumbs: Node | null;
};

export type GalleryPageBarMount = {
  element: HTMLDivElement;
  top: boolean;
};

export type GallerySummaryItem = {
  value: string;
};

export type GalleryTagGroup = {
  namespace: string;
  tags: GalleryTag[];
};

export type GalleryTag = {
  appearance: GalleryTagAppearance;
  href: string;
  label: string;
};

export type GalleryTagAppearance = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

export type GalleryCategoryAppearance = {
  backgroundColor: string;
  color: string;
};

export type GalleryRatingInfo = {
  count: string;
  label: string;
  value: number;
};

export type GalleryInfo = {
  available: boolean;
  titleMain: string;
  titleSub: string;
  category: string;
  categoryAppearance: GalleryCategoryAppearance;
  cover: HTMLElement | null;
  favorite: GalleryFavoriteInfo;
  summary: GallerySummaryItem[];
  actions: HTMLElement[];
  rating: GalleryRatingInfo | null;
  tagGroups: GalleryTagGroup[];
};

export type GalleryFavoriteInfo = {
  actionUrl: string;
  favorited: boolean;
  label: string;
};

export type GalleryFavoriteOption = {
  label: string;
  selected: boolean;
  value: string;
};

export type TouchTopBarInfo = {
  available: boolean;
  navItems: HTMLElement[];
  homeHref: string;
  favoritesHref: string;
};

type PageType =
  | {
      type: "image";
      pageNum: number;
    }
  | {
      type: "favorites" | "gallery" | "search" | "other";
    };

export function imageAspectRatio(image: HTMLImageElement | null): number {
  const width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || "");
  const height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");

  return width > 0 && height > 0 ? height / width : 1.42;
}

export function collectGalleryPages(
  extractPageType: (url: string) => PageType,
  root: ParentNode = document,
  baseUrl = window.location.href,
): ReaderPage[] {
  const links = Array.from(
    root.querySelectorAll<HTMLAnchorElement>("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']"),
  );
  const seen = new Set<string>();
  const pages: ReaderPage[] = [];

  for (const link of links) {
    const url = normalizeUrl(link.getAttribute("href") || "", baseUrl);
    const page = extractPageType(url);

    if (!url || page.type !== "image" || seen.has(url)) {
      continue;
    }

    seen.add(url);
    pages.push({
      url,
      aspectRatio: imageAspectRatio(link.querySelector("img")),
      pageNum: page.pageNum,
    });
  }

  return pages.sort((left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER));
}

export function readShowingRange(root: ParentNode = document): { start: number; end: number; total: number } | null {
  const text = root.querySelector(".gpc")?.textContent ?? "";
  const match = text.match(/([\d,]+)\s*-\s*([\d,]+)\s+of\s+([\d,]+)/i);

  if (!match) {
    return null;
  }

  const start = Number(match[1].replace(/,/g, ""));
  const end = Number(match[2].replace(/,/g, ""));
  const total = Number(match[3].replace(/,/g, ""));

  return [start, end, total].every((value) => Number.isFinite(value) && value > 0) ? { start, end, total } : null;
}

export function searchPageNavigation(root: ParentNode = document): { previousUrl: string | null; nextUrl: string | null } | null {
  const previousUrl = root.querySelector<HTMLAnchorElement>(".searchnav a[id$='prev'][href]")?.href ?? null;
  const nextUrl = root.querySelector<HTMLAnchorElement>(".searchnav a[id$='next'][href]")?.href ?? null;

  return previousUrl || nextUrl ? { previousUrl, nextUrl } : null;
}

export function searchResultList(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(".itg");
}

export function searchNavigationBars(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".searchnav"));
}

export function searchTopNavigationBar(root: ParentNode = document): HTMLElement | null {
  return searchNavigationBars(root)[0] ?? null;
}

export function findSearchNavigationLink(target: EventTarget | null): HTMLAnchorElement | null {
  const link =
    target instanceof Element
      ? target.closest<HTMLAnchorElement>(
          ".searchnav a[id$='first'][href], .searchnav a[id$='prev'][href], .searchnav a[id$='next'][href], .searchnav a[id$='last'][href]",
        )
      : null;

  return link instanceof HTMLAnchorElement ? link : null;
}

export function replaceSearchPageContent(doc: Document): HTMLElement | null {
  const currentList = searchResultList();
  const incomingList = searchResultList(doc);

  if (!currentList || !incomingList) {
    return null;
  }

  replaceFirstElement("#rangebar", doc);
  replaceFirstElement(".searchtext", doc);
  replaceSearchRangeScript(doc);
  replaceSearchNavigationBars(doc);

  const importedList = document.importNode(incomingList, true);
  currentList.replaceWith(importedList);
  return importedList;
}

export function maxPreviewPageIndex(root: ParentNode = document, baseUrl = window.location.href): number | null {
  const range = readShowingRange(root);

  if (!range) {
    return null;
  }

  let currentIndex: number;

  try {
    const value = Number(new URL(baseUrl, window.location.href).searchParams.get("p") || "0");
    currentIndex = Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return null;
  }

  const pageSize = currentIndex === 0 ? range.end - range.start + 1 : (range.start - 1) / currentIndex;

  if (!Number.isInteger(pageSize) || pageSize <= 0) {
    return null;
  }

  return Math.max(currentIndex, Math.ceil(range.total / pageSize) - 1);
}

export function findClickedImageLink(target: EventTarget | null, extractPageType: (url: string) => PageType): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;

  if (!(link instanceof HTMLAnchorElement) || extractPageType(link.href).type !== "image") {
    return null;
  }

  if (link.querySelector("img") || link.closest("#gdt, .gdtm, .gdtl")) {
    return link;
  }

  return null;
}

export function replaceGalleryPageBarMounts(topClassName: string, bottomClassName: string): GalleryPageBarMount[] {
  const originals = Array.from(document.querySelectorAll<HTMLElement>(".ptt, .ptb"));
  const topSource = originals.find((item) => item.classList.contains("ptt")) ?? originals[0];
  const bottomSource = originals.find((item) => item.classList.contains("ptb")) ?? originals[1] ?? originals[0];
  const mounts: GalleryPageBarMount[] = [];

  if (topSource) {
    mounts.push(replaceGalleryPageBarAt(topSource, true, topClassName));
  }

  if (bottomSource) {
    mounts.push(replaceGalleryPageBarAt(bottomSource, false, bottomClassName));
  }

  for (const original of originals) {
    original.hidden = true;
  }

  return mounts;
}

export function snapshotPreview(): PreviewSnapshot {
  return {
    description: document.querySelector(".gpc")?.cloneNode(true) ?? null,
    thumbs: document.querySelector("#gdt")?.cloneNode(true) ?? null,
  };
}

export function showPreviewPlaceholder(content: Node | string): void {
  const current = document.querySelector<HTMLElement>("#gdt");

  if (!current) {
    return;
  }

  const rect = current.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.id = "gdt";
  placeholder.className = "ehpeek-preview-placeholder flex items-center justify-center opacity-72";
  placeholder.style.minHeight = `${Math.max(160, Math.round(rect.height))}px`;
  placeholder.setAttribute("aria-busy", "true");
  placeholder.append(content);
  current.replaceWith(placeholder);
}

export function replacePreviewContent(doc: Document): void {
  replaceFirstElement(".gpc", doc);
  replaceFirstElement("#gdt", doc);
}

export function prepareThumbsGridSwipeTargets(thumbs: HTMLElement): void {
  thumbs.style.touchAction = "pan-y";
  thumbs.style.userSelect = "none";

  thumbs.querySelectorAll<HTMLElement>("a, img, .gdtm, .gdtl").forEach((element) => {
    element.style.touchAction = "pan-y";
    element.style.userSelect = "none";

    if (element instanceof HTMLImageElement) {
      element.draggable = false;
      element.style.setProperty("-webkit-user-drag", "none");
    }
  });
}

export function restorePreview(snapshot: PreviewSnapshot): void {
  const currentDescription = document.querySelector(".gpc");
  const currentThumbs = document.querySelector("#gdt");

  if (snapshot.description && currentDescription) {
    currentDescription.replaceWith(snapshot.description);
  }

  if (snapshot.thumbs && currentThumbs) {
    currentThumbs.replaceWith(snapshot.thumbs);
  }
}

export function settingsMenuMountTarget(): Element | null {
  const thumbnailContainer = document.querySelector("#gdt");
  const titleContainer = document.querySelector("#gd2, h1");
  const topNav = document.querySelector("#nb");
  const anchor = thumbnailContainer ?? titleContainer;

  if (topNav) {
    return topNav;
  }

  if (!anchor?.parentElement) {
    return null;
  }

  const wrapper = document.createElement("div");
  wrapper.style.textAlign = "right";

  if (thumbnailContainer) {
    anchor.parentElement.insertBefore(wrapper, anchor);
  } else {
    anchor.insertAdjacentElement("afterend", wrapper);
  }

  return wrapper;
}

export function applySiteTheme(): void {
  document.documentElement.dataset.ehpeekSite = window.location.hostname.endsWith("exhentai.org") ? "exhentai" : "e-hentai";
}

export function applyTouchGalleryPanelPageStyle(): void {
  if (document.getElementById(TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID;
  style.textContent = galleryRearrange;
  document.head.append(style);
}

export function prepareTouchGalleryComments(): void {
  const items = Array.from(document.querySelectorAll<HTMLElement>("#cdiv .c5"))
    .map((trigger) => ({
      trigger,
      details: trigger.closest(".c1")?.querySelector<HTMLElement>(".c7[id^='cvotes_']") ?? null,
    }))
    .filter((item): item is { trigger: HTMLElement; details: HTMLElement } => item.details !== null);

  const setExpanded = (item: (typeof items)[number], expanded: boolean) => {
    item.trigger.setAttribute("aria-expanded", String(expanded));
    item.details.setAttribute("aria-hidden", String(!expanded));
    item.details.classList.toggle("!block", expanded);
    item.details.classList.toggle("!hidden", !expanded);
  };

  for (const item of items) {
    if (item.trigger.dataset.ehpeekTouchCommentScore === "true") {
      continue;
    }

    item.trigger.dataset.ehpeekTouchCommentScore = "true";
    item.trigger.classList.add(...TOUCH_COMMENT_SCORE_CLASS_NAME.split(" "));
    item.details.classList.add(...TOUCH_COMMENT_SCORE_DETAILS_CLASS_NAME.split(" "));
    item.trigger.removeAttribute("onmouseover");
    item.trigger.removeAttribute("onmouseout");
    item.trigger.removeAttribute("onclick");
    item.trigger.setAttribute("role", "button");
    item.trigger.setAttribute("tabindex", "0");
    item.trigger.setAttribute("aria-controls", item.details.id);
    setExpanded(item, false);

    const toggle = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
      const shouldExpand = item.trigger.getAttribute("aria-expanded") !== "true";

      for (const candidate of items) {
        setExpanded(candidate, candidate === item && shouldExpand);
      }
    };

    item.trigger.addEventListener("click", toggle);
    item.trigger.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        toggle(event);
      }
    });
  }
}

export function prepareTouchFavoritesPage(): void {
  document.documentElement.classList.add(...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "));
  document.body.classList.add(...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "));

  const categories = document.querySelector<HTMLElement>(".ido > .nosel");

  if (categories) {
    categories.classList.add(...TOUCH_FAVORITES_CATEGORIES_CLASS_NAME.split(" "));

    for (const child of Array.from(categories.children)) {
      if (child.classList.contains("fp")) {
        child.classList.add(...TOUCH_FAVORITES_CATEGORY_CLASS_NAME.split(" "));

        if (child.classList.contains("fps")) {
          child.classList.add(...TOUCH_FAVORITES_ALL_CATEGORY_CLASS_NAME.split(" "));
        }
      } else if (child.children.length === 0) {
        child.classList.add("!hidden");
      }
    }
  }

  for (const navigation of searchNavigationBars()) {
    navigation.classList.add(...TOUCH_FAVORITES_NAV_CLASS_NAME.split(" "));
  }

  const resultList = searchResultList();
  resultList?.classList.add(...TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME.split(" "));
  const existingWrapper = resultList?.parentElement?.classList.contains("ehpeek-touch-favorites-results")
    ? resultList.parentElement
    : null;
  const content = existingWrapper?.parentElement ?? resultList?.parentElement;
  const pageContent = resultList?.closest<HTMLElement>(".ido");

  pageContent?.classList.add(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" "));
  content?.classList.add(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" "));

  if (!resultList || existingWrapper) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = TOUCH_FAVORITES_RESULTS_CLASS_NAME;
  resultList.replaceWith(wrapper);
  wrapper.append(resultList);
}

export function insertTouchTopBar(topBar: HTMLElement): boolean {
  const original = document.querySelector("#nb");

  if (!original?.parentElement) {
    return false;
  }

  original.replaceWith(topBar);
  return true;
}

export function insertTouchGalleryPanel(panel: HTMLElement): boolean {
  const original = document.querySelector("#gmid");
  const host = original?.parentElement ?? document.querySelector("#gleft")?.parentElement;

  if (!host) {
    return false;
  }

  host.classList.add("ehpeek-touch-gallery-host");

  for (const child of Array.from(host.children)) {
    (child as HTMLElement).hidden = true;
  }

  host.prepend(panel);
  return true;
}

export function readTouchTopBarInfo(menuItemClassName: string): TouchTopBarInfo {
  const navItems = Array.from(document.querySelectorAll<HTMLAnchorElement>("#nb a[href]")).map((link) => {
    const clone = link.cloneNode(true) as HTMLAnchorElement;
    clone.removeAttribute("id");
    clone.className = menuItemClassName;
    return clone;
  });

  return {
    available: navItems.length > 0,
    navItems,
    homeHref: navItems.find((item): item is HTMLAnchorElement => item instanceof HTMLAnchorElement)?.href ?? "/",
    favoritesHref: new URL("/favorites.php", window.location.href).href,
  };
}

export function readGalleryInfo(actionMenuItemClassName: string): GalleryInfo {
  const meta = readGalleryMeta();
  const range = readShowingRange();
  const coverSource = document.querySelector<HTMLImageElement>("#gd1 img");
  const coverUrl =
    coverSource?.currentSrc ||
    coverSource?.src ||
    coverSource?.getAttribute("src") ||
    backgroundImageUrl(document.querySelector("#gd1"));
  const summary = [
    meta.get("language"),
    range?.total ? `${range.total} ${texts.reader.pages.toLowerCase()}` : undefined,
    meta.get("file size") ?? meta.get("size"),
    meta.get("favorited"),
    meta.get("posted") ?? meta.get("parent"),
  ]
    .filter((value): value is string => Boolean(value))
    .slice(0, 6)
    .map((value) => ({ value }));

  return {
    available: Boolean(document.querySelector("#gmid")),
    titleMain: textOf("#gn"),
    titleSub: textOf("#gj"),
    category: textOf("#gdc"),
    categoryAppearance: readGalleryCategoryAppearance(),
    cover: coverUrl ? galleryCoverImageElement(coverUrl) : null,
    favorite: readGalleryFavoriteInfo(),
    summary,
    actions: readGalleryActionsDom(actionMenuItemClassName),
    rating: readGalleryRatingInfo(),
    tagGroups: readGalleryTagGroups(),
  };
}

function replaceGalleryPageBarAt(source: HTMLElement, top: boolean, className: string): GalleryPageBarMount {
  const existing = document.querySelector<HTMLDivElement>(`.${className}`);

  if (existing) {
    return { element: existing, top };
  }

  const pageBar = document.createElement("div");
  source.insertAdjacentElement("afterend", pageBar);
  return { element: pageBar, top };
}

function replaceFirstElement(selector: string, doc: Document): void {
  const current = document.querySelector(selector);
  const incoming = doc.querySelector(selector);

  if (!current || !incoming) {
    return;
  }

  current.replaceWith(document.importNode(incoming, true));
}

function replaceSearchNavigationBars(doc: Document): void {
  const currentBars = searchNavigationBars();
  const incomingBars = searchNavigationBars(doc);
  const count = Math.min(currentBars.length, incomingBars.length);

  for (let index = 0; index < count; index += 1) {
    currentBars[index].replaceWith(document.importNode(incomingBars[index], true));
  }
}

function replaceSearchRangeScript(doc: Document): void {
  const incomingScript = Array.from(doc.querySelectorAll<HTMLScriptElement>("script")).find((item) =>
    item.textContent?.includes("build_rangebar()"),
  );

  if (!incomingScript) {
    return;
  }

  const currentScript = Array.from(document.querySelectorAll<HTMLScriptElement>("script")).find((item) =>
    item.textContent?.includes("build_rangebar()"),
  );
  const script = document.createElement("script");
  script.type = incomingScript.type || "text/javascript";
  script.textContent = incomingScript.textContent;

  if (currentScript) {
    currentScript.replaceWith(script);
  } else {
    searchNavigationBars()[0]?.before(script);
  }
}

function readGalleryMeta(): Map<string, string> {
  const entries = Array.from(document.querySelectorAll<HTMLTableRowElement>("#gdd tr"))
    .map((row) => {
      const cells = Array.from(row.cells);
      const label = cells[0]?.textContent?.trim().replace(/:$/, "").toLowerCase() ?? "";
      const value = cells.slice(1).map((cell) => cell.textContent?.trim() ?? "").filter(Boolean).join(" ");

      return [label, value] as const;
    })
    .filter(([label, value]) => label && value);

  return new Map(entries);
}

function readGalleryCategoryAppearance(): GalleryCategoryAppearance {
  const category = document.querySelector("#gdc");
  const categoryStyleElement = category?.querySelector("[class*='ct']") ?? category;
  const style = categoryStyleElement ? window.getComputedStyle(categoryStyleElement) : null;

  return {
    backgroundColor: style?.backgroundColor ?? "",
    color: style?.color ?? "",
  };
}

function readGalleryRatingInfo(): GalleryRatingInfo | null {
  const label = textOf("#rating_label");
  const count = textOf("#rating_count");
  const script = galleryRatingScript();
  const value = scriptNumberValue(script, "display_rating");

  if (!label || value === null) {
    return null;
  }

  return { count, label, value };
}

function galleryRatingScript(): string {
  return (
    Array.from(document.scripts)
      .map((item) => item.textContent ?? "")
      .find((text) => text.includes("display_rating")) ?? ""
  );
}

function scriptNumberValue(script: string, name: string): number | null {
  const match = script.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  const value = Number(match?.[1]);
  return match && Number.isFinite(value) ? value : null;
}

export function setGalleryRating(value: number): void {
  const rating = Math.round(value * 2);

  if (rating < 1 || rating > 10) {
    throw new RangeError("Gallery rating must be between 0.5 and 5 stars.");
  }

  const area = document.querySelectorAll<HTMLAreaElement>('map[name="rating"] area')[rating - 1];

  if (!area) {
    throw new Error("Gallery rating action is unavailable.");
  }

  area.click();
}

function readGalleryActionsDom(actionMenuItemClassName: string): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']"))
    .map((item) => {
      const clone = item.cloneNode(false) as HTMLElement;
      clone.removeAttribute("id");
      clone.removeAttribute("style");
      clone.className = actionMenuItemClassName;

      if (!(clone instanceof HTMLInputElement)) {
        clone.textContent = item.textContent?.trim() || item.getAttribute("title")?.trim() || item.getAttribute("aria-label")?.trim() || "";
      }

      return clone;
    })
    .slice(0, 6);
}

function readGalleryTagGroups(): GalleryTagGroup[] {
  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>("#taglist tr"));

  if (rows.length > 0) {
    return rows
      .map((row) => {
        const namespace = row.querySelector(".tc, td:first-child")?.textContent?.trim().replace(/:$/, "") || "tag";
        const tags = Array.from(row.querySelectorAll<HTMLAnchorElement>("a"))
          .map(readGalleryTag)
          .filter((tag): tag is GalleryTag => tag !== null)
          .slice(0, 30);

        return { namespace, tags };
      })
      .filter((group) => group.tags.length > 0);
  }

  const groups = new Map<string, GalleryTag[]>();

  for (const tag of Array.from(document.querySelectorAll<HTMLAnchorElement>("#taglist a")).slice(0, 60)) {
    const galleryTag = readGalleryTag(tag);

    if (!galleryTag) {
      continue;
    }

    const tags = groups.get("tag") ?? [];
    tags.push(galleryTag);
    groups.set("tag", tags);
  }

  return Array.from(groups, ([namespace, tags]) => ({ namespace, tags }));
}

function readGalleryTag(tag: HTMLAnchorElement): GalleryTag | null {
  const label = tag.textContent?.trim() ?? "";

  if (!label || !tag.href) {
    return null;
  }

  const container = tag.closest<HTMLElement>("div.gt, div.gtl, div.gtw") ?? tag;
  const tagStyle = window.getComputedStyle(tag);
  const containerStyle = window.getComputedStyle(container);

  return {
    appearance: {
      backgroundColor: containerStyle.backgroundColor,
      borderColor: containerStyle.borderColor,
      color: tagStyle.color,
    },
    href: tag.href,
    label,
  };
}

function readGalleryFavoriteInfo(): GalleryFavoriteInfo {
  const label = textOf("#favoritelink");
  const iconTitle = document.querySelector("#fav [title]")?.getAttribute("title")?.trim() ?? "";
  const text = label || iconTitle;
  const favorited = /^favorites?\s+\d+/i.test(text);

  return {
    actionUrl: galleryFavoriteActionUrl(),
    favorited,
    label: favorited ? text : "Not Favorited",
  };
}

export function parseGalleryFavoriteOptions(doc: Document, favorited: boolean): GalleryFavoriteOption[] {
  return Array.from(doc.querySelectorAll<HTMLInputElement>("input[name='favcat']")).map((input) => {
    const row = input.closest<HTMLElement>("div[style*='height']");
    const label = row?.textContent?.trim().replace(/\s+/g, " ") || input.value;

    return {
      label,
      selected: favorited && input.checked,
      value: input.value,
    };
  });
}

function galleryFavoriteActionUrl(): string {
  const script = Array.from(document.scripts)
    .map((item) => item.textContent ?? "")
    .find((text) => text.includes("popbase") && text.includes("addfav")) ?? "";
  const match = script.match(/popbase\s*=\s*base_url\s*\+\s*"gallerypopups\.php\?gid=(\d+)&t=([^"]+)&act="/);

  if (match) {
    return `/gallerypopups.php?gid=${match[1]}&t=${match[2]}&act=addfav`;
  }

  return "";
}

export function galleryContinueReadingButtonMountTarget(): HTMLElement {
  const host = document.createElement("div");
  const viewerOptions = document.querySelector<HTMLElement>("#gd5");

  if (viewerOptions) {
    viewerOptions.classList.add("ehpeek-gallery-actions");
    viewerOptions.append(host);
    return host;
  }

  document.body.append(host);
  return host;
}

function textOf(selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? "";
}

function galleryCoverImageElement(imageUrl: string): HTMLImageElement {
  const image = document.createElement("img");
  image.className = "block w-full max-w-full h-full max-h-full mx-auto object-contain object-center";
  image.src = imageUrl;
  image.alt = "";
  image.decoding = "async";
  image.loading = "eager";
  return image;
}

function backgroundImageUrl(root: Element | null): string {
  if (!root) {
    return "";
  }

  for (const item of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
    const backgroundImage = window.getComputedStyle(item).backgroundImage;
    const match = backgroundImage.match(/url\(["']?(.+?)["']?\)/);

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}
