import { h, type ComponentChildren } from "preact";
import { useEffect, useLayoutEffect, useRef, useState } from "preact/hooks";
import texts from "../../texts.json";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import { state, type ReadDirection, type ViewMode } from "../../state";
import {
  clamp,
  debugLog,
  normalizedAspectRatio,
  positiveNumber,
  registerGlobalStyle,
  targetSummary,
} from "../../utils";
import type { ScrollMotion } from "../animation";
import type { PointerDragEnd } from "../pointerGesture";
import { usePointerGestureElement, type PointerGestureSurfaceHandle } from "../PointerGestureSurface";
import { PagesViewport } from "./Viewport";
import {
  initialToolbarState,
  Toolbar,
  type PageProgress,
  type ReaderControls,
  type ReaderDownloadDialog,
  type ToolbarCallbacks,
  type ToolbarState,
} from "./Toolbar";
import { createZoomOverlay, type ZoomOverlay, type ZoomOverlayImage } from "./ZoomOverlay";
import { ExternalDomNode } from "../ExternalDom";
import readerCss from "./index.css";

const VIEWER_ID = "ehpeek-reader";
const STYLE_ID = "ehpeek-reader-style";
const DEFAULT_WINDOW_SIZE = 10;
const DEFAULT_NEAR_CONCURRENT_LOADS = 3;
const DEFAULT_FAR_CONCURRENT_LOADS = 6;
const NEAR_LOAD_AHEAD = 3;
const PAGED_SWIPE_THRESHOLD = 24;
const PAGED_WHEEL_THRESHOLD = 8;
const PROGRESS_IDLE_COMMIT_MS = 1000;
const DOUBLE_TAP_MS = 340;
const DOUBLE_TAP_DISTANCE = 36;
const TAP_CANCEL_DISTANCE = 8;
const FALLBACK_ASPECT_RATIO = 1.42;
const FULLSCREEN_HINT_MS = 5000;

export type FullscreenReaderOptions = {
  galleryId: number;
  pages: ReaderPage[];
  startIndex: number;
  loadPage: (page: ReaderPage, index: number) => Promise<LoadedReaderPage>;
  loadPages?: (pageNums: number[]) => Promise<ReaderPage[]>;
  totalPages?: number;
  onExit?: () => void;
  renderWindowSize?: number;
  preloadWindowSize?: number;
  nearConcurrentLoads?: number;
  farConcurrentLoads?: number;
  onActivePageChange?: (page: ReaderPage, index: number) => void;
  onOpenOriginalPage?: (page: ReaderPage) => void;
  initialFullscreenHint?: boolean;
  initialFullscreenOwned?: boolean;
};

type ReaderRootState = {
  readDirection: ReadDirection;
  toolbarOpen: boolean;
  viewMode: ViewMode;
};

type GesturePoint = {
  clientX: number;
  clientY: number;
};

type GestureDragStart = GesturePoint & {
  pointerId: number;
};

type GestureDragMove = GesturePoint & {
  pointerId: number;
  dx: number;
  dy: number;
  velocityY: number;
};

type GestureDragEnd = GestureDragMove;

type GestureTap = GesturePoint & {
  pointerId: number | null;
  dx: number;
  dy: number;
};

type GesturePinchStart = GesturePoint & {
  distance: number;
};

type GesturePinchMove = GesturePinchStart & {
  scale: number;
};

type PagesGestureCallbacks = {
  onTap: (info: GestureTap, event: PointerEvent | MouseEvent) => void;
  onKeyboardClose: () => void;
  onKeyboardArrow: (direction: "left" | "right") => void;
  onWheel: (delta: number, event: WheelEvent) => void;
  shouldStartDrag: (event: PointerEvent) => boolean;
  onDragStart: (info: GestureDragStart, event: PointerEvent | MouseEvent) => void;
  onDragMove: (info: GestureDragMove, event: PointerEvent | MouseEvent) => void;
  onDragEnd: (info: GestureDragEnd, event: PointerEvent | MouseEvent) => void;
  onPinchStart: (info: GesturePinchStart, event: PointerEvent) => boolean;
  onPinchMove: (info: GesturePinchMove, event: PointerEvent) => void;
  onPinchEnd: () => void;
  onNativeScroll: () => void;
};

type PagesGestureHandle = {
  dragging: () => boolean;
};

type Direction = -1 | 1;
type ViewportDragState = {
  startScroll: number;
};

type LoadTarget = {
  pageNum: number;
  page: ReaderPage;
  index: number;
};

type LoadedReaderImage = ZoomOverlayImage & {
  originalImageUrl: string | null;
};

class TwoTierImageQueue<Target extends { pageNum: number }, Loaded> {
  private nearQueue = new Map<number, Target>();
  private farQueue = new Map<number, Target>();
  private activeNearLoads = 0;
  private activeTotalLoads = 0;
  private timer: number | null = null;
  private disposed = false;

  constructor(
    private readonly loadTarget: (target: Target) => Promise<Loaded>,
    private readonly markLoading: (pageNum: number) => number | null,
    private readonly onLoaded: (target: Target, loaded: Loaded, token: number) => void,
    private readonly onError: (target: Target, error: unknown, token: number) => void,
    private readonly nearConcurrentLoads: number,
    private readonly farConcurrentLoads: number,
  ) {}

  dispose(): void {
    this.disposed = true;
    this.nearQueue.clear();
    this.farQueue.clear();

    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  sync(targets: Target[], currentPageNum: number, direction: Direction, windowNumbers: Set<number>, preloadWindowSize: number): void {
    for (const queue of [this.nearQueue, this.farQueue]) {
      for (const pageNum of queue.keys()) {
        if (!windowNumbers.has(pageNum)) {
          queue.delete(pageNum);
        }
      }
    }

    this.enqueue(targets.find((target) => target.pageNum === currentPageNum), "near");

    for (let offset = 1; offset <= preloadWindowSize; offset += 1) {
      const pageNum = currentPageNum + offset * direction;
      const target = targets.find((candidate) => candidate.pageNum === pageNum);

      if (target) {
        this.enqueue(target, offset <= NEAR_LOAD_AHEAD ? "near" : "far");
      }
    }

    this.schedule();
  }

  private enqueue(target: Target | undefined, tier: "near" | "far"): void {
    if (!target) {
      return;
    }

    const pageNum = target.pageNum;

    if (tier === "near") {
      this.farQueue.delete(pageNum);
      this.nearQueue.set(pageNum, target);
      return;
    }

    if (!this.nearQueue.has(pageNum)) {
      this.farQueue.set(pageNum, target);
    }
  }

  private schedule(): void {
    if (this.timer !== null || this.disposed) {
      return;
    }

    this.timer = window.setTimeout(() => {
      this.timer = null;
      this.process();
    }, 0);
  }

  private process(): void {
    if (this.disposed) {
      return;
    }

    while (this.activeTotalLoads < this.currentConcurrency()) {
      const tier = this.nearQueue.size > 0 ? "near" : this.activeNearLoads > 0 ? null : "far";

      if (tier === null) {
        return;
      }

      const queue = tier === "near" ? this.nearQueue : this.farQueue;
      const target = queue.values().next().value as Target | undefined;

      if (!target) {
        return;
      }

      queue.delete(target.pageNum);

      this.start(target, tier);
    }
  }

  private currentConcurrency(): number {
    return this.nearQueue.size > 0 || this.activeNearLoads > 0
      ? Math.min(this.nearConcurrentLoads, this.farConcurrentLoads)
      : this.farConcurrentLoads;
  }

  private start(target: Target, tier: "near" | "far"): void {
    const token = this.markLoading(target.pageNum);

    if (token === null) {
      return;
    }

    this.activeTotalLoads += 1;

    if (tier === "near") {
      this.activeNearLoads += 1;
    }

    void this.loadTarget(target)
      .then((loaded) => {
        if (!this.disposed) {
          this.onLoaded(target, loaded, token);
        }
      })
      .catch((error) => {
        if (!this.disposed) {
          this.onError(target, error, token);
        }
      })
      .finally(() => {
        this.activeTotalLoads -= 1;

        if (tier === "near") {
          this.activeNearLoads -= 1;
        }

        this.process();
      });
  }
}

export type FullscreenReaderHandle = {
  close: () => void;
};

function ReaderRoot(props: ReaderRootState & { children: ComponentChildren }) {
  useLayoutEffect(() => {
    const previousDocumentOverflow = document.documentElement.style.overflow;
    const previousBodyOverflow = document.body.style.overflow;

    registerGlobalStyle(STYLE_ID, readerCss);
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousDocumentOverflow;
      document.body.style.overflow = previousBodyOverflow;
    };
  }, []);

  return (
    <div
      id={VIEWER_ID}
      className="fixed inset-0 z-reader ehp-color-reader font-sans text-13px leading-[1.4]"
      data-read-direction={props.readDirection}
      data-toolbar-open={String(props.toolbarOpen)}
      data-view-mode={props.viewMode}
    >
      {props.children}
    </div>
  );
}

function PagesGesture(props: {
  callbacks: PagesGestureCallbacks;
  handleRef: (handle: PagesGestureHandle | null) => void;
  target: HTMLElement;
}) {
  const shouldStartDrag = (event: PointerEvent | MouseEvent): boolean => {
    if (!(event instanceof PointerEvent)) {
      return false;
    }

    debugLog("pointerdown", {
      pointerType: event.pointerType,
      button: event.button,
      buttons: event.buttons,
      target: targetSummary(event.target),
    });

    if (event.pointerType === "mouse" && event.button !== 0) {
      debugLog("pointerdown ignored: mouse buttons", { button: event.button, buttons: event.buttons });
      return false;
    }

    return props.callbacks.shouldStartDrag(event);
  };
  const shouldObserveTap = (event: PointerEvent | MouseEvent): boolean => {
    return event instanceof PointerEvent && event.pointerType !== "mouse" && !props.callbacks.shouldStartDrag(event);
  };
  const onDragEnd = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
    props.callbacks.onDragEnd(info, event);
  };

  usePointerGestureElement(props.target, {
    shouldCaptureDrag: shouldStartDrag,
    onStart: props.callbacks.onDragStart,
    onMove: props.callbacks.onDragMove,
    onEnd: onDragEnd,
    onTap: props.callbacks.onTap,
    dragStartThreshold: TAP_CANCEL_DISTANCE,
    tapMoveThreshold: TAP_CANCEL_DISTANCE,
    shouldObserveTap,
    onPinchStart: props.callbacks.onPinchStart,
    onPinchMove: props.callbacks.onPinchMove,
    onPinchEnd: props.callbacks.onPinchEnd,
  }, (handle: PointerGestureSurfaceHandle | null) => {
    props.handleRef(
      handle
        ? {
            dragging: () => handle.gesture()?.isDragging() ?? false,
          }
        : null,
    );
  });

  useEffect(() => {
    const onWheel = (event: WheelEvent): void => {
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      props.callbacks.onWheel(delta, event);
    };
    const onScroll = (): void => {
      props.callbacks.onNativeScroll();
    };

    props.target.addEventListener("scroll", onScroll);
    props.target.addEventListener("wheel", onWheel);

    return () => {
      props.target.removeEventListener("scroll", onScroll);
      props.target.removeEventListener("wheel", onWheel);
    };
  }, [props.callbacks, props.target]);

  return null;
}

export function removePreviousReaderRoot(): void {
  const previous = document.getElementById(VIEWER_ID);
  const previousContainer = previous?.parentElement;

  if (previousContainer?.dataset.ehpeekReaderContainer === "true") {
    previousContainer.remove();
    return;
  }

  previous?.remove();
}

function handlePagesKeydown(event: KeyboardEvent, callbacks: PagesGestureCallbacks): void {
  if (shouldIgnoreKeyboardEvent(event)) {
    return;
  }

  if (event.key === "Escape") {
    event.preventDefault();
    callbacks.onKeyboardClose();
    return;
  }

  if (event.key === "ArrowLeft") {
    event.preventDefault();
    callbacks.onKeyboardArrow("left");
    return;
  }

  if (event.key === "ArrowRight") {
    event.preventDefault();
    callbacks.onKeyboardArrow("right");
  }
}

export function FullscreenReader(props: {
  handleRef: (handle: FullscreenReaderHandle | null) => void;
  onClosed: () => void;
  options: FullscreenReaderOptions;
}) {
  const [toolbarState, setToolbarState] = useState<ToolbarState>(() => initialToolbarState());
  const [rootState, setRootState] = useState<ReaderRootState>(() => ({
    readDirection: state.reader.readDirection.value,
    toolbarOpen: false,
    viewMode: state.reader.viewMode.value,
  }));
  const gestureHandle = useRef<PagesGestureHandle | null>(null);
  const [session, setSession] = useState<ReaderSession | null>(null);

  useLayoutEffect(() => {
    const nextSession = new ReaderSession(props.options, {
      close: props.onClosed,
      isDragging: () => gestureHandle.current?.dragging() ?? false,
      setRootState,
      setToolbarState,
    });

    setSession(nextSession);
    props.handleRef({
      close: () => nextSession.close(),
    });

    return () => {
      props.handleRef(null);
      nextSession.dispose();
    };
  }, [props.handleRef, props.onClosed, props.options]);

  useEffect(() => {
    session?.open();
  }, [session]);

  useEffect(() => {
    if (!session) {
      return;
    }

    const onKeydown = (event: KeyboardEvent): void => {
      handlePagesKeydown(event, session.gestureCallbacks);
    };

    document.addEventListener("keydown", onKeydown, true);
    return () => {
      document.removeEventListener("keydown", onKeydown, true);
    };
  }, [session]);

  if (!session) {
    return null;
  }

  return (
    <ReaderRoot readDirection={rootState.readDirection} toolbarOpen={rootState.toolbarOpen} viewMode={rootState.viewMode}>
      <Toolbar callbacks={session.toolbarCallbacks} state={toolbarState} />
      <PagesGesture
        callbacks={session.gestureCallbacks}
        handleRef={(handle) => {
          gestureHandle.current = handle;
        }}
        target={session.scrollerElement()}
      />
      <ExternalDomNode node={session.viewportElement()} />
      <ExternalDomNode node={session.zoomOverlayElement()} />
    </ReaderRoot>
  );
}

type ReaderSessionBindings = {
  close: () => void;
  isDragging: () => boolean;
  setRootState: (state: ReaderRootState) => void;
  setToolbarState: (state: ToolbarState) => void;
};

class ReaderSession {
  readonly gestureCallbacks: PagesGestureCallbacks;
  readonly toolbarCallbacks: ToolbarCallbacks;
  private toolbarState: ToolbarState;
  private rootState: ReaderRootState;
  private readonly pages = new Map<number, ReaderPage>();
  private readonly loadedImages = new Map<number, LoadedReaderImage>();
  private readonly galleryId: number;
  private currentPageNum: number;
  private direction: Direction = 1;
  private readonly totalPages: number | undefined;
  private readonly renderWindowSize: number;
  private readonly preloadWindowSize: number;
  private readonly imageQueue: TwoTierImageQueue<LoadTarget, LoadedReaderPage>;
  private readonly loadPages: FullscreenReaderOptions["loadPages"];
  private readonly onExit: FullscreenReaderOptions["onExit"];
  private readonly onActivePageChange: ((page: ReaderPage, index: number) => void) | undefined;
  private readonly onOpenOriginalPage: ((page: ReaderPage) => void) | undefined;
  private readonly closeComponent: () => void;
  private readonly isDragging: () => boolean;
  private readonly setRootComponentState: (state: ReaderRootState) => void;
  private readonly setToolbarComponentState: (state: ToolbarState) => void;
  private readonly viewport: PagesViewport;
  private readonly zoomOverlay: ZoomOverlay;
  private scrollFrame: number | null = null;
  private resizeFrame: number | null = null;
  private progressNavigationTimer: number | null = null;
  private fullscreenHintTimer: number | null = null;
  private tapTimer: number | null = null;
  private pendingTap:
    | {
        info: GestureTap;
        event: PointerEvent | MouseEvent;
        time: number;
      }
    | null = null;
  private pendingProgressNavigationPageNum: number | null = null;
  private progressNavigating = false;
  private viewportDrag: ViewportDragState | null = null;
  private pagedTargetPageNumber: number | null = null;
  private syncToken = 0;
  private historyEntry = false;
  private closing = false;
  private closed = false;
  private ownsFullscreen: boolean;
  private readonly initialFullscreenHint: boolean;

  constructor(options: FullscreenReaderOptions, bindings: ReaderSessionBindings) {
    this.galleryId = options.galleryId;
    this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
    this.renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
    for (const [index, page] of options.pages.entries()) {
      const pageNum = pageNumForPage(page, index);
      this.pages.set(pageNum, {
        ...page,
        aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO),
        pageNum,
      });
    }

    const startIndex = clamp(options.startIndex, 0, Math.max(0, options.pages.length - 1));
    this.currentPageNum = pageNumForPage(options.pages[startIndex], startIndex);
    this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.loadPages = options.loadPages;
    this.onExit = options.onExit;
    this.onActivePageChange = options.onActivePageChange;
    this.onOpenOriginalPage = options.onOpenOriginalPage;
    this.initialFullscreenHint = options.initialFullscreenHint ?? false;
    this.ownsFullscreen = options.initialFullscreenOwned ?? false;
    this.closeComponent = bindings.close;
    this.isDragging = bindings.isDragging;
    this.setRootComponentState = bindings.setRootState;
    this.setToolbarComponentState = bindings.setToolbarState;
    this.toolbarState = initialToolbarState();
    this.rootState = {
      readDirection: state.reader.readDirection.value,
      toolbarOpen: false,
      viewMode: state.reader.viewMode.value,
    };
    this.viewport = new PagesViewport({
      mode: () => state.reader.viewMode.value,
      readDirection: () => state.reader.readDirection.value,
      closed: () => this.closed,
      totalPages: () => this.totalPages,
      onReloadPage: (pageNum) => this.reloadPage(pageNum),
    });
    this.zoomOverlay = createZoomOverlay();
    this.toolbarCallbacks = {
      onReadDirectionClick: () => this.toggleReadDirection(),
      onRightTapClick: () => this.toggleRightTapAction(),
      onModeClick: () => this.setMode(state.reader.viewMode.value === "paged" ? "scroll" : "paged"),
      onCloseClick: () => this.close(),
      onDownloadClick: () => this.openDownloadDialog(),
      onDownloadCurrentClick: () => this.downloadDisplayedImage(),
      onDownloadDialogClose: () => this.closeDownloadDialog(),
      onDownloadOriginalClick: () => this.downloadOriginalImage(),
      onFullscreenClick: () => {
        void this.toggleFullscreen();
      },
      onOpenOriginalPageClick: () => this.openOriginalPage(),
      onOpenChange: (open) => this.setRootState({ toolbarOpen: open }),
      onProgressPointerDown: this.onProgressPointerDown,
      onProgressInput: this.onProgressInput,
      onProgressCommit: this.onProgressCommit,
    };
    this.gestureCallbacks = {
      onTap: (info, event) => this.handleTap(info, event),
      onKeyboardClose: () => this.handleKeyboardClose(),
      onKeyboardArrow: (direction) => this.handleKeyboardArrow(direction),
      onWheel: (delta, event) => this.handleWheel(delta, event),
      shouldStartDrag: (event) => this.shouldStartDrag(event),
      onDragStart: (info, event) => this.handleDragStart(info, event),
      onDragMove: (info, event) => this.handleDragMove(info, event),
      onDragEnd: (info, event) => this.handleDragEnd(info, event),
      onPinchStart: (info) => this.handlePinchStart(info),
      onPinchMove: (info) => this.zoomOverlay.movePinch({ centerX: info.clientX, centerY: info.clientY, scale: info.scale }),
      onPinchEnd: () => this.zoomOverlay.endPinch(),
      onNativeScroll: () => this.handleNativeScroll(),
    };
    this.imageQueue = new TwoTierImageQueue(
      (target) => options.loadPage(target.page, target.index),
      (pageNum) => this.viewport.markPageLoading(pageNum),
      this.onImageLoaded,
      this.onImageError,
      options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS,
      options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS,
    );
  }

  scrollerElement(): HTMLElement {
    return this.viewport.scrollerElement();
  }

  viewportElement(): HTMLElement {
    return this.viewport.element;
  }

  zoomOverlayElement(): HTMLElement {
    return this.zoomOverlay.element;
  }

  open(): void {
    if (this.pages.size === 0) {
      this.close();
      return;
    }

    this.viewport.scrollerElement().focus({ preventScroll: true });

    if (this.onExit) {
      window.history.pushState({ ehpeekReader: true }, "", window.location.href);
      this.historyEntry = true;
      window.addEventListener("popstate", this.onPopState);
    }

    window.addEventListener("resize", this.onResize);
    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    this.syncInitialUi();
    if (this.initialFullscreenHint) {
      this.showFullscreenHint();
    }
    this.syncAfterPageChange({ scrollIntoView: true });
  }

  dispose(): void {
    this.cleanup();
  }

  close(): void {
    if (this.closed || this.closing) {
      return;
    }

    if (this.historyEntry) {
      this.closing = true;
      window.history.back();
      return;
    }

    this.finishClose();
  }

  private syncInitialUi(): void {
    this.syncFullscreenState();
    this.syncReaderControls();
    this.updatePageNumber();
  }

  private readonly onPopState = (): void => {
    if (!this.historyEntry) {
      return;
    }

    this.historyEntry = false;
    this.finishClose();
    this.onExit?.();
  };

  private finishClose(): void {
    if (this.cleanup()) {
      this.closeComponent();
    }
  }

  private cleanup(): boolean {
    if (this.closed) {
      return false;
    }

    this.closed = true;
    this.cancelProgressNavigation();
    this.cancelPendingTap();
    this.imageQueue.dispose();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    this.clearFullscreenHintTimer();

    if (this.ownsFullscreen && document.fullscreenElement) {
      this.ownsFullscreen = false;
      void document.exitFullscreen().catch((error: unknown) => {
        console.warn("[ehpeek] Failed to exit fullscreen", error);
      });
    }

    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
    }

    if (this.resizeFrame !== null) {
      window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = null;
    }

    this.viewport.stopMotion();
    return true;
  }

  private setCurrentPageNumber(pageNumber: number, scrollIntoView: boolean, scrollMotion: ScrollMotion = "instant"): void {
    this.pagedTargetPageNumber = null;
    const target = clamp(Math.round(pageNumber), 1, this.maxProgressPageNum());

    if (target !== this.currentPageNum) {
      this.direction = target > this.currentPageNum ? 1 : -1;
      this.currentPageNum = target;
    }

    this.syncAfterPageChange({ scrollIntoView, scrollMotion });
  }

  private syncAfterPageChange(options: { scrollIntoView: boolean; scrollMotion?: ScrollMotion }): void {
    const token = ++this.syncToken;
    const numbers = this.viewport.windowPageNums(this.currentPageNum, this.renderWindowSize);
    const missing = numbers.filter((number) => this.isRealPageNum(number) && !this.pages.has(number));

    this.syncViewportWindow();
    this.maintainLoadQueue();
    this.notifyActivePageChange();

    if (options.scrollIntoView) {
      this.scrollToCurrentPage(options.scrollMotion);
    }

    if (missing.length > 0) {
      void this.loadMissingPages(missing, token);
    }
  }

  private rebuildForCurrentMode(): void {
    this.viewport.stopMotion();
    this.viewport.resetPosition();

    this.syncAfterPageChange({ scrollIntoView: true });
  }

  private async loadMissingPages(pageNums: number[], token: number): Promise<void> {
    let incoming: ReaderPage[] | undefined;

    try {
      incoming = await this.loadPages?.(pageNums);
    } catch (error) {
      console.error("[ehpeek]", error);
      return;
    }

    if (this.closed || token !== this.syncToken) {
      return;
    }

    this.addPages(incoming ?? []);
    this.syncViewportWindow();
    this.maintainLoadQueue();
    this.notifyActivePageChange();
  }

  private addPages(pages: ReaderPage[]): void {
    for (const [index, page] of pages.entries()) {
      const pageNum = pageNumForPage(page, index);

      if (pageNum > 0) {
        this.pages.set(pageNum, {
          ...page,
          aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO),
          pageNum,
        });
      }
    }
  }

  private syncViewportWindow(): void {
    this.viewport.syncWindow({
      currentPageNum: this.currentPageNum,
      windowSize: this.renderWindowSize,
      totalPages: this.totalPages,
      pages: this.pageMetaForViewport(),
    });
    this.updatePageNumber();
  }

  private maintainLoadQueue(): void {
    const targets = this.viewport.requiredImagePageNums()
      .map((pageNum) => this.loadTargetFor(pageNum))
      .filter((target): target is LoadTarget => Boolean(target));
    const windowSet = new Set(targets.map((target) => target.pageNum));
    this.imageQueue.sync(targets, this.currentPageNum, this.direction, windowSet, this.preloadWindowSize);
  }

  private pageMetaForViewport(): Map<number, { aspectRatio: number }> {
    return new Map(Array.from(this.pages, ([pageNum, page]) => [pageNum, { aspectRatio: page.aspectRatio }]));
  }

  private loadTargetFor(pageNum: number): LoadTarget | null {
    const page = this.pages.get(pageNum);

    return page ? { pageNum, page, index: pageNum - 1 } : null;
  }

  private maxProgressPageNum(): number {
    return this.totalPages ? this.totalPages + 1 : Number.MAX_SAFE_INTEGER;
  }

  private isRealPageNum(pageNum: number): boolean {
    return pageNum >= 1 && (!this.totalPages || pageNum <= this.totalPages);
  }

  private turnPageBy(delta: number): void {
    if (state.reader.viewMode.value === "paged") {
      this.animatePagedStep(delta);
      return;
    }

    this.setCurrentPageNumber(this.currentPageNum + delta, true);
  }

  private animatePagedStep(delta: number): void {
    const base = this.pagedTargetPageNumber ?? this.currentPageNum;
    const target = clamp(Math.round(base + delta), 1, this.maxProgressPageNum());

    if (target === base) {
      this.scrollToCurrentPage("animated");
      return;
    }

    if (this.viewport.pageOffset(target) === null) {
      this.pagedTargetPageNumber = null;
      this.setCurrentPageNumber(target, true, "animated");
      return;
    }

    this.direction = target > base ? 1 : -1;
    this.pagedTargetPageNumber = target;
    this.viewport.moveToPage(target, "animated", () => {
      if (this.pagedTargetPageNumber !== target) {
        return;
      }

      this.pagedTargetPageNumber = null;
      this.setCurrentPageNumber(target, true);
    });
  }

  private scrollToCurrentPage(motion: ScrollMotion = "instant"): void {
    this.viewport.moveToPage(this.currentPageNum, motion);
  }

  private setToolbarControls(controls: ReaderControls): void {
    this.toolbarState = { ...this.toolbarState, controls };
    this.setToolbarComponentState(this.toolbarState);
  }

  private setToolbarProgress(progress: PageProgress): void {
    this.toolbarState = { ...this.toolbarState, progress };
    this.setToolbarComponentState(this.toolbarState);
  }

  private readonly onImageLoaded = (target: LoadTarget, loaded: LoadedReaderPage, token: number): void => {
    if (!this.viewport.windowPageNums(this.currentPageNum, this.renderWindowSize).includes(target.pageNum)) {
      return;
    }

    void this.installImage(target, loaded, token);
  };

  private readonly onImageError = (target: LoadTarget, error: unknown, token: number): void => {
    const message = error instanceof Error ? error.message : texts.errors.loadFailed;
    this.viewport.setPageError(target.pageNum, token, message);
  };

  private reloadPage(pageNum: number): void {
    if (!this.viewport.resetPageError(pageNum)) {
      return;
    }

    this.maintainLoadQueue();
  }

  private async installImage(target: LoadTarget, loaded: LoadedReaderPage, token: number): Promise<void> {
    const imageUrl = loaded.imageUrl;
    const width = positiveNumber(loaded.width);
    const height = positiveNumber(loaded.height);
    const image = this.viewport.createPageImage(target.pageNum, {
      imageUrl,
      highPriority: target.pageNum === this.currentPageNum,
      width,
      height,
    });

    try {
      await loadImage(image);
    } catch (error) {
      const message = error instanceof Error ? error.message : texts.errors.imageLoadFailed;
      this.viewport.setPageError(target.pageNum, token, message);
      return;
    }

    if (!this.closed) {
      this.loadedImages.set(target.pageNum, {
        pageNum: target.pageNum,
        imageUrl,
        originalImageUrl: loaded.originalImageUrl ?? null,
        width,
        height,
      });
      this.viewport.setPageImage(target.pageNum, token, { imageUrl, highPriority: target.pageNum === this.currentPageNum, width, height }, image);

      if (target.pageNum === this.currentPageNum) {
        this.updatePageNumber();
      }
    }
  }

  private updatePageNumber(): void {
    this.toolbarState = {
      ...this.toolbarState,
      downloadAvailable: this.loadedImages.has(this.currentPageNum),
      downloadDialog:
        this.toolbarState.downloadDialog?.pageNum === this.currentPageNum ? this.toolbarState.downloadDialog : null,
      progress: {
        pageNum: this.currentPageNum,
        totalPages: this.totalPages,
        maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
        keepInputValue: this.progressNavigating,
      },
    };
    this.setToolbarComponentState(this.toolbarState);
  }

  private notifyActivePageChange(): void {
    const page = this.pages.get(this.currentPageNum);

    if (page) {
      this.onActivePageChange?.(page, this.currentPageNum - 1);
    }
  }

  private handleKeyboardArrow(direction: "left" | "right"): void {
    if (this.zoomOverlay.active()) {
      return;
    }

    this.turnPageBy(direction === "left" ? this.leftTapDelta() : this.rightTapDelta());
  }

  private handleWheel(delta: number, event: WheelEvent): void {
    if (this.zoomOverlay.active()) {
      event.preventDefault();
      return;
    }

    if (state.reader.viewMode.value !== "paged") {
      return;
    }

    event.preventDefault();

    if (this.isDragging()) {
      return;
    }

    if (Math.abs(delta) >= PAGED_WHEEL_THRESHOLD) {
      this.turnPageBy(delta > 0 ? 1 : -1);
    }
  }

  private shouldStartDrag(event: PointerEvent): boolean {
    if (this.zoomOverlay.active()) {
      return true;
    }

    return state.reader.viewMode.value === "paged" || event.pointerType === "mouse";
  }

  private handleDragStart(_info: GestureDragStart, _event: PointerEvent | MouseEvent): void {
    if (this.zoomOverlay.active()) {
      this.zoomOverlay.startDrag();
      return;
    }

    this.viewport.stopMotion();
    this.viewportDrag = {
      startScroll: this.viewport.startDragPosition(),
    };
  }

  private handleDragMove(info: GestureDragMove, event: PointerEvent | MouseEvent): void {
    if (this.zoomOverlay.active()) {
      this.zoomOverlay.moveDrag(info);
      return;
    }

    const drag = this.viewportDrag;

    if (!drag) {
      return;
    }

    if (Math.abs(info.dx) >= TAP_CANCEL_DISTANCE || Math.abs(info.dy) >= TAP_CANCEL_DISTANCE) {
      this.cancelPendingTap();
    }

    debugLog("drag move", {
      pointerType: pointerTypeForEvent(event),
      clientY: info.clientY,
      before: this.viewport.scrollTop(),
    });
    this.viewport.dragPage(drag.startScroll, { dx: info.dx, dy: info.dy });
  }

  private handleDragEnd(info: GestureDragEnd, event: PointerEvent | MouseEvent): void {
    if (this.zoomOverlay.active()) {
      return;
    }

    debugLog("drag end", {
      pointerType: pointerTypeForEvent(event),
      scrollTop: this.viewport.scrollTop(),
      dx: info.dx,
      dy: info.dy,
    });
    this.viewportDrag = null;

    if (state.reader.viewMode.value !== "paged") {
      this.viewport.moveToTop(this.viewport.scrollTop());
      this.viewport.startVerticalFlingFromDragVelocity(info.velocityY, () => this.updateCurrentFromScroll());
      this.updateCurrentFromScroll();
      return;
    }

    if (info.dx >= PAGED_SWIPE_THRESHOLD) {
      this.turnPageBy(this.rightDragDelta());
    } else if (info.dx <= -PAGED_SWIPE_THRESHOLD) {
      this.turnPageBy(this.leftDragDelta());
    } else {
      this.scrollToCurrentPage("animated");
    }
  }

  private handleNativeScroll(): void {
    if (this.zoomOverlay.active()) {
      return;
    }

    if (this.isDragging() || state.reader.viewMode.value === "paged") {
      return;
    }

    const previousScrollTop = this.viewport.scrollTop();
    this.viewport.moveToTop(previousScrollTop);

    if (this.viewport.scrollTop() !== previousScrollTop) {
      return;
    }

    if (this.scrollFrame !== null) {
      return;
    }

    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.updateCurrentFromScroll();
    });
  }

  private updateCurrentFromScroll(): void {
    const next = this.viewport.centerPageNum();

    if (next !== null && next !== this.currentPageNum) {
      this.direction = next > this.currentPageNum ? 1 : -1;
      this.currentPageNum = next;
      this.syncAfterPageChange({ scrollIntoView: false });
    }
  }

  private handleTap(info: GestureTap, event: PointerEvent | MouseEvent): void {
    this.viewportDrag = null;

    if (this.consumeDoubleTap(info, event)) {
      return;
    }

    this.queueSingleTap(info, event);
  }

  private runSingleTap(info: GestureTap, event: PointerEvent | MouseEvent): void {
    if (this.zoomOverlay.active()) {
      event.preventDefault();
      return;
    }

    if (this.handleViewportTap(info)) {
      return;
    }

    if (state.reader.viewMode.value === "scroll") {
      this.toggleToolbar();
      return;
    }

    const width = this.viewport.viewportWidth();
    const zone = info.clientX / width;

    if (zone >= 1 / 3 && zone <= 2 / 3) {
      this.toggleToolbar();
    } else {
      this.turnPageBy(zone < 1 / 3 ? this.leftTapDelta() : this.rightTapDelta());
    }
  }

  private handleViewportTap(point: { clientX: number; clientY: number }): boolean {
    if (this.viewport.isHitEndPage(point)) {
      this.close();
      return true;
    }

    return false;
  }

  private handleKeyboardClose(): void {
    if (this.toolbarState.downloadDialog) {
      this.closeDownloadDialog();
      return;
    }

    if (this.zoomOverlay.active()) {
      this.zoomOverlay.close();
      return;
    }

    if (document.fullscreenElement) {
      this.ownsFullscreen = false;
      void document.exitFullscreen().catch(() => this.showFullscreenHint());
      return;
    }

    this.close();
  }

  private handlePinchStart(info: { clientX: number; clientY: number }): boolean {
    this.cancelPendingTap();
    this.viewport.stopMotion();
    this.viewportDrag = null;

    if (this.zoomOverlay.active()) {
      this.zoomOverlay.startPinch({ centerX: info.clientX, centerY: info.clientY });
      return true;
    }

    const image = this.imageAtPoint(info);

    if (!image) {
      return false;
    }

    this.zoomOverlay.start(image, { centerX: info.clientX, centerY: info.clientY });
    return true;
  }

  private toggleZoomAtPoint(point: { clientX: number; clientY: number }): boolean {
    if (this.zoomOverlay.active()) {
      this.zoomOverlay.close();
      return true;
    }

    const image = this.imageAtPoint(point);

    if (!image) {
      return false;
    }

    this.viewport.stopMotion();
    this.viewportDrag = null;
    this.zoomOverlay.start(image, { centerX: point.clientX, centerY: point.clientY });
    this.zoomOverlay.movePinch({ centerX: point.clientX, centerY: point.clientY, scale: 2 });
    this.zoomOverlay.endPinch();
    return true;
  }

  private imageAtPoint(point: { clientX: number; clientY: number }): ZoomOverlayImage | null {
    const pageNum = this.viewport.pageNumAtPoint(point);
    return pageNum === null ? null : this.loadedImages.get(pageNum) ?? null;
  }

  private consumeDoubleTap(info: GestureTap, event: PointerEvent | MouseEvent): boolean {
    const now = event.timeStamp || performance.now();
    const pending = this.pendingTap;
    const eventDetail = event instanceof MouseEvent ? event.detail : 0;
    const nativeDoubleClick = eventDetail >= 2;
    const nearPendingTap = pending
      ? now - pending.time <= DOUBLE_TAP_MS && Math.hypot(info.clientX - pending.info.clientX, info.clientY - pending.info.clientY) <= DOUBLE_TAP_DISTANCE
      : false;

    if (!nativeDoubleClick && !nearPendingTap) {
      return false;
    }

    this.cancelPendingTap();

    if (this.toggleZoomAtPoint(info)) {
      event.preventDefault();
      return true;
    }

    return false;
  }

  private queueSingleTap(info: GestureTap, event: PointerEvent | MouseEvent): void {
    this.cancelPendingTap();
    this.pendingTap = {
      info,
      event,
      time: event.timeStamp || performance.now(),
    };
    this.tapTimer = window.setTimeout(() => {
      const pending = this.pendingTap;
      this.pendingTap = null;
      this.tapTimer = null;

      if (pending) {
        this.runSingleTap(pending.info, pending.event);
      }
    }, DOUBLE_TAP_MS);
  }

  private cancelPendingTap(): void {
    if (this.tapTimer !== null) {
      window.clearTimeout(this.tapTimer);
      this.tapTimer = null;
    }

    this.pendingTap = null;
  }

  private readonly onProgressPointerDown = (event: PointerEvent): void => {
    this.progressNavigating = true;
    this.cancelProgressNavigation();
    event.stopPropagation();
  };

  private readonly onProgressInput = (pageNum: number): void => {
    if (!Number.isFinite(pageNum) || pageNum <= 0) {
      return;
    }

    this.progressNavigating = true;
    const target = clamp(Math.round(pageNum), 1, this.maxProgressPageNum());
    this.pendingProgressNavigationPageNum = target;
    this.navigateProgressPage(target);
    this.cancelProgressNavigation();
    this.progressNavigationTimer = window.setTimeout(
      () => this.onProgressCommit(this.pendingProgressNavigationPageNum ?? this.currentPageNum),
      PROGRESS_IDLE_COMMIT_MS,
    );
  };

  private readonly onProgressCommit = (value: number): void => {
    if (!this.progressNavigating && this.pendingProgressNavigationPageNum === null) {
      return;
    }

    const pageNum = this.pendingProgressNavigationPageNum ?? value;
    this.progressNavigating = false;
    this.pendingProgressNavigationPageNum = null;
    this.cancelProgressNavigation();

    if (Number.isFinite(pageNum) && pageNum > 0) {
      this.setCurrentPageNumber(pageNum, true);
    }
  };

  private navigateProgressPage(pageNum: number): void {
    const target = clamp(Math.round(pageNum), 1, this.maxProgressPageNum());

    if (target !== this.currentPageNum) {
      this.direction = target > this.currentPageNum ? 1 : -1;
      this.currentPageNum = target;
    }

    ++this.syncToken;
    this.syncViewportWindow();
    this.scrollToCurrentPage();
    this.setToolbarProgress({
      pageNum: target,
      totalPages: this.totalPages,
      maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
      keepInputValue: true,
    });
  }

  private cancelProgressNavigation(): void {
    if (this.progressNavigationTimer !== null) {
      window.clearTimeout(this.progressNavigationTimer);
      this.progressNavigationTimer = null;
    }
  }

  private openDownloadDialog(): void {
    const image = this.loadedImages.get(this.currentPageNum);

    if (!image || !this.isRealPageNum(this.currentPageNum)) {
      return;
    }

    const downloadDialog: ReaderDownloadDialog = {
      currentFileName: displayedImageFileName(this.galleryId, this.currentPageNum, image.imageUrl),
      currentImageUrl: image.imageUrl,
      originalImageUrl: image.originalImageUrl,
      pageNum: this.currentPageNum,
    };
    this.toolbarState = { ...this.toolbarState, downloadDialog };
    this.setToolbarComponentState(this.toolbarState);
  }

  private closeDownloadDialog(): void {
    if (!this.toolbarState.downloadDialog) {
      return;
    }

    this.toolbarState = { ...this.toolbarState, downloadDialog: null };
    this.setToolbarComponentState(this.toolbarState);
  }

  private downloadDisplayedImage(): void {
    const download = this.toolbarState.downloadDialog;

    if (download && startImageDownload(download.currentImageUrl, download.currentFileName)) {
      this.closeDownloadDialog();
    }
  }

  private downloadOriginalImage(): void {
    const originalImageUrl = this.toolbarState.downloadDialog?.originalImageUrl;

    if (originalImageUrl && startImageDownload(originalImageUrl)) {
      this.closeDownloadDialog();
    }
  }

  private openOriginalPage(): void {
    const page = this.pages.get(this.currentPageNum);

    if (!page || !this.isRealPageNum(this.currentPageNum) || !this.onOpenOriginalPage) {
      return;
    }

    this.onOpenOriginalPage(page);
  }

  private async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement) {
      this.ownsFullscreen = false;

      try {
        await document.exitFullscreen();
      } catch (error) {
        console.warn("[ehpeek] Failed to exit fullscreen", error);
        this.showFullscreenHint();
      }
      return;
    }

    const root = document.documentElement;

    if (!document.fullscreenEnabled || typeof root.requestFullscreen !== "function") {
      this.showFullscreenHint();
      return;
    }

    this.ownsFullscreen = true;

    try {
      await root.requestFullscreen();
    } catch (error) {
      this.ownsFullscreen = false;
      console.warn("[ehpeek] Fullscreen request failed", error);
      this.showFullscreenHint();
    }
  }

  private readonly onFullscreenChange = (): void => {
    if (!document.fullscreenElement) {
      this.ownsFullscreen = false;
    }

    this.clearFullscreenHintTimer();
    this.toolbarState = {
      ...this.toolbarState,
      fullscreenActive: Boolean(document.fullscreenElement),
      fullscreenHint: false,
    };
    this.setToolbarComponentState(this.toolbarState);
  };

  private syncFullscreenState(): void {
    this.toolbarState = {
      ...this.toolbarState,
      fullscreenActive: Boolean(document.fullscreenElement),
    };
    this.setToolbarComponentState(this.toolbarState);
  }

  private showFullscreenHint(): void {
    this.clearFullscreenHintTimer();
    this.toolbarState = { ...this.toolbarState, fullscreenHint: true };
    this.setToolbarComponentState(this.toolbarState);
    this.fullscreenHintTimer = window.setTimeout(() => {
      this.fullscreenHintTimer = null;
      this.toolbarState = { ...this.toolbarState, fullscreenHint: false };
      this.setToolbarComponentState(this.toolbarState);
    }, FULLSCREEN_HINT_MS);
  }

  private clearFullscreenHintTimer(): void {
    if (this.fullscreenHintTimer !== null) {
      window.clearTimeout(this.fullscreenHintTimer);
      this.fullscreenHintTimer = null;
    }
  }

  private readonly onResize = (): void => {
    if (this.resizeFrame !== null) {
      return;
    }

    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.viewport.resizePages();
    });
  };

  private setMode(mode: ViewMode): void {
    if (mode === state.reader.viewMode.value) {
      return;
    }

    state.reader.viewMode.set(mode);
    this.syncReaderControls();
    this.rebuildForCurrentMode();
  }

  private toggleReadDirection(): void {
    const readDirection = state.reader.readDirection.value === "rtl" ? "ltr" : "rtl";
    state.reader.readDirection.set(readDirection);
    this.syncReaderControls();
    this.syncViewportWindow();
    this.scrollToCurrentPage();
  }

  private toggleRightTapAction(): void {
    const rightTapAction = state.reader.rightTapAction.value === "previous" ? "next" : "previous";
    state.reader.rightTapAction.set(rightTapAction);
    this.syncReaderControls();
  }

  private syncReaderControls(): void {
    this.setRootState({
      readDirection: state.reader.readDirection.value,
      viewMode: state.reader.viewMode.value,
    });
    this.setToolbarControls({
      mode: state.reader.viewMode.value,
      readDirection: state.reader.readDirection.value,
      rightTapAction: state.reader.rightTapAction.value,
    });
  }

  private toggleToolbar(): void {
    const open = !this.toolbarState.open;
    this.toolbarState = { ...this.toolbarState, open };
    this.setToolbarComponentState(this.toolbarState);
    this.setRootState({ toolbarOpen: open });
  }

  private setRootState(nextState: Partial<ReaderRootState>): void {
    this.rootState = { ...this.rootState, ...nextState };
    this.setRootComponentState(this.rootState);
  }

  private rightTapDelta(): number {
    return state.reader.rightTapAction.value === "previous" ? -1 : 1;
  }

  private leftTapDelta(): number {
    return -this.rightTapDelta();
  }

  private rightDragDelta(): number {
    return state.reader.readDirection.value === "rtl" ? 1 : -1;
  }

  private leftDragDelta(): number {
    return -this.rightDragDelta();
  }


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
    return "jpg";
  }

  return "jpg";
}

function startImageDownload(url: string, name?: string): boolean {
  try {
    GM_download({
      url,
      ...(name ? { name } : {}),
      onerror: (error) => {
        console.error("[ehpeek]", error);
        window.alert(texts.errors.downloadFailed);
      },
    });
    return true;
  } catch (error) {
    console.error("[ehpeek]", error);
    window.alert(texts.errors.downloadFailed);
    return false;
  }
}

async function loadImage(image: HTMLImageElement): Promise<void> {
  if (image.complete && image.naturalWidth > 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    image.addEventListener("load", () => resolve(), { once: true });
    image.addEventListener("error", () => reject(new Error(texts.errors.imageLoadFailed)), { once: true });
  });

  try {
    await image.decode();
  } catch {
    // Loaded is enough.
  }
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

function pointerTypeForEvent(event: PointerEvent | MouseEvent): string {
  return "pointerType" in event ? event.pointerType : "mouse";
}
