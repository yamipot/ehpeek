import {
  Reader,
  type ReaderCallbacks as ReaderComponentCallbacks,
  type ReaderOptions,
} from "../components/Reader";
import { ReadHistorySession } from "../state/readHistory";
import * as eh from "../eh";
import { state } from "../state";
import texts from "../texts.json";
import { render } from "solid-js/web";
import { createSignal } from "solid-js";
import type { GalleryPreviewCache } from "./GalleryPreviewCache";
import type { ReaderFullscreenController, ReaderViewport } from "./viewport";

type ReaderFullscreenLaunch = {
  fullscreen: ReaderFullscreenController;
  host: HTMLDivElement;
  result: Promise<boolean>;
};

export type ReaderCallbacks = {
  enhanceThumbsGridsEnabled: boolean;
  readHistoryEnabled: boolean;
  onGotoPreviewIndex: (previewIndex: number) => void;
  onReaderClosed: (currentPage: number, totalPages: number | null) => void;
};

let activeReaderClose: (() => void) | undefined;

export function openReaderFromUserAction(
  startPageUrl: string,
  callbacks: ReaderCallbacks,
  previewCache: GalleryPreviewCache,
  viewport: ReaderViewport,
  preferredPageNum?: number,
): void {
  const fullscreenLaunch = requestConfiguredFullscreen(viewport);
  void openReader(
    startPageUrl,
    callbacks,
    previewCache,
    viewport,
    preferredPageNum,
    fullscreenLaunch,
  ).catch(async (error: unknown) => {
    if (fullscreenLaunch) {
      const fullscreenEntered = await fullscreenLaunch.result;
      if (document.fullscreenElement === fullscreenLaunch.host) {
        await document.exitFullscreen().catch((fullscreenError: unknown) => {
          console.warn("[ehpeek] Failed to exit fullscreen", fullscreenError);
        });
      }
      if (fullscreenEntered) {
        await fullscreenLaunch.fullscreen.exit();
      }
      fullscreenLaunch.host.remove();
      await fullscreenLaunch.fullscreen.restore();
    }
    reportReaderOpenError(error);
  });
}

export async function openReaderFromHash(
  callbacks: ReaderCallbacks,
  previewCache: GalleryPreviewCache,
  viewport: ReaderViewport,
): Promise<void> {
  const peekPage = eh.peekPageFromHash();

  if (peekPage === null) {
    return;
  }

  const preview = previewCache.current();
  const pages = preview.data.pages;
  const page = pages.find((item) => item.pageNum === peekPage) ?? pages[0];

  if (page) {
    await openReader(page.url, callbacks, previewCache, viewport).catch(
      reportReaderOpenError,
    );
  }
}

export async function openOriginalReader(
  pageNum: number,
  previewCache: GalleryPreviewCache,
): Promise<void> {
  const page = (await previewCache.getPages([pageNum]))[0];

  if (!page || page.pageNum !== pageNum) {
    throw new Error(texts.errors.imageNotFound);
  }

  window.location.assign(page.url);
}

async function openReader(
  startPageUrl: string,
  callbacks: ReaderCallbacks,
  previewCache: GalleryPreviewCache,
  viewport: ReaderViewport,
  preferredPageNum?: number,
  fullscreenLaunch?: ReaderFullscreenLaunch,
): Promise<void> {
  if (!state.reader.enabled.value) {
    return;
  }

  const preview = previewCache.current().data;
  const gallery = eh.galleryIdentityFromUrl(preview.currentUrl);
  if (!gallery) {
    return;
  }

  const currentPreviewIndex = preview.currentIndex;
  const pageSize = preview.pageSize;
  const maxPreviewIndex = preview.maxIndex;
  const totalPages = preview.totalImages;
  const startPageNum = preferredPageNum ?? eh.peekPageFromHash() ?? eh.galleryPageNumber(startPageUrl);

  if (!startPageNum) {
    throw new Error(texts.errors.imageNotFound);
  }

  const historySession = callbacks.readHistoryEnabled
    ? new ReadHistorySession({
      galleryId: gallery.galleryId,
      token: gallery.token,
      totalPages,
    })
    : null;

  const automaticFullscreen = fullscreenLaunch ? await fullscreenLaunch.result : undefined;

  if (automaticFullscreen && document.fullscreenElement !== fullscreenLaunch?.host) {
    historySession?.dispose();
    await fullscreenLaunch?.fullscreen.exit();
    fullscreenLaunch?.host.remove();
    await fullscreenLaunch?.fullscreen.restore();
    return;
  }

  let lastPageNum = startPageNum;
  const onExit = () => {
    historySession?.dispose();
    callbacks.onReaderClosed(lastPageNum, totalPages ?? null);

    if (lastPageNum === startPageNum) {
      return;
    }

    const exitIndex = previewCache.previewIndexForPage(lastPageNum);
    const galleryUrl = eh.previewUrlForIndex(exitIndex);

    if (callbacks.enhanceThumbsGridsEnabled) {
      callbacks.onGotoPreviewIndex(exitIndex);
      void previewCache.select(exitIndex).catch(() => {
        window.location.replace(galleryUrl);
      });
      return;
    }

    if (exitIndex === currentPreviewIndex) {
      window.history.replaceState(window.history.state, "", galleryUrl);
    } else {
      window.location.replace(galleryUrl);
    }
  };

  const host = fullscreenLaunch?.host ?? createReaderHost();
  const fullscreen = fullscreenLaunch?.fullscreen ?? viewport.createFullscreen(host);
  mountReader({
    galleryId: gallery.galleryId,
    initialPageNum: startPageNum,
    totalPages,
  }, previewCache, {
    onActivePageChange: (page) => {
      if (page.pageNum) {
        lastPageNum = page.pageNum;
        if (callbacks.enhanceThumbsGridsEnabled) {
          callbacks.onGotoPreviewIndex(
            previewCache.previewIndexForPage(page.pageNum),
          );
        }
      }

      historySession?.update(page.pageNum, totalPages);
      eh.updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
    },
    onOpenOriginalPage: (page) => {
      historySession?.dispose();
      window.location.assign(page.url);
    },
  }, viewport.lockScroll, fullscreen, onExit, host);
}

function mountReader(
  options: ReaderOptions,
  previewCache: GalleryPreviewCache,
  callbacks: Pick<ReaderComponentCallbacks, "onActivePageChange" | "onOpenOriginalPage">,
  lockPageScroll: () => () => void,
  fullscreen: ReaderFullscreenController,
  onExit: () => void,
  host: HTMLDivElement,
): void {
  activeReaderClose?.();

  let disposeRoot: () => void = () => undefined;
  let unlockPageScroll = lockPageScroll();
  let setFullscreenActive = (_active: boolean): void => undefined;
  let keepReaderOpen = false;
  let historyEntry = true;
  let closeRequested = false;
  let closing = false;
  const close = () => requestClose();

  function requestClose(): void {
    if (closing || closeRequested) {
      return;
    }
    if (historyEntry) {
      closeRequested = true;
      window.history.back();
      return;
    }
    void onClosed();
  }

  const onPopState = (): void => {
    historyEntry = false;
    void onClosed();
  };

  async function onClosed(): Promise<void> {
    if (closing) {
      return;
    }
    closing = true;
    await fullscreen.exit().catch((error: unknown) => {
      console.warn("[ehpeek] Failed to exit fullscreen", error);
    });
    disposeRoot();
    disposeRoot = () => undefined;
    unlockPageScroll();
    unlockPageScroll = () => undefined;
    host.remove();
    await fullscreen.restore().catch((error: unknown) => {
      console.warn("[ehpeek] Failed to restore page viewport", error);
    });

    if (activeReaderClose === close) {
      activeReaderClose = undefined;
    }
    onExit();
  }

  if (!host.isConnected) {
    document.body.append(host);
  }
  window.addEventListener("popstate", onPopState);
  window.history.pushState({ ehpeekReader: true }, "", window.location.href);
  activeReaderClose = close;
  const unsubscribeFullscreen = fullscreen.subscribe((active) => {
    setFullscreenActive(active);
    if (!active && !keepReaderOpen) {
      requestClose();
    }
    keepReaderOpen = false;
  });
  disposeRoot = render(
    () => {
      const [fullscreenActive, updateFullscreenActive] = createSignal(fullscreen.active());
      setFullscreenActive = updateFullscreenActive;
      return <Reader
        callbacks={{
          ...callbacks,
          onClosed: requestClose,
          onFullscreenToggle: () => {
            if (fullscreen.active()) {
              keepReaderOpen = true;
              void fullscreen.exit().catch((error: unknown) => {
                keepReaderOpen = false;
                console.warn("[ehpeek] Failed to exit fullscreen", error);
              });
            } else {
              void fullscreen.enter().catch((error: unknown) => {
                console.warn("[ehpeek] Fullscreen request failed", error);
              });
            }
          },
        }}
        options={options}
        previewCache={previewCache}
        fullscreenActive={fullscreenActive()}
      />;
    },
    host,
  );
  const previousDispose = disposeRoot;
  disposeRoot = () => {
    window.removeEventListener("popstate", onPopState);
    unsubscribeFullscreen();
    previousDispose();
  };
}

function requestConfiguredFullscreen(
  viewportSource: ReaderViewport,
): ReaderFullscreenLaunch | undefined {
  if (!state.reader.enabled.value || !state.reader.fullscreen.value || document.fullscreenElement) {
    return undefined;
  }

  const host = createReaderHost();
  document.body.append(host);
  const fullscreen = viewportSource.createFullscreen(host);

  if (!document.fullscreenEnabled || typeof host.requestFullscreen !== "function") {
    return { fullscreen, host, result: Promise.resolve(false) };
  }

  return {
    fullscreen,
    host,
    result: fullscreen.enter().then(
      () => true,
      (error: unknown) => {
        console.warn("[ehpeek] Fullscreen request failed", error);
        return false;
      },
    ),
  };
}

function createReaderHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.dataset.ehpeekReaderContainer = "true";
  return host;
}

export function reportReaderOpenError(error: unknown): void {
  const message = error instanceof Error ? error.message : texts.errors.loadFailed;
  console.error("[ehpeek]", error);
  window.alert(message);
}
