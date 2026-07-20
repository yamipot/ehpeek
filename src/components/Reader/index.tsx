import { onCleanup, onMount, untrack } from "solid-js";
import type { GalleryPreviewCache } from "../../App/GalleryPreviewCache";
import texts from "../../texts.json";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import { state as appState } from "../../state";
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
import readerCss from "./index.css";

registerGlobalStyle("ehpeek-reader-style", readerCss);

const VIEWER_ID = "ehpeek-reader";
const DEFAULT_WINDOW_SIZE = 10;

const PAGED_SWIPE_THRESHOLD = 24;
const PAGED_WHEEL_THRESHOLD = 8;
const PROGRESS_IDLE_COMMIT_MS = 1000;
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
      class="fixed inset-0 z-reader ehp-color-reader font-sans textsize-sm leading-[1.4]"
      data-read-direction={readerState.ctrls.value().readDirection}
      data-view-mode={readerState.ctrls.value().mode}
    >
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
      <PagesViewport
        actionsRef={readerCallbacks.viewportActionsRef}
        callbacks={readerCallbacks.viewport}
        mode={readerState.ctrls.value().mode}
        readDirection={readerState.ctrls.value().readDirection}
        window={readerState.navi.viewportWindow()}
      />
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
  callbacks: ReaderCallbacks)
{
  const state = session.state;
  let viewportActions!: PagesViewportActions;
  let zoomOverlay!: ZoomOverlayActions;
  const totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
  const renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
  const preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE;
  const pages = new Map<number, ReaderPage>();
  const loadedImages = new Map<number, LoadedReaderImage>();
  let scrollFrame: number | null = null;
  let tapTimer: number | null = null;
  let pendingTap: {
    info: PointerDragEnd;
    event: PointerEvent | MouseEvent;
    time: number;
  } | null = null;
  let pagedTargetPageNumber: number | null = null;
  let syncToken = 0;
  let closed = false;

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

  function rebuildForCurrentMode(): void {
    viewportActions.stopMotion();
    viewportActions.resetPosition();
    syncAfterPageChange({ scrollIntoView: true });
  }

  async function loadMissingPages(pageNums: number[], token: number): Promise<void> {
    let incoming: ReaderPage[];
    try {
      incoming = await previewCache.getPages(pageNums);
    }
    catch (error) {
      console.error("[ehpeek]", error);
      return;
    }
    if (closed || token !== syncToken) {
      return;
    }
    addPages(incoming);
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
    const targets = pageWindowNumbers(state.navi.currentPageNum(), renderWindowSize)
      .map((pageNum) => loadTargetFor(pageNum))
      .filter((target): target is ReaderLoadTarget => Boolean(target));
    const windowSet = new Set(targets.map((target) => target.pageNum));
    session.imageQueue.sync(targets, state.navi.currentPageNum(), state.navi.direction(), windowSet, preloadWindowSize);
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
    if (appState.reader.viewMode.value === "paged") {
      animatePagedStep(delta);
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

  async function installImage(target: ReaderLoadTarget, loaded: LoadedReaderPage, token: number): Promise<void> {
    const imageUrl = loaded.imageUrl;
    const width = positiveNumber(loaded.width);
    const height = positiveNumber(loaded.height);
    const slotImage = {
      imageUrl,
      highPriority: target.pageNum === state.navi.currentPageNum(),
      width,
      height,
    };
    try {
      await viewportActions.loadPageImage(target.pageNum, token, slotImage);
    }
    catch (error) {
      const message = error instanceof Error ? error.message : texts.errors.imageLoadFailed;
      viewportActions.setPageError(target.pageNum, token, message);
      return;
    }
    if (!closed) {
      loadedImages.set(target.pageNum, {
        pageNum: target.pageNum,
        imageUrl,
        originalImageUrl: loaded.originalImageUrl ?? null,
        width,
        height,
      });
      if (target.pageNum === state.navi.currentPageNum()) {
        updatePageNumber();
      }
    }
  }

  function updatePageNumber(): void {
    const pageNum = state.navi.currentPageNum();
    const image = loadedImages.get(pageNum);
    state.navi.setDownloadInfo(image && isRealPageNum(pageNum) ? {
      currentFileName: displayedImageFileName(options.galleryId, pageNum, image.imageUrl),
      currentImageUrl: image.imageUrl,
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

  function runSingleTap(info: PointerDragEnd, event: PointerEvent | MouseEvent): void {
    if (state.overlay.image() !== null) {
      event.preventDefault();
      return;
    }
    if (viewportActions.isHitEndPage(info)) {
      requestReaderClose();
      return;
    }
    if (appState.reader.viewMode.value === "scroll") {
      state.toolbar.toggle();
      return;
    }
    const width = viewportActions.viewportWidth();
    const zone = info.clientX / width;
    if (zone >= 1 / 3 && zone <= 2 / 3) {
      state.toolbar.toggle();
    }
    else {
      turnPageBy(zone < 1 / 3 ? state.navi.leftTapDelta() : state.navi.rightTapDelta());
    }
  }

  function handleKeyboardClose(): boolean {
    if (state.overlay.image() !== null) {
      state.overlay.update(null);
      return true;
    }
    requestReaderClose();
    return true;
  }

  function toggleZoomAtPoint(point: {
    clientX: number;
    clientY: number;
  }): boolean {
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
    state.overlay.update(image);
    zoomOverlay.reset({ centerX: point.clientX, centerY: point.clientY });
    zoomOverlay.movePinch({ centerX: point.clientX, centerY: point.clientY, scale: 2 });
    zoomOverlay.endPinch();
    return true;
  }

  function imageAtPoint(point: {
    clientX: number;
    clientY: number;
  }): ZoomOverlayImage | null {
    const pageNum = viewportActions.pageNumAtPoint(point);
    return pageNum === null ? null : loadedImages.get(pageNum) ?? null;
  }

  function consumeDoubleTap(info: PointerDragEnd, event: PointerEvent | MouseEvent): boolean {
    const now = event.timeStamp || performance.now();
    const pending = pendingTap;
    const eventDetail = event instanceof MouseEvent ? event.detail : 0;
    const nativeDoubleClick = eventDetail >= 2;
    const nearPendingTap = pending
      ? now - pending.time <= DOUBLE_TAP_MS && Math.hypot(info.clientX - pending.info.clientX, info.clientY - pending.info.clientY) <= DOUBLE_TAP_DISTANCE
      : false;
    if (!nativeDoubleClick && !nearPendingTap) {
      return false;
    }
    cancelPendingTap();
    if (toggleZoomAtPoint(info)) {
      event.preventDefault();
      return true;
    }
    return false;
  }

  function queueSingleTap(info: PointerDragEnd, event: PointerEvent | MouseEvent): void {
    cancelPendingTap();
    pendingTap = {
      info,
      event,
      time: event.timeStamp || performance.now(),
    };
    tapTimer = session.setTimeout(() => {
      const pending = pendingTap;
      pendingTap = null;
      tapTimer = null;
      if (pending) {
        runSingleTap(pending.info, pending.event);
      }
    }, DOUBLE_TAP_MS);
  }

  function cancelPendingTap(): void {
    if (tapTimer !== null) {
      session.clearTimeout(tapTimer);
      tapTimer = null;
    }
    pendingTap = null;
  }

  function applyReaderControls(controls: ReaderControls): void {
    const previous = state.ctrls.value();
    appState.reader.viewMode.set(controls.mode);
    appState.reader.readDirection.set(controls.readDirection);
    appState.reader.rightTapAction.set(controls.rightTapAction);
    state.ctrls.update(controls);

    if (controls.mode !== previous.mode) {
      rebuildForCurrentMode();
    } else if (controls.readDirection !== previous.readDirection) {
      syncViewportWindow();
      scrollToCurrentPage();
    }
  }

  const gesture = {
    onTap: (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
      viewportActions.cancelDrag();
      if (consumeDoubleTap(info, event)) {
        return;
      }
      queueSingleTap(info, event);
    },
    onKeyboardClose: handleKeyboardClose,
    onKeyboardArrow: (direction: "left" | "right"): void => {
      if (state.overlay.image() !== null) {
        return;
      }
      turnPageBy(direction === "left" ? state.navi.leftTapDelta() : state.navi.rightTapDelta());
    },
    onWheel: (delta: number, event: WheelEvent): void => {
      if (state.overlay.image() !== null) {
        event.preventDefault();
        return;
      }
      if (appState.reader.viewMode.value !== "paged") {
        return;
      }
      event.preventDefault();
      if (viewportActions.isDragging()) {
        return;
      }
      if (Math.abs(delta) >= PAGED_WHEEL_THRESHOLD) {
        turnPageBy(delta > 0 ? 1 : -1);
      }
    },
    shouldStartDrag: (event: PointerEvent): boolean => {
      if (state.overlay.image() !== null) {
        return true;
      }
      return appState.reader.viewMode.value === "paged" || event.pointerType === "mouse";
    },
    onDragStart: (): void => {
      if (state.overlay.image() !== null) {
        zoomOverlay.startDrag();
        return;
      }
      viewportActions.beginDrag();
    },
    onDragMove: (info: PointerDragEnd): void => {
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
    },
    onDragEnd: (info: PointerDragEnd): void => {
      if (state.overlay.image() !== null) {
        return;
      }
      viewportActions.cancelDrag();
      if (appState.reader.viewMode.value !== "paged") {
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
    },
    onPinchStart: (info: {
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
      state.overlay.update(image);
      zoomOverlay.reset({ centerX: info.clientX, centerY: info.clientY });
      return true;
    },
    onPinchMove: (info: { clientX: number; clientY: number; scale: number }) => zoomOverlay.movePinch({
      centerX: info.clientX,
      centerY: info.clientY,
      scale: info.scale,
    }),
    onPinchEnd: () => zoomOverlay.endPinch(),
    onNativeScroll: (): void => {
      if (state.overlay.image() !== null) {
        return;
      }
      if (viewportActions.isDragging() || appState.reader.viewMode.value === "paged") {
        return;
      }
      const previousScrollTop = viewportActions.scrollTop();
      viewportActions.moveToTop(previousScrollTop);
      if (viewportActions.scrollTop() !== previousScrollTop) {
        return;
      }
      if (scrollFrame !== null) {
        return;
      }
      scrollFrame = session.requestAnimationFrame(() => {
        scrollFrame = null;
        updateCurrentFromScroll();
      });
    },
  };

  const pointer: PointerGestureCallbacks = {
    shouldCaptureDrag: (event) => {
      if (!(event instanceof PointerEvent)) {
        return false;
      }
      if (event.pointerType === "mouse" && event.button !== 0) {
        return false;
      }
      return gesture.shouldStartDrag(event);
    },
    shouldObserveTap: (event) =>
      event instanceof PointerEvent &&
      event.pointerType !== "mouse" &&
      !gesture.shouldStartDrag(event),
    onStart: gesture.onDragStart,
    onMove: gesture.onDragMove,
    onEnd: gesture.onDragEnd,
    onTap: gesture.onTap,
    dragStartThreshold: TAP_CANCEL_DISTANCE,
    tapMoveThreshold: TAP_CANCEL_DISTANCE,
    onPinchStart: gesture.onPinchStart,
    onPinchMove: gesture.onPinchMove,
    onPinchEnd: gesture.onPinchEnd,
  };

  const toolbar = ((): ToolbarCallbacks  => {
    let progressNavigationTimer: number | null = null;
    let pendingProgressPageNum: number | null = null;

    const cancelProgressNavigation = (): void => {
      if (progressNavigationTimer !== null) {
        session.clearTimeout(progressNavigationTimer);
        progressNavigationTimer = null;
      }
    };
    const commitProgress = (value: number): void => {
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
    return {
      onCloseClick: requestReaderClose,
      onControlsChange: applyReaderControls,
      onFullscreenClick: callbacks.onFullscreenToggle,
      onOpenOriginalPageClick: (): void => {
        const page = pages.get(state.navi.currentPageNum());
        if (page && isRealPageNum(state.navi.currentPageNum())) {
          callbacks.onOpenOriginalPage(page);
        }
      },
      onProgressPointerDown: (event: PointerEvent): void => {
        state.navi.setProgressInputActive(true);
        cancelProgressNavigation();
        event.stopPropagation();
      },
      onProgressInput: (pageNum: number): void => {
        if (!Number.isFinite(pageNum) || pageNum <= 0) {
          return;
        }
        state.navi.setProgressInputActive(true);
        pendingProgressPageNum = clamp(Math.round(pageNum), 1, maxProgressPageNum());
        previewProgress(pendingProgressPageNum);
        cancelProgressNavigation();
        progressNavigationTimer = session.setTimeout(
          () => commitProgress(pendingProgressPageNum ?? state.navi.currentPageNum()),
          PROGRESS_IDLE_COMMIT_MS,
        );
      },
      onProgressCommit: commitProgress,
    };
  })();

  const viewport: PagesViewportCallbacks = {
    onNativeScroll: gesture.onNativeScroll,
    onReloadPage: (pageNum: number): void => {
      if (!viewportActions.resetPageError(pageNum)) {
        return;
      }
      maintainLoadQueue();
    },
    onWheel: gesture.onWheel,
    pointer,
  };

  const onKeydown = (event: KeyboardEvent): void => {
    if (shouldIgnoreKeyboardEvent(event)) {
      return;
    }
    if (event.key === "Escape") {
      if (gesture.onKeyboardClose()) {
        event.preventDefault();
      }
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      gesture.onKeyboardArrow(event.key === "ArrowLeft" ? "left" : "right");
    }
  };
  session.imageQueue.updateCallbacks({
    loadTarget: (target) => previewCache.loadImage(target.page),
    markLoading: (pageNum) => viewportActions.markPageLoading(pageNum),
    onLoaded: async (target, loaded, token) => {
      if (pageWindowNumbers(state.navi.currentPageNum(), renderWindowSize).includes(target.pageNum)) {
        await installImage(target, loaded, token);
      }
    },
    onError: (target, error, token) => {
      const message = error instanceof Error ? error.message : texts.errors.loadFailed;
      viewportActions.setPageError(target.pageNum, token, message);
    },
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
      viewportActions.focus();
      updatePageNumber();
      syncAfterPageChange({ scrollIntoView: true });
    },
    cleanup: () => {
      document.removeEventListener("keydown", onKeydown, true);
    },
    toolbar,
    viewport,
  };
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
