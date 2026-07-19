import {
  enterReaderFullscreen,
  FullscreenReader,
  removePreviousReaderRoot,
  type FullscreenReaderOptions,
  type ReaderPageProvider,
} from "../components/Reader";
import { navigateGalleryPreview } from "../components/Enhance/EnhanceThumbsGrids";
import { ReadHistorySession } from "../state/readHistory";
import * as eh from "../eh";
import type { LoadedReaderPage, ReaderPage } from "../readerTypes";
import { state } from "../state";
import texts from "../texts.json";
import { renderInto, unmountFrom } from "./render";
import type { ReaderViewport, ReaderViewportSnapshot } from "./viewport";

const PREVIEW_CACHE_LIMIT = 10;

type ReaderFullscreenLaunch = {
  host: HTMLDivElement;
  result: Promise<boolean>;
  viewport: ReaderViewportSnapshot | null;
};

export type ReaderCallbacks = {
  enhanceThumbsGridsEnabled: () => boolean;
  readHistoryEnabled: () => boolean;
  onPageBarChange: (currentIndex: number, maxIndex: number | null) => void;
  onReaderClosed: (currentPage: number, totalPages: number | null) => void;
};

let activeReaderClose: (() => void) | undefined;

export function onReaderDocumentClick(
  event: MouseEvent,
  callbacks: ReaderCallbacks,
  preview: eh.GalleryPreviewDom | null,
  viewport: ReaderViewport | null,
): void {
  if (!state.reader.enabled.value) {
    return;
  }

  if (!preview || !viewport) {
    return;
  }
  const pageUrl = preview.actions.imageUrlForClick(event.target);

  if (!pageUrl) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  openReaderFromUserAction(pageUrl, callbacks, preview, viewport);
}

export function openReaderFromUserAction(
  startPageUrl: string,
  callbacks: ReaderCallbacks,
  preview: eh.GalleryPreviewDom,
  viewport: ReaderViewport,
  preferredPageNum?: number,
): void {
  const fullscreenLaunch = requestConfiguredFullscreen(viewport);
  void openReader(
    startPageUrl,
    callbacks,
    preview,
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
  preview: eh.GalleryPreviewDom,
  viewport: ReaderViewport,
): Promise<void> {
  const peekPage = eh.peekPageFromHash();

  if (peekPage === null) {
    return;
  }

  const pages = preview.data.pages;
  const page = pages.find((item) => item.pageNum === peekPage) ?? pages[0];

  if (page) {
    await openReader(page.url, callbacks, preview, viewport).catch(
      reportReaderOpenError,
    );
  }
}

export async function openOriginalReader(
  pageNum: number,
  source: eh.GalleryPreviewDom,
): Promise<void> {
  const preview = source.data;
  if (preview.pageSize === null) {
    throw new Error(texts.errors.previewPageSizeUnknown);
  }
  const provider = new GalleryPageProvider(preview.pageSize, preview.maxIndex);
  provider.cachePages(preview.pages);
  const page = (await provider.getPages([pageNum]))[0];

  if (!page || page.pageNum !== pageNum) {
    throw new Error(texts.errors.imageNotFound);
  }

  window.location.assign(page.url);
}

async function openReader(
  startPageUrl: string,
  callbacks: ReaderCallbacks,
  source: eh.GalleryPreviewDom,
  viewport: ReaderViewport,
  preferredPageNum?: number,
  fullscreenLaunch?: ReaderFullscreenLaunch,
): Promise<void> {
  if (!state.reader.enabled.value) {
    return;
  }

  const gallery = eh.galleryIdentityFromUrl(source.data.currentUrl);
  if (!gallery) {
    return;
  }

  const preview = source.data;
  const currentPreviewIndex = preview.currentIndex;
  if (preview.pageSize === null) {
    throw new Error(texts.errors.previewPageSizeUnknown);
  }
  const pageSize = preview.pageSize;
  const maxPreviewIndex = preview.maxIndex;
  const totalPages = preview.totalImages ?? undefined;
  const provider = new GalleryPageProvider(pageSize, maxPreviewIndex);
  provider.cachePages(preview.pages);
  const startPageNum = preferredPageNum ?? eh.peekPageFromHash() ?? eh.galleryPageNumber(startPageUrl);

  if (!startPageNum) {
    throw new Error(texts.errors.imageNotFound);
  }

  const historySession = callbacks.readHistoryEnabled()
    ? new ReadHistorySession({
      galleryId: gallery.galleryId,
      token: gallery.token,
      galleryUrl: preview.currentUrl,
      totalPages,
    })
    : null;

  if (!state.reader.enabled.value) {
    historySession?.dispose();
    return;
  }

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
    provider,
    totalPages,
    onBeforeEnterFullscreen: () => {
      fullscreenViewport = viewport.prepareFullscreen();
    },
    restorePageViewport,
    onActivePageChange: (page) => {
      if (page.pageNum) {
        lastPageNum = page.pageNum;
        if (callbacks.enhanceThumbsGridsEnabled()) {
          callbacks.onPageBarChange(provider.previewIndexForPage(page.pageNum), maxPreviewIndex);
        }
      }

      historySession?.update(page.pageNum, totalPages);
      eh.updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
    },
    onExit: () => {
      historySession?.dispose();
      callbacks.onReaderClosed(lastPageNum, totalPages ?? null);
      const exitIndex = provider.previewIndexForPage(lastPageNum);
      const galleryUrl = eh.previewUrlForIndex(exitIndex);

      if (callbacks.enhanceThumbsGridsEnabled()) {
        callbacks.onPageBarChange(exitIndex, maxPreviewIndex);
        void navigateGalleryPreview(galleryUrl).catch(() => {
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
  removePreviousReaderRoot();

  const host = existingHost ?? createReaderHost();
  let closeReader = onClosed;
  const close = () => closeReader();

  function onClosed(): void {
    unmountFrom(host);
    host.remove();

    if (activeReaderClose === close) {
      activeReaderClose = undefined;
    }
  }

  if (!host.isConnected) {
    document.body.append(host);
  }
  activeReaderClose = close;
  renderInto(
    host,
    () => (
      <FullscreenReader
        options={{ ...options, fullscreenTarget: host }}
        actionsRef={(actions) => {
          closeReader = actions.close;
        }}
        onActionsDispose={() => {
          closeReader = onClosed;
        }}
        onClosed={onClosed}
      />
    ),
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

class GalleryPageProvider implements ReaderPageProvider {
  private readonly pages = new Map<number, ReaderPage>();
  private readonly previewLoads = new Map<number, Promise<ReaderPage[]>>();

  constructor(
    private readonly pageSize: number,
    private readonly maxPreviewIndex: number | null,
  ) {}

  cachePages(pages: ReaderPage[]): void {
    for (const page of pages) {
      if (page.pageNum && page.pageNum > 0) {
        this.pages.set(page.pageNum, page);
      }
    }
  }

  previewIndexForPage(pageNum: number): number {
    return eh.previewPageIndexForGalleryPage(pageNum, this.pageSize, this.maxPreviewIndex);
  }

  async getPages(pageNums: number[]): Promise<ReaderPage[]> {
    const requested = Array.from(new Set(pageNums.filter((pageNum) => pageNum > 0)));
    const previewIndexes = Array.from(new Set(requested
      .filter((pageNum) => !this.pages.has(pageNum))
      .map((pageNum) => this.previewIndexForPage(pageNum)))).filter(
      (value) => value >= 0 && (this.maxPreviewIndex === null || value <= this.maxPreviewIndex),
    );
    await Promise.all(previewIndexes.map((index) => this.loadPreviewPage(index)));
    return requested.flatMap((pageNum) => this.pages.get(pageNum) ?? []);
  }

  loadPage(page: ReaderPage): Promise<LoadedReaderPage> {
    return eh.loadEhImagePage(page);
  }

  private loadPreviewPage(index: number): Promise<ReaderPage[]> {
    const boundedIndex = this.maxPreviewIndex === null ? index : Math.min(index, this.maxPreviewIndex);

    if (boundedIndex < 0) {
      return Promise.resolve([]);
    }

    const cached = this.previewLoads.get(boundedIndex);

    if (cached) {
      this.previewLoads.delete(boundedIndex);
      this.previewLoads.set(boundedIndex, cached);
      return cached;
    }

    const load = eh.pullPreviewPage(boundedIndex).then(
      (pages) => {
        this.cachePages(pages);
        return pages;
      },
      (error: unknown) => {
        this.previewLoads.delete(boundedIndex);
        throw error;
      },
    );
    this.previewLoads.set(boundedIndex, load);

    while (this.previewLoads.size > PREVIEW_CACHE_LIMIT) {
      const oldest = this.previewLoads.keys().next().value;

      if (oldest === undefined) {
        break;
      }

      this.previewLoads.delete(oldest);
    }

    return load;
  }
}
