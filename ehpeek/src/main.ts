import { openFullscreenViewer, type LoadedViewerPage, type ViewerPage } from "./viewer";
import texts from "./texts.json";

const REQUEST_TIMEOUT_MS = 30000;

function normalizeUrl(url: string, baseUrl = window.location.href): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return "";
  }
}

function isImagePageUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.href);
    return /^\/s\/[^/]+\/\d+-\d+\/?$/i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function imageAspectRatio(image: HTMLImageElement | null): number {
  const width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || "");
  const height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");

  return width > 0 && height > 0 ? height / width : 1.42;
}

function galleryPageNumber(url: string): number | undefined {
  try {
    const parsed = new URL(url, window.location.href);
    const match = parsed.pathname.match(/\/(\d+)-(\d+)\/?$/);
    const pageNumber = Number(match?.[2] || "");

    return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : undefined;
  } catch {
    return undefined;
  }
}

function peekPageFromHash(): number | null {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const page = Number(params.get("peek_page") || "");

  return Number.isFinite(page) && page > 0 ? page : null;
}

function updatePeekLocation(pageNumber: number | undefined, pageSize: number): void {
  if (!pageNumber || pageNumber <= 0) {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nextValue = String(pageNumber);
  const previewIndex = previewPageIndexForGalleryPage(pageNumber, pageSize);
  let changed = false;

  if (previewIndex === 0) {
    if (url.searchParams.has("p")) {
      url.searchParams.delete("p");
      changed = true;
    }
  } else if (url.searchParams.get("p") !== String(previewIndex)) {
    url.searchParams.set("p", String(previewIndex));
    changed = true;
  }

  if (params.get("peek_page") !== nextValue) {
    params.set("peek_page", nextValue);
    changed = true;
  }

  if (!changed) {
    return;
  }

  url.hash = params.toString();
  window.history.replaceState(window.history.state, "", url.href);
}

function collectGalleryPages(root: ParentNode = document, baseUrl = window.location.href): ViewerPage[] {
  const links = Array.from(
    root.querySelectorAll<HTMLAnchorElement>("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']"),
  );
  const seen = new Set<string>();
  const pages: ViewerPage[] = [];

  for (const link of links) {
    const url = normalizeUrl(link.getAttribute("href") || "", baseUrl);

    if (!url || !isImagePageUrl(url) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    pages.push({
      url,
      aspectRatio: imageAspectRatio(link.querySelector("img")),
      displayNumber: galleryPageNumber(url),
    });
  }

  return pages;
}

function previewPageIndex(): number {
  const value = Number(new URL(window.location.href).searchParams.get("p") || "0");
  return Number.isFinite(value) && value >= 0 ? value : 0;
}

// The gallery's "Showing A - B of C images" line describes the current preview page.
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

// Number of thumbnails per preview page, derived from the "Showing A - B of C" line.
function computePreviewPageSize(root: ParentNode = document): number {
  const range = readShowingRange(root);

  if (!range) {
    return 40;
  }

  const { start, end, total } = range;
  const currentPageCount = end - start + 1;

  // Single preview page: everything is on it, so the size only needs to exceed the total.
  if (start === 1 && end >= total) {
    return Math.max(1, total);
  }

  // Last preview page: back the full-page size out of the pages that come before it.
  if (end >= total) {
    const previewIndex = previewPageIndex();

    if (previewIndex > 0) {
      return Math.max(1, Math.round((total - currentPageCount) / previewIndex));
    }
  }

  // Any non-last preview page is full, so its own count is the page size.
  return Math.max(1, currentPageCount);
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

function previewUrlForIndex(previewIndex: number): string {
  const url = new URL(window.location.href);

  if (previewIndex <= 0) {
    url.searchParams.delete("p");
  } else {
    url.searchParams.set("p", String(previewIndex));
  }

  url.hash = "";
  return url.href;
}

function previewPageIndexForGalleryPage(galleryPage: number, pageSize: number): number {
  const previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize));
  const maxPreviewIndex = maxPreviewPageIndex();

  return maxPreviewIndex === null ? previewIndex : Math.min(previewIndex, maxPreviewIndex);
}

// Collect the image pages of a single preview page. `landingIndex`/`landingPages` capture the
// preview page shown in the document at open time, since the URL's `p` is rewritten while reading.
async function collectPreviewPage(index: number, landingIndex: number, landingPages: ViewerPage[]): Promise<ViewerPage[]> {
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

async function requestText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    window.clearTimeout(timeout);
  }
}

function firstImagePageHref(doc: Document, selectors: string[], baseUrl: string): string | null {
  for (const selector of selectors) {
    const link = doc.querySelector<HTMLAnchorElement>(selector);
    const href = link ? normalizeUrl(link.getAttribute("href") || "", baseUrl) : "";

    if (href && isImagePageUrl(href)) {
      return href;
    }
  }

  return null;
}

function numericAttribute(element: Element | null, attribute: string): number | null {
  const value = Number(element?.getAttribute(attribute) || "");
  return Number.isFinite(value) && value > 0 ? value : null;
}

async function loadEhImagePage(page: ViewerPage): Promise<LoadedViewerPage> {
  const html = await requestText(page.url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const image = doc.querySelector<HTMLImageElement>("img#img");
  const imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "";
  const imageUrl = imageSrc ? normalizeUrl(imageSrc, page.url) : "";

  if (!imageUrl) {
    throw new Error(texts.errors.imageNotFound);
  }

  const imageLink = image?.closest<HTMLAnchorElement>("a[href]") ?? null;
  const imageLinkUrl =
    imageLink instanceof HTMLAnchorElement ? normalizeUrl(imageLink.getAttribute("href") || "", page.url) : null;
  const nextPageUrl =
    firstImagePageHref(doc, ["a#next[href]", "#i3 a[href*='/s/']"], page.url) ||
    (imageLinkUrl && isImagePageUrl(imageLinkUrl) ? imageLinkUrl : null) ||
    firstImagePageHref(doc, ["a[href*='/s/']"], page.url);
  const width = numericAttribute(image, "width");
  const height = numericAttribute(image, "height");

  return {
    imageUrl,
    width,
    height,
    nextPage:
      nextPageUrl && nextPageUrl !== page.url
        ? {
            url: nextPageUrl,
            aspectRatio: width && height ? height / width : page.aspectRatio,
            displayNumber: galleryPageNumber(nextPageUrl),
          }
        : null,
  };
}

async function openReader(startPageUrl: string): Promise<void> {
  const landingIndex = previewPageIndex();
  const landingPages = collectGalleryPages();
  const pageSize = computePreviewPageSize();
  const startUrl = normalizeUrl(startPageUrl);
  const hashPage = peekPageFromHash();
  const targetIndex = hashPage !== null ? previewPageIndexForGalleryPage(hashPage, pageSize) : landingIndex;
  const pages = await collectPreviewPage(targetIndex, landingIndex, landingPages);
  let startIndex =
    hashPage !== null ? pages.findIndex((page) => page.displayNumber === hashPage) : pages.findIndex((page) => page.url === startUrl);

  if (startIndex < 0) {
    startIndex = 0;
    pages.unshift({ url: startUrl, aspectRatio: 1.42, displayNumber: galleryPageNumber(startUrl) });
  }

  let lastDisplayNumber = hashPage ?? galleryPageNumber(startUrl);

  openFullscreenViewer({
    pages,
    startIndex,
    keepBehind: 5,
    renderAhead: 10,
    preloadAhead: 10,
    nearConcurrentLoads: 3,
    farConcurrentLoads: 6,
    loadPage: loadEhImagePage,
    loadBefore: async (firstPage) => {
      const firstNumber = firstPage.displayNumber;

      if (!firstNumber || firstNumber <= 1) {
        return [];
      }

      const previousIndex = previewPageIndexForGalleryPage(firstNumber, pageSize) - 1;

      if (previousIndex < 0) {
        return [];
      }

      return collectPreviewPage(previousIndex, landingIndex, landingPages);
    },
    loadAfter: async (lastPage) => {
      const lastNumber = lastPage.displayNumber;

      if (!lastNumber) {
        return [];
      }

      const nextIndex = previewPageIndexForGalleryPage(lastNumber, pageSize) + 1;
      const maxIndex = maxPreviewPageIndex();

      if (maxIndex !== null && nextIndex > maxIndex) {
        return [];
      }

      return collectPreviewPage(nextIndex, landingIndex, landingPages);
    },
    onActivePageChange: (page) => {
      if (page.displayNumber) {
        lastDisplayNumber = page.displayNumber;
      }

      updatePeekLocation(page.displayNumber, pageSize);
    },
    onExit: () => {
      const exitIndex = lastDisplayNumber ? previewPageIndexForGalleryPage(lastDisplayNumber, pageSize) : landingIndex;
      const galleryUrl = previewUrlForIndex(exitIndex);

      // If the page underneath already shows this preview page, keep it (just fix the URL);
      // otherwise navigate the gallery to the preview page the reader ended on.
      if (exitIndex === landingIndex) {
        window.history.replaceState(window.history.state, "", galleryUrl);
      } else {
        window.location.replace(galleryUrl);
      }
    },
  });
}

function onDocumentClick(event: MouseEvent): void {
  const link = findClickedImageLink(event.target);

  if (!link) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  void openReader(link.href);
}

async function openReaderFromHash(): Promise<void> {
  const peekPage = peekPageFromHash();

  if (peekPage === null) {
    return;
  }

  const pages = collectGalleryPages();
  const page = pages.find((item) => item.displayNumber === peekPage) ?? pages[0];

  if (page) {
    await openReader(page.url);
  }
}

if (/^\/g\/\d+\/[^/]+\/?$/i.test(window.location.pathname)) {
  document.addEventListener("click", onDocumentClick, true);
  void openReaderFromHash();
}
