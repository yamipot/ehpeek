import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show, untrack } from "solid-js";
import type { ReaderScrollWidthScale, ReadDirection, ViewMode } from "../../state";
import texts from "../../texts.json";
import { clamp, normalizedAspectRatio, positiveNumber } from "../../utils";
import { ScrollAnimator, ScrollFlingAnimator, type ScrollMotion } from "../animation";
import { createPointerGestureElement, type PointerGestureCallbacks } from "../PointerGesture";
import { Icon } from "../Widgets/Icon";

const FALLBACK_ASPECT_RATIO = 1.42;
const DEFAULT_DECODED_IMAGE_CACHE_LIMIT = 24;
const DECODED_IMAGE_CACHE_BYTES = 96 * 1024 * 1024;

type PageMeta = {
  aspectRatio: number;
};

type PageState = "idle" | "loading" | "ready" | "error";
type VerticalScrollBounds = { min?: number; max?: number };
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
  pageImageWidth: (pageNum: number) => number | null;
  pageZoomScale: (pageNum: number) => number;
  pageNumAtPoint: (point: { clientX: number; clientY: number }) => number | null;
  pageOffset: (pageNum: number) => number | null;
  resetPageError: (pageNum: number) => boolean;
  resetPageLoading: (pageNum: number, token: number) => boolean;
  resetPosition: () => void;
  scrollTop: () => number;
  setPageError: (pageNum: number, token: number, errorMessage: string) => boolean;
  startVerticalFlingFromDragVelocity: (dragVelocityY: number, onStop: () => void) => void;
  stopMotion: () => void;
  viewportWidth: () => number;
};

export function PagesViewport(props: {
  actionsRef: (actions: PagesViewportActions) => void;
  callbacks: PagesViewportCallbacks;
  decodedImageCacheLimit?: number;
  mode: ViewMode;
  readDirection: ReadDirection;
  scrollWidthScale: ReaderScrollWidthScale;
  window: PagesViewportWindowOptions;
}) {
  const [slots, setSlots] = createSignal<PageSlot[]>([]);
  const [revision, setRevision] = createSignal(0);
  const [renderedScrollWidthScale, setRenderedScrollWidthScale] = createSignal(
    untrack(() => props.scrollWidthScale),
  );
  const horizontalAnimator = new ScrollAnimator("x");
  const flingAnimator = new ScrollFlingAnimator();
  let pageSlots: PageSlot[] = [];
  let scroller!: HTMLDivElement;
  let scrollerApi!: ReturnType<typeof createPagesScroller>;
  let dragStartPosition: { left: number; top: number } | null = null;
  let resizeFrame: number | null = null;
  let scrollScaleRevision = 0;
  let moveRequestToken = 0;
  let disposed = false;
  const decodedImageCacheLimit = Math.max(
    0,
    Math.floor(untrack(() => props.decodedImageCacheLimit) ?? DEFAULT_DECODED_IMAGE_CACHE_LIMIT),
  );
  const cachedImages = new Map<number, CachedPageImage>();
  let cachedImageBytes = 0;

  const refresh = () => setRevision((value) => value + 1);
  const horizontalMode = () => props.mode !== "scroll";
  const slotFor = (pageNum: number) => pageSlots.find((slot) => slot.pageNum === pageNum);
  const viewportWidth = () => scrollerApi.viewportWidth();
  const viewportHeight = () => scrollerApi.viewportHeight();
  const scrollTop = () => scrollerApi.scrollTop();
  const visualSlotIndex = (index: number, slotCount: number) =>
    horizontalMode() && props.readDirection === "rtl" ? slotCount - 1 - index : index;
  const applySlotSize = (slot: PageSlot) => {
    const widthScale = renderedScrollWidthScale();
    const frameWidth = Math.max(
      1,
      props.mode !== "scroll"
        ? viewportWidth()
        : widthScale === "one-to-one"
          ? slot.width ?? viewportWidth()
          : viewportWidth() * (widthScale ?? 1),
    );
    slot.frameWidth = frameWidth;
    slot.frameHeight = Math.ceil(frameWidth * pageSlotAspectRatio(slot));
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
    return elements ? scrollerApi.slotOffset(elements, props.mode, props.readDirection) : null;
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
    if (props.mode !== "scroll") {
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
  };
  const performPageMove = (pageNum: number, motion: ScrollMotion, onComplete?: () => void): boolean => {
    const delta = pageOffset(pageNum);

    if (delta === null) {
      return false;
    }

    if (horizontalMode()) {
      horizontalAnimator.scrollTo(scroller, scrollerApi.scrollLeft() + delta, motion, onComplete);
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

      if (horizontalMode()) {
        scrollerApi.moveToLeft(dragStartPosition.left - delta.dx);
      } else {
        scrollerApi.moveToLeft(dragStartPosition.left - delta.dx);
        moveToTop(dragStartPosition.top - delta.dy);
      }
      return true;
    },
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
    scrollTop,
    viewportWidth,
    pageOffset,
    centerPageNum(): number | null {
      for (const slot of pageSlots) {
        if (slot.elements && slot.kind !== "blank" && scrollerApi.slotContainsViewportTarget(slot.elements)) {
          return slot.pageNum;
        }
      }

      return null;
    },
    isHitEndPage(point): boolean {
      const pageNum = pageNumAtPoint(point);
      return pageNum !== null && slotFor(pageNum)?.kind === "end";
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
        scroller,
        initialVelocityY: -dragVelocityY,
        setScrollTop: moveToTop,
        canRun: () => !disposed && props.mode === "scroll",
        onStop,
      });
    },
  };

  untrack(() => props.actionsRef(actions));
  createEffect(() => syncWindow(props.window));
  createEffect(() => {
    const mode = props.mode;
    const scrollWidthScale = props.scrollWidthScale;
    if (mode !== "scroll") {
      setRenderedScrollWidthScale(1);
      return;
    }
    const anchor = scrollerApi.centerAnchor();
    const scaleRevision = ++scrollScaleRevision;
    setRenderedScrollWidthScale(scrollWidthScale);
    untrack(resizePages);
    queueMicrotask(() => {
      if (disposed || scaleRevision !== scrollScaleRevision) {
        return;
      }
      if (anchor) {
        scrollerApi.restoreCenterAnchor(anchor);
      } else {
        scrollerApi.centerHorizontal();
      }
    });
  });
  const scrollStripWidth = () => {
    void revision();
    if (props.mode !== "scroll") {
      return undefined;
    }
    const widthScale = renderedScrollWidthScale();
    if (widthScale !== "one-to-one") {
      return `${(widthScale ?? 1) * 100}%`;
    }
    return `${Math.max(viewportWidth(), ...pageSlots.map((slot) => slot.frameWidth))}px`;
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
        "w-full h-full overflow-auto overscroll-contain scroll-auto [touch-action:pan-x_pan-y] cursor-grab scrollbar-hidden " +
        "[&[data-dragging=true]]:(cursor-grabbing select-none) " +
        "[#ehpeek-reader[data-view-mode=paged]_&]:(overflow-hidden touch-none select-none) " +
        "[#ehpeek-reader[data-view-mode=double-page]_&]:(overflow-hidden touch-none select-none)"
      }
      tabIndex={-1}
      onScroll={() => props.callbacks.onNativeScroll()}
      onWheel={(event: WheelEvent) => {
        const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        props.callbacks.onWheel(delta, event);
      }}
    >
      <main
        class="ehpeek-reader-page-strip flex flex-col min-h-full mx-auto py-56px px-0 pb-72px [#ehpeek-reader[data-view-mode=paged]_&]:(flex-row w-auto h-full min-h-0 m-0 p-0) [#ehpeek-reader[data-view-mode=double-page]_&]:(flex-row w-auto h-full min-h-0 m-0 p-0)"
        style={{ width: scrollStripWidth() }}
      >
        <For each={slots()}>{(slot) => (
          <PageSlotView
            doublePageSide={doublePageSide(
              slot.pageNum,
              props.window.currentPageNum,
              props.mode,
              props.readDirection,
            )}
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
    return {
      "--reader-page-height": `${props.slot.frameHeight + 8}px`,
      "--reader-frame-width": `${props.slot.frameWidth}px`,
      "--reader-frame-height": `${props.slot.frameHeight}px`,
      "--reader-end-font-size": `${Math.max(10, props.slot.frameWidth * 0.11)}px`,
      "--reader-end-padding": `${Math.min(24, Math.max(4, props.slot.frameWidth * 0.06))}px`,
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
      class="ehpeek-page flex w-full h-[var(--reader-page-height)] items-start justify-center pb-sm [#ehpeek-reader[data-view-mode=paged]_&]:(flex-[0_0_100%] w-full h-full items-center p-0) [#ehpeek-reader[data-view-mode=double-page]_&]:(h-full items-center p-0)"
      data-ehpeek-page-num={String(props.slot.pageNum)}
      style={slotStyle()}
    >
      <div
        ref={(element) => {
          frame = element;
          props.slot.elements = { node, frame };
        }}
        class={`flex w-[var(--reader-frame-width)] h-[var(--reader-frame-height)] items-center justify-center overflow-hidden [#ehpeek-reader[data-view-mode=paged]_&]:(w-full h-full) [#ehpeek-reader[data-view-mode=double-page]_&]:(w-full h-full) ${props.doublePageSide === "left" ? "[&>img]:object-right" : props.doublePageSide === "right" ? "[&>img]:object-left" : ""}`}
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
  mode: ViewMode,
  readDirection: ReadDirection,
): DoublePageSide {
  if (mode !== "double-page") {
    return null;
  }

  const firstInPair = Math.abs(pageNum - currentPageNum) % 2 === 0;
  if (readDirection === "rtl") {
    return firstInPair ? "right" : "left";
  }
  return firstInPair ? "left" : "right";
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
              ? "p-[var(--reader-end-padding)] [direction:ltr] [font-size:min(var(--font-size-xl),var(--reader-end-font-size))] font-700 leading-[1.3] [unicode-bidi:plaintext]"
              : "text-[clamp(88px,25vw,180px)] desktop:text-[clamp(72px,10vw,140px)] font-mono font-850 leading-[1] [font-variant-numeric:tabular-nums]")
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

  image.className = "block w-[var(--reader-frame-width)] h-[var(--reader-frame-height)] object-contain select-none [-webkit-user-drag:none] [#ehpeek-reader[data-view-mode=paged]_&]:(w-full h-full) [#ehpeek-reader[data-view-mode=double-page]_&]:(w-full h-full)";
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

    slotOffset(elements: SlotElements, mode: ViewMode, readDirection: ReadDirection): number {
      const pageRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      if (mode === "double-page" && readDirection === "rtl") {
        return pageRect.right - scrollerRect.right;
      }
      return mode !== "scroll" ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
    },

    slotContainsViewportTarget(elements: SlotElements): boolean {
      const scrollerRect = element.getBoundingClientRect();
      const target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
      const rect = elements.node.getBoundingClientRect();
      return rect.top <= target && rect.bottom > target;
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
