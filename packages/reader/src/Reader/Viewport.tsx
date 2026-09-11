import { createEffect, createSignal, For, onCleanup, onMount, Show, untrack, type Accessor, type JSX } from "solid-js";
import { getReaderControls, useReaderContext } from "./Context";
import { createReaderGestures, type ReaderGestureViewport } from "./gestures";
import { ReaderPageView } from "./Page";
import { ReaderPositionBar } from "./PositionBar";
import { ZoomOverlay, type ZoomOverlayImage } from "./ZoomOverlay";
import { pageFrameSize } from "./layout";
import { createPagesScroller, type SlotElements, type ScrollBounds, type ViewportCenterAnchor } from "./scroller";
import { ScrollAnimator, ScrollFlingAnimator, type ScrollMotion } from "../kit/animation";
import { createPointerGestureElement } from "../kit/PointerGesture";
import { clamp, normalizedAspectRatio } from "../kit/helpers";
export interface ReaderViewportSize {
  /** Available reading area in CSS pixels. */
  width: number;
  height: number;
}

export interface ReaderViewportRef {
  size: Accessor<ReaderViewportSize | null>;
  /** First visible content page in reading order; null before layout or on the end screen. */
  firstVisiblePage: Accessor<number | null>;
  /**
   * Align a reading page after its frame is available. True means alignment completed;
   * replacement, user interruption or unmount settles the request with false.
   */
  moveToPage(pageNum: number, motion?: ScrollMotion): Promise<boolean>;
  /** Stop page movement and dragging without changing the committed reading page. */
  stopMotion(): void;
  /** Dismiss image zoom; return false when there was no zoom to dismiss. */
  closeZoom(): boolean;
}

export interface ReaderViewportProps {
  /** Initial normalized reading page, including the separate-cover and double-page rules. */
  initPage: number;
  /**
   * Report the reading page observed during user scrolling, not programmatic alignment.
   * Reader accepts this position without writing the same scroll offset back to the DOM.
   */
  onScrollPageChange(pageNum: number): void;
  /** Center taps toggle tools; opening image zoom hides them. */
  onToggleToolbar(): void;
  onHideToolbar(): void;
}


const PAGE_SLOT_SPACING = 8;
const FALLBACK_ASPECT_RATIO = 1.42;
const HORIZONTAL_FLING_VELOCITY_MULTIPLIER = 1.4;
const HORIZONTAL_FLING_MAX_VELOCITY = 1.8;
const VERTICAL_FLING_VELOCITY_MULTIPLIER = 1.35;
const VERTICAL_FLING_MAX_VELOCITY = 2.4;
const VERTICAL_FLING_DECAY = 0.001;
const VERTICAL_FLING_MAX_FRAME_DELTA_MS = 96;
type PageSlot = {
  pageNum: number;
  index: number;
  kind: "page" | "blank" | "end";
  frameWidth: number;
  frameHeight: number;
  elements: SlotElements | null;
};

export function ReaderViewport(props: ReaderViewportProps) {
  const ctx = useReaderContext();
  const controls = () => getReaderControls(ctx);
  const pageLayout = () => controls().pageLayout === "double" && controls().firstPageSeparate && ctx.position.page() === 1 ? "single" : controls().pageLayout;
  const pagedMode = () => controls().navigationMode === "paged";
  const horizontalAxis = () => controls().direction !== "ttb";
  const [slots, setSlots] = createSignal<PageSlot[]>([]);
  const [revision, setRevision] = createSignal(0);
  const [size, setSize] = createSignal<ReaderViewportSize | null>(null);
  const [firstVisiblePage, setFirstVisiblePage] = createSignal<number | null>(null);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [zoomImage, setZoomImage] = createSignal<ZoomOverlayImage | null>(null);
  let scroller!: HTMLDivElement;
  let scrollerApi!: ReturnType<typeof createPagesScroller>;
  let gestures!: ReturnType<typeof createReaderGestures>;
  let disposed = false;
  let resizeFrame: number | undefined;
  let scrollFrame: number | undefined;
  let programmaticFrame: number | undefined;
  let programmatic = false;
  let syncingRevision = 0;
  const pages = { items: [] as PageSlot[] };
  const slotFor = (pageNum: number) => pages.items.find(slot => slot.pageNum === pageNum);
  const refresh = () => setRevision(value => value + 1);
  const viewportWidth = () => size()?.width ?? 1;
  const viewportHeight = () => size()?.height ?? 1;
  const scrollTop = () => scrollerApi.scrollTop();
  const aspectRatio = (pageNum: number) => {
    const resource = ctx.loading.page(pageNum);
    const width = resource?.element?.naturalWidth || resource?.image?.width;
    const height = resource?.element?.naturalHeight || resource?.image?.height;
    return width && height ? height / width : normalizedAspectRatio(resource?.page?.aspectRatio, FALLBACK_ASPECT_RATIO);
  };
  const horizontalAnchorOffset = (pageSlots: PageSlot[], anchor: ViewportCenterAnchor): number | null => {
    const orderedSlots = controls().direction === "rtl" ? pageSlots.slice().reverse() : pageSlots;
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
    const scrolling = controls().navigationMode === "scroll";
    const reference = scrolling ? ctx.scrollScale.referenceImageSize() : null;
    const frame = pageFrameSize({
      aspectRatio: aspectRatio(slot.pageNum),
      contentPage: slot.kind === "page",
      viewportWidth: viewportWidth(),
      viewportHeight: viewportHeight(),
      navigationMode: controls().navigationMode,
      pageLayout: pageLayout(),
      sizeScale: scrolling ? ctx.scrollScale.value() : null,
      reference,
      referenceAspectRatio: reference
        ? reference.height / reference.width
        : scrolling
          ? ctx.loading.page(props.initPage)?.page?.aspectRatio ?? FALLBACK_ASPECT_RATIO
          : FALLBACK_ASPECT_RATIO,
      horizontal: scrolling && horizontalAxis(),
    });
    slot.frameWidth = frame.width;
    slot.frameHeight = frame.height;
  };
  const pageOffset = (pageNum: number) => {
    const elements = slotFor(pageNum)?.elements;
    return elements ? scrollerApi.slotOffset(elements, controls().navigationMode, controls().direction, pageLayout()) : null;
  };
  const verticalScrollBoundsForElements = (
    firstElements: SlotElements | null | undefined,
    lastElements: SlotElements | null | undefined,
  ): ScrollBounds | null => {
    const bounds: ScrollBounds = {};

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
  const verticalScrollBounds = (): ScrollBounds | null => {
    if (controls().navigationMode !== "scroll" || horizontalAxis()) {
      return null;
    }

    return verticalScrollBoundsForElements(
      slotFor(1)?.elements,
      ctx.source.totalPages ? slotFor(ctx.source.totalPages + 1)?.elements : null,
    );
  };
  const moveToTop = (nextScrollTop: number) => {
    scrollerApi.moveToTop(nextScrollTop, verticalScrollBounds());
  };
  const horizontalScrollBounds = (): ScrollBounds | null => {
    if (controls().navigationMode !== "scroll" || !horizontalAxis()) {
      return null;
    }
    const firstElements = slotFor(1)?.elements;
    const endElements = ctx.source.totalPages ? slotFor(ctx.source.totalPages + 1)?.elements : null;
    const bounds: ScrollBounds = {};
    if (controls().direction === "rtl") {
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

  // Alignment settles exactly once, including interruption and component disposal.
  const horizontalAnimator = new ScrollAnimator("x");
  const verticalAnimator = new ScrollAnimator("y");
  const flingAnimator = new ScrollFlingAnimator();
  let dragStartPosition: { left: number; top: number } | null = null;
  let settleMove: ((completed: boolean) => void) | null = null;
  let moveRevision = 0;
  const suppressScrollObservation = () => {
    programmatic = true;
    window.cancelAnimationFrame(programmaticFrame ?? 0);
    programmaticFrame = window.requestAnimationFrame(() => {
      programmaticFrame = window.requestAnimationFrame(() => { programmatic = false; });
    });
  };
  const stopMotion = () => {
    moveRevision++;
    dragStartPosition = null;
    flingAnimator.cancel();
    horizontalAnimator.cancel();
    verticalAnimator.cancel();
    settleMove?.(false);
    settleMove = null;
  };
  const moveToPage = (pageNum: number, motion: ScrollMotion = "instant"): Promise<boolean> => {
    stopMotion();
    suppressScrollObservation();
    const token = moveRevision;
    return new Promise(resolve => {
      settleMove = resolve;
      queueMicrotask(() => untrack(() => {
        if (disposed || token !== moveRevision) return;
        const delta = pageOffset(pageNum);
        const complete = () => {
          if (token !== moveRevision) return;
          settleMove = null;
          suppressScrollObservation();
          setFirstVisiblePage(measureFirstVisiblePage());
          resolve(true);
        };
        if (delta === null) { settleMove = null; resolve(false); return; }
        programmatic = true;
        window.cancelAnimationFrame(programmaticFrame ?? 0);
        if (horizontalAxis()) horizontalAnimator.scrollTo(scroller, scrollerApi.scrollLeft() + delta, motion, complete);
        else if (pagedMode()) verticalAnimator.scrollTo(scroller, scrollTop() + delta, motion, complete);
        else { moveToTop(scrollTop() + delta); complete(); }
      }));
    });
  };
  const gestureDragging = createPointerGestureElement(
    () => ctx.disabled() || ctx.scrollScale.adjusting() ? null : scroller ?? null,
    () => gestures.pointer,
  );
  const centerPageNum = (): number | null => {
      for (const slot of pages.items) {
        if (slot.elements && slot.kind !== "blank" && scrollerApi.slotContainsViewportTarget(slot.elements, controls().direction)) {
          return slot.pageNum;
        }
      }

      return null;
  };
  const measureFirstVisiblePage = (): number | null => {
      let first: { distance: number; pageNum: number } | null = null;
      for (const slot of pages.items) {
        if (!slot.elements || slot.kind !== "page") {
          continue;
        }
        const distance = scrollerApi.slotViewportStartDistance(
          slot.elements,
          controls().direction,
        );
        if (distance !== null && (!first || distance < first.distance)) {
          first = { distance, pageNum: slot.pageNum };
        }
      }
      return first?.pageNum ?? null;
  };

  const actions: ReaderGestureViewport = {
    // Movement and its cancellation share the same motion owner.
    isDragging: gestureDragging,
    beginDrag(): void {
      stopMotion();
      programmatic = false;
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
    moveToTop,
    moveToPage,
    stopMotion,
    startVerticalFlingFromDragVelocity(dragVelocityY, onStop): void {
      flingAnimator.start({
        axis: "y",
        scroller,
        initialVelocity: -dragVelocityY * VERTICAL_FLING_VELOCITY_MULTIPLIER,
        maxVelocity: VERTICAL_FLING_MAX_VELOCITY,
        decay: VERTICAL_FLING_DECAY,
        maxFrameDelta: VERTICAL_FLING_MAX_FRAME_DELTA_MS,
        setScrollPosition: moveToTop,
        canRun: () => !disposed && controls().navigationMode === "scroll" && !horizontalAxis(),
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
        canRun: () => !disposed && controls().navigationMode === "scroll" && horizontalAxis(),
        onStop,
      });
    },


    // Read-only measurements translate rendered slots into reader coordinates.
    scrollLeft: () => scrollerApi.scrollLeft(),
    scrollTop,
    viewportXRatio: (clientX) => scrollerApi.viewportXRatio(clientX),
    isHitEndPage(point): boolean {
      const pageNum = pageNumAtPoint(point);
      return pageNum !== null && slotFor(pageNum)?.kind === "end";
    },
    pageZoomScale(pageNum): number {
      const slot = slotFor(pageNum);
      const frameRect = slot?.elements?.frame.getBoundingClientRect();
      const resource = ctx.loading.page(pageNum);
      const imageWidth = resource?.element?.naturalWidth || resource?.image?.width;
      const imageHeight = resource?.element?.naturalHeight || resource?.image?.height;
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
  };


  const followScroll = () => {
    setFirstVisiblePage(measureFirstVisiblePage());
    if (ctx.disabled() || ctx.scrollScale.adjusting() || zoomImage() || pagedMode() || programmatic) return;
    const page = centerPageNum();
    if (page !== null && page !== ctx.position.page()) props.onScrollPageChange(page);
  };
  const onScroll = () => {
    // Native scrolling bypasses gesture bounds; window padding is not a reading destination.
    if (!pagedMode() && !ctx.scrollScale.adjusting() && !zoomImage()) {
      if (horizontalAxis()) moveToLeft(scrollerApi.scrollLeft());
      else moveToTop(scrollTop());
    }
    setScrollOffset(horizontalAxis() ? scrollerApi.scrollLeft() : scrollTop());
    if (programmatic || gestureDragging() || scrollFrame !== undefined) return;
    scrollFrame = window.requestAnimationFrame(() => untrack(() => {
      scrollFrame = undefined;
      followScroll();
    }));
  };

  // Frame identity survives window changes; loading owns the image lifetime independently.
  let previousMode = "";
  let previousDirection = "";
  let previousPageLayout = "";
  let previousViewportSize: ReaderViewportSize | null = null;
  createEffect(() => {
    const numbers = ctx.loading.windowPages();
    const mode = controls().navigationMode;
    const direction = controls().direction;
    const layout = pageLayout();
    const viewportSize = size();
    const anchorMoveRevision = moveRevision;
    const anchor = settleMove ? null : scrollerApi.centerAnchor();
    const oldOffset = anchor && horizontalAxis() ? horizontalAnchorOffset(pages.items, anchor) : null;
    const oldLeft = scrollerApi.scrollLeft();
    const previous = new Map(pages.items.map(slot => [slot.pageNum, slot]));
    const previousSizes = pages.items.map(slot => ({ page: slot.pageNum, width: slot.frameWidth, height: slot.frameHeight }));
    pages.items = numbers.map((pageNum, index) => {
      const slot = previous.get(pageNum) ?? {
        pageNum, index, kind: pageNum < 1 || (ctx.source.totalPages && pageNum > ctx.source.totalPages + 1) ? "blank"
          : ctx.source.totalPages && pageNum === ctx.source.totalPages + 1 ? "end" : "page",
        frameWidth: 1, frameHeight: 1, elements: null,
      };
      slot.index = index;
      return slot;
    });
    for (const slot of pages.items) applySlotSize(slot);
    const changed = previousMode !== mode || previousDirection !== direction || previousPageLayout !== layout ||
      previousViewportSize?.width !== viewportSize?.width || previousViewportSize?.height !== viewportSize?.height ||
      previousSizes.length !== pages.items.length || pages.items.some((slot, index) => {
        const old = previousSizes[index];
        return !old || old.page !== slot.pageNum || old.width !== slot.frameWidth || old.height !== slot.frameHeight;
      });
    // Loading/error changes repaint Page, but must not interrupt a scroll with unchanged geometry.
    if (!changed) return;
    previousMode = mode;
    previousDirection = direction;
    previousPageLayout = layout;
    previousViewportSize = viewportSize;
    setSlots(pages.items.slice());
    refresh();
    const nextOffset = anchor && horizontalAxis() ? horizontalAnchorOffset(pages.items, anchor) : null;
    const token = ++syncingRevision;
    // Offset deltas compensate for frames removed before the same image-relative anchor.
    if (oldOffset !== null && nextOffset !== null) {
      suppressScrollObservation();
      moveToLeft(oldLeft + nextOffset - oldOffset);
    }
    queueMicrotask(() => {
      if (disposed || token !== syncingRevision) return;
      // A newer seek/turn takes precedence over the anchor captured for this reflow.
      if (anchor && !settleMove && anchorMoveRevision === moveRevision) {
        suppressScrollObservation();
        scrollerApi.restoreCenterAnchor(anchor);
      }
      setFirstVisiblePage(measureFirstVisiblePage());
    });
  });
  const stripStyle = () => {
    revision();
    if (pagedMode()) return {};
    return horizontalAxis()
      ? { height: `${Math.max(viewportHeight(), ...pages.items.map(slot => slot.frameHeight))}px`, width: "max-content" }
      : { width: `${Math.max(viewportWidth(), ...pages.items.map(slot => slot.frameWidth))}px` };
  };
  onMount(() => {
    const measure = () => {
      setSize({ width: Math.max(1, scroller.clientWidth || window.innerWidth), height: Math.max(1, scroller.clientHeight || window.innerHeight) });
    };
    measure();
    const observer = new ResizeObserver(() => {
      if (resizeFrame !== undefined) return;
      resizeFrame = window.requestAnimationFrame(() => { resizeFrame = undefined; measure(); });
    });
    observer.observe(scroller);
    onCleanup(() => observer.disconnect());
    ctx.refs.bindViewport({
      size, firstVisiblePage, moveToPage, stopMotion,
      closeZoom() {
        if (!zoomImage()) return false;
        setZoomImage(null);
        return true;
      },
    });
    scroller.focus({ preventScroll: true });
    void moveToPage(props.initPage);
  });
  onCleanup(() => {
    disposed = true;
    stopMotion();
    window.cancelAnimationFrame(resizeFrame ?? 0);
    window.cancelAnimationFrame(scrollFrame ?? 0);
    window.cancelAnimationFrame(programmaticFrame ?? 0);
    ctx.refs.bindViewport(null);
  });

  return <>
    <ZoomOverlay image={zoomImage()} onClose={() => setZoomImage(null)}
      actionsRef={zoom => { gestures = createReaderGestures({
        viewport: actions, zoom, zoomImage: [zoomImage, setZoomImage],
        onToggleToolbar: () => props.onToggleToolbar(),
        onHideToolbar: () => props.onHideToolbar(),
        followScroll,
      }); }} />
    <div class="ehpeek-reader-canvas">
      <div ref={element => { scroller = element; scrollerApi = createPagesScroller(element); }}
        class="ehpeek-reader-scroller"
        data-navigation-mode={controls().navigationMode} data-read-direction={controls().direction}
        data-page-layout={pageLayout()} data-zoom-active={zoomImage() !== null} tabIndex={-1}
        onScroll={onScroll} onWheel={event => gestures.wheel(event)}>
        <main class="ehpeek-reader-page-strip" style={stripStyle()}>
          <For each={slots()}>{slot => <PageFrame slot={slot} revision={revision()}
            visualIndex={controls().direction === "rtl" ? slots().length - 1 - slot.index : slot.index}
            side={!pagedMode() || pageLayout() !== "double" ? null
              : (Math.abs(slot.pageNum - ctx.position.page()) % 2 === 0) === (controls().direction === "rtl") ? "right" : "left"} />}</For>
        </main>
      </div>
    </div>
    <Show when={!pagedMode() && controls().direction === "ttb" && (ctx.source.totalPages ?? 0) > 1}>
      <ReaderPositionBar scrollOffset={scrollOffset()} viewportLength={viewportHeight()} narrow={viewportWidth() < window.innerWidth} />
    </Show>
  </>;
}

function PageFrame(props: { slot: PageSlot; revision: number; visualIndex: number; side: "left" | "right" | null }): JSX.Element {
  let node!: HTMLElement;
  const style = () => {
    void props.revision;
    const short = Math.min(props.slot.frameWidth, props.slot.frameHeight);
    return {
      "--reader-page-height": `${props.slot.frameHeight + PAGE_SLOT_SPACING}px`,
      "--reader-page-width": `${props.slot.frameWidth + PAGE_SLOT_SPACING}px`,
      "--reader-frame-width": `${props.slot.frameWidth}px`,
      "--reader-frame-height": `${props.slot.frameHeight}px`,
      "--reader-end-font-size": `${Math.max(10, short * 0.11)}px`,
      "--reader-end-padding": `${Math.min(24, Math.max(4, short * 0.06))}px`,
      order: String(props.visualIndex),
    };
  };
  onCleanup(() => { props.slot.elements = null; });
  return <section ref={node} class="ehpeek-page" data-pair-side={props.side} data-ehpeek-page-num={String(props.slot.pageNum)} style={style()}>
    <div ref={frame => { props.slot.elements = { node, frame }; }} class="ehpeek-reader-page-frame">
      <ReaderPageView pageNum={props.slot.pageNum} />
    </div>
  </section>;
}
