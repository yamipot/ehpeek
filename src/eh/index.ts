import type { LoadedReaderPage, ReaderPage } from "../readerTypes";
import texts from "../texts.json";
import * as dom from "./dom";
import { requestPage } from "./request";

export { requestPage, updateGalleryFavorite, type PageRequestOptions, type PageResponse } from "./request";

export {
  applySiteTheme,
  applyTouchGalleryPanelPageStyle,
  findSearchNavigationLink,
  galleryContinueReadingButtonMountTarget,
  insertTouchGalleryPanel,
  insertTouchSearchPanel,
  insertTouchTopBar,
  maxPreviewPageIndex,
  prepareTouchGalleryComments,
  prepareTouchFavoritesPage,
  prepareTouchSearchResultsPage,
  prepareThumbsGridSwipeTargets,
  preparePageViewportForFullscreen,
  parseGalleryFavoriteOptions,
  readGalleryInfo,
  readShowingRange,
  readSearchHistorySource,
  readTouchSearchPanelInfo,
  readTouchTopBarInfo,
  prepareTouchSearchPanel,
  replaceGalleryPageBarMounts,
  restorePreview,
  restorePageViewport,
  searchPageNavigation,
  searchResultList,
  searchTopNavigationBar,
  singlePageContentNodes,
  importSinglePageContent,
  resetTouchPageLayout,
  singlePageNavigationLink,
  singlePageSearchForm,
  setGalleryRating,
  settingsMenuMountTarget,
  showPreviewPlaceholder,
  snapshotPreview,
  thumbsGrid,
} from "./dom";

export type {
  GalleryFavoriteInfo,
  GalleryFavoriteOption,
  GalleryInfo,
  GalleryTag,
  GalleryTagGroup,
  SearchHistorySource,
  TouchSearchPanelInfo,
  TouchTopBarInfo,
} from "./dom";

export type PreviewSnapshot = dom.PreviewSnapshot;
export type PageViewportSnapshot = dom.PageViewportSnapshot;

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
      type: "favorites";
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

    if (parsed.pathname === "/favorites.php") {
      return {
        type: "favorites",
        url: parsed.href,
      };
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

export function singlePageRoute(url: string): PageType | null {
  const page = extractPageType(url);

  if (page.type === "search" || page.type === "favorites") {
    return page;
  }

  if (page.type !== "gallery") {
    return null;
  }

  try {
    const parsed = new URL(url, window.location.href);
    let unsupportedParameter = false;
    parsed.searchParams.forEach((_value, key) => {
      unsupportedParameter ||= key !== "p";
    });
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    let unsupportedHash = false;
    hash.forEach((_value, key) => {
      unsupportedHash ||= key !== "peek_page";
    });
    return unsupportedParameter || unsupportedHash ? null : page;
  } catch {
    return null;
  }
}

export function galleryPageNumber(url: string): number | undefined {
  const page = extractPageType(url);
  return page.type === "image" ? page.pageNum : undefined;
}

export function imageGalleryPage(root: ParentNode = document): Extract<PageType, { type: "gallery" }> | null {
  const url = dom.imageGalleryUrl(root);

  if (!url) {
    return null;
  }

  const page = extractPageType(url);
  return page.type === "gallery" ? page : null;
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

export async function replaceSearchPageContentFromUrl(url: string): Promise<HTMLElement> {
  const response = await requestPage(url);
  const list = dom.replaceSearchPageContent(response.document);

  if (!list) {
    throw new Error(texts.errors.searchPageContentNotFound);
  }

  return list;
}

export function computePreviewPageSize(root: ParentNode = document): number {
  const range = dom.readShowingRange(root);

  if (!range) {
    throw new Error(texts.errors.previewPageSizeUnknown);
  }

  const currentPageCount = range.end - range.start + 1;

  if (range.end < range.total) {
    return currentPageCount;
  }

  const lastPreviewIndex = dom.maxPreviewPageIndex(root);

  if (lastPreviewIndex === null || lastPreviewIndex <= 0) {
    return currentPageCount;
  }

  const fullPageCount = (range.total - currentPageCount) / lastPreviewIndex;

  if (!Number.isInteger(fullPageCount) || fullPageCount <= 0) {
    throw new Error(texts.errors.previewPageSizeUnknown);
  }

  return fullPageCount;
}

export async function pullPreviewPage(index: number): Promise<ReaderPage[]> {
  const previewUrl = previewUrlForIndex(index);
  const response = await requestPage(previewUrl);
  return collectGalleryPages(response.document, previewUrl);
}

export function findClickedImageLink(target: EventTarget | null): HTMLAnchorElement | null {
  return dom.findClickedImageLink(target, extractPageType);
}

export async function loadEhImagePage(page: ReaderPage): Promise<LoadedReaderPage> {
  const response = await requestPage(page.url);
  const info = dom.readImagePageInfo(response.document, page.url);

  if (!info.imageUrl) {
    throw new Error(texts.errors.imageNotFound);
  }

  return info;
}

export function replacePreviewContent(doc: Document): void {
  dom.replacePreviewContent(doc);
}
