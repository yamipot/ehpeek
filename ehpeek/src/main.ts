import { openFullscreenViewer, type LoadedViewerPage, type ViewerPage } from "./viewer";

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

function collectGalleryPages(): ViewerPage[] {
  const links = Array.from(
    document.querySelectorAll<HTMLAnchorElement>("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']"),
  );
  const seen = new Set<string>();
  const pages: ViewerPage[] = [];

  for (const link of links) {
    const url = normalizeUrl(link.href);

    if (!url || !isImagePageUrl(url) || seen.has(url)) {
      continue;
    }

    seen.add(url);
    pages.push({
      url,
      aspectRatio: imageAspectRatio(link.querySelector("img")),
    });
  }

  return pages;
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
    throw new Error("image not found");
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
          }
        : null,
  };
}

function openReader(startPageUrl: string): void {
  const pages = collectGalleryPages();
  const startUrl = normalizeUrl(startPageUrl);
  let startIndex = pages.findIndex((page) => page.url === startUrl);

  if (startIndex < 0) {
    startIndex = 0;
    pages.unshift({ url: startUrl, aspectRatio: 1.42 });
  }

  openFullscreenViewer({
    pages,
    startIndex,
    keepBehind: 5,
    renderAhead: 10,
    preloadAhead: 10,
    maxConcurrentLoads: 3,
    loadPage: loadEhImagePage,
  });
}

function onDocumentClick(event: MouseEvent): void {
  const link = findClickedImageLink(event.target);

  if (!link) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  openReader(link.href);
}

if (/^\/g\/\d+\/[^/]+\/?$/i.test(window.location.pathname)) {
  document.addEventListener("click", onDocumentClick, true);
}
