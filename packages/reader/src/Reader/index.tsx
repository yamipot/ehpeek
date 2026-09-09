import { batch, createEffect, onCleanup, onMount, Show, untrack } from "solid-js";
import { createReadProgressPublisher, type ReadProgressPort } from "../features/ReadProgressSyncer";
import type { ContentSource, ReaderCustomization, LoadedReaderPage, ReaderPage, ReaderSettingsState } from "../kit/interfaces";

import { useOverlayHost } from "../kit/Widgets/OverlayHost";
import { useReaderTexts } from "../kit/i18n";
import { currentReaderOrientation, normalizeReaderScrollSizeScale } from "../features/ReaderSettings";
import {
  clamp,
  normalizedAspectRatio,
  positiveNumber,
} from "../kit/helpers";
import type { ScrollMotion } from "../kit/animation";
import type { PointerDragEnd, PointerGestureCallbacks } from "../kit/PointerGesture";
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
import {
  doublePagePairStart,
  ReaderSession,
  type ReaderLoadTarget,
  type ReaderOptions,
} from "./session";
import { ReaderScrollBar } from "./ScrollBar";
import { ViewportCanvas, type ViewportCanvasCallbacks } from "./ViewportCanvas";
import "../styles";
import { bindInteractionGate } from "../features/InteractionGate";

const VIEWER_ID = "ehpeek-reader";
const DEFAULT_WINDOW_SIZE = 10;

const PAGED_SWIPE_THRESHOLD = 24;
const PAGED_PREVIEW_SWIPE_THRESHOLD = 48;
const PAGED_PREVIEW_SWIPE_AXIS_LIMIT = 32;
const PAGED_WHEEL_THRESHOLD = 8;
const HORIZONTAL_SCROLL_WHEEL_FACTOR = 0.5;
const PROGRESS_IDLE_COMMIT_MS = 180;
const LOADED_IMAGE_INFO_CACHE_LIMIT = 160;
const PROGRESSIVE_IMAGE_SIZE_THRESHOLD = 2 * 1024 * 1024;
const CONCURRENT_IMAGE_BYTE_LIMIT = 6 * 1024 * 1024;
const MIN_CONCURRENT_IMAGE_LOADS = 3;
const SCROLL_GESTURE_IDLE_MS = 160;
const SCROLL_BAR_IDLE_MS = 900;
const SCROLL_BAR_SHOW_DISTANCE = 48;
const SCROLL_BAR_EXPAND_VIEWPORTS = 2;
const MOUSE_HOLD_ZOOM_MS = 350;
const ZOOM_DOUBLE_TAP_MS = 300;
const ZOOM_DOUBLE_TAP_DISTANCE = 36;
const ZOOM_DOUBLE_TAP_SCALE = 1.2;
const TAP_CANCEL_DISTANCE = 8;
const FALLBACK_ASPECT_RATIO = 1.42;
export type { ReaderOptions } from "./session";

type LoadedReaderImage = ZoomOverlayImage & {
  originalImageUrl: string | null;
  fileName?: string;
  originalFileName?: string;
  byteSize?: number | null;
  displayWhileLoading?: boolean;
};

export type ReaderActions = {
  progress: ReadProgressPort;
  gotoPage: (pageNum: number) => void;
};

export type ReaderCallbacks = {
  onClose: () => boolean;
  onProgress: (page: ReaderPage) => void;
  onEnd: () => void;
  onOpenPreview: (pageNum: number) => void;
  onToggleFullscreen: () => void;
};
export type ReaderProps = {
  disabled?: boolean;
  callbacks: ReaderCallbacks;
  actionsRef: (actions: ReaderActions | null) => void;
  settings: ReaderSettingsState;
  customization?: ReaderCustomization;
  fullscreenActive: boolean;
  options: ReaderOptions;
  source: ContentSource;
};

export function Reader(props: ReaderProps) {
  const overlayHost = useOverlayHost();
  const options = untrack(() => props.options);
  const totalPages = options.totalPages ?? 0;
  const source = untrack(() => props.source);
  const session = new ReaderSession(options, untrack(() => props.settings));
  const readerState = session.state;
  const scrollFitPageNum = readerState.navi.currentPageNum();
  let readerElement!: HTMLDivElement;
  const disabled = () => props.disabled ?? false;
  untrack(() => bindInteractionGate(() => readerElement, disabled));
  const publisher = createReadProgressPublisher();
  const clientCallbacks = untrack(() => props.callbacks);
  const readerCallbacks = untrack(() => wireReaderCallbacks(
    session,
    options,
    source,
    {
      ...clientCallbacks,
      onProgress: page => {
        if (page.pageNum) publisher.publish(page.pageNum);
        clientCallbacks.onProgress(page);
      },
    },
    untrack(() => props.settings),
    untrack(() => props.customization) ?? {},
    () => readerElement,
    disabled,
  ));
  untrack(() => props.actionsRef)({
    gotoPage: readerCallbacks.gotoPage,
    progress: {
      current: readerState.navi.currentPageNum,
      subscribe: publisher.subscribe,
      setProgress: readerCallbacks.syncProgress,
    },
  });
  let previousFullscreenActive = untrack(() => props.fullscreenActive);
  const viewportPageLayout = () =>
    readerState.ctrls.value().pageLayout === "double" &&
      readerState.ctrls.value().firstPageSeparate &&
      readerState.navi.currentPageNum() === 1
      ? "single"
      : readerState.ctrls.value().pageLayout;

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

  onCleanup(() => {
    props.actionsRef(null);
    readerCallbacks.cleanup();
    session.dispose();
  });
  onMount(readerCallbacks.init);

  return (
    <div
      ref={readerElement}
      id={VIEWER_ID}
      class="ehpeek-reader"
      data-navigation-mode={readerState.ctrls.value().navigationMode}
      data-page-layout={viewportPageLayout()}
      data-read-direction={readerState.ctrls.value().direction}
    >
      <Show when={!readerState.scrollViewport.adjusting()}>
        <header class="ehpeek-reader-header">
          <Toolbar
            disabled={props.disabled}
            callbacks={readerCallbacks.toolbar}
            customization={props.customization}
            leftHandedControls={props.settings.value().leftHandedControls}
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
        disabled={props.disabled}
        adjusting={readerState.scrollViewport.adjusting()}
        callbacks={readerCallbacks.viewportCanvas}
        scaleMode={readerState.scrollViewport.scaleMode()}
        scalePercent={readerState.scrollViewport.scalePercent()}
      >
        <PagesViewport
          disabled={props.disabled}
          actionsRef={readerCallbacks.viewportActionsRef}
          callbacks={readerCallbacks.viewport}
          decodedImageCacheLimit={options.decodedImageCacheLimit}
          direction={readerState.ctrls.value().direction}
          navigationMode={readerState.ctrls.value().navigationMode}
          pageLayout={viewportPageLayout()}
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
          disabled={props.disabled}
          callbacks={readerCallbacks.toolbar}
          currentPage={readerState.navi.currentPageNum()}
          expanded={readerState.scrollBar.expanded()}
          narrow={readerState.scrollViewport.viewportWidth() < window.innerWidth}
          pixelScale={overlayHost.fullscreenPixelScale()}
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
  source: ContentSource,
  callbacks: ReaderCallbacks,
  settings: ReaderSettingsState,
  customization: ReaderCustomization,
  readerElement: () => HTMLElement,
  disabled: () => boolean,
) {
  const texts = useReaderTexts();
  const state = session.state;
  let viewportActions!: PagesViewportActions;
  let zoomOverlay!: ZoomOverlayActions;
  const totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
  const renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
  const preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE;
  const loadController = new AbortController();
  const pages = new Map<number, ReaderPage>();
  const loadedImages = new Map<number, LoadedReaderImage>();
  let pagedTargetPageNumber: number | null = null;
  let syncToken = 0;
  let closed = false;
  let lastReportedPageNum: number | null = null;
  let loadDirection: -1 | 1 = 1;
  let loadDirectionEdgePageNum = state.navi.currentPageNum();
  const scrollFitPageNum = state.navi.currentPageNum();
  const pagedMode = () => state.ctrls.value().navigationMode === "paged";
  const doublePageActive = () =>
    pagedMode() &&
    state.ctrls.value().pageLayout === "double" &&
    !(state.ctrls.value().firstPageSeparate && state.navi.currentPageNum() === 1);
  const stopViewportMotion = () => {
    pagedTargetPageNumber = null;
    viewportActions.stopMotion();
  };
  let readerOrientation = currentReaderOrientation();
  let viewportResizeObserver: ResizeObserver | null = null;
  const updateReaderViewportSize = () => {
    const viewport = readerElement();
    state.scrollViewport.setViewportWidth(Math.max(1, viewport.clientWidth));
    state.scrollViewport.setViewportHeight(Math.max(1, viewport.clientHeight));
    const nextOrientation = currentReaderOrientation();
    if (nextOrientation !== readerOrientation) {
      readerOrientation = nextOrientation;
      applyControls(configuredReaderControls());
    }
  };

  function configuredReaderControls(): ReaderControls {
    const controls = settings.controls();
    const navigationMode = controls.navigationMode;
    return {
      navigationMode,
      direction: navigationMode === "scroll"
        ? controls.scrollDirection
        : controls.pagedDirection,
      firstPageSeparate: state.ctrls.value().firstPageSeparate,
      pageLayout: controls.pageLayout,
      rightTapAction: controls.rightTapAction,
    };
  }

  function updateControls(requestedControls: ReaderControls): void {
    const previous = state.ctrls.value();
    const persistedControls = settings.controls();
    const controls = requestedControls.navigationMode === previous.navigationMode
      ? requestedControls
      : {
          ...requestedControls,
          direction: requestedControls.navigationMode === "scroll"
            ? persistedControls.scrollDirection
            : persistedControls.pagedDirection,
        };
    batch(() => {
      settings.updateControls({
        ...persistedControls,
        navigationMode: controls.navigationMode,
        ...(controls.navigationMode === "scroll"
          ? { scrollDirection: controls.direction }
          : { pagedDirection: controls.direction }),
        pageLayout: controls.pageLayout,
        rightTapAction: controls.rightTapAction,
      });
      applyControls(controls);
    });
  }

  createEffect(() => {
    settings.controls();
    untrack(() => applyControls(configuredReaderControls()));
  });

  function applyControls(controls: ReaderControls): void {
    const previous = state.ctrls.value();
    if (Object.keys(controls).every((key) =>
      controls[key as keyof ReaderControls] === previous[key as keyof ReaderControls]
    )) return;
    const currentPageNum = state.navi.currentPageNum();
    state.ctrls.update(controls);
    if (controls.navigationMode !== "scroll") {
      state.scrollViewport.setAdjusting(false);
    }

    if (
      controls.navigationMode !== previous.navigationMode ||
      controls.pageLayout !== previous.pageLayout ||
      controls.firstPageSeparate !== previous.firstPageSeparate
    ) {
      stopViewportMotion();
      viewportActions.resetPosition();
      // Align after PagesViewport has applied the new mode's layout.
      session.requestAnimationFrame(() => {
        setCurrentPageNumber(currentPageNum, true);
      });
    } else if (controls.direction !== previous.direction) {
      syncViewportWindow();
      scrollToCurrentPage();
    }
  }

  function requestReaderClose(): void {
    if (closed) {
      return;
    }
    closed = callbacks.onClose();
  }

  function imageAtPoint(point: { clientX: number; clientY: number }): ZoomOverlayImage | null {
    const pageNum = viewportActions.pageNumAtPoint(point);
    return pageNum === null || !viewportActions.pageImageReady(pageNum)
      ? null
      : loadedImages.get(pageNum) ?? null;
  }

  function prepareZoomAtPoint(
    point: { clientX: number; clientY: number },
    scaleMultiplier = 1,
  ): boolean {
    const image = imageAtPoint(point);
    if (!image) {
      return false;
    }
    stopViewportMotion();
    viewportActions.cancelDrag();
    const zoomScale = viewportActions.pageZoomScale(image.pageNum);
    state.overlay.update(image);
    zoomOverlay.reset({
      centerX: point.clientX,
      centerY: point.clientY,
      scale: zoomScale * scaleMultiplier,
    });
    return true;
  }

  function setCurrentPageNumber(pageNumber: number, scrollIntoView: boolean, scrollMotion: ScrollMotion = "instant"): void {
    pagedTargetPageNumber = null;
    const target = normalizedPageNumber(
      clamp(Math.round(pageNumber), 1, maxReaderPageNum()),
    );
    if (target !== state.navi.currentPageNum()) {
      state.navi.setDirection(target > state.navi.currentPageNum() ? 1 : -1);
      state.navi.setCurrentPageNum(target);
    }
    syncAfterPageChange({ scrollIntoView, scrollMotion });
  }

  function normalizedPageNumber(pageNum: number): number {
    if (
      !pagedMode() ||
      state.ctrls.value().pageLayout !== "double" ||
      (totalPages !== undefined && pageNum === totalPages + 1)
    ) {
      return pageNum;
    }
    return doublePagePairStart(pageNum, state.ctrls.value().firstPageSeparate);
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
      scrollToCurrentPage({ motion: options.scrollMotion });
    }
    if (missing.length > 0) {
      void loadMissingPages(missing, token);
    }
  }

  async function loadMissingPages(pageNums: number[], token: number): Promise<void> {
    await Promise.all(pageNums.map(async (pageNum) => {
      const groupPageNums = [pageNum];
      const loadingTokens = new Map(groupPageNums.flatMap((pageNum) => {
        const loadingToken = viewportActions.markPageLoading(pageNum);
        return loadingToken === null ? [] : [[pageNum, loadingToken] as const];
      }));
      let incoming: ReaderPage[];
      try {
        incoming = await source.getPages(groupPageNums, loadController.signal);
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
    const firstVisiblePageNum =
      viewportActions.firstVisiblePageNum() ?? state.navi.currentPageNum();
    const movement = (firstVisiblePageNum - loadDirectionEdgePageNum) *
      loadDirection;
    if (movement >= 0) {
      loadDirectionEdgePageNum = firstVisiblePageNum;
    } else if (-movement > 2) {
      loadDirection = loadDirection === 1 ? -1 : 1;
      loadDirectionEdgePageNum = firstVisiblePageNum;
    }
    const pageNums = [firstVisiblePageNum];
    for (let offset = 1; offset <= preloadWindowSize; offset += 1) {
      pageNums.push(firstVisiblePageNum + offset * loadDirection);
    }
    pageNums.push(firstVisiblePageNum - loadDirection);
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

  function maxReaderPageNum(): number {
    return totalPages ? totalPages + 1 : Number.MAX_SAFE_INTEGER;
  }

  function maxProgressPageNum(): number {
    return totalPages ?? Number.MAX_SAFE_INTEGER;
  }

  function isRealPageNum(pageNum: number): boolean {
    return pageNum >= 1 && (!totalPages || pageNum <= totalPages);
  }

  function turnPageBy(delta: number): void {
    if (pagedMode()) {
      const base = pagedTargetPageNumber ?? state.navi.currentPageNum();
      const firstPageSeparate = state.ctrls.value().firstPageSeparate;
      let pageDelta = delta;
      if (state.ctrls.value().pageLayout === "double") {
        if (totalPages !== undefined && base === totalPages + 1 && delta < 0) {
          pageDelta = doublePagePairStart(totalPages, firstPageSeparate) - base;
        } else if (firstPageSeparate && base === 1 && delta > 0) {
          pageDelta = 1;
        } else if (firstPageSeparate && base === 2 && delta < 0) {
          pageDelta = -1;
        } else {
          pageDelta = delta * 2;
        }
      }
      animatePagedStep(pageDelta);
      return;
    }
    setCurrentPageNumber(state.navi.currentPageNum() + delta, true);
  }

  function animatePagedStep(delta: number): void {
    const base = pagedTargetPageNumber ?? state.navi.currentPageNum();
    const target = clamp(Math.round(base + delta), 1, maxReaderPageNum());
    if (target === base) {
      scrollToCurrentPage({ motion: "animated", overrideTarget: false });
      return;
    }
    if (viewportActions.pageOffset(target) === null) {
      setCurrentPageNumber(target, true, "animated");
      return;
    }
    state.navi.setDirection(target > base ? 1 : -1);
    pagedTargetPageNumber = target;
    viewportActions.moveToPage(target, "animated", () => {
      if (pagedTargetPageNumber !== target) {
        return;
      }
      setCurrentPageNumber(target, true);
    });
  }

  function scrollToCurrentPage({
    motion = "instant",
    overrideTarget = true,
  }: {
    motion?: ScrollMotion;
    overrideTarget?: boolean;
  } = {}): void {
    if (pagedTargetPageNumber !== null && !overrideTarget) {
      return;
    }
    pagedTargetPageNumber = null;
    viewportActions.moveToPage(state.navi.currentPageNum(), motion);
  }

  function updatePageNumber(): void {
    const pageNum = state.navi.currentPageNum();
    const downloadPageNums = doublePageActive()
      ? [pageNum, pageNum + 1]
      : [pageNum];
    state.navi.setDownloadInfos(downloadPageNums.flatMap((downloadPageNum) => {
      const image = loadedImages.get(downloadPageNum);
      if (!image || !isRealPageNum(downloadPageNum)) {
        return [];
      }
      loadedImages.delete(downloadPageNum);
      loadedImages.set(downloadPageNum, image);
      const currentFileName = image.fileName ?? `page-${downloadPageNum}.${imageFileExtension(image.imageUrl) || "webp"}`;
      return [{
        currentFileName,
        currentImageUrl: image.imageUrl,
        imageHeight: viewportActions.pageImageHeight(downloadPageNum) ?? image.height,
        imageWidth: viewportActions.pageImageWidth(downloadPageNum) ?? image.width,
        originalFileName: image.originalFileName ?? currentFileName,
        originalImageUrl: image.originalImageUrl,
        pageNum: downloadPageNum,
      }];
    }));
    state.navi.setMaxProgressPageNum(Math.max(1, maxProgressPageNum()));
  }

  function notifyActivePageChange(): void {
    const page = pages.get(state.navi.currentPageNum());
    if (page && page.pageNum !== lastReportedPageNum) {
      lastReportedPageNum = page.pageNum ?? null;
      callbacks.onProgress(page);
    }
  }

  function updateCurrentFromScroll(): void {
    const next = viewportActions.centerPageNum();
    if (next !== null && next !== state.navi.currentPageNum()) {
      state.navi.setDirection(next > state.navi.currentPageNum() ? 1 : -1);
      state.navi.setCurrentPageNum(next);
      syncAfterPageChange({ scrollIntoView: false });
      return;
    }
    maintainLoadQueue();
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (disabled() || shouldIgnoreKeyboardEvent(event)) {
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
  createEffect(() => {
    if (!disabled()) return;
    untrack(() => {
      stopViewportMotion();
      viewportActions.cancelDrag();
      scrollViewport.endPinch();
      state.navi.setProgressInputActive(false);
    });
  });

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
      updateReaderViewportSize();
      viewportResizeObserver = new ResizeObserver(updateReaderViewportSize);
      viewportResizeObserver.observe(readerElement());
      viewportActions.focus();
      updatePageNumber();
      syncAfterPageChange({ scrollIntoView: true });
    },
    cleanup: () => {
      closed = true;
      loadController.abort();
      document.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("resize", updateReaderViewportSize);
      viewportResizeObserver?.disconnect();
      viewportResizeObserver = null;
    },
    gotoPage: (pageNum: number) => setCurrentPageNumber(pageNum, true),
    syncProgress: (pageNum: number) => {
      lastReportedPageNum = normalizedPageNumber(
        clamp(Math.round(pageNum), 1, maxReaderPageNum()),
      );
      setCurrentPageNumber(pageNum, true);
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
    endPinch: () => void;
    movePinch: (scale: number) => void;
    open: () => void;
    pinching: () => boolean;
    startPinch: () => boolean;
  } {
    let adjustmentStartSizeScale = state.scrollViewport.sizeScale();
    let pinchStartScale: number | null = null;
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
      startPinch: () => {
        const scalePercent = state.scrollViewport.scalePercent();
        if (scalePercent === null) {
          return false;
        }
        pinchStartScale = scalePercent / 100;
        return true;
      },
      movePinch: (scale) => {
        if (pinchStartScale === null) {
          return;
        }
        updateImageScale(clamp(pinchStartScale * scale, 0.1, 5));
      },
      endPinch: () => {
        pinchStartScale = null;
      },
      pinching: () => pinchStartScale !== null,
      open: () => {
        adjustmentStartSizeScale = state.scrollViewport.sizeScale();
        state.scrollViewport.setAdjusting(true);
      },
      callbacks: {
        onApply: () => state.scrollViewport.setAdjusting(false),
        onApplyAll: () => {
          settings.set(
            state.ctrls.value().direction === "ttb" ? "scrollTtbScale" : "scrollHorizontalScale",
            state.scrollViewport.sizeScale(),
          );
          state.scrollViewport.setAdjusting(false);
        },
        onClose: () => {
          state.scrollViewport.setSizeScale(adjustmentStartSizeScale);
          state.scrollViewport.setAdjusting(false);
        },
        onFill: () => state.scrollViewport.setSizeScale("fill"),
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
        const deltaPixels = wheelDeltaPixels(delta, event.deltaMode);
        if (state.overlay.image() !== null) {
          event.preventDefault();
          zoomOverlay.moveWheel({
            centerX: event.clientX,
            centerY: event.clientY,
            delta: deltaPixels,
          });
          return;
        }
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (!pagedMode()) {
            if (scrollViewport.startPinch()) {
              scrollViewport.movePinch(
                Math.exp(-clamp(deltaPixels, -100, 100) * 0.0025),
              );
              scrollViewport.endPinch();
            }
            return;
          }
          if (!prepareZoomAtPoint(event)) {
            return;
          }
          zoomOverlay.moveWheel({
            centerX: event.clientX,
            centerY: event.clientY,
            delta: deltaPixels,
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
              deltaPixels * direction * HORIZONTAL_SCROLL_WHEEL_FACTOR,
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
    const imagePageLoadController = new AbortController();
    const acquireImageLoadBudget = createImageLoadBudget(
      CONCURRENT_IMAGE_BYTE_LIMIT,
      MIN_CONCURRENT_IMAGE_LOADS,
    );

    onCleanup(() => imagePageLoadController.abort());

    const rememberLoadedImage = (pageNum: number, loaded: LoadedReaderPage): LoadedReaderImage => {
      const image = {
        ...loaded,
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
          displayWhileLoading: loaded.displayWhileLoading ?? (
            imageFileExtension(imageUrl) === "gif" ||
            imageFileExtension(loaded.originalImageUrl ?? "") === "gif" ||
            (loaded.byteSize ?? 0) > PROGRESSIVE_IMAGE_SIZE_THRESHOLD
          ),
          imageUrl,
          highPriority: target.pageNum === state.navi.currentPageNum() || (
          doublePageActive() &&
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
          doublePageActive() &&
          target.pageNum === currentPageNum + 1
        )) {
          updatePageNumber();
        }
      }
    };

    session.imageQueue.updateCallbacks({
      loadTarget: (target) => Promise.resolve(
        loadedImages.get(target.pageNum) ??
        source.loadImage(target.page, imagePageLoadController.signal),
      ),
      markLoading: (target) => viewportActions.markPageLoading(target.pageNum),
      onLoaded: async (target, loaded, token) => {
        const image = rememberLoadedImage(target.pageNum, loaded);
        if (!pageWindowNumbers(state.navi.currentPageNum(), renderWindowSize).includes(target.pageNum)) {
          return;
        }
        const releaseBudget = await acquireImageLoadBudget(
          image.byteSize ?? CONCURRENT_IMAGE_BYTE_LIMIT,
        );
        try {
          if (!pageWindowNumbers(state.navi.currentPageNum(), renderWindowSize).includes(target.pageNum)) {
            return;
          }
          await installImage(target, image, token);
        } finally {
          releaseBudget();
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

    const cancelProgressNavigation = (): void => {
      if (progressNavigationTimer !== null) {
        session.clearTimeout(progressNavigationTimer);
        progressNavigationTimer = null;
      }
    };
    const previewProgress = (pageNum: number): void => {
      const target = normalizedPageNumber(
        clamp(Math.round(pageNum), 1, maxProgressPageNum()),
      );
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
    createEffect(() => {
      if (!disabled()) return;
      cancelProgressNavigation();
      pendingProgressPageNum = null;
    });

    toolbar.onCloseClick = requestReaderClose;
    toolbar.onControlsChange = updateControls;
    toolbar.onFullscreenClick = callbacks.onToggleFullscreen;
    toolbar.onOpenOriginalPageClick = (): void => {
      const page = pages.get(state.navi.currentPageNum());
      if (page && isRealPageNum(state.navi.currentPageNum())) {
        customization.onOpenOriginalPage?.(page.url, page.pageNum ?? state.navi.currentPageNum());
      }
    };
    toolbar.onOpenScrollPreviewClick = (): void => {
      callbacks.onOpenPreview(state.navi.currentPageNum());
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
    const gesture: PointerGestureCallbacks = { dragAxis: "any" };
    let lastZoomTap: { clientX: number; clientY: number; time: number } | null = null;
    const isZoomDoubleTap = (
      info: PointerDragEnd,
      event: PointerEvent | MouseEvent,
    ): boolean => {
      const now = event.timeStamp || performance.now();
      const doubleTap = lastZoomTap !== null &&
        now - lastZoomTap.time <= ZOOM_DOUBLE_TAP_MS &&
        Math.hypot(
            info.clientX - lastZoomTap.clientX,
            info.clientY - lastZoomTap.clientY,
          ) <= ZOOM_DOUBLE_TAP_DISTANCE;
      lastZoomTap = doubleTap
        ? null
        : { clientX: info.clientX, clientY: info.clientY, time: now };
      return doubleTap;
    };
    const isPageReloadButtonTarget = (event: PointerEvent | MouseEvent): boolean =>
      event.target instanceof Element &&
      event.target.closest(".ehpeek-reader-page-reload") !== null;
    const shouldStartDrag = (event: PointerEvent): boolean =>
      state.overlay.image() !== null ||
      pagedMode() ||
      state.ctrls.value().direction !== "ttb" ||
      event.pointerType === "mouse";
    const isPreviewSwipe = (info: PointerDragEnd): boolean => {
      if (!pagedMode()) {
        return false;
      }
      return state.ctrls.value().direction === "ttb"
        ? Math.abs(info.dx) >= PAGED_PREVIEW_SWIPE_THRESHOLD &&
          Math.abs(info.dy) <= PAGED_PREVIEW_SWIPE_AXIS_LIMIT
        : info.dy >= PAGED_PREVIEW_SWIPE_THRESHOLD &&
          Math.abs(info.dx) <= PAGED_PREVIEW_SWIPE_AXIS_LIMIT;
    };
    const runSingleTap = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
      if (state.overlay.image() !== null) {
        event.preventDefault();
      } else if (viewportActions.isHitEndPage(info)) {
        callbacks.onEnd();
        requestReaderClose();
      } else {
        const zone = viewportActions.viewportXRatio(info.clientX);
        if (zone >= 1 / 3 && zone <= 2 / 3) {
          state.toolbar.toggle();
        } else {
          turnPageBy(zone < 1 / 3 ? state.navi.leftTapDelta() : state.navi.rightTapDelta());
        }
      }
    };
    gesture.onTap = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
      viewportActions.cancelDrag();
      if (state.overlay.image() !== null) {
        if (isZoomDoubleTap(info, event)) {
          state.overlay.update(null);
        }
        event.preventDefault();
        return;
      }

      const zone = viewportActions.viewportXRatio(info.clientX);
      const centerTap = zone >= 1 / 3 && zone <= 2 / 3;
      if (centerTap) {
        if (
          isZoomDoubleTap(info, event) &&
          prepareZoomAtPoint(info, ZOOM_DOUBLE_TAP_SCALE)
        ) {
          state.toolbar.close();
          event.preventDefault();
          return;
        }
      } else {
        lastZoomTap = null;
      }
      runSingleTap(info, event);
    };
    gesture.holdDelay = MOUSE_HOLD_ZOOM_MS;
    gesture.onHold = (info, event) => {
      const mouseInput = event instanceof PointerEvent
        ? event.pointerType === "mouse"
        : event instanceof MouseEvent;
      if (!mouseInput) {
        return false;
      }
      lastZoomTap = null;
      if (state.overlay.image() !== null) {
        state.overlay.update(null);
        return "consume";
      }
      if (!prepareZoomAtPoint(info)) {
        return false;
      }
      zoomOverlay.movePinch({ centerX: info.clientX, centerY: info.clientY, scale: 2 });
      zoomOverlay.endPinch();
      return "drag";
    };
    gesture.onStart = (): void => {
      if (state.overlay.image() !== null) {
        zoomOverlay.startDrag();
        return;
      }
      pagedTargetPageNumber = null;
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
    };
    gesture.onEnd = (info: PointerDragEnd): void => {
      if (state.overlay.image() !== null) {
        return;
      }
      viewportActions.cancelDrag();
      if (isPreviewSwipe(info)) {
        scrollToCurrentPage({ motion: "animated" });
        callbacks.onOpenPreview(state.navi.currentPageNum());
        return;
      }
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
          scrollToCurrentPage({ motion: "animated" });
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
        scrollToCurrentPage({ motion: "animated" });
      }
    };
    gesture.onPinchStart = (info: {
      clientX: number;
      clientY: number;
    }): boolean => {
      lastZoomTap = null;
      stopViewportMotion();
      viewportActions.cancelDrag();
      if (!pagedMode() && state.overlay.image() === null) {
        return scrollViewport.startPinch();
      }
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
    gesture.onPinchMove = (info: { clientX: number; clientY: number; scale: number }) => {
      if (scrollViewport.pinching()) {
        scrollViewport.movePinch(info.scale);
        return;
      }
      zoomOverlay.movePinch({
        centerX: info.clientX,
        centerY: info.clientY,
        scale: info.scale,
      });
    };
    gesture.onPinchEnd = () => {
      if (scrollViewport.pinching()) {
        scrollViewport.endPinch();
        return;
      }
      zoomOverlay.endPinch();
    };
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

function createImageLoadBudget(maxBytes: number, minConcurrentLoads: number) {
  type Waiter = {
    bytes: number;
    resolve: (release: () => void) => void;
  };
  const waiters: Waiter[] = [];
  let activeBytes = 0;
  let activeLoads = 0;

  const drain = (): void => {
    const next = waiters[0];
    if (
      !next ||
      (activeLoads >= minConcurrentLoads && activeBytes + next.bytes > maxBytes)
    ) {
      return;
    }
    waiters.shift();
    activeBytes += next.bytes;
    activeLoads += 1;
    let released = false;
    next.resolve(() => {
      if (released) {
        return;
      }
      released = true;
      activeBytes = Math.max(0, activeBytes - next.bytes);
      activeLoads = Math.max(0, activeLoads - 1);
      drain();
    });
    drain();
  };

  return (bytes: number): Promise<() => void> =>
    new Promise((resolve) => {
      waiters.push({ bytes, resolve });
      drain();
    });
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
