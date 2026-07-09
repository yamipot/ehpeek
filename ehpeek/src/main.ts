import { openFullscreenReader, type LoadedReaderPage, type ReaderPage } from "./components/Reader";
import { SettingsMenu } from "./components/SettingsMenu";
import {
  createBetterPageBar,
  enhanceGalleryThumbsEnabled,
  GalleryPageProvider,
  galleryPageNumber,
  installGalleryThumbEnhancement,
  navigateGalleryPreview,
  peekPageFromHash,
  previewPageIndex,
  previewPageIndexFromUrl,
  previewUrlForIndex,
  requestText,
  toggleEnhanceGalleryThumbs,
  updatePeekLocation,
} from "./components/EnhanceGallery";
import texts from "./texts.json";
import { state } from "./state";
import { normalizeUrl } from "./utils";

const BETTER_PAGE_BAR_TOP_CLASS = "ehpeek-better-page-bar-top";
const BETTER_PAGE_BAR_BOTTOM_CLASS = "ehpeek-better-page-bar-bottom";
const PREVIEW_PLACEHOLDER_CLASS = "ehpeek-preview-placeholder";
const READER_WINDOW_SIZE = 10;

type PreviewSnapshot = {
  description: Node | null;
  thumbs: Node | null;
};

let menuCommandId: number | string | null = null;
let settingsMenu: SettingsMenu | null = null;

function updateReaderEnabled(enabled: boolean): void {
  state.reader.enabled.set(enabled);
  settingsMenu?.update();
  registerUserscriptMenu();
}

function toggleReader(): void {
  updateReaderEnabled(!state.reader.enabled.value);
}

function registerUserscriptMenu(): void {
  if (typeof GM_registerMenuCommand !== "function") {
    return;
  }

  if (menuCommandId !== null && typeof GM_unregisterMenuCommand === "function") {
    GM_unregisterMenuCommand(menuCommandId);
    menuCommandId = null;
  }

  menuCommandId = GM_registerMenuCommand(
    texts.settings.openSettings,
    openSettingsMenu,
  );
}

function isImagePageUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href);
    return /^\/s\/[^/]+\/\d+-\d+\/?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function toggleEnhanceGalleryThumbsSetting(): void {
  toggleEnhanceGalleryThumbs();
  settingsMenu?.update();
}

function settingsMenuState() {
  return {
    readerEnabled: state.reader.enabled.value,
    enhanceGalleryThumbsEnabled: enhanceGalleryThumbsEnabled(),
  };
}

function imageAspectRatio(image: HTMLImageElement | null): number {
  const width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || "");
  const height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");

  return width > 0 && height > 0 ? height / width : 1.42;
}

function collectGalleryPages(root: ParentNode = document, baseUrl = window.location.href): ReaderPage[] {
  const links = Array.from(
    root.querySelectorAll<HTMLAnchorElement>("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']"),
  );
  const seen = new Set<string>();
  const pages: ReaderPage[] = [];

  for (const link of links) {
    const url = normalizeUrl(link.getAttribute("href") || "", baseUrl);

    if (!url || !isImagePageUrl(url) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    pages.push({
      url,
      aspectRatio: imageAspectRatio(link.querySelector("img")),
      pageNum: galleryPageNumber(url),
    });
  }

  return pages.sort((left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER));
}

function readShowingRange(root: ParentNode = document): { start: number; end: number; total: number } | null {
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

function computePreviewPageSize(root: ParentNode = document): number {
  const range = readShowingRange(root);

  if (!range) {
    throw new Error(texts.errors.previewPageSizeUnknown);
  }

  const currentPageCount = range.end - range.start + 1;

  if (range.end < range.total) {
    return currentPageCount;
  }

  const lastPreviewIndex = maxPreviewPageIndex(root);

  if (lastPreviewIndex === null || lastPreviewIndex <= 0) {
    return currentPageCount;
  }

  const fullPageCount = (range.total - currentPageCount) / lastPreviewIndex;

  if (!Number.isInteger(fullPageCount) || fullPageCount <= 0) {
    throw new Error(texts.errors.previewPageSizeUnknown);
  }

  return fullPageCount;
}

function maxPreviewPageIndex(root: ParentNode = document, baseUrl = window.location.href): number | null {
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

async function collectPreviewPage(index: number, landingIndex: number, landingPages: ReaderPage[]): Promise<ReaderPage[]> {
  if (index === landingIndex) {
    return landingPages;
  }

  const previewUrl = previewUrlForIndex(index);
  const html = await requestText(previewUrl);
  const doc = new DOMParser().parseFromString(html, "text/html");
  return collectGalleryPages(doc, previewUrl);
}

function findClickedImageLink(target: EventTarget | null): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;

  if (!(link instanceof HTMLAnchorElement) || !isImagePageUrl(link.href)) {
    return null;
  }

  if (link.querySelector("img") || link.closest("#gdt, .gdtm, .gdtl")) {
    return link;
  }

  return null;
}

function numericAttribute(element: Element | null, attribute: string): number | null {
  const value = Number(element?.getAttribute(attribute) || "");
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function loadEhImagePage(page: ReaderPage): Promise<LoadedReaderPage> {
  const html = await requestText(page.url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const image = doc.querySelector<HTMLImageElement>("img#img");
  const imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "";
  const imageUrl = imageSrc ? normalizeUrl(imageSrc, page.url) : "";

  if (!imageUrl) {
    throw new Error(texts.errors.imageNotFound);
  }

  const width = numericAttribute(image, "width");
  const height = numericAttribute(image, "height");

  return {
    imageUrl,
    width,
    height,
  };
}

async function openReader(startPageUrl: string): Promise<void> {
  const landingIndex = previewPageIndex();
  const landingPages = collectGalleryPages();
  const pageSize = computePreviewPageSize();
  const maxPreviewIndex = maxPreviewPageIndex();
  const provider = new GalleryPageProvider(
    landingIndex,
    landingPages,
    pageSize,
    maxPreviewIndex,
    READER_WINDOW_SIZE,
    collectPreviewPage,
  );
  const startUrl = normalizeUrl(startPageUrl);
  const hashPage = peekPageFromHash();

  const startPageNum = hashPage ?? galleryPageNumber(startUrl);
  let pages = startPageNum ? await provider.loadDisplayPages(provider.displayWindowAround(startPageNum)) : landingPages;
  let startIndex =
    hashPage !== null ? pages.findIndex((page) => page.pageNum === hashPage) : pages.findIndex((page) => page.url === startUrl);

  if (startIndex < 0) {
    startIndex = 0;
    pages = [{ url: startUrl, aspectRatio: 1.42, pageNum: galleryPageNumber(startUrl) }, ...pages].sort(
      (left, right) => (left.pageNum ?? 0) - (right.pageNum ?? 0),
    );
    startIndex = pages.findIndex((page) => page.url === startUrl);
  }

  let lastPageNum = hashPage ?? galleryPageNumber(startUrl);

  openFullscreenReader({
    pages,
    startIndex,
    renderWindowSize: READER_WINDOW_SIZE,
    preloadWindowSize: READER_WINDOW_SIZE,
    nearConcurrentLoads: 3,
    farConcurrentLoads: 6,
    totalPages: readShowingRange()?.total,
    loadPage: loadEhImagePage,
    loadPages: (pageNums) => provider.loadDisplayPages(pageNums),
    onActivePageChange: (page) => {
      if (page.pageNum) {
        lastPageNum = page.pageNum;
        renderPageBars(provider.previewIndexForPage(page.pageNum), maxPreviewIndex);
      }

      updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
    },
    onExit: () => {
      const exitIndex = lastPageNum ? provider.previewIndexForPage(lastPageNum) : landingIndex;
      const galleryUrl = previewUrlForIndex(exitIndex);
      renderPageBars(exitIndex, maxPreviewIndex);

      if (enhanceGalleryThumbsEnabled()) {
        void navigateGalleryPreview(galleryUrl, "replace").catch(() => {
          window.location.replace(galleryUrl);
        });
        return;
      }

      // If the page underneath already shows this preview page, keep it (just fix the URL);
      // otherwise navigate the gallery to the preview page the reader ended on.
      if (exitIndex === landingIndex) {
        window.history.replaceState(window.history.state, "", galleryUrl);
      } else {
        window.location.replace(galleryUrl);
      }
    },
    onDisableReader: () => updateReaderEnabled(false),
  });
}

function reportOpenError(error: unknown): void {
  const message = error instanceof Error ? error.message : texts.errors.loadFailed;
  console.error("[ehpeek]", error);
  window.alert(message);
}

function renderPageBars(currentIndex: number, maxIndex: number | null): void {
  const originals = Array.from(document.querySelectorAll<HTMLElement>(".ptt, .ptb"));
  const topSource = originals.find((item) => item.classList.contains("ptt")) ?? originals[0];
  const bottomSource = originals.find((item) => item.classList.contains("ptb")) ?? originals[1] ?? originals[0];

  if (topSource) {
    renderPageBarAt(topSource, true, currentIndex, maxIndex);
  }

  if (bottomSource) {
    renderPageBarAt(bottomSource, false, currentIndex, maxIndex);
  }

  for (const original of originals) {
    original.hidden = true;
  }
}

function renderPageBarAt(source: HTMLElement, top: boolean, currentIndex: number, maxIndex: number | null): void {
  const className = top ? BETTER_PAGE_BAR_TOP_CLASS : BETTER_PAGE_BAR_BOTTOM_CLASS;
  const existing = document.querySelector<HTMLElement>(`.${className}`);
  const pageBar = createBetterPageBar({
    currentIndex,
    maxIndex,
    top,
    previewUrlForIndex,
  });

  if (existing) {
    existing.replaceWith(pageBar);
  } else {
    source.insertAdjacentElement("afterend", pageBar);
  }
}

function snapshotPreview(): PreviewSnapshot {
  return {
    description: document.querySelector(".gpc")?.cloneNode(true) ?? null,
    thumbs: document.querySelector("#gdt")?.cloneNode(true) ?? null,
  };
}

function installPreviewPlaceholder(): void {
  const current = document.querySelector<HTMLElement>("#gdt");

  if (!current) {
    return;
  }

  const rect = current.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.id = "gdt";
  placeholder.className = PREVIEW_PLACEHOLDER_CLASS;
  placeholder.style.minHeight = `${Math.max(160, Math.round(rect.height))}px`;
  placeholder.setAttribute("aria-busy", "true");
  current.replaceWith(placeholder);
}

function replacePreviewContent(doc: Document, baseUrl: string): void {
  replaceFirstElement(".gpc", doc);
  replaceFirstElement("#gdt", doc);
  renderPageBars(previewPageIndexFromUrl(baseUrl) ?? previewPageIndex(), maxPreviewPageIndex(doc, baseUrl));
}

function replaceFirstElement(selector: string, doc: Document): void {
  const current = document.querySelector(selector);
  const incoming = doc.querySelector(selector);

  if (!current || !incoming) {
    return;
  }

  current.replaceWith(document.importNode(incoming, true));
}

function restorePreview(snapshot: unknown): void {
  const preview = snapshot as PreviewSnapshot;
  const currentDescription = document.querySelector(".gpc");
  const currentThumbs = document.querySelector("#gdt");

  if (preview.description && currentDescription) {
    currentDescription.replaceWith(preview.description);
  }

  if (preview.thumbs && currentThumbs) {
    currentThumbs.replaceWith(preview.thumbs);
  }
}

function openSettingsMenu(): void {
  installSettingsMenu();
  settingsMenu?.open();
}

function installSettingsMenu(): void {
  if (settingsMenu) {
    settingsMenu.update();
    return;
  }

  const thumbnailContainer = document.querySelector("#gdt");
  const titleContainer = document.querySelector("#gd2, h1");
  const topNav = document.querySelector("#nb");
  const anchor = thumbnailContainer ?? titleContainer;

  if (!topNav && !anchor?.parentElement) {
    return;
  }

  settingsMenu = new SettingsMenu(topNav ? "a" : "button", settingsMenuState, {
    onReaderToggle: toggleReader,
    onEnhanceGalleryThumbsToggle: toggleEnhanceGalleryThumbsSetting,
  });

  if (topNav) {
    settingsMenu.mount(topNav);
  } else {
    const wrapper = document.createElement("div");
    wrapper.style.textAlign = "right";

    if (thumbnailContainer) {
      anchor?.parentElement?.insertBefore(wrapper, anchor);
    } else {
      anchor?.insertAdjacentElement("afterend", wrapper);
    }

    settingsMenu.mount(wrapper);
  }
}

function onDocumentClick(event: MouseEvent): void {
  if (!state.reader.enabled.value) {
    return;
  }

  const link = findClickedImageLink(event.target);

  if (!link) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  void openReader(link.href).catch(reportOpenError);
}

async function openReaderFromHash(): Promise<void> {
  const peekPage = peekPageFromHash();

  if (peekPage === null) {
    return;
  }

  const pages = collectGalleryPages();
  const page = pages.find((item) => item.pageNum === peekPage) ?? pages[0];

  if (page) {
    await openReader(page.url).catch(reportOpenError);
  }
}

registerUserscriptMenu();

if (/^\/g\/\d+\/[^/]+\/?$/i.test(window.location.pathname)) {
  installSettingsMenu();
  installGalleryThumbEnhancement({
    currentPreviewIndex: () => previewPageIndex(),
    maxPreviewIndex: () => maxPreviewPageIndex(),
    previewUrlForIndex,
    previewIndexFromUrl: (url) => previewPageIndexFromUrl(url),
    renderPageBars,
    snapshotPreview,
    installPreviewPlaceholder,
    replacePreviewContent,
    restorePreview,
    onError: reportOpenError,
  });
  document.addEventListener("click", onDocumentClick, true);
  if (state.reader.enabled.value) {
    void openReaderFromHash();
  }
}
