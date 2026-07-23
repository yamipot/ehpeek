import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show, untrack } from "solid-js";
import type {
  NavigationMode,
  PageLayout,
  ReaderScrollSizeScale,
  ReadDirection,
} from "../../state";
import texts from "../../texts.json";
import { clamp, normalizedAspectRatio, positiveNumber } from "../../utils";
import { ScrollAnimator, ScrollFlingAnimator, type ScrollMotion } from "../animation";
import { createPointerGestureElement, type PointerGestureCallbacks } from "../PointerGesture";
import { Icon } from "../Widgets/Icon";

const FALLBACK_ASPECT_RATIO = 1.42;
const PAGE_SLOT_SPACING = 8;
const DEFAULT_DECODED_IMAGE_CACHE_LIMIT = 24;
const DECODED_IMAGE_CACHE_BYTES = 96 * 1024 * 1024;
const HORIZONTAL_FLING_VELOCITY_MULTIPLIER = 1.4;
const HORIZONTAL_FLING_MAX_VELOCITY = 1.8;

type PageMeta = {
  aspectRatio: number;
};

type PageState = "idle" | "loading" | "ready" | "error";
type VerticalScrollBounds = { min?: number; max?: number };
type HorizontalScrollBounds = { min?: number; max?: number };
type ViewportCenterAnchor = {
  pageNum: number;
  xRatio: number;
  yRatio: number;
};

export type PagesViewportWindowOptions = {
  currentPageNum: number;
  windowSize: number;
  totalPages?: number;
  pages: Map<number, PageMeta>;
};

export function pageWindowNumbers(currentPageNum: number, windowSize: number): number[] {
  const numbers: number[] = [];

  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    numbers.push(currentPageNum + offset);
  }

  return numbers;
}

type ViewportImage = {
  imageUrl: string;
  highPriority: boolean;
  width: number | null;
  height: number | null;
};

export type ScrollFitImageSize = {
  height: number;
  width: number;
};

type PageSlotKind = "page" | "blank" | "end";
type DoublePageSide = "left" | "right" | null;

type SlotContent = {
  pageNum: number;
  kind: PageSlotKind;
  state: PageState;
  errorMessage?: string;
};

type SlotElements = {
  node: HTMLElement;
  frame: HTMLElement;
};

type PageSlot = {
  pageNum: number;
  index: number;
  kind: PageSlotKind;
  state: PageState;
  aspectRatio: number;
  width: number | null;
  height: number | null;
  image: HTMLImageElement | null;
  errorMessage: string | null;
  frameWidth: number;
  frameHeight: number;
  elements: SlotElements | null;
  token: number;
};

type CachedPageImage = {
  bytes: number;
  height: number | null;
  image: HTMLImageElement;
  width: number | null;
};

export type PagesViewportCallbacks = {
  onNativeScroll: () => void;
  onReloadPage: (pageNum: number) => void;
  onWheel: (delta: number, event: WheelEvent) => void;
  pointer: PointerGestureCallbacks;
};

export type PagesViewportActions = {
  beginDrag: () => void;
  cancelDrag: () => void;
  centerPageNum: () => number | null;
  focus: () => void;
  isDragging: () => boolean;
  isHitEndPage: (point: { clientX: number; clientY: number }) => boolean;
  loadPageImage: (pageNum: number, token: number, slotImage: ViewportImage) => Promise<boolean>;
  markPageLoading: (pageNum: number) => number | null;
  moveToPage: (pageNum: number, motion?: ScrollMotion, onComplete?: () => void) => void;
  moveToTop: (scrollTop: number) => void;
  moveDrag: (delta: { dx: number; dy: number }) => boolean;
  moveToLeft: (scrollLeft: number) => void;
  pageImageHeight: (pageNum: number) => number | null;
  pageImageReady: (pageNum: number) => boolean;
  pageImageWidth: (pageNum: number) => number | null;
  pageZoomScale: (pageNum: number) => number;
  pageNumAtPoint: (point: { clientX: number; clientY: number }) => number | null;
  pageOffset: (pageNum: number) => number | null;
  resetPageError: (pageNum: number) => boolean;
  resetPageLoading: (pageNum: number, token: number) => boolean;
  resetPosition: () => void;
  scrollLeft: () => number;
  scrollTop: () => number;
  setPageError: (pageNum: number, token: number, errorMessage: string) => boolean;
  startHorizontalFlingFromDragVelocity: (dragVelocityX: number, onStop: () => void) => void;
  startVerticalFlingFromDragVelocity: (dragVelocityY: number, onStop: () => void) => void;
  stopMotion: () => void;
  viewportWidth: () => number;
};

export function PagesViewport(props: {
  actionsRef: (actions: PagesViewportActions) => void;
  callbacks: PagesViewportCallbacks;
  decodedImageCacheLimit?: number;
  direction: ReadDirection;
  navigationMode: NavigationMode;
  pageLayout: PageLayout;
  scrollFitImageSize: ScrollFitImageSize | null;
  scrollFitPageNum: number;
  scrollSizeScale: ReaderScrollSizeScale;
  window: PagesViewportWindowOptions;
  zoomActive: boolean;
}) {
  const [slots, setSlots] = createSignal<PageSlot[]>([]);
  const [revision, setRevision] = createSignal(0);
  const [renderedScrollSizeScale, setRenderedScrollSizeScale] = createSignal(
    untrack(() => props.scrollSizeScale),
  );
  const horizontalAnimator = new ScrollAnimator("x");
  const verticalAnimator = new ScrollAnimator("y");
  const flingAnimator = new ScrollFlingAnimator();
  let pageSlots: PageSlot[] = [];
  let scroller!: HTMLDivElement;
  let scrollerApi!: ReturnType<typeof createPagesScroller>;
  let dragStartPosition: { left: number; top: number } | null = null;
  let resizeFrame: number | null = null;
  let scrollScaleRevision = 0;
  let moveRequestToken = 0;
  let disposed = false;
  let syncedDirection = untrack(() => props.direction);
  let syncedNavigationMode = untrack(() => props.navigationMode);
  const decodedImageCacheLimit = Math.max(
    0,
    Math.floor(untrack(() => props.decodedImageCacheLimit) ?? DEFAULT_DECODED_IMAGE_CACHE_LIMIT),
  );
  const cachedImages = new Map<number, CachedPageImage>();
  let cachedImageBytes = 0;

  const refresh = () => setRevision((value) => value + 1);
  const pagedMode = () => props.navigationMode === "paged";
  const horizontalAxis = () => props.direction !== "ttb";
  const slotFor = (pageNum: number) => pageSlots.find((slot) => slot.pageNum === pageNum);
  const viewportWidth = () => scrollerApi.viewportWidth();
  const viewportHeight = () => scrollerApi.viewportHeight();
  const scrollTop = () => scrollerApi.scrollTop();
  const visualSlotIndex = (index: number, slotCount: number) =>
    props.direction === "rtl" ? slotCount - 1 - index : index;
  const horizontalAnchorOffset = (pageSlots: PageSlot[], anchor: ViewportCenterAnchor): number | null => {
    const orderedSlots = props.direction === "rtl" ? pageSlots.slice().reverse() : pageSlots;
    let offset = 0;
    for (const slot of orderedSlots) {
      const extent = slot.frameWidth + PAGE_SLOT_SPACING;
      if (slot.pageNum === anchor.pageNum) {
        return offset + extent * anchor.xRatio;
      }
      offset += extent;
    }
    return null;
  };
  const applySlotSize = (slot: PageSlot) => {
    const aspectRatio = pageSlotAspectRatio(slot);
    if (pagedMode()) {
      const availableWidth = props.pageLayout === "double"
        ? Math.max(1, (viewportWidth() - 3) / 2)
        : viewportWidth();
      if (slot.kind !== "page") {
        slot.frameWidth = availableWidth;
        slot.frameHeight = viewportHeight();
        return;
      }
      const frameSize = containFitFrame(aspectRatio, availableWidth, viewportHeight());
      slot.frameWidth = frameSize.width;
      slot.frameHeight = frameSize.height;
      return;
    }
    const sizeScale = renderedScrollSizeScale();
    const reference = props.scrollFitImageSize;
    const referenceAspectRatio = reference
      ? reference.height / reference.width
      : props.window.pages.get(props.scrollFitPageNum)?.aspectRatio ?? FALLBACK_ASPECT_RATIO;
    const scaleMultiplier = sizeScale === "one-to-one" && reference
      ? 1 / containFitScale(
          reference.width,
          reference.height,
          viewportWidth(),
          viewportHeight(),
        )
      : typeof sizeScale === "number"
        ? sizeScale
        : 1;
    const referenceFrame = containFitFrame(
      referenceAspectRatio,
      viewportWidth(),
      viewportHeight(),
      scaleMultiplier,
    );
    if (horizontalAxis()) {
      slot.frameHeight = referenceFrame.height;
      slot.frameWidth = referenceFrame.height / aspectRatio;
    } else {
      slot.frameWidth = referenceFrame.width;
      slot.frameHeight = referenceFrame.width * aspectRatio;
    }
  };
  const renderSlots = () => {
    for (const slot of pageSlots) {
      applySlotSize(slot);
    }

    setSlots(pageSlots.slice());
    refresh();
  };
  const refreshSlot = (slot: PageSlot) => {
    applySlotSize(slot);
    refresh();
  };
  const pageOffset = (pageNum: number) => {
    const elements = slotFor(pageNum)?.elements;
    return elements ? scrollerApi.slotOffset(elements, props.navigationMode, props.direction, props.pageLayout) : null;
  };
  const verticalScrollBoundsForElements = (
    firstElements: SlotElements | null | undefined,
    lastElements: SlotElements | null | undefined,
  ): VerticalScrollBounds | null => {
    const bounds: VerticalScrollBounds = {};

    if (firstElements) {
      bounds.min = scrollerApi.slotTop(firstElements);
    }

    if (lastElements) {
      const lastElementsRect = lastElements.node.getBoundingClientRect();
      const lastElementsTop = scrollerApi.slotTop(lastElements);
      bounds.max = lastElementsTop + lastElementsRect.height - viewportHeight();
    }

    if (bounds.min === undefined && bounds.max === undefined) {
      return null;
    }

    if (bounds.min !== undefined && bounds.max !== undefined) {
      bounds.max = Math.max(bounds.min, bounds.max);
    }

    return bounds;
  };
  const verticalScrollBounds = (): VerticalScrollBounds | null => {
    if (props.navigationMode !== "scroll" || horizontalAxis()) {
      return null;
    }

    return verticalScrollBoundsForElements(
      slotFor(1)?.elements,
      props.window.totalPages ? slotFor(props.window.totalPages + 1)?.elements : null,
    );
  };
  const moveToTop = (nextScrollTop: number) => {
    scrollerApi.moveToTop(nextScrollTop, verticalScrollBounds());
  };
  const horizontalScrollBounds = (): HorizontalScrollBounds | null => {
    if (props.navigationMode !== "scroll" || !horizontalAxis()) {
      return null;
    }
    const firstElements = slotFor(1)?.elements;
    const endElements = props.window.totalPages ? slotFor(props.window.totalPages + 1)?.elements : null;
    const bounds: HorizontalScrollBounds = {};
    if (props.direction === "rtl") {
      if (firstElements) {
        bounds.max = scrollerApi.slotLeft(firstElements) +
          firstElements.node.getBoundingClientRect().width - viewportWidth();
      }
      if (endElements) {
        bounds.min = scrollerApi.slotLeft(endElements);
      }
    } else {
      if (firstElements) {
        bounds.min = scrollerApi.slotLeft(firstElements);
      }
      if (endElements) {
        bounds.max = scrollerApi.slotLeft(endElements) +
          endElements.node.getBoundingClientRect().width - viewportWidth();
      }
    }
    if (bounds.min !== undefined && bounds.max !== undefined) {
      bounds.max = Math.max(bounds.min, bounds.max);
    }
    return bounds.min === undefined && bounds.max === undefined ? null : bounds;
  };
  const moveToLeft = (nextScrollLeft: number) => {
    const bounds = horizontalScrollBounds();
    scrollerApi.moveToLeft(bounds
      ? clamp(nextScrollLeft, bounds.min ?? Number.NEGATIVE_INFINITY, bounds.max ?? Number.POSITIVE_INFINITY)
      : nextScrollLeft);
  };
  const pageNumAtPoint = (point: { clientX: number; clientY: number }): number | null => {
    const element = document.elementFromPoint(point.clientX, point.clientY);
    const pageNode = element instanceof Element ? element.closest<HTMLElement>(".ehpeek-page") : null;

    if (!pageNode || !scroller.contains(pageNode)) {
      return null;
    }

    const pageNum = Number(pageNode.dataset.ehpeekPageNum || "");
    return Number.isFinite(pageNum) ? pageNum : null;
  };
  const stopMotion = () => {
    moveRequestToken += 1;
    dragStartPosition = null;
    flingAnimator.cancel();
    horizontalAnimator.cancel();
    verticalAnimator.cancel();
  };
  const performPageMove = (pageNum: number, motion: ScrollMotion, onComplete?: () => void): boolean => {
    const delta = pageOffset(pageNum);

    if (delta === null) {
      return false;
    }

    if (horizontalAxis()) {
      horizontalAnimator.scrollTo(scroller, scrollerApi.scrollLeft() + delta, motion, onComplete);
    } else if (pagedMode()) {
      verticalAnimator.scrollTo(scroller, scrollTop() + delta, motion, onComplete);
    } else {
      moveToTop(scrollTop() + delta);
      onComplete?.();
    }
    return true;
  };
  const moveToPage = (pageNum: number, motion: ScrollMotion = "instant", onComplete?: () => void): void => {
    const requestToken = ++moveRequestToken;

    if (performPageMove(pageNum, motion, onComplete)) {
      return;
    }

    queueMicrotask(() => {
      untrack(() => {
        if (!disposed && requestToken === moveRequestToken) {
          performPageMove(pageNum, motion, onComplete);
        }
      });
    });
  };
  const resizePages = () => {
    for (const slot of pageSlots) {
      applySlotSize(slot);
    }
    refresh();
  };
  const gestureDragging = createPointerGestureElement(
    () => scroller ?? null,
    () => props.callbacks.pointer,
  );
  const syncWindow = (options: PagesViewportWindowOptions) => {
    const preserveHorizontalPosition =
      props.navigationMode === "scroll" &&
      horizontalAxis() &&
      syncedNavigationMode === props.navigationMode &&
      syncedDirection === props.direction;
    const anchor = preserveHorizontalPosition
      ? scrollerApi.centerAnchor()
      : null;
    const oldAnchorOffset = anchor ? horizontalAnchorOffset(pageSlots, anchor) : null;
    const oldScrollLeft = scrollerApi.scrollLeft();
    const oldSlots = new Map(pageSlots.map((slot) => [slot.pageNum, slot]));
    const nextSlots: PageSlot[] = [];

    for (const pageNum of pageWindowNumbers(options.currentPageNum, options.windowSize)) {
      const kind = pageSlotKind(pageNum, options.totalPages);
      const oldSlot = oldSlots.get(pageNum);
      const slot = oldSlot && oldSlot.kind === kind ? oldSlot : pageSlot(pageNum, kind);

      if (!oldSlot && kind === "page") {
        const cached = cachedImages.get(pageNum);
        if (cached) {
          cachedImages.delete(pageNum);
          cachedImageBytes -= cached.bytes;
          slot.state = "ready";
          slot.image = cached.image;
          slot.width = cached.width;
          slot.height = cached.height;
        }
      }

      if (kind === "page") {
        const page = options.pages.get(pageNum);

        if (page) {
          applyPageMetaToSlot(slot, page);
        }
      } else {
        clearNonPageSlotMeta(slot);
      }

      nextSlots.push(slot);
    }

    const nextSet = new Set(nextSlots);

    for (const slot of pageSlots) {
      if (!nextSet.has(slot)) {
        if (slot.kind === "page" && slot.state === "ready" && slot.image) {
          const width = positiveNumber(slot.image.naturalWidth) ?? slot.width;
          const height = positiveNumber(slot.image.naturalHeight) ?? slot.height;
          const cached = {
            bytes: width && height ? width * height * 4 : 0,
            height,
            image: slot.image,
            width,
          };
          const previous = cachedImages.get(slot.pageNum);
          if (previous) {
            cachedImageBytes -= previous.bytes;
          }
          cachedImages.delete(slot.pageNum);
          cachedImages.set(slot.pageNum, cached);
          cachedImageBytes += cached.bytes;
        }
        slot.token += 1;
      }
    }

    while (cachedImages.size > decodedImageCacheLimit || cachedImageBytes > DECODED_IMAGE_CACHE_BYTES) {
      const oldest = cachedImages.entries().next().value as [number, CachedPageImage] | undefined;
      if (!oldest) {
        break;
      }
      cachedImages.delete(oldest[0]);
      cachedImageBytes -= oldest[1].bytes;
      oldest[1].image.removeAttribute("src");
    }

    pageSlots = nextSlots;
    pageSlots.forEach((slot, index) => {
      slot.index = index;
    });
    renderSlots();
    const newAnchorOffset = anchor ? horizontalAnchorOffset(pageSlots, anchor) : null;
    if (oldAnchorOffset !== null && newAnchorOffset !== null) {
      moveToLeft(oldScrollLeft + newAnchorOffset - oldAnchorOffset);
    }
    syncedNavigationMode = props.navigationMode;
    syncedDirection = props.direction;
  };
  const actions: PagesViewportActions = {
    focus: () => scroller.focus({ preventScroll: true }),
    isDragging: gestureDragging,
    beginDrag(): void {
      stopMotion();
      dragStartPosition = {
        left: scrollerApi.scrollLeft(),
        top: scrollTop(),
      };
    },
    cancelDrag: () => {
      dragStartPosition = null;
    },
    moveDrag(delta): boolean {
      if (dragStartPosition === null) {
        return false;
      }

      if (!pagedMode()) {
        moveToLeft(dragStartPosition.left - delta.dx);
        moveToTop(dragStartPosition.top - delta.dy);
      } else if (horizontalAxis()) {
        scrollerApi.moveToLeft(dragStartPosition.left - delta.dx);
      } else {
        moveToTop(dragStartPosition.top - delta.dy);
      }
      return true;
    },
    moveToLeft,
    resetPosition: () => scrollerApi.resetPosition(),
    stopMotion,
    markPageLoading(pageNum): number | null {
      const slot = slotFor(pageNum);

      if (!slot || slot.kind !== "page" || slot.state !== "idle") {
        return null;
      }

      slot.state = "loading";
      slot.errorMessage = null;
      slot.token += 1;
      refreshSlot(slot);
      return slot.token;
    },
    async loadPageImage(pageNum, token, slotImage): Promise<boolean> {
      const image = pageImageDom(pageNum, slotImage);
      const pendingSlot = slotFor(pageNum);
      if (pendingSlot && pendingSlot.token === token) {
        pendingSlot.width = slotImage.width;
        pendingSlot.height = slotImage.height;
        refreshSlot(pendingSlot);
      }
      await loadImage(image);
      const slot = slotFor(pageNum);

      if (!slot || slot.token !== token || !slot.elements) {
        return false;
      }

      slot.state = "ready";
      slot.image = image;
      slot.errorMessage = null;
      slot.width = positiveNumber(image.naturalWidth) ?? slotImage.width;
      slot.height = positiveNumber(image.naturalHeight) ?? slotImage.height;
      refreshSlot(slot);
      return true;
    },
    setPageError(pageNum, token, errorMessage): boolean {
      const slot = slotFor(pageNum);

      if (!slot || slot.token !== token) {
        return false;
      }

      slot.state = "error";
      slot.image = null;
      slot.errorMessage = errorMessage;
      refresh();
      return true;
    },
    resetPageError(pageNum): boolean {
      const slot = slotFor(pageNum);

      if (!slot || slot.kind !== "page" || slot.state !== "error") {
        return false;
      }

      slot.state = "idle";
      slot.errorMessage = null;
      refreshSlot(slot);
      return true;
    },
    resetPageLoading(pageNum, token): boolean {
      const slot = slotFor(pageNum);

      if (!slot || slot.kind !== "page" || slot.state !== "loading" || slot.token !== token) {
        return false;
      }

      slot.state = "idle";
      refreshSlot(slot);
      return true;
    },
    moveToPage,
    moveToTop,
    scrollLeft: () => scrollerApi.scrollLeft(),
    scrollTop,
    viewportWidth,
    pageOffset,
    centerPageNum(): number | null {
      for (const slot of pageSlots) {
        if (slot.elements && slot.kind !== "blank" && scrollerApi.slotContainsViewportTarget(slot.elements, props.direction)) {
          return slot.pageNum;
        }
      }

      return null;
    },
    isHitEndPage(point): boolean {
      const pageNum = pageNumAtPoint(point);
      return pageNum !== null && slotFor(pageNum)?.kind === "end";
    },
    pageImageHeight(pageNum): number | null {
      const slot = slotFor(pageNum);
      return slot?.image?.naturalHeight || slot?.height || null;
    },
    pageImageReady(pageNum): boolean {
      const slot = slotFor(pageNum);
      return slot?.state === "ready" && slot.image !== null;
    },
    pageImageWidth(pageNum): number | null {
      const slot = slotFor(pageNum);
      return slot?.image?.naturalWidth || slot?.width || null;
    },
    pageZoomScale(pageNum): number {
      const slot = slotFor(pageNum);
      const frameRect = slot?.elements?.frame.getBoundingClientRect();
      const imageWidth = slot?.image?.naturalWidth || slot?.width;
      const imageHeight = slot?.image?.naturalHeight || slot?.height;
      if (!frameRect || !imageWidth || !imageHeight) {
        return 1;
      }
      const readerScale = Math.min(frameRect.width / imageWidth, frameRect.height / imageHeight);
      const overlayScale = Math.min(
        1,
        viewportWidth() / imageWidth,
        viewportHeight() / imageHeight,
      );
      return readerScale > 0 && overlayScale > 0 ? readerScale / overlayScale : 1;
    },
    pageNumAtPoint,
    startVerticalFlingFromDragVelocity(dragVelocityY, onStop): void {
      flingAnimator.start({
        axis: "y",
        scroller,
        initialVelocity: -dragVelocityY,
        setScrollPosition: moveToTop,
        canRun: () => !disposed && props.navigationMode === "scroll" && !horizontalAxis(),
        onStop,
      });
    },
    startHorizontalFlingFromDragVelocity(dragVelocityX, onStop): void {
      flingAnimator.start({
        axis: "x",
        scroller,
        initialVelocity: -dragVelocityX * HORIZONTAL_FLING_VELOCITY_MULTIPLIER,
        maxVelocity: HORIZONTAL_FLING_MAX_VELOCITY,
        setScrollPosition: moveToLeft,
        canRun: () => !disposed && props.navigationMode === "scroll" && horizontalAxis(),
        onStop,
      });
    },
  };

  untrack(() => props.actionsRef(actions));
  createEffect(() => syncWindow(props.window));
  createEffect(() => {
    const navigationMode = props.navigationMode;
    const direction = props.direction;
    const scrollFitImageSize = props.scrollFitImageSize;
    const scrollSizeScale = props.scrollSizeScale;
    void scrollFitImageSize;
    if (navigationMode !== "scroll") {
      setRenderedScrollSizeScale(1);
      return;
    }
    const anchor = scrollerApi.centerAnchor();
    const scaleRevision = ++scrollScaleRevision;
    setRenderedScrollSizeScale(scrollSizeScale);
    untrack(resizePages);
    queueMicrotask(() => {
      if (disposed || scaleRevision !== scrollScaleRevision) {
        return;
      }
      if (anchor) {
        scrollerApi.restoreCenterAnchor(anchor);
      } else if (direction === "ttb") {
        scrollerApi.centerHorizontal();
      } else {
        scrollerApi.centerVertical();
      }
    });
  });
  const scrollStripStyle = () => {
    void revision();
    if (props.navigationMode !== "scroll") {
      return {};
    }
    if (props.direction === "ttb") {
      return {
        width: `${Math.max(viewportWidth(), ...pageSlots.map((slot) => slot.frameWidth))}px`,
      };
    }
    return {
      height: `${Math.max(viewportHeight(), ...pageSlots.map((slot) => slot.frameHeight))}px`,
      width: "max-content",
    };
  };
  const stripClass = () => {
    if (props.navigationMode === "paged") {
      if (props.direction === "ttb" && props.pageLayout === "double") {
        return "grid grid-cols-2 auto-rows-[100%] w-full h-full gap-x-3px";
      }
      return props.direction === "ttb"
        ? "flex flex-col w-full h-full"
        : `flex flex-row w-auto h-full${props.pageLayout === "double" ? " gap-3px" : ""}`;
    }
    if (props.direction === "ttb") {
      return "flex flex-col min-h-full mx-auto py-56px px-0 pb-72px";
    }
    return `flex flex-row min-w-full my-auto py-0 ${props.direction === "rtl" ? "pl-72px pr-56px" : "pl-56px pr-72px"}`;
  };
  onMount(() => {
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== null) {
        return;
      }

      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = null;
        untrack(resizePages);
      });
    });

    observer.observe(scroller);
    onCleanup(() => observer.disconnect());
  });
  onCleanup(() => {
    disposed = true;
    stopMotion();
    for (const cached of cachedImages.values()) {
      cached.image.removeAttribute("src");
    }
    cachedImages.clear();
    cachedImageBytes = 0;
    if (resizeFrame !== null) {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = null;
    }
  });

  return (
    <div
      ref={(element) => {
        scroller = element;
        scrollerApi = createPagesScroller(element);
      }}
      class={
        "w-full h-full overflow-auto overscroll-contain scroll-auto cursor-grab scrollbar-hidden " +
        (!props.zoomActive && props.navigationMode === "scroll" && props.direction === "ttb"
          ? "[touch-action:pan-x_pan-y] "
          : "touch-none ") +
        "[&[data-dragging=true]]:(cursor-grabbing select-none) " +
        "[#ehpeek-reader[data-navigation-mode=paged]_&]:(overflow-hidden touch-none select-none)"
      }
      tabIndex={-1}
      onScroll={() => props.callbacks.onNativeScroll()}
      onWheel={(event: WheelEvent) => {
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        props.callbacks.onWheel(delta, event);
      }}
    >
      <main
        class={`ehpeek-reader-page-strip ${stripClass()}`}
        style={scrollStripStyle()}
      >
        <For each={slots()}>{(slot) => (
          <PageSlotView
            doublePageSide={doublePageSide(
              slot.pageNum,
              props.window.currentPageNum,
              props.navigationMode,
              props.pageLayout,
              props.direction,
            )}
            direction={props.direction}
            navigationMode={props.navigationMode}
            pageLayout={props.pageLayout}
            slot={slot}
            revision={revision()}
            visualIndex={visualSlotIndex(slot.index, slots().length)}
            onReloadPage={(pageNum) => props.callbacks.onReloadPage(pageNum)}
          />
        )}</For>
      </main>
    </div>
  );
}

function PageSlotView(props: {
  doublePageSide: DoublePageSide;
  direction: ReadDirection;
  navigationMode: NavigationMode;
  pageLayout: PageLayout;
  slot: PageSlot;
  revision: number;
  visualIndex: number;
  onReloadPage: (pageNum: number) => void;
}) {
  let node!: HTMLElement;
  let frame!: HTMLElement;
  const content = createMemo<SlotContent>(() => {
    void props.revision;
    return {
      pageNum: props.slot.pageNum,
      kind: props.slot.kind,
      state: props.slot.state,
      errorMessage: props.slot.errorMessage ?? undefined,
    };
  });
  const image = createMemo(() => {
    void props.revision;
    return props.slot.state === "ready" ? props.slot.image : null;
  });
  const slotStyle = createMemo(() => {
    void props.revision;
    const frameShortSide = Math.min(props.slot.frameWidth, props.slot.frameHeight);
    return {
      "--reader-page-height": `${props.slot.frameHeight + PAGE_SLOT_SPACING}px`,
      "--reader-page-width": `${props.slot.frameWidth + PAGE_SLOT_SPACING}px`,
      "--reader-frame-width": `${props.slot.frameWidth}px`,
      "--reader-frame-height": `${props.slot.frameHeight}px`,
      "--reader-end-font-size": `${Math.max(10, frameShortSide * 0.11)}px`,
      "--reader-end-padding": `${Math.min(24, Math.max(4, frameShortSide * 0.06))}px`,
      order: String(props.visualIndex),
    };
  });

  onCleanup(() => {
    if (props.slot.elements?.node === node) {
      props.slot.elements = null;
    }
  });

  return (
    <section
      ref={node}
      class={`ehpeek-page flex items-center ${props.doublePageSide === "left" ? "justify-end" : props.doublePageSide === "right" ? "justify-start" : "justify-center"} ${pageSlotClass(
        props.navigationMode,
        props.direction,
        props.pageLayout,
      )}`}
      data-ehpeek-page-num={String(props.slot.pageNum)}
      style={slotStyle()}
    >
      <div
        ref={(element) => {
          frame = element;
          props.slot.elements = { node, frame };
        }}
        class="flex w-[var(--reader-frame-width)] h-[var(--reader-frame-height)] items-center justify-center overflow-hidden [container-type:size]"
      >
        <Show
          when={image()}
          keyed
          fallback={<PageSlotPlaceholder content={content()} text={slotPlaceholderText(content())} onReloadPage={props.onReloadPage} />}
        >
          {(currentImage) => currentImage}
        </Show>
      </div>
    </section>
  );
}

function doublePageSide(
  pageNum: number,
  currentPageNum: number,
  navigationMode: NavigationMode,
  pageLayout: PageLayout,
  direction: ReadDirection,
): DoublePageSide {
  if (navigationMode !== "paged" || pageLayout !== "double") {
    return null;
  }

  const firstInPair = Math.abs(pageNum - currentPageNum) % 2 === 0;
  if (direction === "rtl") {
    return firstInPair ? "right" : "left";
  }
  return firstInPair ? "left" : "right";
}

function pageSlotClass(
  navigationMode: NavigationMode,
  direction: ReadDirection,
  pageLayout: PageLayout,
): string {
  if (navigationMode === "scroll") {
    return direction === "ttb"
      ? "w-full h-[var(--reader-page-height)] items-start pb-sm"
      : "flex-[0_0_var(--reader-page-width)] w-[var(--reader-page-width)] h-full pr-sm";
  }
  if (direction === "ttb") {
    return pageLayout === "double"
      ? "w-full h-full"
      : "flex-[0_0_100%] w-full h-full";
  }
  return pageLayout === "double"
    ? "h-full"
    : "flex-[0_0_100%] w-full h-full";
}

function PageSlotPlaceholder(props: {
  content: SlotContent;
  text: string;
  onReloadPage: (pageNum: number) => void;
}) {
  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div
      class={
        props.content.state === "error"
          ? "flex w-full h-full flex-col items-center justify-center gap-lg bg-[var(--color-reader-surface)] p-xl text-[var(--color-danger)] text-center textsize-md font-700 leading-1"
          : "relative flex w-full h-full items-center justify-center bg-[var(--color-reader-surface)] text-[var(--color-reader-muted)] text-center " +
            (props.content.kind === "end"
              ? "p-[var(--reader-end-padding)] [direction:ltr] [font-size:min(var(--ui-font-size-xl),var(--reader-end-font-size))] font-700 leading-[1.3] [unicode-bidi:plaintext]"
              : "[font-size:min(25vw,35cqi,35cqb,180px)] font-mono font-850 leading-[1] [font-variant-numeric:tabular-nums]")
      }
      role={props.content.state === "loading" ? "status" : undefined}
      aria-label={props.content.state === "loading" ? `${texts.reader.loading} ${props.text}` : undefined}
    >
      <Show when={props.content.state === "error"} fallback={
        <Show when={props.content.state === "loading"} fallback={props.text}>
          <span class="flex w-full h-full flex-col items-center justify-center gap-xl overflow-hidden" aria-hidden="true">
            <span class="block max-w-full flex-none m-0 p-0 text-center leading-[1] whitespace-nowrap [direction:ltr] [unicode-bidi:plaintext]">
              {props.text}
            </span>
            <span class="block w-md h-md flex-none box-border animate-spin rounded-full border-4px border-solid border-[var(--color-reader-border)] border-t-[var(--color-reader-accent)]" />
          </span>
        </Show>
      }>
        <button
          type="button"
          class="ehpeek-reader-page-reload appearance-none inline-flex w-64px h-64px items-center justify-center border border-[var(--color-border)] rounded-md bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer font-sans textsize-lg font-700 leading-1 hover:bg-[var(--color-badge)] active:scale-96 [touch-action:manipulation]"
          aria-label={`${texts.reader.reloadPage} ${props.content.pageNum}`}
          title={texts.reader.reloadPage}
          onPointerDown={stop}
          onClick={(event: MouseEvent) => {
            stop(event);
            props.onReloadPage(props.content.pageNum);
          }}
        >
          <Icon name="refresh" size={32} />
        </button>
        <div class="max-w-[min(86vw,760px)] break-anywhere [direction:ltr] [unicode-bidi:plaintext]">
          {texts.reader.failedPrefix}
        </div>
        <Show when={props.content.errorMessage}>
          <div class="max-w-[min(86vw,760px)] opacity-80 break-anywhere textsize-sm font-500 leading-[1.4] [direction:ltr] [unicode-bidi:plaintext]">
            {props.content.errorMessage}
          </div>
        </Show>
      </Show>
    </div>
  );
}

function pageImageDom(pageNum: number, slotImage: ViewportImage): HTMLImageElement {
  const image = document.createElement("img");

  image.className = "block w-full h-full object-contain select-none [-webkit-user-drag:none]";
  image.alt = `Page ${pageNum}`;
  image.decoding = "async";
  image.loading = "eager";
  image.draggable = false;
  image.setAttribute("fetchpriority", slotImage.highPriority ? "high" : "low");
  image.src = slotImage.imageUrl;

  if (slotImage.width && slotImage.height) {
    image.width = slotImage.width;
    image.height = slotImage.height;
  }

  return image;
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

function createPagesScroller(element: HTMLElement) {
  const clampedTop = (scrollTop: number, bounds?: VerticalScrollBounds | null): number => {
    if (!bounds) {
      return scrollTop;
    }

    return clamp(scrollTop, bounds.min ?? Number.NEGATIVE_INFINITY, bounds.max ?? Number.POSITIVE_INFINITY);
  };

  return {
    element,
    resetPosition(): void {
      element.scrollLeft = 0;
      element.scrollTop = 0;
    },
    scrollLeft(): number {
      return element.scrollLeft;
    },
    scrollTop(): number {
      return element.scrollTop;
    },
    viewportWidth(): number {
      return element.clientWidth || window.innerWidth || 1;
    },
    viewportHeight(): number {
      return element.clientHeight;
    },
    moveToLeft(scrollLeft: number): void {
      element.scrollLeft = scrollLeft;
    },
    centerHorizontal(): void {
      element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
    },
    centerVertical(): void {
      element.scrollTop = Math.max(0, (element.scrollHeight - element.clientHeight) / 2);
    },
    centerAnchor(): ViewportCenterAnchor | null {
      const viewportRect = element.getBoundingClientRect();
      const centerX = viewportRect.left + viewportRect.width / 2;
      const centerY = viewportRect.top + viewportRect.height / 2;
      const pages = Array.from(element.querySelectorAll<HTMLElement>(".ehpeek-page"));
      let closest: { distance: number; node: HTMLElement } | null = null;
      for (const node of pages) {
        const rect = node.getBoundingClientRect();
        const dx = centerX < rect.left ? rect.left - centerX : centerX > rect.right ? centerX - rect.right : 0;
        const dy = centerY < rect.top ? rect.top - centerY : centerY > rect.bottom ? centerY - rect.bottom : 0;
        const distance = Math.hypot(dx, dy);
        if (!closest || distance < closest.distance) {
          closest = { distance, node };
        }
      }
      if (!closest) {
        return null;
      }
      const rect = closest.node.getBoundingClientRect();
      const pageNum = Number(closest.node.dataset.ehpeekPageNum || "");
      return Number.isFinite(pageNum) && rect.width > 0 && rect.height > 0
        ? {
            pageNum,
            xRatio: (centerX - rect.left) / rect.width,
            yRatio: (centerY - rect.top) / rect.height,
          }
        : null;
    },
    restoreCenterAnchor(anchor: ViewportCenterAnchor): void {
      const node = element.querySelector<HTMLElement>(`.ehpeek-page[data-ehpeek-page-num="${anchor.pageNum}"]`);
      if (!node) {
        return;
      }
      const viewportRect = element.getBoundingClientRect();
      const pageRect = node.getBoundingClientRect();
      const centerX = viewportRect.left + viewportRect.width / 2;
      const centerY = viewportRect.top + viewportRect.height / 2;
      element.scrollLeft += pageRect.left + pageRect.width * anchor.xRatio - centerX;
      element.scrollTop += pageRect.top + pageRect.height * anchor.yRatio - centerY;
    },
    moveToTop(scrollTop: number, bounds?: VerticalScrollBounds | null): void {
      element.scrollTop = clampedTop(scrollTop, bounds);
    },
    slotTop(elements: SlotElements): number {
      const elementsRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      return element.scrollTop + elementsRect.top - scrollerRect.top;
    },
    slotLeft(elements: SlotElements): number {
      const elementsRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      return element.scrollLeft + elementsRect.left - scrollerRect.left;
    },

    slotOffset(
      elements: SlotElements,
      navigationMode: NavigationMode,
      direction: ReadDirection,
      pageLayout: PageLayout,
    ): number {
      const pageRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      if (direction === "ttb") {
        return pageRect.top - scrollerRect.top;
      }
      if (direction === "rtl" && (navigationMode === "scroll" || pageLayout === "double")) {
        return pageRect.right - scrollerRect.right;
      }
      return pageRect.left - scrollerRect.left;
    },

    slotContainsViewportTarget(elements: SlotElements, direction: ReadDirection): boolean {
      const scrollerRect = element.getBoundingClientRect();
      const rect = elements.node.getBoundingClientRect();
      if (direction === "ttb") {
        const target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
        return rect.top <= target && rect.bottom > target;
      }
      const offset = Math.min(80, scrollerRect.width * 0.14);
      const target = direction === "rtl" ? scrollerRect.right - offset : scrollerRect.left + offset;
      return rect.left <= target && rect.right > target;
    },
  };
}

function slotPlaceholderText(content: SlotContent): string {
  if (content.state === "error") {
    return texts.reader.failedPrefix;
  }

  if (content.kind === "end") {
    return texts.reader.end;
  }

  if (content.kind === "blank") {
    return "";
  }

  return String(content.pageNum);
}

function pageSlotKind(pageNum: number, totalPages: number | undefined): PageSlotKind {
  if (pageNum < 1) {
    return "blank";
  }

  if (totalPages && pageNum === totalPages + 1) {
    return "end";
  }

  if (totalPages && pageNum > totalPages + 1) {
    return "blank";
  }

  return "page";
}

function pageSlot(pageNum: number, kind: PageSlotKind): PageSlot {
  return {
    pageNum,
    index: 0,
    kind,
    state: kind === "page" ? "idle" : "ready",
    aspectRatio: FALLBACK_ASPECT_RATIO,
    width: null,
    height: null,
    image: null,
    errorMessage: null,
    frameWidth: 1,
    frameHeight: Math.ceil(FALLBACK_ASPECT_RATIO),
    elements: null,
    token: 0,
  };
}

function applyPageMetaToSlot(slot: PageSlot, page: PageMeta): void {
  const aspectRatio = normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO);

  if (slot.aspectRatio === aspectRatio && slot.state !== "error") {
    return;
  }

  slot.aspectRatio = aspectRatio;
  slot.kind = "page";
  slot.state = "idle";
  slot.image = null;
  slot.errorMessage = null;
  slot.width = null;
  slot.height = null;
  slot.token += 1;
}

function clearNonPageSlotMeta(slot: PageSlot): void {
  if (slot.kind !== "blank" && slot.kind !== "end") {
    return;
  }

  slot.state = "ready";
  slot.image = null;
  slot.errorMessage = null;
  slot.width = null;
  slot.height = null;
  slot.token += 1;
}

function pageSlotAspectRatio(slot: PageSlot): number {
  return slot.width && slot.height && slot.width > 0 && slot.height > 0
    ? slot.height / slot.width
    : normalizedAspectRatio(slot.aspectRatio, FALLBACK_ASPECT_RATIO);
}

export function containFitScale(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  return Math.min(
    Math.max(1, viewportWidth) / Math.max(1, imageWidth),
    Math.max(1, viewportHeight) / Math.max(1, imageHeight),
  );
}

function containFitFrame(
  aspectRatio: number,
  viewportWidth: number,
  viewportHeight: number,
  scale = 1,
): { height: number; width: number } {
  const width = Math.max(1, Math.min(
    Math.max(1, viewportWidth),
    Math.max(1, viewportHeight) / aspectRatio,
  ) * scale);
  return { height: width * aspectRatio, width };
}
