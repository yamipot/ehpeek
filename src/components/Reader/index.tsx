import { createSignal, onCleanup, onMount, untrack } from "solid-js";
import { createStore } from "solid-js/store";
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
import type { PointerDragEnd, PointerGestureCallbacks } from "../PointerGesture";
import {
  PagesViewport,
  pageWindowNumbers,
  type PagesViewportActions,
  type PagesViewportCallbacks,
  type PagesViewportWindowOptions,
} from "./Viewport";
import {
  initialToolbarState,
  Toolbar,
  type PageProgress,
  type ReaderControls,
  type ReaderDownloadDialog,
  type ToolbarCallbacks,
  type ToolbarState,
} from "./Toolbar";
import { ZoomOverlay, type ZoomOverlayActions, type ZoomOverlayImage } from "./ZoomOverlay";
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
const FULLSCREEN_UI_SCALE_PROPERTY = "--ehpeek-reader-fullscreen-ui-scale";
const FULLSCREEN_PROGRESS_SIZE_PROPERTY = "--ehpeek-reader-fullscreen-progress-size";

export async function enterReaderFullscreen(target: HTMLElement): Promise<void> {
  const scaleBefore = window.visualViewport?.scale ?? 1;
  await target.requestFullscreen();
  await new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });

  const scaleAfter = window.visualViewport?.scale ?? 1;
  const uiScale = clamp(scaleBefore / Math.max(scaleAfter, 0.01), 0.25, 1);
  const progressSize = Number.parseFloat(getComputedStyle(target).getPropertyValue("--font-size-lg")) || 24;
  target.style.setProperty(FULLSCREEN_UI_SCALE_PROPERTY, String(uiScale));
  target.style.setProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY, `${progressSize * uiScale}px`);
}

function clearReaderFullscreenScale(target: HTMLElement): void {
  target.style.removeProperty(FULLSCREEN_UI_SCALE_PROPERTY);
  target.style.removeProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY);
}

export type FullscreenReaderOptions = {
  fullscreenTarget: HTMLElement;
  galleryId: number;
  initialPageNum: number;
  lockPageScroll: () => () => void;
  provider: ReaderPageProvider;
  totalPages?: number;
  onExit?: () => void;
  renderWindowSize?: number;
  preloadWindowSize?: number;
  nearConcurrentLoads?: number;
  farConcurrentLoads?: number;
  onActivePageChange?: (page: ReaderPage) => void;
  onOpenOriginalPage?: (page: ReaderPage) => void;
  onBeforeEnterFullscreen?: () => void;
  restorePageViewport?: () => Promise<void>;
};

export type ReaderPageProvider = {
  getPages: (pageNums: number[]) => Promise<ReaderPage[]>;
  loadPage: (page: ReaderPage) => Promise<LoadedReaderPage>;
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
  onKeyboardClose: () => boolean;
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

type Direction = -1 | 1;
type LoadTarget = {
  pageNum: number;
  page: ReaderPage;
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

export type FullscreenReaderActions = {
  close: () => void;
};

function pagesPointerGestureCallbacks(callbacks: PagesGestureCallbacks): PointerGestureCallbacks {
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

    return callbacks.shouldStartDrag(event);
  };
  const shouldObserveTap = (event: PointerEvent | MouseEvent): boolean => {
    return event instanceof PointerEvent && event.pointerType !== "mouse" && !callbacks.shouldStartDrag(event);
  };
  const onDragEnd = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
    callbacks.onDragEnd(info, event);
  };

  return {
    shouldCaptureDrag: shouldStartDrag,
    onStart: callbacks.onDragStart,
    onMove: callbacks.onDragMove,
    onEnd: onDragEnd,
    onTap: callbacks.onTap,
    dragStartThreshold: TAP_CANCEL_DISTANCE,
    tapMoveThreshold: TAP_CANCEL_DISTANCE,
    shouldObserveTap,
    onPinchStart: callbacks.onPinchStart,
    onPinchMove: callbacks.onPinchMove,
    onPinchEnd: callbacks.onPinchEnd,
  };
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
    if (callbacks.onKeyboardClose()) {
      event.preventDefault();
    }
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

function initialViewportWindow(options: FullscreenReaderOptions): PagesViewportWindowOptions {
  return {
    currentPageNum: initialPageNumber(options),
    windowSize: options.renderWindowSize ?? DEFAULT_WINDOW_SIZE,
    totalPages: options.totalPages && options.totalPages > 0 ? options.totalPages : undefined,
    pages: new Map(),
  };
}

function initialPageNumber(options: FullscreenReaderOptions): number {
  const totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : Number.MAX_SAFE_INTEGER;
  return clamp(Math.round(options.initialPageNum), 1, totalPages);
}

export function FullscreenReader(props: {
  actionsRef: (actions: FullscreenReaderActions) => void;
  onActionsDispose: () => void;
  onClosed: () => void;
  options: FullscreenReaderOptions;
}) {
  const [toolbarState, setToolbarState] = createStore<ToolbarState>(initialToolbarState());
  const [viewportWindow, setViewportWindow] = createSignal(
    untrack(() => initialViewportWindow(props.options)),
  );
  const [zoomImage, setZoomImage] = createSignal<ZoomOverlayImage | null>(null);
  const [rootState, setRootState] = createStore<ReaderRootState>({
    readDirection: state.reader.readDirection.value,
    toolbarOpen: false,
    viewMode: state.reader.viewMode.value,
  });
  let viewportActions!: PagesViewportActions;
  let zoomOverlayActions!: ZoomOverlayActions;
  let readerSession!: ReaderSession;
  const closeDownloadDialog = () => setToolbarState({ downloadDialog: null });
  const toolbarCallbacks: ToolbarCallbacks = {
    onReadDirectionClick: () => readerSession.toggleReadDirection(),
    onRightTapClick: () => readerSession.toggleRightTapAction(),
    onModeClick: () => readerSession.setMode(state.reader.viewMode.value === "paged" ? "scroll" : "paged"),
    onCloseClick: () => readerSession.close(),
    onDownloadClick: () => {
      const downloadDialog = readerSession.downloadDialog();

      if (downloadDialog) {
        setToolbarState({ downloadDialog });
      }
    },
    onDownloadCurrentClick: () => {
      const downloadDialog = toolbarState.downloadDialog;

      if (downloadDialog && readerSession.downloadDisplayedImage(downloadDialog)) {
        closeDownloadDialog();
      }
    },
    onDownloadDialogClose: closeDownloadDialog,
    onDownloadOriginalClick: () => {
      const downloadDialog = toolbarState.downloadDialog;

      if (downloadDialog && readerSession.downloadOriginalImage(downloadDialog)) {
        closeDownloadDialog();
      }
    },
    onFullscreenClick: () => {
      void readerSession.toggleFullscreen();
    },
    onOpenOriginalPageClick: () => readerSession.openOriginalPage(),
    onProgressPointerDown: (event) => readerSession.handleProgressPointerDown(event),
    onProgressInput: (pageNum) => readerSession.handleProgressInput(pageNum),
    onProgressCommit: (pageNum) => readerSession.handleProgressCommit(pageNum),
  };
  const gestureCallbacks: PagesGestureCallbacks = {
    onTap: (info, event) => readerSession.handleTap(info, event),
    onKeyboardClose: () => {
      if (toolbarState.downloadDialog) {
        closeDownloadDialog();
        return true;
      }

      return readerSession.handleKeyboardClose();
    },
    onKeyboardArrow: (direction) => readerSession.handleKeyboardArrow(direction),
    onWheel: (delta, event) => readerSession.handleWheel(delta, event),
    shouldStartDrag: (event) => readerSession.shouldStartDrag(event),
    onDragStart: (info, event) => readerSession.handleDragStart(info, event),
    onDragMove: (info, event) => readerSession.handleDragMove(info, event),
    onDragEnd: (info, event) => readerSession.handleDragEnd(info, event),
    onPinchStart: (info) => readerSession.handlePinchStart(info),
    onPinchMove: (info) => zoomOverlayActions.movePinch({ centerX: info.clientX, centerY: info.clientY, scale: info.scale }),
    onPinchEnd: () => zoomOverlayActions.endPinch(),
    onNativeScroll: () => readerSession.handleNativeScroll(),
  };
  const viewportCallbacks: PagesViewportCallbacks = {
    onNativeScroll: gestureCallbacks.onNativeScroll,
    onReloadPage: (pageNum) => readerSession.reloadPage(pageNum),
    onWheel: gestureCallbacks.onWheel,
    pointer: pagesPointerGestureCallbacks(gestureCallbacks),
  };
  const sessionCallbacks: ReaderSessionCallbacks = {
    isZoomActive: () => zoomImage() !== null,
    onControlsChange: (controls) => {
      setRootState({ readDirection: controls.readDirection, viewMode: controls.mode });
      setToolbarState({ controls });
    },
    onFullscreenChange: (active) => setToolbarState({ fullscreenActive: active }),
    onPageChange: (progress, downloadAvailable) => {
      setToolbarState({
        downloadAvailable,
        downloadDialog: toolbarState.downloadDialog?.pageNum === progress.pageNum ? toolbarState.downloadDialog : null,
        progress,
      });
    },
    onProgressChange: (progress) => setToolbarState({ progress }),
    onToolbarToggle: () => {
      const open = !toolbarState.open;
      setToolbarState({ open });
      setRootState({ toolbarOpen: open });
    },
    onViewportWindowChange: (window) => setViewportWindow(window),
    onZoomClose: () => setZoomImage(null),
    onZoomOpen: (image, pinch) => {
      setZoomImage(image);
      zoomOverlayActions.reset(pinch);
    },
  };

  onMount(() => {
    const unlockPageScroll = props.options.lockPageScroll();
    readerSession = new ReaderSession(
      props.options,
      {
        callbacks: sessionCallbacks,
        close: props.onClosed,
      },
      viewportActions,
      zoomOverlayActions,
    );

    registerGlobalStyle(STYLE_ID, readerCss);
    props.actionsRef({
      close: () => readerSession.close(),
    });

    const onKeydown = (event: KeyboardEvent): void => {
      handlePagesKeydown(event, gestureCallbacks);
    };

    document.addEventListener("keydown", onKeydown, true);
    readerSession.open();

    onCleanup(() => {
      props.onActionsDispose();
      readerSession.dispose();
      document.removeEventListener("keydown", onKeydown, true);
      unlockPageScroll();
    });
  });

  return (
    <div
      id={VIEWER_ID}
      class="fixed inset-0 z-reader ehp-color-reader font-sans textsize-sm leading-[1.4]"
      data-read-direction={rootState.readDirection}
      data-toolbar-open={String(rootState.toolbarOpen)}
      data-view-mode={rootState.viewMode}
    >
      <header class="contents">
        <Toolbar callbacks={toolbarCallbacks} state={toolbarState} />
      </header>
      <PagesViewport
        actionsRef={(actions) => {
          viewportActions = actions;
        }}
        callbacks={viewportCallbacks}
        mode={rootState.viewMode}
        readDirection={rootState.readDirection}
        window={viewportWindow()}
      />
      <ZoomOverlay
        actionsRef={(actions) => {
          zoomOverlayActions = actions;
        }}
        image={zoomImage()}
        onClose={() => setZoomImage(null)}
      />
    </div>
  );
}

type ReaderSessionCallbacks = {
  isZoomActive: () => boolean;
  onControlsChange: (controls: ReaderControls) => void;
  onFullscreenChange: (active: boolean) => void;
  onPageChange: (progress: PageProgress, downloadAvailable: boolean) => void;
  onProgressChange: (progress: PageProgress) => void;
  onToolbarToggle: () => void;
  onViewportWindowChange: (window: PagesViewportWindowOptions) => void;
  onZoomClose: () => void;
  onZoomOpen: (image: ZoomOverlayImage, pinch: { centerX: number; centerY: number }) => void;
};

type ReaderSessionBindings = {
  callbacks: ReaderSessionCallbacks;
  close: () => void;
};

class ReaderSession {
  private readonly pages = new Map<number, ReaderPage>();
  private readonly loadedImages = new Map<number, LoadedReaderImage>();
  private readonly galleryId: number;
  private readonly fullscreenTarget: HTMLElement;
  private currentPageNum: number;
  private direction: Direction = 1;
  private readonly totalPages: number | undefined;
  private readonly renderWindowSize: number;
  private readonly preloadWindowSize: number;
  private readonly imageQueue: TwoTierImageQueue<LoadTarget, LoadedReaderPage>;
  private readonly provider: ReaderPageProvider;
  private readonly onExit: FullscreenReaderOptions["onExit"];
  private readonly onActivePageChange: ((page: ReaderPage) => void) | undefined;
  private readonly onOpenOriginalPage: ((page: ReaderPage) => void) | undefined;
  private readonly onBeforeEnterFullscreen: (() => void) | undefined;
  private readonly restorePageViewport: (() => Promise<void>) | undefined;
  private readonly callbacks: ReaderSessionCallbacks;
  private readonly closeComponent: () => void;
  private readonly viewport: PagesViewportActions;
  private readonly zoomOverlay: ZoomOverlayActions;
  private scrollFrame: number | null = null;
  private progressNavigationTimer: number | null = null;
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
  private pagedTargetPageNumber: number | null = null;
  private syncToken = 0;
  private historyEntry = false;
  private closing = false;
  private closed = false;
  private fullscreenExitPromise: Promise<void> | null = null;
  private fullscreenWasActive: boolean;
  private keepReaderAfterFullscreenExit = false;

  constructor(
    options: FullscreenReaderOptions,
    bindings: ReaderSessionBindings,
    viewport: PagesViewportActions,
    zoomOverlay: ZoomOverlayActions,
  ) {
    this.fullscreenTarget = options.fullscreenTarget;
    this.fullscreenWasActive = document.fullscreenElement === this.fullscreenTarget;
    this.galleryId = options.galleryId;
    this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
    this.renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.currentPageNum = initialPageNumber(options);
    this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.provider = options.provider;
    this.onExit = options.onExit;
    this.onActivePageChange = options.onActivePageChange;
    this.onOpenOriginalPage = options.onOpenOriginalPage;
    this.onBeforeEnterFullscreen = options.onBeforeEnterFullscreen;
    this.restorePageViewport = options.restorePageViewport;
    this.callbacks = bindings.callbacks;
    this.closeComponent = bindings.close;
    this.viewport = viewport;
    this.zoomOverlay = zoomOverlay;
    this.imageQueue = new TwoTierImageQueue(
      (target) => this.provider.loadPage(target.page),
      (pageNum) => this.viewport.markPageLoading(pageNum),
      this.onImageLoaded,
      this.onImageError,
      options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS,
      options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS,
    );
  }

  open(): void {
    this.viewport.focus();

    if (this.onExit) {
      window.history.pushState({ ehpeekReader: true }, "", window.location.href);
      this.historyEntry = true;
      window.addEventListener("popstate", this.onPopState);
    }

    document.addEventListener("fullscreenchange", this.onFullscreenChange);
    this.syncInitialUi();
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
    void this.finishReaderExit();
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
    void this.finishReaderExit();
  };

  private async finishReaderExit(): Promise<void> {
    await this.fullscreenExitPromise;

    try {
      await this.restorePageViewport?.();
    } catch (error) {
      console.warn("[ehpeek] Failed to restore page viewport", error);
    }

    this.onExit?.();
  }

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
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("fullscreenchange", this.onFullscreenChange);
    if (document.fullscreenElement === this.fullscreenTarget) {
      this.fullscreenExitPromise = document
        .exitFullscreen()
        .catch((error: unknown) => {
          console.warn("[ehpeek] Failed to exit fullscreen", error);
        });
    }
    clearReaderFullscreenScale(this.fullscreenTarget);

    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
      this.scrollFrame = null;
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
    const numbers = pageWindowNumbers(this.currentPageNum, this.renderWindowSize);
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
    let incoming: ReaderPage[];

    try {
      incoming = await this.provider.getPages(pageNums);
    } catch (error) {
      console.error("[ehpeek]", error);
      return;
    }

    if (this.closed || token !== this.syncToken) {
      return;
    }

    this.addPages(incoming);
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
    this.callbacks.onViewportWindowChange({
      currentPageNum: this.currentPageNum,
      windowSize: this.renderWindowSize,
      totalPages: this.totalPages,
      pages: this.pageMetaForViewport(),
    });
    this.updatePageNumber();
  }

  private maintainLoadQueue(): void {
    const targets = pageWindowNumbers(this.currentPageNum, this.renderWindowSize)
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

    return page ? { pageNum, page } : null;
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

  private readonly onImageLoaded = (target: LoadTarget, loaded: LoadedReaderPage, token: number): void => {
    if (!pageWindowNumbers(this.currentPageNum, this.renderWindowSize).includes(target.pageNum)) {
      return;
    }

    void this.installImage(target, loaded, token);
  };

  private readonly onImageError = (target: LoadTarget, error: unknown, token: number): void => {
    const message = error instanceof Error ? error.message : texts.errors.loadFailed;
    this.viewport.setPageError(target.pageNum, token, message);
  };

  reloadPage(pageNum: number): void {
    if (!this.viewport.resetPageError(pageNum)) {
      return;
    }

    this.maintainLoadQueue();
  }

  private async installImage(target: LoadTarget, loaded: LoadedReaderPage, token: number): Promise<void> {
    const imageUrl = loaded.imageUrl;
    const width = positiveNumber(loaded.width);
    const height = positiveNumber(loaded.height);
    const slotImage = {
      imageUrl,
      highPriority: target.pageNum === this.currentPageNum,
      width,
      height,
    };

    try {
      await this.viewport.loadPageImage(target.pageNum, token, slotImage);
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

      if (target.pageNum === this.currentPageNum) {
        this.updatePageNumber();
      }
    }
  }

  private updatePageNumber(): void {
    this.callbacks.onPageChange({
      pageNum: this.currentPageNum,
      totalPages: this.totalPages,
      maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
      keepInputValue: this.progressNavigating,
    }, this.loadedImages.has(this.currentPageNum));
  }

  private notifyActivePageChange(): void {
    const page = this.pages.get(this.currentPageNum);

    if (page) {
      this.onActivePageChange?.(page);
    }
  }

  handleKeyboardArrow(direction: "left" | "right"): void {
    if (this.callbacks.isZoomActive()) {
      return;
    }

    this.turnPageBy(direction === "left" ? this.leftTapDelta() : this.rightTapDelta());
  }

  handleWheel(delta: number, event: WheelEvent): void {
    if (this.callbacks.isZoomActive()) {
      event.preventDefault();
      return;
    }

    if (state.reader.viewMode.value !== "paged") {
      return;
    }

    event.preventDefault();

    if (this.viewport.isDragging()) {
      return;
    }

    if (Math.abs(delta) >= PAGED_WHEEL_THRESHOLD) {
      this.turnPageBy(delta > 0 ? 1 : -1);
    }
  }

  shouldStartDrag(event: PointerEvent): boolean {
    if (this.callbacks.isZoomActive()) {
      return true;
    }

    return state.reader.viewMode.value === "paged" || event.pointerType === "mouse";
  }

  handleDragStart(_info: GestureDragStart, _event: PointerEvent | MouseEvent): void {
    if (this.callbacks.isZoomActive()) {
      this.zoomOverlay.startDrag();
      return;
    }

    this.viewport.beginDrag();
  }

  handleDragMove(info: GestureDragMove, event: PointerEvent | MouseEvent): void {
    if (this.callbacks.isZoomActive()) {
      this.zoomOverlay.moveDrag(info);
      return;
    }

    const before = this.viewport.scrollTop();
    if (!this.viewport.moveDrag({ dx: info.dx, dy: info.dy })) {
      return;
    }

    if (Math.abs(info.dx) >= TAP_CANCEL_DISTANCE || Math.abs(info.dy) >= TAP_CANCEL_DISTANCE) {
      this.cancelPendingTap();
    }

    debugLog("drag move", {
      pointerType: pointerTypeForEvent(event),
      clientY: info.clientY,
      before,
    });
  }

  handleDragEnd(info: GestureDragEnd, event: PointerEvent | MouseEvent): void {
    if (this.callbacks.isZoomActive()) {
      return;
    }

    debugLog("drag end", {
      pointerType: pointerTypeForEvent(event),
      scrollTop: this.viewport.scrollTop(),
      dx: info.dx,
      dy: info.dy,
    });
    this.viewport.cancelDrag();

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

  handleNativeScroll(): void {
    if (this.callbacks.isZoomActive()) {
      return;
    }

    if (this.viewport.isDragging() || state.reader.viewMode.value === "paged") {
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

  handleTap(info: GestureTap, event: PointerEvent | MouseEvent): void {
    this.viewport.cancelDrag();

    if (this.consumeDoubleTap(info, event)) {
      return;
    }

    this.queueSingleTap(info, event);
  }

  private runSingleTap(info: GestureTap, event: PointerEvent | MouseEvent): void {
    if (this.callbacks.isZoomActive()) {
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

  handleKeyboardClose(): boolean {
    if (this.callbacks.isZoomActive()) {
      this.callbacks.onZoomClose();
      return true;
    }

    if (document.fullscreenElement === this.fullscreenTarget) {
      return false;
    }

    this.close();
    return true;
  }

  handlePinchStart(info: { clientX: number; clientY: number }): boolean {
    this.cancelPendingTap();
    this.viewport.stopMotion();
    this.viewport.cancelDrag();

    if (this.callbacks.isZoomActive()) {
      this.zoomOverlay.startPinch({ centerX: info.clientX, centerY: info.clientY });
      return true;
    }

    const image = this.imageAtPoint(info);

    if (!image) {
      return false;
    }

    this.callbacks.onZoomOpen(image, { centerX: info.clientX, centerY: info.clientY });
    return true;
  }

  private toggleZoomAtPoint(point: { clientX: number; clientY: number }): boolean {
    if (this.callbacks.isZoomActive()) {
      this.callbacks.onZoomClose();
      return true;
    }

    const image = this.imageAtPoint(point);

    if (!image) {
      return false;
    }

    this.viewport.stopMotion();
    this.viewport.cancelDrag();
    this.callbacks.onZoomOpen(image, { centerX: point.clientX, centerY: point.clientY });
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

  readonly handleProgressPointerDown = (event: PointerEvent): void => {
    this.progressNavigating = true;
    this.cancelProgressNavigation();
    event.stopPropagation();
  };

  readonly handleProgressInput = (pageNum: number): void => {
    if (!Number.isFinite(pageNum) || pageNum <= 0) {
      return;
    }

    this.progressNavigating = true;
    const target = clamp(Math.round(pageNum), 1, this.maxProgressPageNum());
    this.pendingProgressNavigationPageNum = target;
    this.navigateProgressPage(target);
    this.cancelProgressNavigation();
    this.progressNavigationTimer = window.setTimeout(
      () => this.handleProgressCommit(this.pendingProgressNavigationPageNum ?? this.currentPageNum),
      PROGRESS_IDLE_COMMIT_MS,
    );
  };

  readonly handleProgressCommit = (value: number): void => {
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
    this.callbacks.onProgressChange({
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

  downloadDialog(): ReaderDownloadDialog | null {
    const image = this.loadedImages.get(this.currentPageNum);

    if (!image || !this.isRealPageNum(this.currentPageNum)) {
      return null;
    }

    return {
      currentFileName: displayedImageFileName(this.galleryId, this.currentPageNum, image.imageUrl),
      currentImageUrl: image.imageUrl,
      originalImageUrl: image.originalImageUrl,
      pageNum: this.currentPageNum,
    };
  }

  downloadDisplayedImage(download: ReaderDownloadDialog): boolean {
    return startImageDownload(download.currentImageUrl, download.currentFileName);
  }

  downloadOriginalImage(download: ReaderDownloadDialog): boolean {
    return Boolean(download.originalImageUrl && startImageDownload(download.originalImageUrl));
  }

  openOriginalPage(): void {
    const page = this.pages.get(this.currentPageNum);

    if (!page || !this.isRealPageNum(this.currentPageNum) || !this.onOpenOriginalPage) {
      return;
    }

    this.onOpenOriginalPage(page);
  }

  async toggleFullscreen(): Promise<void> {
    if (document.fullscreenElement === this.fullscreenTarget) {
      this.keepReaderAfterFullscreenExit = true;

      try {
        await document.exitFullscreen();
      } catch (error) {
        this.keepReaderAfterFullscreenExit = false;
        console.warn("[ehpeek] Failed to exit fullscreen", error);
      }
      return;
    }

    if (
      document.fullscreenElement ||
      !document.fullscreenEnabled ||
      typeof this.fullscreenTarget.requestFullscreen !== "function"
    ) {
      return;
    }

    try {
      this.onBeforeEnterFullscreen?.();
      await enterReaderFullscreen(this.fullscreenTarget);
    } catch (error) {
      await this.restorePageViewport?.();
      console.warn("[ehpeek] Fullscreen request failed", error);
    }
  }

  private readonly onFullscreenChange = (): void => {
    const fullscreenActive = document.fullscreenElement === this.fullscreenTarget;
    const fullscreenExited = this.fullscreenWasActive && !fullscreenActive;
    const keepReaderOpen = this.keepReaderAfterFullscreenExit;
    this.fullscreenWasActive = fullscreenActive;
    this.keepReaderAfterFullscreenExit = false;

    if (!fullscreenActive) {
      clearReaderFullscreenScale(this.fullscreenTarget);
    }

    this.callbacks.onFullscreenChange(fullscreenActive);

    if (fullscreenExited) {
      void this.finishFullscreenExit(keepReaderOpen);
    }
  };

  private async finishFullscreenExit(keepReaderOpen: boolean): Promise<void> {
    if (!keepReaderOpen) {
      this.close();
      return;
    }

    try {
      await this.restorePageViewport?.();
    } catch (error) {
      console.warn("[ehpeek] Failed to restore page viewport", error);
    }
  }

  private syncFullscreenState(): void {
    this.callbacks.onFullscreenChange(document.fullscreenElement === this.fullscreenTarget);
  }

  setMode(mode: ViewMode): void {
    if (mode === state.reader.viewMode.value) {
      return;
    }

    state.reader.viewMode.set(mode);
    this.syncReaderControls();
    this.rebuildForCurrentMode();
  }

  toggleReadDirection(): void {
    const readDirection = state.reader.readDirection.value === "rtl" ? "ltr" : "rtl";
    state.reader.readDirection.set(readDirection);
    this.syncReaderControls();
    this.syncViewportWindow();
    this.scrollToCurrentPage();
  }

  toggleRightTapAction(): void {
    const rightTapAction = state.reader.rightTapAction.value === "previous" ? "next" : "previous";
    state.reader.rightTapAction.set(rightTapAction);
    this.syncReaderControls();
  }

  private syncReaderControls(): void {
    this.callbacks.onControlsChange({
      mode: state.reader.viewMode.value,
      readDirection: state.reader.readDirection.value,
      rightTapAction: state.reader.rightTapAction.value,
    });
  }

  private toggleToolbar(): void {
    this.callbacks.onToolbarToggle();
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
