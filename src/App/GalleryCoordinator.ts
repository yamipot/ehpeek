import type { Accessor } from "solid-js";
import type { ThumbsGridsActions } from "../components/Enhance/EnhanceThumbsGrids";
import type { ScrollPreviewActions } from "../components/Enhance/ScrollPreview";
import type { ReaderActions } from "../components/Reader";
import * as eh from "../eh";
import type { ReaderPage } from "../readerTypes";
import {
  type GalleryReadHistory,
} from "../state/readHistory";
import texts from "../i18n";
import {
  ReadingProgressSession,
  type ReadingProgress,
} from "./ReadingProgressSession";
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
  readerEndReached: () => void;
  requestClosePreview: (previewIndex: number) => void;
  requestCloseReader: () => boolean;
  selectPreviewPage: (pageUrl: string, pageNum: number) => void;
  toggleReaderFullscreen: () => void;
};

export function createGalleryCoordinator(options: {
  enhanceThumbsGridsEnabled: boolean;
  exitReaderOnFullscreenExit: boolean;
  includeReaderPageInUrl: boolean;
  includeUnreadHistoryEnabled: boolean;
  overlayHost: OverlayHost;
  previewCache: GalleryPreviewCache;
  readHistory: GalleryReadHistory | null;
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
    options.readHistory,
    options.includeUnreadHistoryEnabled,
  );
  const historySessionId = crypto.randomUUID();
  const surfaces: OverlaySurface[] = [];
  let reader: ReaderSurface | null = null;
  let readerActions: ReaderActions | null = null;
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

  const replaceReaderLocation = (pageNumber: number): void => {
    if (pageNumber <= 0 || !options.includeReaderPageInUrl) {
      return;
    }

    let url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    url = new URL(eh.previewUrlForIndex(
      previewCache.previewIndexForPage(pageNumber),
      url.href,
    ));
    hashParams.set("peek_page", String(pageNumber));
    url.hash = hashParams.toString();

    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url.href);
    }
  };

  const replacePreviewLocation = (previewIndex: number): void => {
    if (options.replacePreviewWithScroll) {
      return;
    }

    const url = new URL(eh.previewUrlForIndex(previewIndex));

    if (url.href !== window.location.href) {
      window.history.replaceState(window.history.state, "", url.href);
    }
  };

  const clearReaderLocation = (): void => {
    if (!/(?:^#|&)peek_page(?:=|&|$)/.test(window.location.hash)) {
      return;
    }

    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    hashParams.delete("peek_page");
    url.hash = hashParams.toString();
    window.history.replaceState(window.history.state, "", url.href);
  };

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
    clearReaderLocation();
    const exitIndex = previewCache.previewIndexForPage(readerLastPage);
    if (enhancedPreviewActive()) {
      gotoPreviewIndex(exitIndex);
      if (exitIndex !== previewCache.current().data.currentIndex) {
        void previewCache.select(exitIndex).catch(reportReaderOpenError);
      }
      if (surfaces.length === 0) {
        replacePreviewLocation(exitIndex);
      }
      return;
    }
    if (exitIndex !== readerInitialPreviewIndex) {
      window.location.replace(eh.previewUrlForIndex(exitIndex));
    } else {
      replacePreviewLocation(exitIndex);
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
    // Stop Reader work before fullscreen resize can trigger another layout or load cycle.
    activeReader.dispose();
    await exitFullscreen();
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
    const closeReaderAfterFullscreenExit =
      fullscreenWasActive &&
      !active &&
      !preserveSurfacesOnFullscreenExit &&
      options.exitReaderOnFullscreenExit &&
      reader !== null;
    if (closeReaderAfterFullscreenExit) {
      // Release the nested Preview's scroll lock before Reader's while leaving
      // the history stack for popstate to reconcile.
      if (previewOpen()) {
        previewActions?.close();
      }
      // Stop Reader immediately instead of letting the fullscreen resize run before popstate closes it.
      reader?.dispose();
      clearReaderLocation();
      window.history.go(-surfaces.length);
    } else {
      reader?.setFullscreenActive(active);
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
    if (page.pageNum) {
      replaceReaderLocation(page.pageNum);
    }
  };

  const requestClose = (surface: OverlaySurface, afterClose?: () => void): void => {
    if (historyClosePending || topSurface() !== surface) {
      return;
    }
    historyClosePending = true;
    afterHistoryClose = afterClose ?? null;
    if (surface === "reader") {
      clearReaderLocation();
    }
    window.history.back();
  };

  const requestReaderClose = (): boolean => {
    if (!reader || topSurface() !== "reader") {
      return false;
    }
    requestClose("reader");
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
      const pageNum = options.readHistory
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
    readerEndReached: () => {
      progress.update(preview.totalImages, preview.totalImages);
    },
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
    if (options.enhanceThumbsGridsEnabled || options.replacePreviewWithScroll) {
      if (previewIndex !== previewCache.current().data.currentIndex) {
        void previewCache.select(previewIndex).catch(reportReaderOpenError);
      }
      replacePreviewLocation(previewIndex);
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
  history: GalleryReadHistory | null,
  includeUnread: boolean,
): ReadingProgressSession {
  if (!history) {
    return new ReadingProgressSession(null, {
      currentPage: 1,
      hasHistory: false,
      totalPages,
    });
  }

  const existing = history.value;
  const galleryInfo = eh.extractGalleryHistoryInfo();
  if (includeUnread) {
    history.recordVisit(totalPages, galleryInfo);
  } else if (existing) {
    history.updateGalleryInfo(galleryInfo);
  }
  return new ReadingProgressSession({
    history,
    record: {
      gallery: galleryInfo,
      galleryId,
      token,
      totalPages,
    },
  }, {
    currentPage: existing?.pageNum && existing.pageNum > 0 ? existing.pageNum : 1,
    hasHistory: Boolean(existing && existing.pageNum > 0),
    totalPages: existing?.totalPages ?? totalPages,
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
