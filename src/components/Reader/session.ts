import { createSignal } from "solid-js";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import {
  currentReaderControlsState,
  state as appState,
  type ReaderScrollSizeScale,
} from "../../state";
import { clamp } from "../../utils";
import type { ReaderControls, ReaderDownloadInfo } from "./Toolbar";
import {
  containFitScale,
  type PagesViewportWindowOptions,
  type ScrollFitImageSize,
} from "./Viewport";
import type { ZoomOverlayImage } from "./ZoomOverlay";
import { PriorityLoadQueue } from "../Widgets/PriorityLoadQueue";

const DEFAULT_WINDOW_SIZE = 10;

export type Direction = -1 | 1;
export type ReaderLoadTarget = {
  pageNum: number;
  page: ReaderPage;
};

export type ReaderOptions = {
  decodedImageCacheLimit?: number;
  galleryId: number;
  galleryToken: string;
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
    const readerControls = currentReaderControlsState();
    const navigationMode = readerControls.navigationMode.value;
    const initialControls: ReaderControls = {
      navigationMode,
      direction: navigationMode === "scroll"
        ? readerControls.scrollDirection.value
        : readerControls.pagedDirection.value,
      firstPageSeparate: false,
      pageLayout: readerControls.pageLayout.value,
      rightTapAction: readerControls.rightTapAction.value,
    };
    const [controls, setControls] = createSignal(initialControls);
    const initialPageNum = initialControls.navigationMode === "paged" &&
        initialControls.pageLayout === "double"
      ? doublePagePairStart(initialPageNumber(options), initialControls.firstPageSeparate)
      : initialPageNumber(options);
    const [toolbarOpen, setToolbarOpen] = createSignal(false);
    const [viewportWindow, setViewportWindow] = createSignal(
      initialViewportWindow(options, initialPageNum),
    );
    const [zoomImage, setZoomImage] = createSignal<ZoomOverlayImage | null>(null);
    const [currentPageNum, setCurrentPageNum] = createSignal(initialPageNum);
    const [direction, setDirection] = createSignal<Direction>(1);
    const [downloadInfos, setDownloadInfos] = createSignal<ReaderDownloadInfo[]>([]);
    const [maxProgressPageNum, setMaxProgressPageNum] = createSignal(initialMaxProgressPageNumber(options));
    const [progressInputActive, setProgressInputActive] = createSignal(false);
    const [scrollBarVisible, setScrollBarVisible] = createSignal(false);
    const [scrollBarExpanded, setScrollBarExpanded] = createSignal(false);
    const [scrollViewportAdjusting, setScrollViewportAdjusting] = createSignal(false);
    const [scrollViewportTtbScale, setScrollViewportTtbScale] = createSignal<ReaderScrollSizeScale>(
      appState.reader.scrollTtbScale.value,
    );
    const [scrollViewportHorizontalScale, setScrollViewportHorizontalScale] = createSignal<ReaderScrollSizeScale>(
      appState.reader.scrollHorizontalScale.value,
    );
    const [scrollFitImageSize, setScrollFitImageSize] = createSignal<ScrollFitImageSize | null>(null);
    const [readerViewportWidth, setReaderViewportWidth] = createSignal(Math.max(1, window.innerWidth));
    const [readerViewportHeight, setReaderViewportHeight] = createSignal(Math.max(1, window.innerHeight));
    const scrollViewportSizeScale = () => controls().direction === "ttb"
      ? scrollViewportTtbScale()
      : scrollViewportHorizontalScale();
    const setScrollViewportSizeScale = (scale: ReaderScrollSizeScale) => {
      if (controls().direction === "ttb") {
        setScrollViewportTtbScale(scale);
      } else {
        setScrollViewportHorizontalScale(scale);
      }
    };
    const scrollFitScale = () => {
      const imageSize = scrollFitImageSize();
      return imageSize
        ? containFitScale(
            imageSize.width,
            imageSize.height,
            readerViewportWidth(),
            readerViewportHeight(),
          )
        : null;
    };
    const scrollFillScale = () => {
      const imageSize = scrollFitImageSize();
      if (!imageSize) {
        return null;
      }
      return controls().direction === "ttb"
        ? readerViewportWidth() / imageSize.width
        : readerViewportHeight() / imageSize.height;
    };

    this.state = {
      navi: {
        currentPageNum,
        direction,
        setCurrentPageNum,
        setDirection,
        setViewportWindow,
        viewportWindow,
        leftDragDelta: () => controls().direction === "rtl" ? -1 : 1,
        leftTapDelta: () => controls().rightTapAction === "previous" ? 1 : -1,
        rightDragDelta: () => controls().direction === "rtl" ? 1 : -1,
        rightTapDelta: () => controls().rightTapAction === "previous" ? -1 : 1,
        downloadInfos,
        maxProgressPageNum,
        progressInputActive,
        setDownloadInfos,
        setMaxProgressPageNum,
        setProgressInputActive,
      },
      ctrls: { update: setControls, value: controls },
      toolbar: {
        close: () => setToolbarOpen(false),
        open: toolbarOpen,
        toggle: () => setToolbarOpen((open) => !open),
      },
      scrollBar: {
        expanded: scrollBarExpanded,
        updateExpanded: setScrollBarExpanded,
        updateVisible: setScrollBarVisible,
        visible: scrollBarVisible,
      },
      scrollViewport: {
        adjusting: scrollViewportAdjusting,
        scaleMode: () => scrollViewportSizeScale() === null
          ? "fit" as const
          : scrollViewportSizeScale() === "fill"
            ? "fill" as const
            : scrollViewportSizeScale() === "one-to-one"
              ? "one-to-one" as const
              : "custom" as const,
        scalePercent: () => {
          const sizeScale = scrollViewportSizeScale();
          if (sizeScale === "one-to-one") {
            return 100;
          }
          if (sizeScale === "fill") {
            const fillScale = scrollFillScale();
            return fillScale ? fillScale * 100 : null;
          }
          const fitScale = scrollFitScale();
          return fitScale
            ? (sizeScale ?? 1) * fitScale * 100
            : null;
        },
        fitImageSize: scrollFitImageSize,
        fitScale: scrollFitScale,
        setAdjusting: setScrollViewportAdjusting,
        setFitImageSize: setScrollFitImageSize,
        setViewportWidth: setReaderViewportWidth,
        setSizeScale: setScrollViewportSizeScale,
        setViewportHeight: setReaderViewportHeight,
        viewportWidth: readerViewportWidth,
        viewportHeight: readerViewportHeight,
        sizeScale: scrollViewportSizeScale,
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

function initialViewportWindow(
  options: ReaderOptions,
  initialPageNum: number,
): PagesViewportWindowOptions {
  return {
    currentPageNum: initialPageNum,
    windowSize: options.renderWindowSize ?? DEFAULT_WINDOW_SIZE,
    totalPages: options.totalPages && options.totalPages > 0 ? options.totalPages : undefined,
    pages: new Map(),
  };
}

export function doublePagePairStart(
  pageNum: number,
  firstPageSeparate: boolean,
): number {
  if (firstPageSeparate) {
    return pageNum <= 1 ? 1 : pageNum - (pageNum % 2);
  }
  return pageNum % 2 === 0 ? pageNum - 1 : pageNum;
}

function initialPageNumber(options: ReaderOptions): number {
  const totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : Number.MAX_SAFE_INTEGER;
  return clamp(Math.round(options.initialPageNum), 1, totalPages);
}

function initialMaxProgressPageNumber(options: ReaderOptions): number {
  return options.totalPages && options.totalPages > 0 ? options.totalPages + 1 : 1;
}
