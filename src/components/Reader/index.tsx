import { createEffect, onCleanup, onMount, Show, untrack } from "solid-js";
import type { GalleryPreviewCache } from "../../App/GalleryPreviewCache";
import texts from "../../texts.json";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import {
  normalizeReaderScrollViewportWidth,
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
};

export function Reader(props: {
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
  const readerCallbacks = wireReaderCallbacks(
    session,
    options,
    previewCache,
    callbacks,
  );
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
      data-read-direction={readerState.ctrls.value().readDirection}
      data-view-mode={readerState.ctrls.value().mode}
    >
      <Show when={!readerState.scrollViewport.adjusting()}>
        <header class="contents">
          <Toolbar
            callbacks={readerCallbacks.toolbar}
            controls={readerState.ctrls.value()}
            downloadInfo={readerState.navi.downloadInfo()}
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
          mode={readerState.ctrls.value().mode}
          readDirection={readerState.ctrls.value().readDirection}
          scrollWidthScale={readerState.scrollViewport.widthScale()}
          window={readerState.navi.viewportWindow()}
        />
      </ViewportCanvas>
      <Show when={readerState.ctrls.value().mode === "scroll" && totalPages > 1}>
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
  let pendingInitialScrollWidthScale = untrack(() => appState.reader.scrollWidthScale.reload());
  const horizontalMode = () => state.ctrls.value().mode !== "scroll";
  const pageTurnStep = () => state.ctrls.value().mode === "double-page" ? 2 : 1;
  const updateReaderViewportWidth = () => state.scrollViewport.setViewportWidth(Math.max(1, window.innerWidth));

  createEffect(() => {
    if (!state.navi.downloadInfo()?.imageWidth || pendingInitialScrollWidthScale === null) {
      return;
    }
    const initialWidthScale = pendingInitialScrollWidthScale;
    pendingInitialScrollWidthScale = null;
    state.scrollViewport.setWidthScale(initialWidthScale);
  });

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
    if (state.ctrls.value().mode === "double-page") {
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
    if (horizontalMode()) {
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
    const image = loadedImages.get(pageNum);
    if (image) {
      loadedImages.delete(pageNum);
      loadedImages.set(pageNum, image);
    }
    state.navi.setDownloadInfo(image && isRealPageNum(pageNum) ? {
      currentFileName: displayedImageFileName(options.galleryId, pageNum, image.imageUrl),
      currentImageUrl: image.imageUrl,
      imageWidth: viewportActions.pageImageWidth(pageNum) ?? image.width,
      originalImageUrl: image.originalImageUrl,
      pageNum,
    } : null);
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
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      if (state.overlay.image() === null) {
        turnPageBy(event.key === "ArrowLeft" ? state.navi.leftTapDelta() : state.navi.rightTapDelta());
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
      window.addEventListener("resize", updateReaderViewportWidth);
      viewportActions.focus();
      updatePageNumber();
      syncAfterPageChange({ scrollIntoView: true });
    },
    cleanup: () => {
      document.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("resize", updateReaderViewportWidth);
    },
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
    let adjustmentStartWidthScale = state.scrollViewport.widthScale();
    const updateImageScale = (scale: number | null): void => {
      pendingInitialScrollWidthScale = null;
      if (scale === null) {
        state.scrollViewport.setWidthScale(null);
        return;
      }
      const imageWidth = state.navi.downloadInfo()?.imageWidth;
      if (imageWidth) {
        state.scrollViewport.setWidthScale(normalizeReaderScrollViewportWidth(
          imageWidth * scale / state.scrollViewport.viewportWidth(),
        ));
      }
    };

    return {
      open: () => {
        pendingInitialScrollWidthScale = null;
        adjustmentStartWidthScale = state.scrollViewport.widthScale();
        state.scrollViewport.setAdjusting(true);
      },
      callbacks: {
        onApply: () => state.scrollViewport.setAdjusting(false),
        onApplyAll: () => {
          appState.reader.scrollWidthScale.set(state.scrollViewport.widthScale());
          state.scrollViewport.setAdjusting(false);
        },
        onClose: () => {
          state.scrollViewport.setWidthScale(adjustmentStartWidthScale);
          state.scrollViewport.setAdjusting(false);
        },
        onFit: () => updateImageScale(null),
        onOneToOne: () => state.scrollViewport.setWidthScale("one-to-one"),
        onScaleChange: updateImageScale,
      },
    };
  }

  function wireViewport(): PagesViewportCallbacks {
    let scrollFrame: number | null = null;
    let scrollBarTimer: number | null = null;
    let scrollGestureTimer: number | null = null;
    let previousScrollTop: number | null = null;
    let scrollDistance = 0;

    const updateScrollBarActivity = (): void => {
      const currentScrollTop = viewportActions.scrollTop();
      if (previousScrollTop !== null) {
        scrollDistance += Math.abs(currentScrollTop - previousScrollTop);
      }
      previousScrollTop = currentScrollTop;
      if (scrollDistance >= SCROLL_BAR_SHOW_DISTANCE) {
        state.scrollBar.updateVisible(true);
      }
      if (scrollDistance >= window.innerHeight * SCROLL_BAR_EXPAND_VIEWPORTS) {
        state.scrollBar.updateExpanded(true);
      }
      session.clearTimeout(scrollGestureTimer);
      scrollGestureTimer = session.setTimeout(() => {
        scrollGestureTimer = null;
        scrollDistance = 0;
        previousScrollTop = viewportActions.scrollTop();
      }, SCROLL_GESTURE_IDLE_MS);
      session.clearTimeout(scrollBarTimer);
      scrollBarTimer = session.setTimeout(() => {
        scrollBarTimer = null;
        scrollDistance = 0;
        previousScrollTop = viewportActions.scrollTop();
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
        if (state.overlay.image() !== null || horizontalMode()) {
          return;
        }
        if (state.scrollViewport.adjusting()) {
          return;
        }
        updateScrollBarActivity();
        if (viewportActions.isDragging()) {
          return;
        }
        const previousScrollTop = viewportActions.scrollTop();
        viewportActions.moveToTop(previousScrollTop);
        if (viewportActions.scrollTop() !== previousScrollTop || scrollFrame !== null) {
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
        if (!horizontalMode()) {
          return;
        }
        event.preventDefault();
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
      try {
        await viewportActions.loadPageImage(target.pageNum, token, {
          imageUrl,
          highPriority: target.pageNum === state.navi.currentPageNum() || (
            state.ctrls.value().mode === "double-page" &&
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
      if (!closed) {
        if (target.pageNum === state.navi.currentPageNum()) {
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

    const updateControls = (controls: ReaderControls): void => {
      const previous = state.ctrls.value();
      appState.reader.viewMode.set(controls.mode);
      appState.reader.readDirection.set(controls.readDirection);
      appState.reader.rightTapAction.set(controls.rightTapAction);
      state.ctrls.update(controls);
      if (controls.mode !== "scroll") {
        state.scrollViewport.setAdjusting(false);
      }

      if (controls.mode !== previous.mode) {
        viewportActions.stopMotion();
        viewportActions.resetPosition();
        syncAfterPageChange({ scrollIntoView: true });
      } else if (controls.readDirection !== previous.readDirection) {
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
    const gesture: PointerGestureCallbacks = {};
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
      horizontalMode() ||
      event.pointerType === "mouse";
    const imageAtPoint = (point: { clientX: number; clientY: number }): ZoomOverlayImage | null => {
      const pageNum = viewportActions.pageNumAtPoint(point);
      return pageNum === null ? null : loadedImages.get(pageNum) ?? null;
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
      } else if (appState.reader.viewMode.value === "scroll") {
        state.toolbar.toggle();
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
      if (!horizontalMode()) {
        viewportActions.moveToTop(viewportActions.scrollTop());
        viewportActions.startVerticalFlingFromDragVelocity(info.velocityY, () => updateCurrentFromScroll());
        updateCurrentFromScroll();
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
