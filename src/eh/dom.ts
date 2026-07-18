import type { ReaderPage } from "../readerTypes";
import texts from "../texts.json";
import { normalizeUrl } from "../utils";
import {
  updateGalleryRating,
  updateGalleryTagVote,
  type GalleryRatingResult,
  type GalleryTagApiInfo,
} from "./request";
import galleryRearrange from "./galleryRearrange.css";

const TOUCH_GALLERY_PAGE_REARRANGE_STYLE_ID = "ehpeek-touch-gallery-page-rearrange-style";
const TOUCH_FAVORITES_PAGE_CLASS_NAME = "!min-w-0 !max-w-full !overflow-x-hidden";
const TOUCH_FAVORITES_CONTENT_CLASS_NAME = "box-border !min-w-0 !w-full !max-w-full !overflow-x-hidden";
const TOUCH_FAVORITES_NAV_CLASS_NAME = "box-border !max-w-full overflow-x-auto";
const TOUCH_FAVORITES_RESULTS_CLASS_NAME = "ehpeek-touch-favorites-results box-border !min-w-0 !w-full !max-w-full overflow-x-auto";
const TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME = "!min-w-0 !w-full !max-w-full";
const TOUCH_FAVORITES_ALL_RESULTS_CLASS_NAME = "!overflow-x-hidden";
const TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME = "!min-w-0 !max-w-full !overflow-x-hidden";
const TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME = "box-border !min-w-0 !w-full !max-w-full !overflow-x-hidden";
const TOUCH_SEARCH_RESULTS_WRAPPER_CLASS_NAME =
  "ehpeek-touch-search-results box-border !min-w-0 !w-full !max-w-full overflow-x-auto";
const TOUCH_SEARCH_RESULT_LIST_CLASS_NAME = "!min-w-0 !w-full !max-w-full";
const GALLERY_PAGE_DESCRIPTION_SELECTOR = ".gpc:not(.eh-syringe-ignore)";
const EXHENTAI_ONION_HOST = "exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion";
const SINGLE_PAGE_PERSISTENT_SELECTOR =
  "[data-ehpeek-persistent], #eh-syringe-popup-button, #eh-syringe-popup-back, .eh-syringe-lite-auto-complete-list";

export type PreviewSnapshot = {
  description: Node | null;
  thumbs: Node | null;
};

export type ImagePageInfo = {
  imageUrl: string;
  originalImageUrl: string | null;
  width: number | null;
  height: number | null;
};

export type GalleryPageBarMount = {
  descriptionElement: HTMLDivElement | null;
  descriptionText: string | null;
  element: HTMLDivElement;
  top: boolean;
};

export type PageViewportSnapshot = {
  content: string | null;
  created: boolean;
  meta: HTMLMetaElement;
  scale: number;
  scrollX: number;
  scrollY: number;
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
  contentSource: HTMLElement;
  definitionHref: string;
  href: string;
  label: string;
  name: string;
};

export type GalleryTagAction = "voteDown" | "voteUp";

export type GalleryNewTagInfo = {
  button: HTMLInputElement | HTMLButtonElement;
  container: HTMLElement;
  field: HTMLInputElement;
  form: HTMLFormElement;
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
  rated: boolean;
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
  newTag: GalleryNewTagInfo | null;
  tagApi: GalleryTagApiInfo | null;
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

export type TouchSearchPanelInfo = {
  advancedPanel: HTMLElement | null;
  advancedToggle: HTMLAnchorElement | null;
  advancedToggleMount: HTMLSpanElement | null;
  categories: HTMLTableElement | null;
  categoryToggleMount: HTMLSpanElement | null;
  clearActionMount: HTMLSpanElement | null;
  clearButton: HTMLInputElement | HTMLButtonElement | null;
  clearLabel: string | null;
  fileSearch: HTMLElement | null;
  fileSearchToggle: HTMLAnchorElement | null;
  fileSearchToggleMount: HTMLSpanElement | null;
  form: HTMLFormElement;
  optionLinks: HTMLElement | null;
  searchActionMount: HTMLSpanElement;
  searchBox: HTMLElement;
  searchControls: HTMLDivElement;
  searchInput: HTMLInputElement;
  searchLabel: string;
  searchSubmit: HTMLInputElement | HTMLButtonElement;
};

export type TouchFavoritesCategory = {
  appearance: TouchFavoritesCategoryAppearance | null;
  count: number;
  href: string;
  label: string;
  selected: boolean;
};

export type TouchFavoritesCategoryAppearance = {
  backgroundImage: string;
  backgroundPosition: string;
  backgroundSize: string;
};

export type TouchFavoritesCategorySelectInfo = {
  categories: TouchFavoritesCategory[];
};

export type SearchHistorySource = {
  searchInput: HTMLInputElement;
  searchSubmit: HTMLInputElement | HTMLButtonElement;
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

export function readImagePageInfo(root: ParentNode, baseUrl: string): ImagePageInfo {
  const image = root.querySelector<HTMLImageElement>("img#img");
  const imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "";
  const originalImageUrl = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"))
    .map((link) => normalizeUrl(link.getAttribute("href") || "", baseUrl))
    .find((url) => imageUrlPath(url).includes("/fullimg")) ?? null;

  return {
    imageUrl: normalizeUrl(imageSrc, baseUrl),
    originalImageUrl,
    width: numericAttribute(image, "width"),
    height: numericAttribute(image, "height"),
  };
}

export function imageGalleryUrl(root: ParentNode = document, baseUrl = window.location.href): string | null {
  for (const link of Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href]"))) {
    const url = normalizeUrl(link.getAttribute("href") || "", baseUrl);

    try {
      if (/^\/g\/\d+\/[^/]+\/?$/i.test(new URL(url).pathname)) {
        return url;
      }
    } catch {
      continue;
    }
  }

  return null;
}

function imageUrlPath(url: string): string {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
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
  const text = galleryPageDescription(root)?.textContent ?? "";
  const match = text.match(/([\d,]+)\s*-\s*([\d,]+)\D+([\d,]+)/);

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

export function prepareEhPeekSearchGrid(): void {
  const resultList = searchResultList();

  if (!resultList) {
    return;
  }

  document.querySelector<HTMLElement>(".ehpeek-search-grid-host")?.remove();
  resultList.hidden = false;
  resultList.style.setProperty("display", "block", "important");
  resultList.style.setProperty("width", "100%", "important");
  resultList.style.setProperty("table-layout", "auto", "important");
  const body = resultList.querySelector<HTMLElement>("tbody");
  body?.style.setProperty("display", "block", "important");

  for (const row of Array.from(resultList.querySelectorAll<HTMLTableRowElement>("tbody > tr"))) {
    const thumbnailCell = row.querySelector<HTMLElement>(":scope > .gl1e");
    const contentCell = row.querySelector<HTMLElement>(":scope > .gl2e");

    if (!thumbnailCell || !contentCell) {
      continue;
    }

    const selectionCell = row.querySelector<HTMLElement>(":scope > .glfe");
    row.style.setProperty("display", "grid", "important");
    row.style.setProperty(
      "grid-template-columns",
      selectionCell ? "clamp(112px, 34%, 250px) minmax(0, 1fr) auto" : "clamp(112px, 34%, 250px) minmax(0, 1fr)",
      "important",
    );
    row.style.setProperty("align-items", "start", "important");
    row.style.setProperty("column-gap", "6px", "important");
    row.style.setProperty("width", "100%", "important");

    thumbnailCell.style.setProperty("width", "auto", "important");
    contentCell.style.setProperty("width", "auto", "important");
    contentCell.style.setProperty("min-width", "0", "important");
    contentCell.style.setProperty("align-self", "stretch", "important");
    contentCell.style.setProperty("height", "100%", "important");
    selectionCell?.style.setProperty("width", "auto", "important");

    mergeEhPeekSearchContent(contentCell);

    const thumbnail = thumbnailCell.querySelector<HTMLElement>(":scope > div");
    thumbnail?.style.setProperty("width", "100%", "important");
    thumbnail?.style.setProperty("height", "auto", "important");
    const image = thumbnail?.querySelector<HTMLImageElement>("img");
    image?.style.setProperty("width", "100%", "important");
    image?.style.setProperty("height", "auto", "important");

    const title = contentCell.querySelector<HTMLElement>(".glink");
    title?.style.setProperty("height", "auto", "important");
    title?.style.setProperty("min-height", "0", "important");
    title?.style.setProperty("overflow", "visible", "important");
    title?.style.setProperty("overflow-wrap", "anywhere", "important");
    title?.style.setProperty("white-space", "normal", "important");
    title?.style.setProperty("word-break", "normal", "important");
    title?.style.setProperty("text-align", "left", "important");
    title?.style.setProperty("font-size", "var(--font-size-md)", "important");
    title?.style.setProperty("font-weight", "700", "important");
    title?.style.setProperty("line-height", "1.35", "important");
  }
}

function mergeEhPeekSearchContent(contentCell: HTMLElement): void {
  const detail = contentCell.querySelector<HTMLElement>(".gl4e");
  const metadata = contentCell.querySelector<HTMLElement>(".gl3e");

  if (!detail || !metadata || detail.dataset.ehpeekMerged === "true") {
    return;
  }

  const galleryLink = detail.parentElement instanceof HTMLAnchorElement ? detail.parentElement : null;
  const title = detail.querySelector<HTMLElement>(":scope > .glink");
  const tags = Array.from(detail.children).filter((element) => element !== title);

  if (galleryLink && title) {
    const titleLink = document.createElement("a");
    titleLink.href = galleryLink.href;
    titleLink.className = "block min-w-0 ehp-color-site-text no-underline";
    titleLink.append(title);
    galleryLink.before(detail);
    galleryLink.remove();
    detail.replaceChildren(titleLink, metadata, ...tags);
    makeEhPeekSearchContentClickable(contentCell, titleLink);
  } else {
    title?.after(metadata);
  }

  detail.dataset.ehpeekMerged = "true";
  detail.style.setProperty("display", "flex", "important");
  detail.style.setProperty("flex-direction", "column", "important");
  detail.style.setProperty("justify-content", "flex-start", "important");
  detail.style.setProperty("align-items", "stretch", "important");
  detail.style.setProperty("gap", "var(--space-md, 12px)", "important");
  detail.style.setProperty("min-height", "0", "important");
  detail.style.setProperty("width", "100%", "important");
  detail.style.setProperty("box-sizing", "border-box", "important");

  metadata.style.setProperty("display", "flex", "important");
  metadata.style.setProperty("flex-direction", "row", "important");
  metadata.style.setProperty("flex-wrap", "wrap", "important");
  metadata.style.setProperty("align-items", "center", "important");
  metadata.style.setProperty("align-content", "flex-start", "important");
  metadata.style.setProperty("justify-content", "flex-start", "important");
  metadata.style.setProperty("gap", "8px 12px", "important");
  metadata.style.setProperty("float", "none", "important");
  metadata.style.setProperty("position", "static", "important");
  metadata.style.setProperty("width", "100%", "important");
  metadata.style.setProperty("height", "auto", "important");
  metadata.style.setProperty("min-height", "0", "important");
  metadata.style.setProperty("margin", "0", "important");
  metadata.style.setProperty("padding", "0", "important");
  metadata.style.setProperty("font-weight", "600", "important");

  for (const tagsContainer of tags) {
    if (!(tagsContainer instanceof HTMLElement)) {
      continue;
    }

    tagsContainer.style.setProperty("position", "static", "important");
    tagsContainer.style.setProperty("width", "100%", "important");
    tagsContainer.style.setProperty("height", "auto", "important");
    tagsContainer.style.setProperty("min-height", "0", "important");
    tagsContainer.style.setProperty("flex", "0 0 auto", "important");
    tagsContainer.style.setProperty("margin", "0", "important");
    tagsContainer.style.setProperty("padding", "0", "important");

    for (const table of Array.from(tagsContainer.querySelectorAll<HTMLElement>("table, tbody, tr"))) {
      table.style.setProperty("height", "auto", "important");
      table.style.setProperty("min-height", "0", "important");
      table.style.setProperty("margin", "0", "important");
    }

    for (const cell of Array.from(tagsContainer.querySelectorAll<HTMLElement>("td"))) {
      cell.style.setProperty("height", "auto", "important");
      cell.style.setProperty("min-height", "0", "important");
      cell.style.setProperty("vertical-align", "top", "important");
    }
  }

  for (const tag of Array.from(detail.querySelectorAll<HTMLElement>(".gt, .gtl, .gtw, td.tc"))) {
    tag.style.setProperty("font-size", "var(--font-size-sm)", "important");
    tag.style.setProperty("line-height", "1.2", "important");
  }

  for (const item of Array.from(metadata.children)) {
    if (!(item instanceof HTMLElement)) {
      continue;
    }

    item.style.setProperty("float", "none", "important");
    item.style.setProperty("position", "static", "important");
    item.style.setProperty("flex", "0 0 auto", "important");
    item.style.setProperty("min-width", "0", "important");
    item.style.setProperty("margin", "0", "important");
    item.style.setProperty("font-weight", "600", "important");

    if (item.matches(".ir, .gldown")) {
      item.style.removeProperty("width");
      item.style.removeProperty("height");
      continue;
    }

    item.style.setProperty("width", "auto", "important");
    item.style.setProperty("height", "auto", "important");
    item.style.setProperty("padding", "0", "important");
    item.style.setProperty("line-height", "1.3", "important");

    if (item.matches(".cn, .cs, [class*='ct']")) {
      item.style.setProperty("display", "inline-flex", "important");
      item.style.setProperty("align-items", "center", "important");
      item.style.setProperty("justify-content", "center", "important");
      item.style.setProperty("box-sizing", "border-box", "important");
      item.style.setProperty("width", "72px", "important");
      item.style.setProperty("height", "32px", "important");
      item.style.setProperty("padding", "0 8px", "important");
    }
  }
}

function makeEhPeekSearchContentClickable(contentCell: HTMLElement, galleryLink: HTMLAnchorElement): void {
  if (contentCell.dataset.ehpeekClickable === "true") {
    return;
  }

  contentCell.dataset.ehpeekClickable = "true";
  contentCell.style.setProperty("position", "relative", "important");
  contentCell.style.setProperty("cursor", "pointer", "important");
  const coarseOverlay = document.createElement("a");
  coarseOverlay.href = galleryLink.href;
  coarseOverlay.className = "hidden coarse:block absolute inset-0 z-1";
  coarseOverlay.setAttribute("aria-label", galleryLink.textContent?.trim() || "Open gallery");
  contentCell.append(coarseOverlay);
  contentCell.addEventListener("click", (event) => {
    const interactive = event.target instanceof Element
      ? event.target.closest("a[href], button, input, select, textarea, label, [onclick]")
      : null;

    if (!interactive) {
      galleryLink.click();
    }
  });
}

export function prepareSearchGridModeSelect(
  selected: boolean,
  onEhPeekSelect: () => void,
  onOriginalSelect: () => void,
): void {
  const selects = Array.from(document.querySelectorAll<HTMLSelectElement>("select[onchange*='inline_set=dm_']"));

  for (const select of selects) {
    let option = Array.from(select.options).find((item) => item.value === "ehpeek");

    if (!option) {
      option = new Option("EhPeek", "ehpeek");
      select.add(option);
    }

    option.selected = selected;

    if (select.dataset.ehpeekGridMode === "true") {
      continue;
    }

    select.dataset.ehpeekGridMode = "true";
    select.addEventListener("change", (event) => {
      if (select.value !== "ehpeek") {
        onOriginalSelect();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      onEhPeekSelect();
    }, true);
  }
}

export function searchNavigationBars(root: ParentNode = document): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(".searchnav"));
}

export function searchTopNavigationBar(root: ParentNode = document): HTMLElement | null {
  return searchNavigationBars(root)[0] ?? null;
}

export function singlePageContentNodes(root: HTMLElement = document.body): Node[] {
  return Array.from(root.childNodes).filter(
    (node) => !(node instanceof Element && node.matches(SINGLE_PAGE_PERSISTENT_SELECTOR)),
  );
}

export function importSinglePageContent(doc: Document, baseUrl: string): Node[] {
  absolutizeDocumentUrls(doc, baseUrl);
  return Array.from(doc.body.childNodes, (node) => document.importNode(node, true));
}

export function singlePageNavigationLink(target: EventTarget | null): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;

  if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("data-ehpeek-single-page-bypass")) {
    return null;
  }

  return link;
}

export function singlePageSearchForm(target: EventTarget | null): HTMLFormElement | null {
  const form = target instanceof HTMLFormElement ? target : null;

  if (!form || (!form.matches("#searchbox form, #fsdiv form") && !form.querySelector("[name='f_search']"))) {
    return null;
  }

  return form;
}

export function resetTouchPageLayout(): void {
  document.documentElement.classList.remove(
    ...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "),
    ...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" "),
  );
  document.body.classList.remove(
    ...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "),
    ...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" "),
  );
}

export function preparePageViewportForFullscreen(): PageViewportSnapshot {
  const existing = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  const meta = existing ?? document.createElement("meta");
  const scale = Math.max(0.1, window.visualViewport?.scale ?? 1);
  const snapshot: PageViewportSnapshot = {
    content: existing?.getAttribute("content") ?? null,
    created: !existing,
    meta,
    scale,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };

  if (!existing) {
    meta.name = "viewport";
    document.head.append(meta);
  }

  meta.content = lockedViewportContent(snapshot.content, scale);
  return snapshot;
}

export async function restorePageViewport(snapshot: PageViewportSnapshot): Promise<void> {
  await nextAnimationFrame();

  if (snapshot.created) {
    snapshot.meta.remove();
  } else if (snapshot.content === null) {
    snapshot.meta.removeAttribute("content");
  } else {
    snapshot.meta.setAttribute("content", snapshot.content);
  }

  await nextAnimationFrame();
  await nextAnimationFrame();
  window.scrollTo(snapshot.scrollX, snapshot.scrollY);
}

function lockedViewportContent(content: string | null, scale: number): string {
  const preserved = (content ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(
      (item) =>
        item &&
        !/^(?:initial-scale|minimum-scale|maximum-scale|user-scalable|viewport-fit)\s*=/i.test(item),
    );
  const value = String(Math.round(scale * 1000) / 1000);
  return [
    ...preserved,
    `initial-scale=${value}`,
    `minimum-scale=${value}`,
    `maximum-scale=${value}`,
    "user-scalable=no",
    "viewport-fit=cover",
  ].join(", ");
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function absolutizeDocumentUrls(doc: Document, baseUrl: string): void {
  const attributes: Array<[string, string]> = [
    ["a[href]", "href"],
    ["area[href]", "href"],
    ["form[action]", "action"],
    ["img[src]", "src"],
    ["input[src]", "src"],
    ["script[src]", "src"],
    ["source[src]", "src"],
  ];

  for (const [selector, attribute] of attributes) {
    for (const element of Array.from(doc.querySelectorAll<HTMLElement>(selector))) {
      const value = element.getAttribute(attribute);

      if (!value || value.startsWith("#") || /^(?:data|javascript|mailto):/i.test(value)) {
        continue;
      }

      element.setAttribute(attribute, normalizeUrl(value, baseUrl));
    }
  }
}

export function readTouchSearchPanelInfo(root: ParentNode = document): TouchSearchPanelInfo | null {
  const searchInput = root.querySelector<HTMLInputElement>("#f_search, input[name='f_search']");
  const form = searchInput?.form ?? null;
  const standardSearchBox = searchInput?.closest<HTMLElement>("#searchbox") ?? null;
  const searchControls = document.createElement("div");
  const searchBox = standardSearchBox ?? searchControls;
  const categories = searchBox?.querySelector<HTMLTableElement>("form > table") ?? null;
  const advancedPanel = searchBox?.querySelector<HTMLElement>("#advdiv") ?? null;
  const optionLinksCandidate = advancedPanel?.previousElementSibling;
  const optionLinks = optionLinksCandidate instanceof HTMLElement ? optionLinksCandidate : null;
  const advancedToggle = optionLinks?.querySelector<HTMLAnchorElement>("a[onclick*='toggle_advsearch']") ?? null;
  const fileSearchToggle = optionLinks?.querySelector<HTMLAnchorElement>("a[onclick*='toggle_filesearch']") ?? null;
  const searchSubmit =
    form?.querySelector<HTMLInputElement | HTMLButtonElement>("input[name='f_apply'], button[name='f_apply']") ??
    searchInput?.parentElement?.querySelector<HTMLInputElement | HTMLButtonElement>(
      "input[type='submit'], button[type='submit']",
    );
  const clearButton =
    form?.querySelector<HTMLInputElement | HTMLButtonElement>("input[name='f_clear'], button[name='f_clear']") ??
    searchInput?.parentElement?.querySelector<HTMLInputElement | HTMLButtonElement>(
      "input[type='button'], button[type='button']",
    ) ?? null;

  if (
    !searchBox ||
    !form ||
    !searchInput ||
    !searchSubmit
  ) {
    return null;
  }

  const categoryToggleMount = categories && optionLinks ? document.createElement("span") : null;
  const advancedToggleMount = advancedToggle ? document.createElement("span") : null;
  const fileSearchToggleMount = fileSearchToggle ? document.createElement("span") : null;
  const searchActionMount = document.createElement("span");
  const clearActionMount = clearButton ? document.createElement("span") : null;
  if (categoryToggleMount) {
    categoryToggleMount.className = "contents";
  }
  if (advancedToggleMount) {
    advancedToggleMount.className = "contents";
  }
  if (fileSearchToggleMount) {
    fileSearchToggleMount.className = "contents";
  }
  searchActionMount.className = "contents";
  if (clearActionMount) {
    clearActionMount.className = "contents";
  }

  return {
    advancedPanel,
    advancedToggle,
    advancedToggleMount,
    categories,
    categoryToggleMount,
    clearActionMount,
    clearButton,
    clearLabel: clearButton ? searchActionLabel(clearButton) : null,
    fileSearch: root.querySelector<HTMLElement>("#fsdiv"),
    fileSearchToggle,
    fileSearchToggleMount,
    form,
    optionLinks,
    searchActionMount,
    searchBox,
    searchControls,
    searchInput,
    searchLabel: searchActionLabel(searchSubmit),
    searchSubmit,
  };
}

export function readSearchHistorySource(root: ParentNode = document): SearchHistorySource | null {
  const searchInput = root.querySelector<HTMLInputElement>("#f_search, input[name='f_search']");
  const searchSubmit =
    searchInput?.form?.querySelector<HTMLInputElement | HTMLButtonElement>("input[name='f_apply'], button[name='f_apply']") ??
    searchInput?.parentElement?.querySelector<HTMLInputElement | HTMLButtonElement>(
      "input[type='submit'], button[type='submit']",
    );

  return searchInput && searchSubmit ? { searchInput, searchSubmit } : null;
}

export function prepareTouchSearchPanel(info: TouchSearchPanelInfo, optionClassName: string): void {
  const form = info.form;
  const searchInput = info.searchInput;
  const advancedPanel = form?.querySelector<HTMLElement>("#advdiv");

  if (!info.searchBox.contains(form)) {
    form.id ||= "ehpeek-search-form";
    searchInput.setAttribute("form", form.id);
    info.searchSubmit.setAttribute("form", form.id);
    info.clearButton?.setAttribute("form", form.id);
  }

  info.searchBox.className =
    "box-border !w-full !m-0 !p-0 !border-0 !text-left !textsize-md " +
    "[&_.searchadv]:box-border [&_.searchadv]:!w-full [&_.searchadv]:!pt-md [&_.searchadv]:!textsize-md " +
    "[&_.searchadv>div]:!flex-wrap [&_.searchadv>div]:!justify-start [&_.searchadv>div]:!gap-sm " +
    "[&_.searchadv>div>div]:!p-sm";

  if (info.searchBox.contains(form)) {
    form.removeAttribute("style");
    form.className = "flex w-full flex-col gap-md m-0 p-0";
  }

  if (info.categories && info.optionLinks) {
    info.categories.className = "hidden !w-full !m-0 border-collapse";
    info.categories.hidden = true;
    info.optionLinks.insertAdjacentElement("afterend", info.categories);
    info.categories.tBodies[0]?.classList.add(
      "grid",
      "grid-cols-[repeat(auto-fit,minmax(140px,1fr))]",
      "gap-xs",
    );

    for (const row of Array.from(info.categories.rows)) {
      row.className = "contents";

      for (const cell of Array.from(row.cells)) {
        cell.className = "!p-0";
      }
    }

    for (const category of Array.from(info.categories.querySelectorAll<HTMLElement>("[id^='cat_']"))) {
      const colorClass = Array.from(category.classList).find((className) => /^ct(?:[1-9a])$/.test(className));
      category.className =
        `${colorClass ? `${colorClass} ` : ""}` +
        "flex box-border w-full min-w-0 !h-lg items-center justify-center px-md border rounded-md text-white text-center textsize-md font-700 leading-[1.15] whitespace-nowrap shadow-[0_2px_6px_var(--color-shadow-control)] cursor-pointer select-none transition-opacity [touch-action:manipulation] active:opacity-70 [&[data-disabled]]:opacity-40";
    }
  }

  info.searchControls.className =
    `${info.clearButton ? "grid-cols-[minmax(0,1fr)_60px_60px]" : "grid-cols-[minmax(0,1fr)_60px]"} ` +
    "grid w-full items-start gap-0 !p-0";

  if (searchInput) {
    searchInput.className =
      `appearance-none !box-border !w-full !h-60px min-w-0 col-span-full row-start-1 !m-0 !py-0 !pl-lg ${info.clearButton ? "!pr-[132px]" : "!pr-[72px]"} ` +
      "!border !border-[var(--color-site-border)] rounded-md !bg-[var(--color-site-elevated)] !text-[var(--color-site-text)] !text-[length:var(--font-size-md)] leading-[1.2] outline-none focus:(!border-[var(--color-site-accent)] !bg-[var(--color-site-elevated)] shadow-[0_0_0_3px_var(--color-site-accent-hover)])";
  }

  searchInput.before(info.searchControls);
  info.searchSubmit.replaceWith(info.searchActionMount);
  if (info.clearButton && info.clearActionMount) {
    info.clearButton.replaceWith(info.clearActionMount);
  }
  info.searchControls.append(searchInput);
  if (info.clearActionMount) {
    info.searchControls.append(info.clearActionMount);
  }
  info.searchControls.append(info.searchActionMount);
  if (info.optionLinks && info.categoryToggleMount) {
    info.optionLinks.prepend(info.categoryToggleMount);
  }
  if (info.advancedToggle && info.advancedToggleMount) {
    info.advancedToggle.replaceWith(info.advancedToggleMount);
  }
  if (info.fileSearchToggle && info.fileSearchToggleMount) {
    info.fileSearchToggle.replaceWith(info.fileSearchToggleMount);
  }
  if (info.optionLinks) {
    info.optionLinks.className = "flex w-full flex-wrap items-center justify-start gap-x-md gap-y-sm !p-0 !text-0";

    for (const link of Array.from(info.optionLinks.querySelectorAll<HTMLAnchorElement>("a"))) {
      link.className = optionClassName;
    }
  }

  if (advancedPanel) {
    advancedPanel.className = "box-border w-full !p-0 ehp-color-site-text";
  }

  if (info.fileSearch) {
    info.fileSearch.style.removeProperty("margin-top");
    info.fileSearch.className =
      "box-border !w-full !m-0 !mt-0 p-lg border ehp-color-site-border rounded-md bg-[var(--color-site-elevated)] ehp-color-site-text !textsize-md text-left " +
      "[&_form]:flex [&_form]:flex-col [&_form]:gap-sm [&_form>div]:!p-0 " +
      "[&_.searchadv>div]:!flex-wrap [&_.searchadv>div]:!justify-start [&_.searchadv>div]:!gap-sm [&_.searchadv>div>div]:!p-sm";
  }
}

function searchActionLabel(element: HTMLInputElement | HTMLButtonElement): string {
  return element instanceof HTMLInputElement ? element.value : element.textContent?.trim() ?? "";
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

export function replaceGalleryPageBarMounts(
  topClassName: string,
  bottomClassName: string,
): GalleryPageBarMount[] {
  const originals = Array.from(document.querySelectorAll<HTMLElement>(".ptt, .ptb"));
  const topSource = originals.find((item) => item.classList.contains("ptt")) ?? originals[0];
  const bottomSource = originals.find((item) => item.classList.contains("ptb")) ?? originals[1] ?? originals[0];
  const mounts: GalleryPageBarMount[] = [];
  const description = galleryPageDescription();
  const descriptionText = description?.textContent?.trim() || null;

  if (description) {
    description.hidden = true;
  }

  if (topSource) {
    mounts.push(replaceGalleryPageBarAt(topSource, true, topClassName, descriptionText));
  }

  if (bottomSource) {
    mounts.push(replaceGalleryPageBarAt(bottomSource, false, bottomClassName, descriptionText));
  }

  for (const original of originals) {
    original.hidden = true;
  }

  return mounts;
}

export function snapshotPreview(): PreviewSnapshot {
  return {
    description: galleryPageDescription()?.cloneNode(true) ?? null,
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
  const description = galleryPageDescription(doc);

  if (description) {
    replaceGalleryPageDescription(description);
  }

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

export function thumbsGrid(): HTMLElement | null {
  return document.querySelector<HTMLElement>("#gdt");
}

export function restorePreview(snapshot: PreviewSnapshot): void {
  const currentThumbs = document.querySelector("#gdt");

  if (snapshot.description) {
    replaceGalleryPageDescription(snapshot.description);
  }

  if (snapshot.thumbs && currentThumbs) {
    currentThumbs.replaceWith(snapshot.thumbs);
  }
}

export function settingsMenuMountTarget(): HTMLElement | null {
  const thumbnailContainer = document.querySelector("#gdt");
  const titleContainer = document.querySelector("#gd2, h1");
  const topNav = document.querySelector<HTMLElement>("#nb");
  const anchor = thumbnailContainer ?? titleContainer;

  if (topNav) {
    const item = document.createElement("div");
    topNav.append(item);
    return item;
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
  const hostname = window.location.hostname;
  document.documentElement.dataset.ehpeekSite =
    hostname.endsWith("exhentai.org") || hostname === EXHENTAI_ONION_HOST || hostname.endsWith(`.${EXHENTAI_ONION_HOST}`)
      ? "exhentai"
      : "e-hentai";
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
    item.details.style.display = expanded ? "" : "none";
  };

  for (const item of items) {
    if (item.trigger.dataset.ehpeekTouchCommentScore === "true") {
      continue;
    }

    item.trigger.dataset.ehpeekTouchCommentScore = "true";
    item.trigger.classList.add("whitespace-nowrap");
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

export function prepareTouchFavoritesPage(): TouchFavoritesCategorySelectInfo | null {
  document.documentElement.classList.add(...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "));
  document.body.classList.add(...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "));

  const page = document.querySelector<HTMLElement>(".ido");
  page?.style.removeProperty("min-width");
  page?.classList.add(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" "));
  const categories = document.querySelector<HTMLElement>(".ido > .nosel");
  const categorySelect = categories ? prepareTouchFavoritesCategorySelect(categories) : null;
  const searchForm = document.querySelector<HTMLInputElement>("input[name='f_search']")?.form;
  const searchContainer = searchForm?.parentElement;

  if (searchContainer instanceof HTMLElement) {
    searchContainer.style.removeProperty("width");
    searchContainer.classList.add("box-border", "!w-full", "!min-w-0", "!max-w-full");
  }

  for (const navigation of searchNavigationBars()) {
    navigation.classList.add(...TOUCH_FAVORITES_NAV_CLASS_NAME.split(" "));
  }

  const resultList = searchResultList();
  resultList?.classList.add(...TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME.split(" "));
  const allSelected = categorySelect?.categories[0]?.selected === true;
  const existingWrapper = resultList?.parentElement?.classList.contains("ehpeek-touch-favorites-results")
    ? resultList.parentElement
    : null;
  const content = existingWrapper?.parentElement ?? resultList?.parentElement;

  content?.classList.add(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" "));

  if (!resultList || existingWrapper) {
    return categorySelect;
  }

  const wrapper = document.createElement("div");
  wrapper.className = TOUCH_FAVORITES_RESULTS_CLASS_NAME;
  if (allSelected || window.innerWidth < 850) {
    wrapper.classList.add(...TOUCH_FAVORITES_ALL_RESULTS_CLASS_NAME.split(" "));
    compactTouchFavoritesResultList(resultList);
  }
  resultList.replaceWith(wrapper);
  wrapper.append(resultList);
  return categorySelect;
}

function compactTouchFavoritesResultList(resultList: HTMLElement): void {
  resultList.style.setProperty("table-layout", "auto", "important");
  resultList.style.setProperty("width", "100%", "important");

  for (const content of Array.from(resultList.querySelectorAll<HTMLElement>("tbody > tr > .gl2e"))) {
    content.style.setProperty("width", "auto", "important");
    content.style.overflowWrap = "anywhere";
  }

  for (const title of Array.from(resultList.querySelectorAll<HTMLElement>(".glink"))) {
    title.style.whiteSpace = "normal";
    title.style.overflowWrap = "anywhere";
  }

  for (const tags of Array.from(resultList.querySelectorAll<HTMLElement>(".gl4e table"))) {
    tags.style.setProperty("table-layout", "fixed", "important");
    tags.style.setProperty("width", "100%", "important");
    tags.style.setProperty("max-width", "100%", "important");
  }

  for (const cell of Array.from(resultList.querySelectorAll<HTMLElement>(".gl4e td"))) {
    cell.style.setProperty("min-width", "0", "important");
    cell.style.overflowWrap = "anywhere";
  }

  for (const namespace of Array.from(resultList.querySelectorAll<HTMLElement>(".gl4e td.tc"))) {
    namespace.style.setProperty("width", "4em", "important");
    namespace.style.whiteSpace = "nowrap";
  }

  for (const selection of Array.from(resultList.querySelectorAll<HTMLElement>("tbody > tr > .glfe"))) {
    selection.style.setProperty("width", "1%", "important");
    selection.style.whiteSpace = "nowrap";
  }
}

function prepareTouchFavoritesCategorySelect(container: HTMLElement): TouchFavoritesCategorySelectInfo | null {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(":scope > .fp, :scope > .fps"));

  if (nodes.length === 0) {
    return null;
  }

  const parsed = nodes.map((node) => {
    const children = Array.from(node.children);
    const countText = children[0]?.textContent?.trim() ?? "0";
    const label = children[children.length - 1]?.textContent?.trim() || node.textContent?.trim() || "";
    const count = Number(countText.replace(/,/g, ""));
    const indicator = node.querySelector<HTMLElement>(".i");
    const indicatorStyle = indicator ? window.getComputedStyle(indicator) : null;
    const href = node.getAttribute("onclick")?.match(/document\.location\s*=\s*['\"]([^'\"]+)['\"]/)?.[1] ?? "";

    return {
      appearance: indicatorStyle ? {
        backgroundImage: indicatorStyle.backgroundImage,
        backgroundPosition: indicatorStyle.backgroundPosition,
        backgroundSize: indicatorStyle.backgroundSize,
      } : null,
      count: Number.isFinite(count) ? count : 0,
      href: normalizeUrl(href, window.location.href),
      label,
      node,
      selected: node.classList.contains("fps"),
    };
  });
  const all = parsed.find((category) => category.node.children.length === 0);
  const favorites = parsed.filter((category) => category !== all);
  const total = favorites.reduce((sum, category) => sum + category.count, 0);
  container.hidden = true;

  return {
    categories: [
      ...(all ? [{ ...all, count: total, label: texts.favorites.all }] : []),
      ...favorites,
    ].map(({ appearance, count, href, label, selected }) => ({
      appearance,
      count,
      href,
      label,
      selected,
    })),
  };
}

export function prepareTouchSearchResultsPage(): void {
  document.documentElement.classList.add(...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" "));
  document.body.classList.add(...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" "));

  const resultList = searchResultList();
  resultList?.classList.add(...TOUCH_SEARCH_RESULT_LIST_CLASS_NAME.split(" "));
  const existingWrapper = resultList?.parentElement?.classList.contains("ehpeek-touch-search-results")
    ? resultList.parentElement
    : null;
  const content = existingWrapper?.parentElement ?? resultList?.parentElement;
  const pageContent = resultList?.closest<HTMLElement>(".ido");

  pageContent?.classList.add(...TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME.split(" "));
  content?.classList.add(...TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME.split(" "));

  if (!resultList || existingWrapper) {
    return;
  }

  const wrapper = document.createElement("div");
  wrapper.className = TOUCH_SEARCH_RESULTS_WRAPPER_CLASS_NAME;
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

export function insertTouchSearchPanel(panel: HTMLElement): boolean {
  const original =
    document.querySelector("#searchbox") ??
    document.querySelector<HTMLInputElement>("input[name='f_search']")?.form;

  if (!original?.parentElement) {
    return false;
  }

  original.before(panel);
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
    const element = child as HTMLElement;
    element.hidden = true;
    element.classList.add("!hidden");
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
    newTag: readGalleryNewTagInfo(),
    tagApi: readGalleryTagApiInfo(),
    summary,
    actions: readGalleryActionsDom(actionMenuItemClassName),
    rating: readGalleryRatingInfo(),
    tagGroups: readGalleryTagGroups(),
  };
}

function replaceGalleryPageBarAt(
  source: HTMLElement,
  top: boolean,
  className: string,
  descriptionText: string | null,
): GalleryPageBarMount {
  const existing = document.querySelector<HTMLDivElement>(`.${className}`);
  const descriptionElement = top
    ? document.querySelector<HTMLDivElement>("[data-ehpeek-gallery-page-description-mount]") ?? document.createElement("div")
    : null;

  if (descriptionElement) {
    descriptionElement.dataset.ehpeekGalleryPageDescriptionMount = "true";
  }

  if (existing) {
    if (descriptionElement) {
      existing.insertAdjacentElement("beforebegin", descriptionElement);
    }
    return { descriptionElement, descriptionText, element: existing, top };
  }

  const pageBar = document.createElement("div");
  source.insertAdjacentElement("afterend", pageBar);
  if (descriptionElement) {
    pageBar.insertAdjacentElement("beforebegin", descriptionElement);
  }
  return { descriptionElement, descriptionText, element: pageBar, top };
}

function replaceFirstElement(selector: string, doc: Document): void {
  const current = document.querySelector(selector);
  const incoming = doc.querySelector(selector);

  if (!current || !incoming) {
    return;
  }

  current.replaceWith(document.importNode(incoming, true));
}

function galleryPageDescription(root: ParentNode = document): HTMLElement | null {
  return root.querySelector<HTMLElement>(GALLERY_PAGE_DESCRIPTION_SELECTOR);
}

function replaceGalleryPageDescription(incoming: Node): void {
  const current = galleryPageDescription();

  if (!current) {
    return;
  }

  const staleDescriptions = Array.from(document.querySelectorAll(".gpc"));
  current.replaceWith(document.importNode(incoming, true));

  for (const description of staleDescriptions) {
    if (description !== current) {
      description.remove();
    }
  }
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
  const ratingImage = document.querySelector("#rating_image");
  const script = galleryRatingScript();
  const value = scriptNumberValue(script, "display_rating");

  if (!label || value === null) {
    return null;
  }

  return {
    count,
    label,
    rated: ["irb", "irg", "irr"].some((className) => ratingImage?.classList.contains(className)),
    value,
  };
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

export async function setGalleryRating(
  info: GalleryTagApiInfo,
  value: number,
): Promise<GalleryRatingResult> {
  const rating = Math.round(value * 2);

  if (rating < 1 || rating > 10) {
    throw new RangeError("Gallery rating must be between 0.5 and 5 stars.");
  }

  return updateGalleryRating(info, value);
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

export function readGalleryTagGroups(): GalleryTagGroup[] {
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
  const label = tag.textContent?.trim() || tag.getAttribute("ehs-tag")?.trim() || tag.title.trim();
  const name = galleryTagName(tag);

  if (!label || !name || !tag.href) {
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
    contentSource: tag,
    definitionHref: `https://ehwiki.org/wiki/${encodeURIComponent(name.replace(/^[a-z]+:\s*/i, ""))}`,
    href: tag.href,
    label,
    name,
  };
}

export function observeGalleryTagChanges(onChange: () => void): () => void {
  const tagList = document.querySelector<HTMLElement>("#taglist");

  if (!tagList) {
    return () => undefined;
  }

  const observer = new MutationObserver(onChange);
  observer.observe(tagList, { childList: true, subtree: true });
  return () => observer.disconnect();
}

export async function runGalleryTagAction(
  info: GalleryTagApiInfo,
  tag: GalleryTag,
  action: GalleryTagAction,
): Promise<void> {
  const tagPane = await updateGalleryTagVote(info, tag.name, action === "voteUp" ? 1 : -1);
  const tagList = document.querySelector<HTMLElement>("#taglist");

  if (!tagList) {
    throw new Error("Gallery tag list is unavailable.");
  }

  const template = document.createElement("template");
  template.innerHTML = tagPane;
  tagList.replaceChildren(...Array.from(template.content.childNodes));
}

export function prepareGalleryNewTag(info: GalleryNewTagInfo): void {
  info.container.hidden = false;
  info.container.style.removeProperty("display");
  addClassNames(info.container, "ehpeek-touch-gallery-new-tag box-border w-full pt-md");
  addClassNames(info.form, "flex w-full min-w-0 items-center gap-sm");
  addClassNames(info.field, "box-border min-w-0 flex-1 h-md px-md rounded-xs border ehp-color-site-border bg-[var(--color-site-surface)] ehp-color-site-text font-inherit textsize-md outline-none focus:border-[var(--color-site-accent)]");
  info.field.removeAttribute("size");
  addClassNames(info.button, "box-border flex-none h-md px-lg rounded-xs border border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-background)] font-inherit textsize-md font-700 cursor-pointer");

  if (document.querySelector("[data-ehpeek-single-page-app='true']")) {
    const action = new URL(window.location.href);
    action.hash = "";
    info.form.action = action.href;
    info.button.removeAttribute("onclick");
  }
}

export function focusGalleryNewTag(info: GalleryNewTagInfo): void {
  info.container.scrollIntoView({ block: "nearest" });
  info.field.focus();
}

function addClassNames(element: Element, classNames: string): void {
  element.classList.add(...classNames.split(" "));
}

function galleryTagName(tag: HTMLAnchorElement): string | null {
  try {
    const path = new URL(tag.href).pathname;
    const encodedName = path.match(/^\/tag\/(.+?)\/?$/i)?.[1];
    return encodedName ? decodeURIComponent(encodedName.replace(/\+/g, " ")) : null;
  } catch {
    return null;
  }
}

function readGalleryNewTagInfo(): GalleryNewTagInfo | null {
  const container = document.querySelector<HTMLElement>("#tagmenu_new");
  const form = container?.querySelector<HTMLFormElement>("form") ?? null;
  const field = container?.querySelector<HTMLInputElement>("#newtagfield") ?? null;
  const button = container?.querySelector<HTMLInputElement | HTMLButtonElement>("#newtagbutton") ?? null;

  if (!container || !form || !field || !button) {
    return null;
  }

  return {
    button,
    container,
    field,
    form,
  };
}

function readGalleryTagApiInfo(): GalleryTagApiInfo | null {
  const galleryMatch = window.location.pathname.match(/^\/g\/(\d+)\/([^/]+)/i);

  if (!galleryMatch) {
    return null;
  }

  const expectedGalleryId = Number(galleryMatch[1]);
  const expectedToken = galleryMatch[2];
  const script = Array.from(document.scripts)
    .map((item) => item.textContent ?? "")
    .find(
      (text) =>
        text.includes("var api_url") &&
        text.includes("var apikey") &&
        scriptNumberValue(text, "gid") === expectedGalleryId &&
        scriptStringValue(text, "token") === expectedToken,
    );

  if (!script) {
    return null;
  }

  const apiUrl = scriptStringValue(script, "api_url");
  const apiKey = scriptStringValue(script, "apikey");
  const token = scriptStringValue(script, "token");
  const galleryId = scriptNumberValue(script, "gid");
  const apiUid = scriptNumberValue(script, "apiuid");

  if (!apiUrl || !apiKey || !token || galleryId === null || apiUid === null) {
    return null;
  }

  return {
    apiKey,
    apiUid,
    apiUrl,
    galleryId,
    token,
  };
}

function scriptStringValue(script: string, name: string): string | null {
  const match = script.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`));
  return match?.[2] ?? null;
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

function numericAttribute(element: Element | null, attribute: string): number | null {
  const value = Number(element?.getAttribute(attribute) || "");
  return Number.isFinite(value) && value > 0 ? value : null;
}
