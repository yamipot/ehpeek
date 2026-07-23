import { createEffect, onCleanup, onMount, Show, untrack } from "solid-js";
import type { GalleryPreviewCache } from "../../App/GalleryPreviewCache";
import texts from "../../texts.json";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import {
  normalizeReaderScrollSizeScale,
  state as appState,
} from "../../state";
import {
  clamp,
  normalizedAspectRatio,
  positiveNumber,
  registerGlobalStyle,
} from "../../utils";
import type { ScrollMotion } from "../animation";
import type { PointerDragEnd, PointerGestureCallbacks } from "../PointerGesture";
import {
  PagesViewport,
  pageWindowNumbers,
  type PagesViewportActions,
  type PagesViewportCallbacks,
} from "./Viewport";
import {
  Toolbar,
  type ReaderControls,
  type ToolbarCallbacks,
} from "./Toolbar";
import { ZoomOverlay, type ZoomOverlayActions, type ZoomOverlayImage } from "./ZoomOverlay";
import { ReaderSession, type ReaderLoadTarget, type ReaderOptions } from "./session";
import { ReaderScrollBar } from "./ScrollBar";
import { ViewportCanvas, type ViewportCanvasCallbacks } from "./ViewportCanvas";
import readerCss from "./index.css";

registerGlobalStyle("ehpeek-reader-style", readerCss);

const VIEWER_ID = "ehpeek-reader";
const DEFAULT_WINDOW_SIZE = 10;

const PAGED_SWIPE_THRESHOLD = 24;
const PAGED_WHEEL_THRESHOLD = 8;
const HORIZONTAL_SCROLL_WHEEL_FACTOR = 0.5;
const PROGRESS_IDLE_COMMIT_MS = 180;
const LOADED_IMAGE_INFO_CACHE_LIMIT = 160;
const SCROLL_GESTURE_IDLE_MS = 160;
const SCROLL_BAR_IDLE_MS = 900;
const SCROLL_BAR_SHOW_DISTANCE = 48;
const SCROLL_BAR_EXPAND_VIEWPORTS = 2;
const DOUBLE_TAP_MS = 340;
const DOUBLE_TAP_DISTANCE = 36;
const TAP_CANCEL_DISTANCE = 8;
const FALLBACK_ASPECT_RATIO = 1.42;
export type { ReaderOptions } from "./session";

type LoadedReaderImage = ZoomOverlayImage & {
  originalImageUrl: string | null;
};

export type ReaderCallbacks = {
  onActivePageChange: (page: ReaderPage) => void;
  onClosed: () => void;
  onFullscreenToggle: () => void;
  onOpenOriginalPage: (page: ReaderPage) => void;
  onOpenScrollPreview: (pageNum: number) => void;
};

export type ReaderActions = {
  gotoPage: (pageNum: number) => void;
};

export function Reader(props: {
  actionsRef: (actions: ReaderActions) => void;
  callbacks: ReaderCallbacks;
  options: ReaderOptions;
  previewCache: GalleryPreviewCache;
  fullscreenActive: boolean;
}) {
  const options = untrack(() => props.options);
  const totalPages = options.totalPages ?? 0;
  const previewCache = untrack(() => props.previewCache);
  const callbacks = untrack(() => props.callbacks);
  const session = new ReaderSession(options);
  const readerState = session.state;
  const scrollFitPageNum = readerState.navi.currentPageNum();
  const readerCallbacks = wireReaderCallbacks(
    session,
    options,
    previewCache,
    callbacks,
  );
  untrack(() => props.actionsRef({
    gotoPage: readerCallbacks.gotoPage,
  }));
  let previousFullscreenActive = untrack(() => props.fullscreenActive);

  createEffect(() => {
    const fullscreenActive = props.fullscreenActive;
    if (fullscreenActive === previousFullscreenActive) {
      return;
    }
    previousFullscreenActive = fullscreenActive;
    session.requestAnimationFrame(() => {
      session.requestAnimationFrame(readerCallbacks.realignCurrentPage);
    });
  });

  onMount(() => {
    readerCallbacks.init();

    onCleanup(() => {
      readerCallbacks.cleanup();
      session.dispose();
    });
  });

  return (
    <div
      id={VIEWER_ID}
      class="fixed inset-0 z-reader overflow-hidden ehp-color-reader font-sans textsize-sm leading-[1.4]"
      data-navigation-mode={readerState.ctrls.value().navigationMode}
      data-page-layout={readerState.ctrls.value().pageLayout}
      data-read-direction={readerState.ctrls.value().direction}
    >
      <Show when={!readerState.scrollViewport.adjusting()}>
        <header class="contents">
          <Toolbar
            callbacks={readerCallbacks.toolbar}
            controls={readerState.ctrls.value()}
            downloadInfos={readerState.navi.downloadInfos()}
            fullscreenActive={props.fullscreenActive}
            open={readerState.toolbar.open()}
            progress={{
              pageNum: readerState.navi.currentPageNum(),
              totalPages: options.totalPages,
              maxProgressPageNum: readerState.navi.maxProgressPageNum(),
              keepInputValue: readerState.navi.progressInputActive(),
            }}
          />
        </header>
      </Show>
      <ViewportCanvas
        adjusting={readerState.scrollViewport.adjusting()}
        callbacks={readerCallbacks.viewportCanvas}
        scaleMode={readerState.scrollViewport.scaleMode()}
        scalePercent={readerState.scrollViewport.scalePercent()}
      >
        <PagesViewport
          actionsRef={readerCallbacks.viewportActionsRef}
          callbacks={readerCallbacks.viewport}
          decodedImageCacheLimit={options.decodedImageCacheLimit}
          direction={readerState.ctrls.value().direction}
          navigationMode={readerState.ctrls.value().navigationMode}
          pageLayout={readerState.ctrls.value().pageLayout}
          scrollFitImageSize={readerState.scrollViewport.fitImageSize()}
          scrollFitPageNum={scrollFitPageNum}
          scrollSizeScale={readerState.scrollViewport.sizeScale()}
          window={readerState.navi.viewportWindow()}
          zoomActive={readerState.overlay.image() !== null}
        />
      </ViewportCanvas>
      <Show when={
        readerState.ctrls.value().navigationMode === "scroll" &&
        readerState.ctrls.value().direction === "ttb" &&
        totalPages > 1
      }>
        <ReaderScrollBar
          callbacks={readerCallbacks.toolbar}
          currentPage={readerState.navi.currentPageNum()}
          expanded={readerState.scrollBar.expanded()}
          totalPages={totalPages}
          visible={readerState.scrollBar.visible()}
        />
      </Show>
      <ZoomOverlay
        actionsRef={readerCallbacks.zoomOverlayActionsRef}
        image={readerState.overlay.image()}
        onClose={() => readerState.overlay.update(null)}
      />
    </div>
  );
}

function wireReaderCallbacks(
  session: ReaderSession,
  options: ReaderOptions,
  previewCache: GalleryPreviewCache,
  callbacks: ReaderCallbacks) {
  const state = session.state;
  let viewportActions!: PagesViewportActions;
  let zoomOverlay!: ZoomOverlayActions;
  const totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
  const renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
  const preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE;
  const pages = new Map<number, ReaderPage>();
  const loadedImages = new Map<number, LoadedReaderImage>();
  let pagedTargetPageNumber: number | null = null;
  let syncToken = 0;
  let closed = false;
  const scrollFitPageNum = state.navi.currentPageNum();
  const pagedMode = () => state.ctrls.value().navigationMode === "paged";
  const pageTurnStep = () => state.ctrls.value().pageLayout === "double" ? 2 : 1;
  const updateReaderViewportSize = () => {
    state.scrollViewport.setViewportWidth(Math.max(1, window.innerWidth));
    state.scrollViewport.setViewportHeight(Math.max(1, window.innerHeight));
  };

  function requestReaderClose(): void {
    if (closed) {
      return;
    }
    closed = true;
    callbacks.onClosed();
  }

  function setCurrentPageNumber(pageNumber: number, scrollIntoView: boolean, scrollMotion: ScrollMotion = "instant"): void {
    pagedTargetPageNumber = null;
    const target = clamp(Math.round(pageNumber), 1, maxProgressPageNum());
    if (target !== state.navi.currentPageNum()) {
      state.navi.setDirection(target > state.navi.currentPageNum() ? 1 : -1);
      state.navi.setCurrentPageNum(target);
    }
    syncAfterPageChange({ scrollIntoView, scrollMotion });
  }

  function syncAfterPageChange(options: {
    scrollIntoView: boolean;
    scrollMotion?: ScrollMotion;
  }): void {
    const token = ++syncToken;
    const numbers = pageWindowNumbers(state.navi.currentPageNum(), renderWindowSize);
    const missing = numbers.filter((number) => isRealPageNum(number) && !pages.has(number));
    syncViewportWindow();
    maintainLoadQueue();
    notifyActivePageChange();
    if (options.scrollIntoView) {
      scrollToCurrentPage(options.scrollMotion);
    }
    if (missing.length > 0) {
      void loadMissingPages(missing, token);
    }
  }

  async function loadMissingPages(pageNums: number[], token: number): Promise<void> {
    const pageGroups = new Map<number, number[]>();
    for (const pageNum of pageNums) {
      const previewIndex = previewCache.previewIndexForPage(pageNum);
      pageGroups.set(previewIndex, [...(pageGroups.get(previewIndex) ?? []), pageNum]);
    }

    await Promise.all(Array.from(pageGroups.values(), async (groupPageNums) => {
      const loadingTokens = new Map(groupPageNums.flatMap((pageNum) => {
        const loadingToken = viewportActions.markPageLoading(pageNum);
        return loadingToken === null ? [] : [[pageNum, loadingToken] as const];
      }));
      let incoming: ReaderPage[];
      try {
        incoming = await previewCache.getPages(groupPageNums);
      }
      catch (error) {
        console.error("[ehpeek]", error);
        const message = error instanceof Error ? error.message : texts.errors.loadFailed;
        for (const [pageNum, loadingToken] of loadingTokens) {
          viewportActions.setPageError(pageNum, loadingToken, message);
        }
        return;
      }

      if (closed) {
        return;
      }
      addPages(incoming);
      const loadedPageNums = new Set(incoming.flatMap((page) =>
        page.pageNum && page.pageNum > 0 ? [page.pageNum] : []
      ));
      for (const [pageNum, loadingToken] of loadingTokens) {
        if (loadedPageNums.has(pageNum)) {
          viewportActions.resetPageLoading(pageNum, loadingToken);
        } else {
          viewportActions.setPageError(
            pageNum,
            loadingToken,
            texts.errors.imageNotFound,
          );
        }
      }
    }));

    if (closed || token !== syncToken) {
      return;
    }
    syncViewportWindow();
    maintainLoadQueue();
    notifyActivePageChange();
    if (state.ctrls.value().navigationMode === "scroll" && state.navi.currentPageNum() === scrollFitPageNum) {
      scrollToCurrentPage();
    }
  }
  function addPages(incomingPages: ReaderPage[]): void {
    for (const [index, page] of incomingPages.entries()) {
      const pageNum = pageNumForPage(page, index);
      if (pageNum > 0) {
        pages.set(pageNum, {
          ...page,
          aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO),
          pageNum,
        });
      }
    }
  }

  function syncViewportWindow(): void {
    state.navi.setViewportWindow({
      currentPageNum: state.navi.currentPageNum(),
      windowSize: renderWindowSize,
      totalPages: totalPages,
      pages: pageMetaForViewport(),
    });
    updatePageNumber();
  }

  function maintainLoadQueue(): void {
    const currentPageNum = state.navi.currentPageNum();
    const pageNums = [currentPageNum];
    if (state.ctrls.value().navigationMode === "scroll" && !state.scrollViewport.fitImageSize()) {
      pageNums.push(scrollFitPageNum);
    }
    if (state.ctrls.value().navigationMode === "paged" && state.ctrls.value().pageLayout === "double") {
      pageNums.push(currentPageNum + 1);
    }
    for (let offset = 1; offset <= preloadWindowSize; offset += 1) {
      pageNums.push(currentPageNum + offset * state.navi.direction());
    }
    session.imageQueue.sync(Array.from(new Set(pageNums)).flatMap((pageNum, priority) => {
      const target = loadTargetFor(pageNum);
      return target ? [{ key: pageNum, priority, target }] : [];
    }));
  }

  function pageMetaForViewport(): Map<number, {
    aspectRatio: number;
  }> {
    return new Map(Array.from(pages, ([pageNum, page]) => [pageNum, { aspectRatio: page.aspectRatio }]));
  }

  function loadTargetFor(pageNum: number): ReaderLoadTarget | null {
    const page = pages.get(pageNum);
    return page ? { pageNum, page } : null;
  }

  function maxProgressPageNum(): number {
    return totalPages ? totalPages + 1 : Number.MAX_SAFE_INTEGER;
  }

  function isRealPageNum(pageNum: number): boolean {
    return pageNum >= 1 && (!totalPages || pageNum <= totalPages);
  }

  function turnPageBy(delta: number): void {
    if (pagedMode()) {
      animatePagedStep(delta * pageTurnStep());
      return;
    }
    setCurrentPageNumber(state.navi.currentPageNum() + delta, true);
  }

  function animatePagedStep(delta: number): void {
    const base = pagedTargetPageNumber ?? state.navi.currentPageNum();
    const target = clamp(Math.round(base + delta), 1, maxProgressPageNum());
    if (target === base) {
      scrollToCurrentPage("animated");
      return;
    }
    if (viewportActions.pageOffset(target) === null) {
      pagedTargetPageNumber = null;
      setCurrentPageNumber(target, true, "animated");
      return;
    }
    state.navi.setDirection(target > base ? 1 : -1);
    pagedTargetPageNumber = target;
    viewportActions.moveToPage(target, "animated", () => {
      if (pagedTargetPageNumber !== target) {
        return;
      }
      pagedTargetPageNumber = null;
      setCurrentPageNumber(target, true);
    });
  }

  function scrollToCurrentPage(motion: ScrollMotion = "instant"): void {
    viewportActions.moveToPage(state.navi.currentPageNum(), motion);
  }

  function updatePageNumber(): void {
    const pageNum = state.navi.currentPageNum();
    const downloadPageNums = pagedMode() && state.ctrls.value().pageLayout === "double"
      ? [pageNum, pageNum + 1]
      : [pageNum];
    state.navi.setDownloadInfos(downloadPageNums.flatMap((downloadPageNum) => {
      const image = loadedImages.get(downloadPageNum);
      if (!image || !isRealPageNum(downloadPageNum)) {
        return [];
      }
      loadedImages.delete(downloadPageNum);
      loadedImages.set(downloadPageNum, image);
      return [{
        currentFileName: displayedImageFileName(options.galleryId, downloadPageNum, image.imageUrl),
        currentImageUrl: image.imageUrl,
        imageHeight: viewportActions.pageImageHeight(downloadPageNum) ?? image.height,
        imageWidth: viewportActions.pageImageWidth(downloadPageNum) ?? image.width,
        originalImageUrl: image.originalImageUrl,
        pageNum: downloadPageNum,
      }];
    }));
    state.navi.setMaxProgressPageNum(Math.max(1, maxProgressPageNum()));
  }

  function notifyActivePageChange(): void {
    const page = pages.get(state.navi.currentPageNum());
    if (page) {
      callbacks.onActivePageChange(page);
    }
  }

  function updateCurrentFromScroll(): void {
    const next = viewportActions.centerPageNum();
    if (next !== null && next !== state.navi.currentPageNum()) {
      state.navi.setDirection(next > state.navi.currentPageNum() ? 1 : -1);
      state.navi.setCurrentPageNum(next);
      syncAfterPageChange({ scrollIntoView: false });
    }
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (shouldIgnoreKeyboardEvent(event)) {
      return;
    }
    if (event.key === "Escape") {
      if (state.overlay.image() !== null) {
        state.overlay.update(null);
      } else {
        requestReaderClose();
      }
      event.preventDefault();
    } else if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      (state.ctrls.value().direction === "ttb" && (event.key === "ArrowUp" || event.key === "ArrowDown"))
    ) {
      event.preventDefault();
      if (state.overlay.image() === null) {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          turnPageBy(event.key === "ArrowUp" ? -1 : 1);
        } else {
          turnPageBy(event.key === "ArrowLeft" ? state.navi.leftTapDelta() : state.navi.rightTapDelta());
        }
      }
    }
  };

  const gesture = wireGesture();
  const viewport = wireViewport();
  const scrollViewport = wireScrollViewport();
  wireImageQueue();
  const toolbar = wireToolbar();

  return {
    viewportActionsRef: (actions: PagesViewportActions): void => {
      viewportActions = actions;
    },
    zoomOverlayActionsRef: (actions: ZoomOverlayActions): void => {
      zoomOverlay = actions;
    },
    init: () => {
      document.addEventListener("keydown", onKeydown, true);
      window.addEventListener("resize", updateReaderViewportSize);
      viewportActions.focus();
      updatePageNumber();
      syncAfterPageChange({ scrollIntoView: true });
    },
    cleanup: () => {
      document.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("resize", updateReaderViewportSize);
    },
    gotoPage: (pageNum: number) => setCurrentPageNumber(pageNum, true),
    realignCurrentPage: () => {
      scrollToCurrentPage();
    },
    toolbar,
    viewport,
    viewportCanvas: scrollViewport.callbacks,
  };

  function wireScrollViewport(): {
    callbacks: ViewportCanvasCallbacks;
    open: () => void;
  } {
    let adjustmentStartSizeScale = state.scrollViewport.sizeScale();
    const updateImageScale = (scale: number | null): void => {
      if (scale === null) {
        state.scrollViewport.setSizeScale(null);
        return;
      }
      const fitScale = state.scrollViewport.fitScale();
      if (fitScale) {
        state.scrollViewport.setSizeScale(normalizeReaderScrollSizeScale(
          scale / fitScale,
        ));
      }
    };

    return {
      open: () => {
        adjustmentStartSizeScale = state.scrollViewport.sizeScale();
        state.scrollViewport.setAdjusting(true);
      },
      callbacks: {
        onApply: () => state.scrollViewport.setAdjusting(false),
        onApplyAll: () => {
          const persistedScale = state.ctrls.value().direction === "ttb"
            ? appState.reader.scrollTtbScale
            : appState.reader.scrollHorizontalScale;
          persistedScale.set(state.scrollViewport.sizeScale());
          state.scrollViewport.setAdjusting(false);
        },
        onClose: () => {
          state.scrollViewport.setSizeScale(adjustmentStartSizeScale);
          state.scrollViewport.setAdjusting(false);
        },
        onFit: () => updateImageScale(null),
        onOneToOne: () => state.scrollViewport.setSizeScale("one-to-one"),
        onScaleChange: updateImageScale,
      },
    };
  }

  function wireViewport(): PagesViewportCallbacks {
    let scrollFrame: number | null = null;
    let scrollBarTimer: number | null = null;
    let scrollGestureTimer: number | null = null;
    let previousScrollPosition: number | null = null;
    let scrollDistance = 0;
    const scrollPosition = () => state.ctrls.value().direction === "ttb"
      ? viewportActions.scrollTop()
      : viewportActions.scrollLeft();

    const updateScrollBarActivity = (): void => {
      const currentScrollPosition = scrollPosition();
      if (previousScrollPosition !== null) {
        scrollDistance += Math.abs(currentScrollPosition - previousScrollPosition);
      }
      previousScrollPosition = currentScrollPosition;
      if (scrollDistance >= SCROLL_BAR_SHOW_DISTANCE) {
        state.scrollBar.updateVisible(true);
      }
      const viewportSize = state.ctrls.value().direction === "ttb" ? window.innerHeight : window.innerWidth;
      if (scrollDistance >= viewportSize * SCROLL_BAR_EXPAND_VIEWPORTS) {
        state.scrollBar.updateExpanded(true);
      }
      session.clearTimeout(scrollGestureTimer);
      scrollGestureTimer = session.setTimeout(() => {
        scrollGestureTimer = null;
        scrollDistance = 0;
        previousScrollPosition = scrollPosition();
      }, SCROLL_GESTURE_IDLE_MS);
      session.clearTimeout(scrollBarTimer);
      scrollBarTimer = session.setTimeout(() => {
        scrollBarTimer = null;
        scrollDistance = 0;
        previousScrollPosition = scrollPosition();
        state.scrollBar.updateExpanded(false);
        state.scrollBar.updateVisible(false);
      }, SCROLL_BAR_IDLE_MS);
    };

    onCleanup(() => {
      session.clearTimeout(scrollBarTimer);
      session.clearTimeout(scrollGestureTimer);
    });

    return {
      onNativeScroll: (): void => {
        if (state.overlay.image() !== null || pagedMode()) {
          return;
        }
        if (state.scrollViewport.adjusting()) {
          return;
        }
        updateScrollBarActivity();
        if (viewportActions.isDragging()) {
          return;
        }
        const previousPosition = scrollPosition();
        if (state.ctrls.value().direction === "ttb") {
          viewportActions.moveToTop(previousPosition);
        } else {
          viewportActions.moveToLeft(previousPosition);
        }
        if (scrollPosition() !== previousPosition || scrollFrame !== null) {
          return;
        }
        scrollFrame = session.requestAnimationFrame(() => {
          scrollFrame = null;
          updateCurrentFromScroll();
        });
      },
      onReloadPage: (pageNum: number): void => {
        if (!viewportActions.resetPageError(pageNum)) {
          return;
        }
        if (pages.has(pageNum)) {
          maintainLoadQueue();
        } else {
          void loadMissingPages([pageNum], ++syncToken);
        }
      },
      onWheel: (delta: number, event: WheelEvent): void => {
        if (state.overlay.image() !== null) {
          event.preventDefault();
          zoomOverlay.moveWheel({
            centerX: event.clientX,
            centerY: event.clientY,
            delta: wheelDeltaPixels(delta, event.deltaMode),
          });
          return;
        }
        if (!pagedMode() && state.ctrls.value().direction === "ttb") {
          return;
        }
        event.preventDefault();
        if (!pagedMode()) {
          const direction = state.ctrls.value().direction === "rtl" ? -1 : 1;
          viewportActions.moveToLeft(
            viewportActions.scrollLeft() +
              wheelDeltaPixels(delta, event.deltaMode) * direction * HORIZONTAL_SCROLL_WHEEL_FACTOR,
          );
          return;
        }
        if (!viewportActions.isDragging() && Math.abs(delta) >= PAGED_WHEEL_THRESHOLD) {
          turnPageBy(delta > 0 ? 1 : -1);
        }
      },
      pointer: gesture,
    };
  }

  function wireImageQueue(): void {

    const rememberLoadedImage = (pageNum: number, loaded: LoadedReaderPage): LoadedReaderImage => {
      const image = {
        pageNum,
        imageUrl: loaded.imageUrl,
        originalImageUrl: loaded.originalImageUrl ?? null,
        width: positiveNumber(loaded.width),
        height: positiveNumber(loaded.height),
      };
      if (pageNum === scrollFitPageNum && image.width && image.height && !state.scrollViewport.fitImageSize()) {
        state.scrollViewport.setFitImageSize({ height: image.height, width: image.width });
      }
      loadedImages.delete(pageNum);
      loadedImages.set(pageNum, image);
      while (loadedImages.size > LOADED_IMAGE_INFO_CACHE_LIMIT) {
        const oldestPageNum = loadedImages.keys().next().value as number | undefined;
        if (oldestPageNum === undefined) {
          break;
        }
        loadedImages.delete(oldestPageNum);
      }
      return image;
    };

    const installImage = async (
      target: ReaderLoadTarget,
      loaded: LoadedReaderPage,
      token: number,
    ): Promise<void> => {
      const imageUrl = loaded.imageUrl;
      const width = positiveNumber(loaded.width);
      const height = positiveNumber(loaded.height);
      let installed = false;
      try {
        installed = await viewportActions.loadPageImage(target.pageNum, token, {
          imageUrl,
          highPriority: target.pageNum === state.navi.currentPageNum() || (
          state.ctrls.value().navigationMode === "paged" &&
          state.ctrls.value().pageLayout === "double" &&
            target.pageNum === state.navi.currentPageNum() + 1
          ),
          width,
          height,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : texts.errors.imageLoadFailed;
        viewportActions.setPageError(target.pageNum, token, message);
        return;
      }
      if (installed && target.pageNum === scrollFitPageNum && !state.scrollViewport.fitImageSize()) {
        const fitWidth = viewportActions.pageImageWidth(target.pageNum);
        const fitHeight = viewportActions.pageImageHeight(target.pageNum);
        if (fitWidth && fitHeight) {
          state.scrollViewport.setFitImageSize({ height: fitHeight, width: fitWidth });
        }
      }
      if (!closed) {
        const currentPageNum = state.navi.currentPageNum();
        if (target.pageNum === currentPageNum || (
          pagedMode() &&
          state.ctrls.value().pageLayout === "double" &&
          target.pageNum === currentPageNum + 1
        )) {
          updatePageNumber();
        }
      }
    };

    session.imageQueue.updateCallbacks({
      loadTarget: (target) => Promise.resolve(loadedImages.get(target.pageNum) ?? previewCache.loadImage(target.page)),
      markLoading: (target) => viewportActions.markPageLoading(target.pageNum),
      onLoaded: async (target, loaded, token) => {
        const image = rememberLoadedImage(target.pageNum, loaded);
        if (pageWindowNumbers(state.navi.currentPageNum(), renderWindowSize).includes(target.pageNum)) {
          await installImage(target, image, token);
        }
      },
      onError: (target, error, token) => {
        const message = error instanceof Error ? error.message : texts.errors.loadFailed;
        viewportActions.setPageError(target.pageNum, token, message);
      },
    });
  }

  function wireToolbar(): ToolbarCallbacks {
    const toolbar = {} as ToolbarCallbacks;
    let progressNavigationTimer: number | null = null;
    let pendingProgressPageNum: number | null = null;

    const updateControls = (requestedControls: ReaderControls): void => {
      const previous = state.ctrls.value();
      const controls = requestedControls.navigationMode === previous.navigationMode
        ? requestedControls
        : {
            ...requestedControls,
            direction: requestedControls.navigationMode === "scroll"
              ? appState.reader.scrollDirection.value
              : appState.reader.pagedDirection.value,
          };
      appState.reader.navigationMode.set(controls.navigationMode);
      if (controls.navigationMode === "scroll") {
        appState.reader.scrollDirection.set(controls.direction);
      } else {
        appState.reader.pagedDirection.set(controls.direction);
      }
      appState.reader.pageLayout.set(controls.pageLayout);
      appState.reader.rightTapAction.set(controls.rightTapAction);
      state.ctrls.update(controls);
      if (controls.navigationMode !== "scroll") {
        state.scrollViewport.setAdjusting(false);
      }

      if (controls.navigationMode !== previous.navigationMode || controls.pageLayout !== previous.pageLayout) {
        viewportActions.stopMotion();
        viewportActions.resetPosition();
        syncAfterPageChange({ scrollIntoView: true });
      } else if (controls.direction !== previous.direction) {
        syncViewportWindow();
        scrollToCurrentPage();
      }
    };

    const cancelProgressNavigation = (): void => {
      if (progressNavigationTimer !== null) {
        session.clearTimeout(progressNavigationTimer);
        progressNavigationTimer = null;
      }
    };
    const previewProgress = (pageNum: number): void => {
      const target = clamp(Math.round(pageNum), 1, maxProgressPageNum());
      if (target !== state.navi.currentPageNum()) {
        state.navi.setDirection(target > state.navi.currentPageNum() ? 1 : -1);
        state.navi.setCurrentPageNum(target);
      }
      ++syncToken;
      syncViewportWindow();
      scrollToCurrentPage();
      updatePageNumber();
    };

    onCleanup(cancelProgressNavigation);

    toolbar.onCloseClick = requestReaderClose;
    toolbar.onControlsChange = updateControls;
    toolbar.onFullscreenClick = callbacks.onFullscreenToggle;
    toolbar.onOpenOriginalPageClick = (): void => {
      const page = pages.get(state.navi.currentPageNum());
      if (page && isRealPageNum(state.navi.currentPageNum())) {
        callbacks.onOpenOriginalPage(page);
      }
    };
    toolbar.onOpenScrollPreviewClick = (): void => {
      callbacks.onOpenScrollPreview(state.navi.currentPageNum());
    };
    toolbar.onViewportAdjustClick = scrollViewport.open;
    toolbar.onProgressPointerDown = (event: PointerEvent): void => {
      state.navi.setProgressInputActive(true);
      cancelProgressNavigation();
      event.stopPropagation();
    };
    toolbar.onProgressInput = (pageNum: number): void => {
      if (!Number.isFinite(pageNum) || pageNum <= 0) {
        return;
      }
      state.navi.setProgressInputActive(true);
      pendingProgressPageNum = clamp(Math.round(pageNum), 1, maxProgressPageNum());
      previewProgress(pendingProgressPageNum);
      cancelProgressNavigation();
      progressNavigationTimer = session.setTimeout(
        () => toolbar.onProgressCommit(pendingProgressPageNum ?? state.navi.currentPageNum()),
        PROGRESS_IDLE_COMMIT_MS,
      );
    };
    toolbar.onProgressCommit = (value: number): void => {
      if (!state.navi.progressInputActive() && pendingProgressPageNum === null) {
        return;
      }
      const pageNum = pendingProgressPageNum ?? value;
      state.navi.setProgressInputActive(false);
      pendingProgressPageNum = null;
      cancelProgressNavigation();
      if (Number.isFinite(pageNum) && pageNum > 0) {
        setCurrentPageNumber(pageNum, true);
      }
    };
    return toolbar;
  }


  function wireGesture(): PointerGestureCallbacks {
    const gesture: PointerGestureCallbacks = {
      get dragAxis() {
        if (state.overlay.image() !== null || !pagedMode()) {
          return "any";
        }
        return state.ctrls.value().direction === "ttb" ? "y" : "x";
      },
    };
    let tapTimer: number | null = null;
    let pendingTap: {
      info: PointerDragEnd;
      event: PointerEvent | MouseEvent;
      time: number;
    } | null = null;
    const isPageReloadButtonTarget = (event: PointerEvent | MouseEvent): boolean =>
      event.target instanceof Element &&
      event.target.closest(".ehpeek-reader-page-reload") !== null;
    const shouldStartDrag = (event: PointerEvent): boolean =>
      state.overlay.image() !== null ||
      pagedMode() ||
      state.ctrls.value().direction !== "ttb" ||
      event.pointerType === "mouse";
    const imageAtPoint = (point: { clientX: number; clientY: number }): ZoomOverlayImage | null => {
      const pageNum = viewportActions.pageNumAtPoint(point);
      return pageNum === null || !viewportActions.pageImageReady(pageNum)
        ? null
        : loadedImages.get(pageNum) ?? null;
    };
    const cancelPendingTap = (): void => {
      if (tapTimer !== null) {
        session.clearTimeout(tapTimer);
        tapTimer = null;
      }
      pendingTap = null;
    };
    const toggleZoomAtPoint = (point: { clientX: number; clientY: number }): boolean => {
      if (state.overlay.image() !== null) {
        state.overlay.update(null);
        return true;
      }
      const image = imageAtPoint(point);
      if (!image) {
        return false;
      }
      viewportActions.stopMotion();
      viewportActions.cancelDrag();
      const zoomScale = viewportActions.pageZoomScale(image.pageNum);
      state.overlay.update(image);
      zoomOverlay.reset({ centerX: point.clientX, centerY: point.clientY, scale: zoomScale });
      zoomOverlay.movePinch({ centerX: point.clientX, centerY: point.clientY, scale: 2 });
      zoomOverlay.endPinch();
      return true;
    };
    const consumeDoubleTap = (info: PointerDragEnd, event: PointerEvent | MouseEvent): boolean => {
      const now = event.timeStamp || performance.now();
      const nativeDoubleClick = event instanceof MouseEvent && event.detail >= 2;
      const nearPendingTap = pendingTap
        ? now - pendingTap.time <= DOUBLE_TAP_MS &&
        Math.hypot(info.clientX - pendingTap.info.clientX, info.clientY - pendingTap.info.clientY) <= DOUBLE_TAP_DISTANCE
        : false;
      if (!nativeDoubleClick && !nearPendingTap) {
        return false;
      }
      cancelPendingTap();
      if (!toggleZoomAtPoint(info)) {
        return false;
      }
      event.preventDefault();
      return true;
    };
    const runSingleTap = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
      if (state.overlay.image() !== null) {
        event.preventDefault();
      } else if (viewportActions.isHitEndPage(info)) {
        requestReaderClose();
      } else {
        const zone = info.clientX / viewportActions.viewportWidth();
        if (zone >= 1 / 3 && zone <= 2 / 3) {
          state.toolbar.toggle();
        } else {
          turnPageBy(zone < 1 / 3 ? state.navi.leftTapDelta() : state.navi.rightTapDelta());
        }
      }
    };
    const queueSingleTap = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
      cancelPendingTap();
      pendingTap = { info, event, time: event.timeStamp || performance.now() };
      tapTimer = session.setTimeout(() => {
        const pending = pendingTap;
        pendingTap = null;
        tapTimer = null;
        if (pending) {
          runSingleTap(pending.info, pending.event);
        }
      }, DOUBLE_TAP_MS);
    };

    gesture.onTap = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
      viewportActions.cancelDrag();
      if (consumeDoubleTap(info, event)) {
        return;
      }
      queueSingleTap(info, event);
    };
    gesture.onStart = (): void => {
      if (state.overlay.image() !== null) {
        zoomOverlay.startDrag();
        return;
      }
      viewportActions.beginDrag();
    };
    gesture.onMove = (info: PointerDragEnd): void => {
      if (state.overlay.image() !== null) {
        zoomOverlay.moveDrag(info);
        return;
      }
      if (!viewportActions.moveDrag({ dx: info.dx, dy: info.dy })) {
        return;
      }
      if (Math.abs(info.dx) >= TAP_CANCEL_DISTANCE || Math.abs(info.dy) >= TAP_CANCEL_DISTANCE) {
        cancelPendingTap();
      }
    };
    gesture.onEnd = (info: PointerDragEnd): void => {
      if (state.overlay.image() !== null) {
        return;
      }
      viewportActions.cancelDrag();
      if (!pagedMode()) {
        if (state.ctrls.value().direction === "ttb") {
          viewportActions.moveToTop(viewportActions.scrollTop());
          viewportActions.startVerticalFlingFromDragVelocity(info.velocityY, () => updateCurrentFromScroll());
        } else {
          viewportActions.moveToLeft(viewportActions.scrollLeft());
          viewportActions.startHorizontalFlingFromDragVelocity(info.velocityX, () => updateCurrentFromScroll());
        }
        updateCurrentFromScroll();
        return;
      }
      if (state.ctrls.value().direction === "ttb") {
        if (info.dy >= PAGED_SWIPE_THRESHOLD) {
          turnPageBy(-1);
        } else if (info.dy <= -PAGED_SWIPE_THRESHOLD) {
          turnPageBy(1);
        } else {
          scrollToCurrentPage("animated");
        }
        return;
      }
      if (info.dx >= PAGED_SWIPE_THRESHOLD) {
        turnPageBy(state.navi.rightDragDelta());
      }
      else if (info.dx <= -PAGED_SWIPE_THRESHOLD) {
        turnPageBy(state.navi.leftDragDelta());
      }
      else {
        scrollToCurrentPage("animated");
      }
    };
    gesture.onPinchStart = (info: {
      clientX: number;
      clientY: number;
    }): boolean => {
      cancelPendingTap();
      viewportActions.stopMotion();
      viewportActions.cancelDrag();
      if (state.overlay.image() !== null) {
        zoomOverlay.startPinch({ centerX: info.clientX, centerY: info.clientY });
        return true;
      }
      const image = imageAtPoint(info);
      if (!image) {
        return false;
      }
      const zoomScale = viewportActions.pageZoomScale(image.pageNum);
      state.overlay.update(image);
      zoomOverlay.reset({ centerX: info.clientX, centerY: info.clientY, scale: zoomScale });
      return true;
    };
    gesture.onPinchMove = (info: { clientX: number; clientY: number; scale: number }) => zoomOverlay.movePinch({
      centerX: info.clientX,
      centerY: info.clientY,
      scale: info.scale,
    });
    gesture.onPinchEnd = () => zoomOverlay.endPinch();
    gesture.shouldCaptureDrag = (event) => {
      if (isPageReloadButtonTarget(event)) {
        return false;
      }
      if (!(event instanceof PointerEvent)) {
        return false;
      }
      if (event.pointerType === "mouse" && event.button !== 0) {
        return false;
      }
      return shouldStartDrag(event);
    };
    gesture.shouldObserveTap = (event) =>
      event instanceof PointerEvent &&
      !isPageReloadButtonTarget(event) &&
      event.pointerType !== "mouse" &&
      !shouldStartDrag(event);
    gesture.dragStartThreshold = TAP_CANCEL_DISTANCE;
    gesture.tapMoveThreshold = TAP_CANCEL_DISTANCE;
    return gesture;
  }
}

function wheelDeltaPixels(delta: number, mode: number): number {
  if (mode === WheelEvent.DOM_DELTA_LINE) {
    return delta * 16;
  }
  if (mode === WheelEvent.DOM_DELTA_PAGE) {
    return delta * window.innerHeight;
  }
  return delta;
}

function displayedImageFileName(galleryId: number, pageNum: number, imageUrl: string): string {
  return `${galleryId}-p${String(pageNum).padStart(2, "0")}.${imageFileExtension(imageUrl)}`;
}

function imageFileExtension(imageUrl: string): string {
  try {
    const fileName = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop() ?? "");
    const extension = fileName.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();

    if (extension && ["avif", "bmp", "gif", "jpeg", "jpg", "png", "webp"].includes(extension)) {
      return extension;
    }
  } catch {
    return "";
  }
  return "";
}


function pageNumForPage(page: ReaderPage | undefined, index: number): number {
  const pageNum = page?.pageNum;
  return typeof pageNum === "number" && Number.isFinite(pageNum) && pageNum > 0 ? pageNum : index + 1;
}

function shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
  if (event.isComposing) {
    return true;
  }

  const eventTarget = event.target;

  if (!(eventTarget instanceof Element)) {
    return false;
  }

  return Boolean(eventTarget.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
}
