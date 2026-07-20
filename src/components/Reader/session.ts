import { createSignal } from "solid-js";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import { state as appState } from "../../state";
import { clamp } from "../../utils";
import type { ReaderControls, ReaderDownloadInfo } from "./Toolbar";
import type { PagesViewportWindowOptions } from "./Viewport";
import type { ZoomOverlayImage } from "./ZoomOverlay";

const DEFAULT_WINDOW_SIZE = 10;
const DEFAULT_NEAR_CONCURRENT_LOADS = 3;
const DEFAULT_FAR_CONCURRENT_LOADS = 6;
const DEFAULT_NEAR_LOAD_AHEAD = 3;

export type Direction = -1 | 1;
export type ReaderLoadTarget = {
  pageNum: number;
  page: ReaderPage;
};

export type ReaderOptions = {
  galleryId: number;
  initialPageNum: number;
  totalPages?: number;
  renderWindowSize?: number;
  preloadWindowSize?: number;
  nearConcurrentLoads?: number;
  farConcurrentLoads?: number;
};

export class ReaderSession {
  readonly imageQueue: TwoTierImageQueue<ReaderLoadTarget, LoadedReaderPage>;
  readonly state;
  private readonly animationFrames = new Set<number>();
  private readonly timers = new Set<number>();
  private disposed = false;

  constructor(options: ReaderOptions) {
    this.imageQueue = new TwoTierImageQueue(
      options.nearConcurrentLoads,
      options.farConcurrentLoads,
    );
    const [controls, setControls] = createSignal<ReaderControls>({
      mode: appState.reader.viewMode.value,
      readDirection: appState.reader.readDirection.value,
      rightTapAction: appState.reader.rightTapAction.value,
    });
    const [toolbarOpen, setToolbarOpen] = createSignal(false);
    const [viewportWindow, setViewportWindow] = createSignal(initialViewportWindow(options));
    const [zoomImage, setZoomImage] = createSignal<ZoomOverlayImage | null>(null);
    const [currentPageNum, setCurrentPageNum] = createSignal(initialPageNumber(options));
    const [direction, setDirection] = createSignal<Direction>(1);
    const [downloadInfo, setDownloadInfo] = createSignal<ReaderDownloadInfo | null>(null);
    const [maxProgressPageNum, setMaxProgressPageNum] = createSignal(1);
    const [progressInputActive, setProgressInputActive] = createSignal(false);

    this.state = {
      navi: {
        currentPageNum,
        direction,
        setCurrentPageNum,
        setDirection,
        setViewportWindow,
        viewportWindow,
        leftDragDelta: () => appState.reader.readDirection.value === "rtl" ? -1 : 1,
        leftTapDelta: () => appState.reader.rightTapAction.value === "previous" ? 1 : -1,
        rightDragDelta: () => appState.reader.readDirection.value === "rtl" ? 1 : -1,
        rightTapDelta: () => appState.reader.rightTapAction.value === "previous" ? -1 : 1,
        downloadInfo,
        maxProgressPageNum,
        progressInputActive,
        setDownloadInfo,
        setMaxProgressPageNum,
        setProgressInputActive,
      },
      ctrls: { update: setControls, value: controls },
      toolbar: {
        open: toolbarOpen,
        toggle: () => setToolbarOpen((open) => !open),
      },
      overlay: { image: zoomImage, update: setZoomImage },
    };
  }

  setTimeout(callback: () => void, delay: number): number {
    const timer = window.setTimeout(() => {
      this.timers.delete(timer);
      callback();
    }, delay);
    this.timers.add(timer);
    return timer;
  }

  clearTimeout(timer: number | null): void {
    if (timer === null) {
      return;
    }
    window.clearTimeout(timer);
    this.timers.delete(timer);
  }

  requestAnimationFrame(callback: FrameRequestCallback): number {
    const frame = window.requestAnimationFrame((time) => {
      this.animationFrames.delete(frame);
      callback(time);
    });
    this.animationFrames.add(frame);
    return frame;
  }

  cancelAnimationFrame(frame: number | null): void {
    if (frame === null) {
      return;
    }
    window.cancelAnimationFrame(frame);
    this.animationFrames.delete(frame);
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    for (const timer of this.timers) {
      window.clearTimeout(timer);
    }
    for (const frame of this.animationFrames) {
      window.cancelAnimationFrame(frame);
    }
    this.imageQueue.dispose();
    this.timers.clear();
    this.animationFrames.clear();
  }
}

function initialViewportWindow(options: ReaderOptions): PagesViewportWindowOptions {
  return {
    currentPageNum: initialPageNumber(options),
    windowSize: options.renderWindowSize ?? DEFAULT_WINDOW_SIZE,
    totalPages: options.totalPages && options.totalPages > 0 ? options.totalPages : undefined,
    pages: new Map(),
  };
}

function initialPageNumber(options: ReaderOptions): number {
  const totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : Number.MAX_SAFE_INTEGER;
  return clamp(Math.round(options.initialPageNum), 1, totalPages);
}


type ImageQueueCallbacks<Target, Loaded> = {
  loadTarget: (target: Target) => Promise<Loaded>;
  markLoading: (pageNum: number) => number | null;
  onLoaded: (target: Target, loaded: Loaded, token: number) => void;
  onError: (target: Target, error: unknown, token: number) => void;
};

export class TwoTierImageQueue<Target extends { pageNum: number }, Loaded> {
  private nearQueue = new Map<number, Target>();
  private farQueue = new Map<number, Target>();
  private activeNearLoads = 0;
  private activeTotalLoads = 0;
  private timer: number | null = null;
  private disposed = false;
  private callbacks: Partial<ImageQueueCallbacks<Target, Loaded>> = {};

  constructor(
    private readonly nearConcurrentLoads: number = DEFAULT_NEAR_CONCURRENT_LOADS,
    private readonly farConcurrentLoads: number = DEFAULT_FAR_CONCURRENT_LOADS,
    private readonly nearLoadAhead: number = DEFAULT_NEAR_LOAD_AHEAD,
  ) { }

  updateCallbacks(callbacks: ImageQueueCallbacks<Target, Loaded>): void {
    this.callbacks = callbacks;
    this.schedule();
  }

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
        this.enqueue(target, offset <= this.nearLoadAhead ? "near" : "far");
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
    if (this.timer !== null || this.disposed || !this.callbacks.loadTarget) {
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
    const { loadTarget, markLoading, onLoaded, onError } = this.callbacks;
    if (!loadTarget || !markLoading || !onLoaded || !onError) {
      return;
    }
    const token = markLoading(target.pageNum);

    if (token === null) {
      return;
    }

    this.activeTotalLoads += 1;

    if (tier === "near") {
      this.activeNearLoads += 1;
    }

    void loadTarget(target)
      .then((loaded) => {
        if (!this.disposed) {
          onLoaded(target, loaded, token);
        }
      })
      .catch((error) => {
        if (!this.disposed) {
          onError(target, error, token);
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
