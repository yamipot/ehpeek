import type { LoadedReaderPage, ReaderPage } from "../components/Reader";
import texts from "../texts.json";
import { normalizeUrl, requestText } from "../utils";
import * as dom from "./dom";

export type PreviewSnapshot = dom.PreviewSnapshot;

export type PageType =
  | {
      type: "gallery";
      url: string;
      galleryId: number;
      token: string;
      previewIndex: number;
      peekPage: number | null;
    }
  | {
      type: "image";
      url: string;
      galleryId: number;
      pageNum: number;
    }
  | {
      type: "search";
      url: string;
    }
  | {
      type: "other";
      url: string;
    };

export function extractPageType(url = window.location.href): PageType {
  try {
    const parsed = new URL(url, window.location.href);
    const galleryMatch = parsed.pathname.match(/^\/g\/(\d+)\/([^/]+)\/?$/i);

    if (galleryMatch) {
      const galleryId = Number(galleryMatch[1]);

      if (Number.isFinite(galleryId) && galleryId > 0) {
        return {
          type: "gallery",
          url: parsed.href,
          galleryId,
          token: galleryMatch[2],
          previewIndex: previewPageIndex(parsed.href),
          peekPage: peekPageFromHash(parsed.hash),
        };
      }
    }

    const imageMatch = parsed.pathname.match(/^\/s\/[^/]+\/(\d+)-(\d+)\/?$/i);

    if (imageMatch) {
      const galleryId = Number(imageMatch[1]);
      const pageNum = Number(imageMatch[2]);

      if (Number.isFinite(galleryId) && galleryId > 0 && Number.isFinite(pageNum) && pageNum > 0) {
        return {
          type: "image",
          url: parsed.href,
          galleryId,
          pageNum,
        };
      }
    }

    if (parsed.pathname === "/" || parsed.pathname.startsWith("/tag/") || parsed.pathname === "/watched") {
      return {
        type: "search",
        url: parsed.href,
      };
    }

    return {
      type: "other",
      url: parsed.href,
    };
  } catch {
    return {
      type: "other",
      url,
    };
  }
}

export function galleryPageNumber(url: string): number | undefined {
  const page = extractPageType(url);
  return page.type === "image" ? page.pageNum : undefined;
}

export function previewPageIndexFromUrl(url: string, pageUrl = window.location.href): number | null {
  try {
    const parsed = new URL(url, pageUrl);
    const current = new URL(pageUrl);

    if (parsed.origin !== current.origin || parsed.pathname !== current.pathname) {
      return null;
    }

    const value = Number(parsed.searchParams.get("p") || "0");
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function previewPageIndex(url = window.location.href): number {
  try {
    const value = Number(new URL(url).searchParams.get("p") || "0");
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function previewUrlForIndex(previewIndex: number, pageUrl = window.location.href): string {
  const url = new URL(pageUrl);

  if (previewIndex <= 0) {
    url.searchParams.delete("p");
  } else {
    url.searchParams.set("p", String(previewIndex));
  }

  url.hash = "";
  return url.href;
}

export function previewPageIndexForGalleryPage(galleryPage: number, pageSize: number, maxPreviewIndex: number | null): number {
  const previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize));
  return maxPreviewIndex === null ? previewIndex : Math.min(previewIndex, maxPreviewIndex);
}

export function peekPageFromHash(hash = window.location.hash): number | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const page = Number(params.get("peek_page") || "");

  return Number.isFinite(page) && page > 0 ? page : null;
}

export function updatePeekLocation(pageNumber: number | undefined, pageSize: number, maxPreviewIndex: number | null): void {
  if (!pageNumber || pageNumber <= 0) {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nextValue = String(pageNumber);
  const nextPreviewIndex = previewPageIndexForGalleryPage(pageNumber, pageSize, maxPreviewIndex);
  let changed = false;

  if (nextPreviewIndex === 0) {
    if (url.searchParams.has("p")) {
      url.searchParams.delete("p");
      changed = true;
    }
  } else if (url.searchParams.get("p") !== String(nextPreviewIndex)) {
    url.searchParams.set("p", String(nextPreviewIndex));
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

export function collectGalleryPages(root: ParentNode = document, baseUrl = window.location.href): ReaderPage[] {
  return dom.collectGalleryPages(extractPageType, root, baseUrl);
}

export function readShowingRange(root: ParentNode = document): { start: number; end: number; total: number } | null {
  return dom.readShowingRange(root);
}

export function searchPageNavigation(root: ParentNode = document): { previousUrl: string | null; nextUrl: string | null } | null {
  return dom.searchPageNavigation(root);
}

export function searchResultList(root: ParentNode = document): HTMLElement | null {
  return dom.searchResultList(root);
}

export function findSearchNavigationLink(target: EventTarget | null): HTMLAnchorElement | null {
  return dom.findSearchNavigationLink(target);
}

export async function replaceSearchPageContentFromUrl(url: string): Promise<HTMLElement> {
  const html = await requestText(url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const list = dom.replaceSearchPageContent(doc);

  if (!list) {
    throw new Error(texts.errors.searchPageContentNotFound);
  }

  return list;
}

export function computePreviewPageSize(root: ParentNode = document): number {
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

export function maxPreviewPageIndex(root: ParentNode = document, baseUrl = window.location.href): number | null {
  return dom.maxPreviewPageIndex(root, baseUrl);
}

export async function pullPreviewPage(index: number, landingIndex: number, landingPages: ReaderPage[]): Promise<ReaderPage[]> {
  if (index === landingIndex) {
    return landingPages;
  }

  const previewUrl = previewUrlForIndex(index);
  const html = await requestText(previewUrl);
  const doc = new DOMParser().parseFromString(html, "text/html");
  return collectGalleryPages(doc, previewUrl);
}

export function findClickedImageLink(target: EventTarget | null): HTMLAnchorElement | null {
  return dom.findClickedImageLink(target, extractPageType);
}

export async function loadEhImagePage(page: ReaderPage): Promise<LoadedReaderPage> {
  const html = await requestText(page.url);
  const doc = new DOMParser().parseFromString(html, "text/html");
  const image = doc.querySelector<HTMLImageElement>("img#img");
  const imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "";
  const imageUrl = imageSrc ? normalizeUrl(imageSrc, page.url) : "";

  if (!imageUrl) {
    throw new Error(texts.errors.imageNotFound);
  }

  return {
    imageUrl,
    width: numericAttribute(image, "width"),
    height: numericAttribute(image, "height"),
  };
}

export function replaceGalleryPageBar(currentIndex: number, maxIndex: number | null): void {
  dom.replaceGalleryPageBar({
    currentIndex,
    maxIndex,
    previewUrlForIndex,
  });
}

export function snapshotPreview(): PreviewSnapshot {
  return dom.snapshotPreview();
}

export function installPreviewPlaceholder(): void {
  dom.installPreviewPlaceholder();
}

export function replacePreviewContent(doc: Document, baseUrl: string): void {
  dom.replacePreviewContent(doc);
  replaceGalleryPageBar(previewPageIndexFromUrl(baseUrl) ?? previewPageIndex(), maxPreviewPageIndex(doc, baseUrl));
}

export function prepareThumbsGridSwipeTargets(thumbs: HTMLElement): void {
  dom.prepareThumbsGridSwipeTargets(thumbs);
}

export function restorePreview(snapshot: unknown): void {
  dom.restorePreview(snapshot as PreviewSnapshot);
}

export function mountSettingsMenu(settingsMenu: Parameters<typeof dom.mountSettingsMenu>[0]): boolean {
  return dom.mountSettingsMenu(settingsMenu);
}

export function settingsMenuTriggerTagName(): "a" | "button" {
  return dom.settingsMenuTriggerTagName();
}

export function mountGalleryContinueReadingButton(button: HTMLButtonElement): void {
  dom.mountGalleryContinueReadingButton(button);
}

function numericAttribute(element: Element | null, attribute: string): number | null {
  const value = Number(element?.getAttribute(attribute) || "");
  return Number.isFinite(value) && value > 0 ? value : null;
}
