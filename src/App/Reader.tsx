import {
  enterReaderFullscreen,
  FullscreenReader,
  type FullscreenReaderOptions,
} from "../components/Reader";
import { ReadHistorySession } from "../state/readHistory";
import * as eh from "../eh";
import { state } from "../state";
import texts from "../texts.json";
import { render } from "solid-js/web";
import type { GalleryPreviewCache } from "./GalleryPreviewCache";
import type { ReaderViewport, ReaderViewportSnapshot } from "./viewport";

type ReaderFullscreenLaunch = {
  host: HTMLDivElement;
  result: Promise<boolean>;
  viewport: ReaderViewportSnapshot | null;
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
      if (fullscreenEntered && fullscreenLaunch.viewport) {
        await viewport.restore(fullscreenLaunch.viewport);
      }
      fullscreenLaunch.host.remove();
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
    if (fullscreenLaunch?.viewport) {
      await viewport.restore(fullscreenLaunch.viewport);
    }
    fullscreenLaunch?.host.remove();
    return;
  }

  let lastPageNum = startPageNum;
  let fullscreenViewport = automaticFullscreen ? fullscreenLaunch?.viewport ?? null : null;
  const restorePageViewport = async () => {
    const snapshot = fullscreenViewport;
    fullscreenViewport = null;

    if (snapshot) {
      await viewport.restore(snapshot);
    }
  };

  openFullscreenReader({
    galleryId: gallery.galleryId,
    initialPageNum: startPageNum,
    lockPageScroll: viewport.lockScroll,
    previewCache,
    totalPages,
    onBeforeEnterFullscreen: () => {
      fullscreenViewport = viewport.prepareFullscreen();
    },
    restorePageViewport,
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
    onExit: () => {
      historySession?.dispose();
      callbacks.onReaderClosed(lastPageNum, totalPages ?? null);
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
    },
    onOpenOriginalPage: (page) => {
      historySession?.dispose();
      window.location.assign(page.url);
    },
  }, fullscreenLaunch?.host);
}

function openFullscreenReader(
  options: Omit<FullscreenReaderOptions, "fullscreenTarget">,
  existingHost?: HTMLDivElement,
): void {
  activeReaderClose?.();

  const host = existingHost ?? createReaderHost();
  let closeReader = onClosed;
  let disposeRoot: () => void = () => undefined;
  const close = () => closeReader();

  function onClosed(): void {
    disposeRoot();
    disposeRoot = () => undefined;
    host.remove();

    if (activeReaderClose === close) {
      activeReaderClose = undefined;
    }
  }

  if (!host.isConnected) {
    document.body.append(host);
  }
  activeReaderClose = close;
  disposeRoot = render(
    () => (
      <FullscreenReader
        options={{ ...options, fullscreenTarget: host }}
        actionsRef={(actions) => {
          closeReader = actions.close;
        }}
        onClosed={onClosed}
      />
    ),
    host,
  );
}

function requestConfiguredFullscreen(
  viewportSource: ReaderViewport,
): ReaderFullscreenLaunch | undefined {
  if (!state.reader.enabled.value || !state.reader.fullscreen.value || document.fullscreenElement) {
    return undefined;
  }

  const host = createReaderHost();
  document.body.append(host);

  if (!document.fullscreenEnabled || typeof host.requestFullscreen !== "function") {
    return { host, result: Promise.resolve(false), viewport: null };
  }

  const viewport = viewportSource.prepareFullscreen();

  return {
    host,
    viewport,
    result: enterReaderFullscreen(host).then(
      () => true,
      async (error: unknown) => {
        await viewportSource.restore(viewport);
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
