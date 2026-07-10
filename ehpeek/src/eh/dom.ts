import { SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR, createScrollPageBar } from "../components/Enhance/ScrollPageBar";
import type { ReaderPage } from "../components/Reader";
import type { SettingsMenu } from "../components/SettingsMenu";
import texts from "../texts.json";
import { normalizeUrl } from "../utils";

const TOUCH_GALLERY_PANEL_PAGE_STYLE_ID = "ehpeek-touch-gallery-panel-page-style";
const TOUCH_TOP_BAR_PAGE_STYLE_ID = "ehpeek-touch-top-bar-page-style";

const TOUCH_GALLERY_PANEL_PAGE_CSS = `
  :root {
    --ehpeek-touch-gallery-gutter: clamp(16px, 2.5vw, 36px);
  }

  .ehpeek-touch-gallery-host,
  .gpc,
  body #gdt[class],
  #cdiv,
  .ptt,
  .ptb {
    box-sizing: border-box !important;
    width: calc(100% - (var(--ehpeek-touch-gallery-gutter) * 2)) !important;
    max-width: none !important;
    margin-left: auto !important;
    margin-right: auto !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  body #gdt[class],
  .ptt,
  .ptb,
  .ehpeek-scroll-page-bar {
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  #gdt .gdtm,
  #gdt .gdtl,
  #gdt > div {
    display: inline-flex !important;
    min-width: 132px !important;
    align-items: center !important;
    justify-content: center !important;
    vertical-align: top;
  }

  #gdt a {
    display: flex !important;
    min-height: 150px;
    align-items: center;
    justify-content: center;
  }
`;

const TOUCH_TOP_BAR_PAGE_CSS = "";

export type PreviewSnapshot = {
  description: Node | null;
  thumbs: Node | null;
};

export type GallerySummaryItem = {
  value: string;
};

export type GalleryTagGroup = {
  namespace: string;
  tags: HTMLElement[];
};

export type GalleryInfo = {
  available: boolean;
  titleMain: string;
  titleSub: string;
  category: string;
  categoryClassName: string;
  cover: HTMLElement | null;
  favorite: GalleryFavoriteInfo;
  summary: GallerySummaryItem[];
  actions: HTMLElement[];
  rating: HTMLElement | null;
  tagGroups: GalleryTagGroup[];
};

export type GalleryFavoriteInfo = {
  favorited: boolean;
  label: string;
};

export type TouchTopBarInfo = {
  available: boolean;
  navItems: HTMLElement[];
  homeHref: string;
};

type PageType =
  | {
      type: "image";
      pageNum: number;
    }
  | {
      type: "gallery" | "search" | "other";
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
  const indexes = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href*='?p='], a[href*='&p=']"))
    .map((link) => {
      try {
        return Number(new URL(link.getAttribute("href") || "", baseUrl).searchParams.get("p") || "");
      } catch {
        return NaN;
      }
    })
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (indexes.length === 0) {
    return null;
  }

  return Math.max(...indexes);
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

export function replaceGalleryPageBar(options: {
  currentIndex: number;
  maxIndex: number | null;
  previewUrlForIndex: (index: number) => string;
}): void {
  const originals = Array.from(document.querySelectorAll<HTMLElement>(".ptt, .ptb"));
  const topSource = originals.find((item) => item.classList.contains("ptt")) ?? originals[0];
  const bottomSource = originals.find((item) => item.classList.contains("ptb")) ?? originals[1] ?? originals[0];

  if (topSource) {
    replaceGalleryPageBarAt(topSource, true, options);
  }

  if (bottomSource) {
    replaceGalleryPageBarAt(bottomSource, false, options);
  }

  for (const original of originals) {
    original.hidden = true;
  }
}

export function snapshotPreview(): PreviewSnapshot {
  return {
    description: document.querySelector(".gpc")?.cloneNode(true) ?? null,
    thumbs: document.querySelector("#gdt")?.cloneNode(true) ?? null,
  };
}

export function installPreviewPlaceholder(): void {
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
  placeholder.textContent = texts.reader.loading;
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

export function mountSettingsMenu(settingsMenu: SettingsMenu): boolean {
  const touchTopBarMenu = document.querySelector(".ehpeek-touch-top-bar-menu-panel");
  const thumbnailContainer = document.querySelector("#gdt");
  const titleContainer = document.querySelector("#gd2, h1");
  const topNav = document.querySelector("#nb");
  const anchor = thumbnailContainer ?? titleContainer;

  if (touchTopBarMenu) {
    settingsMenu.mount(touchTopBarMenu);
    return true;
  }

  if (topNav) {
    settingsMenu.mount(topNav);
    return true;
  }

  if (!anchor?.parentElement) {
    return false;
  }

  const wrapper = document.createElement("div");
  wrapper.style.textAlign = "right";

  if (thumbnailContainer) {
    anchor.parentElement.insertBefore(wrapper, anchor);
  } else {
    anchor.insertAdjacentElement("afterend", wrapper);
  }

  settingsMenu.mount(wrapper);
  return true;
}

export function settingsMenuTriggerTagName(): "a" | "button" {
  return document.querySelector("#nb") && !document.querySelector(".ehpeek-touch-top-bar") ? "a" : "button";
}

export function installTouchGalleryPanelPageStyle(): void {
  if (document.getElementById(TOUCH_GALLERY_PANEL_PAGE_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = TOUCH_GALLERY_PANEL_PAGE_STYLE_ID;
  style.textContent = TOUCH_GALLERY_PANEL_PAGE_CSS;
  document.head.append(style);
}

export function installTouchTopBarPageStyle(): void {
  if (document.getElementById(TOUCH_TOP_BAR_PAGE_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = TOUCH_TOP_BAR_PAGE_STYLE_ID;
  style.textContent = TOUCH_TOP_BAR_PAGE_CSS;
  document.head.append(style);
}

export function mountTouchTopBar(topBar: HTMLElement): boolean {
  const original = document.querySelector("#nb");

  if (!original?.parentElement) {
    return false;
  }

  original.replaceWith(topBar);
  return true;
}

export function mountTouchGalleryPanel(panel: HTMLElement): boolean {
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

export function readTouchTopBarInfo(): TouchTopBarInfo {
  const navItems = Array.from(document.querySelectorAll<HTMLAnchorElement>("#nb a[href]")).map((link) => {
    const clone = link.cloneNode(true) as HTMLAnchorElement;
    clone.removeAttribute("id");
    clone.className = "ehpeek-touch-top-bar-menu-item";
    return clone;
  });

  return {
    available: navItems.length > 0,
    navItems,
    homeHref: navItems.find((item): item is HTMLAnchorElement => item instanceof HTMLAnchorElement)?.href ?? "/",
  };
}

export function readGalleryInfo(): GalleryInfo {
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
    categoryClassName: readGalleryCategoryClassName(),
    cover: coverUrl ? createGalleryCoverImageDom(coverUrl) : null,
    favorite: readGalleryFavoriteInfo(),
    summary,
    actions: readGalleryActionsDom(),
    rating: readGalleryRatingDom(),
    tagGroups: readGalleryTagGroupsDom(),
  };
}

function replaceGalleryPageBarAt(
  source: HTMLElement,
  top: boolean,
  options: {
    currentIndex: number;
    maxIndex: number | null;
    previewUrlForIndex: (index: number) => string;
  },
): void {
  const className = top ? "ehpeek-scroll-page-bar-top" : "ehpeek-scroll-page-bar-bottom";
  const existing = document.querySelector<HTMLElement>(`.${className}`);
  const initialWindowIndex = existing ? Number(existing.getAttribute(SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR) || "") : undefined;
  const pageBar = createScrollPageBar({
    currentIndex: options.currentIndex,
    initialWindowIndex: Number.isFinite(initialWindowIndex) ? initialWindowIndex : undefined,
    maxIndex: options.maxIndex,
    top,
    urlForIndex: options.previewUrlForIndex,
  });

  if (existing) {
    existing.replaceWith(pageBar);
  } else {
    source.insertAdjacentElement("afterend", pageBar);
  }
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

function readGalleryCategoryClassName(): string {
  const category = document.querySelector("#gdc");
  const categoryStyleElement = category?.querySelector("[class*='ct']") ?? category;

  return Array.from(categoryStyleElement?.classList ?? [])
    .filter((className) => /^ct\d+$/i.test(className))
    .join(" ");
}

function readGalleryRatingDom(): HTMLElement | null {
  const element =
    document.querySelector<HTMLElement>("#gdr") ??
    document.querySelector<HTMLElement>("#rating") ??
    document.querySelector<HTMLElement>("#rating_label")?.parentElement ??
    null;

  if (!element) {
    return null;
  }

  const wrapper = document.createElement("div");
  const scaler = document.createElement("div");

  wrapper.className = "ehpeek-touch-gallery-rating";
  scaler.className = "ehpeek-touch-gallery-rating-scale";

  scaler.append(element);
  wrapper.append(scaler);
  return wrapper;
}

function readGalleryActionsDom(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']"))
    .map((item) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.removeAttribute("id");
      clone.classList.add("ehpeek-touch-gallery-actions-menu-item");
      return clone;
    })
    .slice(0, 6);
}

function readGalleryTagGroupsDom(): GalleryTagGroup[] {
  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>("#taglist tr"));

  if (rows.length > 0) {
    return rows
      .map((row) => {
        const namespace = row.querySelector(".tc, td:first-child")?.textContent?.trim().replace(/:$/, "") || "tag";
        const tags = Array.from(row.querySelectorAll<HTMLAnchorElement>("a"))
          .map(cloneGalleryTagDom)
          .filter(Boolean)
          .slice(0, 30);

        return { namespace, tags };
      })
      .filter((group) => group.tags.length > 0);
  }

  const groups = new Map<string, HTMLElement[]>();

  for (const tag of Array.from(document.querySelectorAll<HTMLAnchorElement>("#taglist a")).slice(0, 60)) {
    const clone = cloneGalleryTagDom(tag);
    const tags = groups.get("tag") ?? [];
    tags.push(clone);
    groups.set("tag", tags);
  }

  return Array.from(groups, ([namespace, tags]) => ({ namespace, tags }));
}

function cloneGalleryTagDom(tag: HTMLAnchorElement): HTMLElement {
  const clone = tag.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  return clone;
}

function readGalleryFavoriteInfo(): GalleryFavoriteInfo {
  const label = textOf("#favoritelink");
  const iconTitle = document.querySelector("#fav [title]")?.getAttribute("title")?.trim() ?? "";
  const text = label || iconTitle;
  const favorited = /^favorites?\s+\d+/i.test(text);

  return {
    favorited,
    label: favorited ? text : "Not Favorited",
  };
}

export function clickGalleryFavoriteAction(): void {
  document.querySelector<HTMLElement>("#gdf")?.click();
}

export function mountGalleryContinueReadingButton(button: HTMLButtonElement): void {
  const viewerOptions = document.querySelector<HTMLElement>("#gd5");

  if (viewerOptions) {
    viewerOptions.classList.add("ehpeek-gallery-actions");
    viewerOptions.append(button);
    return;
  }

  document.body.append(button);
}

function textOf(selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? "";
}

function createGalleryCoverImageDom(imageUrl: string): HTMLImageElement {
  const image = document.createElement("img");
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
