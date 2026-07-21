import { createSignal } from "solid-js";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import { state as appState } from "../../state";
import { clamp } from "../../utils";
import type { ReaderControls, ReaderDownloadInfo } from "./Toolbar";
import type { PagesViewportWindowOptions } from "./Viewport";
import type { ZoomOverlayImage } from "./ZoomOverlay";

const DEFAULT_WINDOW_SIZE = 10;
const DEFAULT_FAR_CONCURRENT_LOADS = 6;

export type Direction = -1 | 1;
export type ReaderLoadTarget = {
  pageNum: number;
  page: ReaderPage;
};

export type ReaderOptions = {
  decodedImageCacheLimit?: number;
  galleryId: number;
  initialPageNum: number;
  totalPages?: number;
  renderWindowSize?: number;
  preloadWindowSize?: number;
  concurrentLoads?: number;
};

export class ReaderSession {
  readonly imageQueue: PriorityLoadQueue<ReaderLoadTarget, LoadedReaderPage>;
  readonly state;
  private readonly animationFrames = new Set<number>();
  private readonly timers = new Set<number>();
  private disposed = false;

  constructor(options: ReaderOptions) {
    this.imageQueue = new PriorityLoadQueue(
      options.concurrentLoads,
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
    const [scrollBarVisible, setScrollBarVisible] = createSignal(false);
    const [scrollBarExpanded, setScrollBarExpanded] = createSignal(false);

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
      scrollBar: {
        expanded: scrollBarExpanded,
        updateExpanded: setScrollBarExpanded,
        updateVisible: setScrollBarVisible,
        visible: scrollBarVisible,
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


type LoadQueueCallbacks<Target, Loaded> = {
  loadTarget: (target: Target) => Promise<Loaded>;
  markLoading: (target: Target) => number | null;
  onLoaded: (target: Target, loaded: Loaded, token: number) => void;
  onError: (target: Target, error: unknown, token: number) => void;
};

type PrioritizedTarget<Target> = {
  key: string | number;
  priority: number;
  target: Target;
};

export class PriorityLoadQueue<Target, Loaded> {
  private pending = new Map<string | number, PrioritizedTarget<Target>>();
  private active = new Set<string | number>();
  private timer: number | null = null;
  private disposed = false;
  private callbacks: Partial<LoadQueueCallbacks<Target, Loaded>> = {};

  constructor(
    private readonly concurrentLoads: number = DEFAULT_FAR_CONCURRENT_LOADS,
  ) { }

  updateCallbacks(callbacks: LoadQueueCallbacks<Target, Loaded>): void {
    this.callbacks = callbacks;
    this.schedule();
  }

  dispose(): void {
    this.disposed = true;
    this.pending.clear();

    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  sync(targets: PrioritizedTarget<Target>[]): void {
    this.pending = new Map(targets
      .filter(({ key }) => !this.active.has(key))
      .map((target) => [target.key, target]));
    this.schedule();
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

    while (this.active.size < this.concurrentLoads) {
      const next = Array.from(this.pending.values())
        .sort((left, right) => left.priority - right.priority)[0];
      if (!next) {
        return;
      }
      this.pending.delete(next.key);
      this.start(next);
    }
  }

  private start({ key, target }: PrioritizedTarget<Target>): void {
    const { loadTarget, markLoading, onLoaded, onError } = this.callbacks;
    if (!loadTarget || !markLoading || !onLoaded || !onError) {
      return;
    }
    const token = markLoading(target);

    if (token === null) {
      return;
    }

    this.active.add(key);

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
        this.active.delete(key);
        this.process();
      });
  }
}
