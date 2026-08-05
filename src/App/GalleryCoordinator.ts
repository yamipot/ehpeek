import type { Accessor } from "solid-js";
import type { ThumbsGridsActions } from "../components/Enhance/EnhanceThumbsGrids";
import type { ScrollPreviewActions } from "../components/Enhance/ScrollPreview";
import type { ReaderActions } from "../components/Reader";
import * as eh from "../eh";
import type { ReaderPage } from "../readerTypes";
import {
  loadReadHistory,
  ReadingProgressSession,
  recordGalleryVisit,
  type ReadingProgress,
  updateReadHistoryGalleryInfo,
} from "../state/readHistory";
import texts from "../texts.json";
import type { GalleryPreviewCache } from "./GalleryPreviewCache";
import type { OverlayHost } from "./OverlayHost";
import {
  mountReaderSurface,
  openOriginalReader,
  reportReaderOpenError,
  type ReaderSurface,
} from "./Reader";

type OverlaySurface = "preview" | "reader";

type OverlayHistoryState = {
  depth: number;
  sessionId: string;
  surface: OverlaySurface;
};

export type GalleryCoordinator = {
  attachPreview: (actions: ScrollPreviewActions) => void;
  attachReader: (actions: ReaderActions | null) => void;
  attachThumbs: (actions: ThumbsGridsActions) => void;
  dispose: () => void;
  openFromReadButton: () => void;
  openGalleryPage: (pageUrl: string, preferredPageNum?: number) => void;
  openOriginalPage: (page: ReaderPage) => void;
  openPreviewIndex: (previewIndex: number) => void;
  openPreviewPage: (pageNum: number) => void;
  openReaderFromHash: () => Promise<void>;
  progress: Accessor<ReadingProgress>;
  readerActivePageChanged: (page: ReaderPage) => void;
  requestClosePreview: (previewIndex: number) => void;
  requestCloseReader: () => boolean;
  selectPreviewPage: (pageUrl: string, pageNum: number) => void;
  toggleReaderFullscreen: () => void;
};

export function createGalleryCoordinator(options: {
  enhanceThumbsGridsEnabled: boolean;
  exitReaderOnFullscreenExit: boolean;
  includeUnreadHistoryEnabled: boolean;
  overlayHost: OverlayHost;
  previewCache: GalleryPreviewCache;
  readHistoryEnabled: boolean;
  readerEnabled: boolean;
  readerFullscreenEnabled: boolean;
  replacePreviewWithScroll: boolean;
}): GalleryCoordinator {
  const previewCache = options.previewCache;
  const preview = previewCache.current().data;
  const gallery = eh.galleryIdentityFromUrl(preview.currentUrl);
  if (!gallery) {
    throw new Error("Cannot identify Gallery for Reader.");
  }

  const progress = createProgressSession(
    gallery.galleryId,
    gallery.token,
    preview.totalImages,
    options.readHistoryEnabled,
    options.includeUnreadHistoryEnabled,
  );
  const historySessionId = crypto.randomUUID();
  const surfaces: OverlaySurface[] = [];
  let reader: ReaderSurface | null = null;
  let readerActions: ReaderActions | null = null;
  let readerInitialPage = 1;
  let readerInitialPreviewIndex = preview.currentIndex;
  let readerLastPage = 1;
  let previewActions: ScrollPreviewActions | null = null;
  let thumbsActions: ThumbsGridsActions | null = null;
  let afterHistoryClose: (() => void) | null = null;
  let historyClosePending = false;
  let preserveSurfacesOnFullscreenExit = false;
  let fullscreenWasActive = options.overlayHost.fullscreen.active();

  const topSurface = (): OverlaySurface | undefined => surfaces[surfaces.length - 1];
  const previewOpen = (): boolean => topSurface() === "preview";
  const enhancedPreviewActive = (): boolean =>
    options.enhanceThumbsGridsEnabled ||
    options.replacePreviewWithScroll ||
    previewOpen();

  const pushSurface = (surface: OverlaySurface): void => {
    surfaces.push(surface);
    const currentState = window.history.state;
    window.history.pushState({
      ...(currentState !== null && typeof currentState === "object" ? currentState : {}),
      ehpeekOverlay: {
        depth: surfaces.length,
        sessionId: historySessionId,
        surface,
      } satisfies OverlayHistoryState,
    }, "", window.location.href);
  };

  const exitFullscreen = async (): Promise<boolean> => {
    preserveSurfacesOnFullscreenExit = true;
    try {
      await options.overlayHost.fullscreen.exit();
      return true;
    } catch (error) {
      console.warn("[ehpeek] Failed to exit fullscreen", error);
      return false;
    } finally {
      preserveSurfacesOnFullscreenExit = false;
    }
  };

  const closePreview = (): void => {
    if (!previewOpen()) {
      return;
    }
    surfaces.pop();
    previewActions?.close();
  };

  const syncReaderExit = (): void => {
    progress.flush();
    eh.clearPeekLocation();
    if (readerLastPage === readerInitialPage) {
      return;
    }

    const exitIndex = previewCache.previewIndexForPage(readerLastPage);
    const galleryUrl = eh.previewUrlForIndex(exitIndex);
    if (enhancedPreviewActive()) {
      gotoPreviewIndex(exitIndex);
      void previewCache.select(exitIndex).catch(() => {
        window.location.replace(galleryUrl);
      });
    } else if (exitIndex === readerInitialPreviewIndex) {
      window.history.replaceState(window.history.state, "", galleryUrl);
    } else {
      window.location.replace(galleryUrl);
    }
  };

  const closeReader = async (): Promise<void> => {
    const activeReader = reader;
    if (!activeReader) {
      return;
    }
    reader = null;
    const index = surfaces.lastIndexOf("reader");
    if (index >= 0) {
      surfaces.splice(index, 1);
    }
    await exitFullscreen();
    activeReader.dispose();
    syncReaderExit();
  };

  const reconcileHistory = async (event: PopStateEvent): Promise<void> => {
    const marker = overlayHistoryState(event.state);
    const depth = marker?.sessionId === historySessionId ? marker.depth : 0;
    while (surfaces.length > depth) {
      if (topSurface() === "preview") {
        closePreview();
      } else {
        await closeReader();
      }
    }
    const afterClose = afterHistoryClose;
    afterHistoryClose = null;
    historyClosePending = false;
    afterClose?.();
  };

  const onPopState = (event: PopStateEvent): void => {
    void reconcileHistory(event);
  };
  window.addEventListener("popstate", onPopState);

  const stopFullscreen = options.overlayHost.fullscreen.subscribe((active) => {
    reader?.setFullscreenActive(active);
    if (
      fullscreenWasActive &&
      !active &&
      !preserveSurfacesOnFullscreenExit &&
      options.exitReaderOnFullscreenExit &&
      reader
    ) {
      window.history.go(-surfaces.length);
    }
    fullscreenWasActive = active;
  });

  const gotoPreviewIndex = (previewIndex: number): void => {
    if (previewOpen()) {
      previewActions?.gotoPreview(previewIndex);
    } else {
      thumbsActions?.gotoPreview(previewIndex);
    }
  };

  const activePageChanged = (page: ReaderPage): void => {
    if (page.pageNum) {
      readerLastPage = page.pageNum;
      if (enhancedPreviewActive()) {
        gotoPreviewIndex(previewCache.previewIndexForPage(page.pageNum));
      }
    }
    progress.update(page.pageNum, preview.totalImages);
    eh.updatePeekLocation(page.pageNum, preview.pageSize, preview.maxIndex);
  };

  const requestClose = (surface: OverlaySurface, afterClose?: () => void): void => {
    if (historyClosePending || topSurface() !== surface) {
      return;
    }
    historyClosePending = true;
    afterHistoryClose = afterClose ?? null;
    if (surface === "reader") {
      eh.clearPeekLocation();
    }
    window.history.back();
  };

  const requestReaderClose = (): boolean => {
    if (!reader || topSurface() !== "reader") {
      return false;
    }
    eh.clearPeekLocation();
    void closeReader();
    window.history.back();
    return true;
  };

  const toggleFullscreen = (): void => {
    const request = options.overlayHost.fullscreen.active()
      ? exitFullscreen().then(() => undefined)
      : options.overlayHost.fullscreen.enter();
    void request.catch((error: unknown) => {
      console.warn("[ehpeek] Fullscreen request failed", error);
    });
  };

  const openOriginalPage = (page: ReaderPage): void => {
    void (async () => {
      if (!await exitFullscreen()) {
        return;
      }
      progress.flush();
      window.location.assign(page.url);
    })();
  };

  const mountReader = (startPageNum: number): void => {
    const current = previewCache.current().data;
    readerInitialPage = startPageNum;
    readerLastPage = startPageNum;
    readerInitialPreviewIndex = current.currentIndex;
    pushSurface("reader");
    try {
      reader = mountReaderSurface({
        coordinator,
        options: {
          galleryId: gallery.galleryId,
          galleryToken: gallery.token,
          initialPageNum: startPageNum,
          totalPages: current.totalImages,
        },
        overlayHost: options.overlayHost,
        previewCache,
      });
    } catch (error) {
      surfaces.pop();
      window.history.back();
      throw error;
    }
  };

  const openReader = async (
    startPageUrl: string,
    preferredPageNum?: number,
    requestConfiguredFullscreen = false,
  ): Promise<void> => {
    if (!options.readerEnabled) {
      if (preferredPageNum !== undefined) {
        await openOriginalReader(preferredPageNum, previewCache);
      }
      return;
    }
    if (reader) {
      if (preferredPageNum !== undefined) {
        readerActions?.gotoPage(preferredPageNum);
      }
      return;
    }

    const startPageNum = preferredPageNum ??
      eh.peekPageFromHash() ??
      eh.galleryPageNumber(startPageUrl);
    if (!startPageNum) {
      throw new Error(texts.errors.imageNotFound);
    }

    const fullscreenResult = requestConfiguredFullscreen &&
        options.readerFullscreenEnabled &&
        !document.fullscreenElement &&
        document.fullscreenEnabled &&
        typeof options.overlayHost.element.requestFullscreen === "function"
      ? options.overlayHost.fullscreen.enter().then(
        () => true,
        (error: unknown) => {
          console.warn("[ehpeek] Fullscreen request failed", error);
          return false;
        },
      )
      : null;
    const enteredFullscreen = await fullscreenResult;
    if (enteredFullscreen && !options.overlayHost.fullscreen.active()) {
      await options.overlayHost.fullscreen.restore();
      return;
    }
    try {
      mountReader(startPageNum);
    } catch (error) {
      if (enteredFullscreen) {
        await exitFullscreen();
      }
      throw error;
    }
  };

  function openPreviewPage(pageNum: number): void {
    if (!previewOpen()) {
      pushSurface("preview");
    }
    previewActions?.gotoPage(pageNum);
  }

  const openPreviewIndex = (previewIndex: number): void => {
    if (!previewOpen()) {
      pushSurface("preview");
    }
    previewActions?.gotoPreview(previewIndex);
  };

  const coordinator: GalleryCoordinator = {
    attachPreview: (actions: ScrollPreviewActions) => {
      previewActions = actions;
    },
    attachReader: (actions: ReaderActions | null) => {
      readerActions = actions;
    },
    attachThumbs: (actions: ThumbsGridsActions) => {
      thumbsActions = actions;
    },
    dispose: () => {
      progress.dispose();
      reader?.dispose();
      reader = null;
      readerActions = null;
      previewActions?.close();
      window.removeEventListener("popstate", onPopState);
      stopFullscreen();
    },
    openFromReadButton: () => {
      const pageNum = options.readHistoryEnabled
        ? progress.progress().currentPage
        : 1;
      const firstPage = previewCache.current().data.pages[0];
      if (firstPage) {
        void openReader(firstPage.url, pageNum, true).catch(reportReaderOpenError);
      }
    },
    openGalleryPage: (
      pageUrl: string,
      preferredPageNum?: number,
    ) => {
      void openReader(pageUrl, preferredPageNum, true).catch(reportReaderOpenError);
    },
    openPreviewIndex,
    openPreviewPage,
    openReaderFromHash: async () => {
      const pageNum = eh.peekPageFromHash();
      if (pageNum === null) {
        return;
      }
      const current = previewCache.current().data;
      const page = current.pages.find((item) => item.pageNum === pageNum) ?? current.pages[0];
      if (page) {
        await openReader(page.url, pageNum).catch(reportReaderOpenError);
      }
    },
    openOriginalPage,
    readerActivePageChanged: activePageChanged,
    progress: progress.progress as Accessor<ReadingProgress>,
    requestClosePreview: (previewIndex: number) => {
      requestClose("preview", () => syncPreviewExit(previewIndex));
    },
    requestCloseReader: requestReaderClose,
    selectPreviewPage: (pageUrl: string, pageNum: number) => {
      requestClose("preview", () => {
        void openReader(pageUrl, pageNum, true).catch(reportReaderOpenError);
      });
    },
    toggleReaderFullscreen: toggleFullscreen,
  };
  return coordinator;

  function syncPreviewExit(previewIndex: number): void {
    if (previewIndex === previewCache.current().data.currentIndex) {
      return;
    }
    if (options.enhanceThumbsGridsEnabled || options.replacePreviewWithScroll) {
      void previewCache.select(previewIndex).catch(reportReaderOpenError);
    } else {
      window.location.assign(
        eh.previewUrlForIndex(previewIndex, previewCache.current().data.currentUrl),
      );
    }
  }
}

function createProgressSession(
  galleryId: number,
  token: string,
  totalPages: number,
  enabled: boolean,
  includeUnread: boolean,
): ReadingProgressSession {
  if (!enabled) {
    return new ReadingProgressSession(null, {
      currentPage: 1,
      hasHistory: false,
      totalPages,
    });
  }

  const existing = loadReadHistory(galleryId, token);
  const galleryInfo = eh.extractGalleryHistoryInfo();
  let record = existing;
  if (includeUnread) {
    record = recordGalleryVisit(galleryId, token, totalPages, galleryInfo);
  } else if (existing) {
    record = updateReadHistoryGalleryInfo(galleryId, token, galleryInfo);
  }
  return new ReadingProgressSession({
    gallery: galleryInfo,
    galleryId,
    token,
    totalPages,
  }, {
    currentPage: record?.pageNum && record.pageNum > 0 ? record.pageNum : 1,
    hasHistory: Boolean(record && record.pageNum > 0),
    totalPages: record?.totalPages ?? totalPages,
  });
}

function overlayHistoryState(value: unknown): OverlayHistoryState | null {
  if (value === null || typeof value !== "object") {
    return null;
  }
  const marker = (value as { ehpeekOverlay?: unknown }).ehpeekOverlay;
  if (
    marker === null ||
    typeof marker !== "object" ||
    typeof (marker as { depth?: unknown }).depth !== "number" ||
    typeof (marker as { sessionId?: unknown }).sessionId !== "string"
  ) {
    return null;
  }
  return marker as OverlayHistoryState;
}
