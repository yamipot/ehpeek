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

function updatePeekPageHash(pageNumber: number | undefined): void {
  if (!pageNumber || pageNumber <= 0) {
    return;
  }

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nextValue = String(pageNumber);

  if (params.get("peek_page") === nextValue) {
    return;
  }

  params.set("peek_page", nextValue);
  const nextUrl = `${window.location.pathname}${window.location.search}#${params.toString()}`;
  window.history.replaceState(window.history.state, "", nextUrl);
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

function previewPageSize(pages: ViewerPage[]): number {
  const displayNumbers = pages
    .map((page) => page.displayNumber)
    .filter((value): value is number => typeof value === "number")
    .sort((left, right) => left - right);

  if (displayNumbers.length === 0) {
    return 40;
  }

  const currentPreviewIndex = previewPageIndex();
  const firstDisplayNumber = displayNumbers[0];

  if (currentPreviewIndex > 0 && firstDisplayNumber > 1) {
    return Math.max(1, Math.round((firstDisplayNumber - 1) / currentPreviewIndex));
  }

  return Math.max(1, displayNumbers[displayNumbers.length - 1] - firstDisplayNumber + 1);
}

function previewUrlForGalleryPage(galleryPage: number, currentPages: ViewerPage[]): string {
  const url = new URL(window.location.href);
  const pageSize = previewPageSize(currentPages);
  const previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize));

  if (previewIndex === 0) {
    url.searchParams.delete("p");
  } else {
    url.searchParams.set("p", String(previewIndex));
  }

  url.hash = "";
  return url.href;
}

async function loadPreviewPageForGalleryPage(galleryPage: number, currentPages: ViewerPage[]): Promise<ViewerPage[]> {
  const previewUrl = previewUrlForGalleryPage(galleryPage, currentPages);

  if (previewUrl === normalizeUrl(window.location.pathname + window.location.search)) {
    return currentPages;
  }

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
  let pages = collectGalleryPages();
  const startUrl = normalizeUrl(startPageUrl);
  const hashPage = peekPageFromHash();
  let startIndex =
    hashPage !== null ? pages.findIndex((page) => page.displayNumber === hashPage) : pages.findIndex((page) => page.url === startUrl);

  if (hashPage !== null && startIndex < 0) {
    pages = await loadPreviewPageForGalleryPage(hashPage, pages);
    startIndex = pages.findIndex((page) => page.displayNumber === hashPage);
  }

  if (startIndex < 0) {
    startIndex = 0;
    pages.unshift({ url: startUrl, aspectRatio: 1.42, displayNumber: galleryPageNumber(startUrl) });
  }

  openFullscreenViewer({
    pages,
    startIndex,
    keepBehind: 5,
    renderAhead: 10,
    preloadAhead: 10,
    nearConcurrentLoads: 3,
    farConcurrentLoads: 6,
    loadPage: loadEhImagePage,
    onActivePageChange: (page) => {
      updatePeekPageHash(page.displayNumber);
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
