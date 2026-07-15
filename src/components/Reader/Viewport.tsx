import type { ReadDirection, ViewMode } from "../../state";
import texts from "../../texts.json";
import { clamp, normalizedAspectRatio } from "../../utils";
import { ScrollAnimator, ScrollFlingAnimator, type ScrollMotion } from "../animation";

const FALLBACK_ASPECT_RATIO = 1.42;

export type PageMeta = {
  aspectRatio: number;
};

type PageState = "idle" | "loading" | "ready" | "error";
export type VerticalScrollBounds = { min?: number; max?: number };

export type PagesViewportWindowOptions = {
  currentPageNum: number;
  windowSize: number;
  totalPages?: number;
  pages: Map<number, PageMeta>;
};

export type ViewportImage = {
  imageUrl: string;
  highPriority: boolean;
  width: number | null;
  height: number | null;
};

type PageSlotKind = "page" | "blank" | "end";

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
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  elements: SlotElements | null;
  token: number;
};

function pagesViewportDom(options: { onReloadPage: (pageNum: number) => void }) {
  const scroller = document.createElement("div");
  const strip = document.createElement("main");

  scroller.className =
    "w-full h-full overflow-auto overscroll-contain scroll-auto touch-pan-y cursor-grab control-scroll-hidden " +
    "[&[data-dragging=true]]:(cursor-grabbing select-none) " +
    "[#ehpeek-reader[data-view-mode=paged]_&]:(overflow-hidden touch-none select-none)";
  scroller.tabIndex = -1;
  strip.className =
    "flex flex-col w-full min-h-full py-56px px-0 pb-72px " +
    "[#ehpeek-reader[data-view-mode=paged]_&]:(flex-row w-auto h-full min-h-0 p-0)";
  scroller.append(strip);

  const setOrder = (elements: SlotElements, visualIndex: number) => {
    elements.node.style.setProperty("order", String(visualIndex));
    elements.node.dataset.ehpeekIndex = String(visualIndex);
  };

  const setPageNum = (elements: SlotElements, pageNum: number) => {
    elements.node.dataset.ehpeekPageNum = String(pageNum);
  };

  const newSlotElements = (pageNum: number, visualIndex: number): SlotElements => {
    const elements = slotElements();
    setOrder(elements, visualIndex);
    setPageNum(elements, pageNum);
    return elements;
  };

  const appendSlotElements = (elements: SlotElements) => {
    strip.append(elements.node);
  };

  const removeSlotElements = (elements: SlotElements) => {
    elements.node.remove();
  };

  const removeStaleElements = (keepNodes: Set<HTMLElement | null>) => {
    for (const node of Array.from(strip.children)) {
      if (!keepNodes.has(node as HTMLElement)) {
        node.remove();
      }
    }
  };

  const slotElementsConnected = (elements: SlotElements) => elements.node.isConnected;
  const slots = {
    sync(
      pageSlots: PageSlot[],
      options: {
        refreshSlot: (slot: PageSlot) => void;
        visualIndex: (slotIndex: number, slotCount: number) => number;
      },
    ) {
      const keepNodes = new Set(pageSlots.map((slot) => slot.elements?.node ?? null).filter(Boolean));
      removeStaleElements(keepNodes);

      for (const slot of pageSlots) {
        if (slot.elements && !slotElementsConnected(slot.elements)) {
          slot.elements = null;
        }

        if (!slot.elements) {
          slot.elements = newSlotElements(slot.pageNum, options.visualIndex(slot.index, pageSlots.length));
          appendSlotElements(slot.elements);
        }

        options.refreshSlot(slot);

        if (slot.elements) {
          setOrder(slot.elements, options.visualIndex(slot.index, pageSlots.length));
        }
      }
    },
    removeSlot(slot: PageSlot) {
      if (!slot.elements) {
        return;
      }

      removeSlotElements(slot.elements);
      slot.elements = null;
    },
    setImage(elements: SlotElements, image: HTMLImageElement) {
      elements.frame.replaceChildren(image);
    },
    setPageNum,
    setPlaceholder(elements: SlotElements, content: SlotContent, text: string) {
      const placeholder =
        content.state === "error" ? errorPlaceholderDom(content.pageNum, text, options.onReloadPage) : placeholderDom(content.kind, text);

      elements.frame.replaceChildren(placeholder);
    },
    setSize(elements: SlotElements, frameWidth: number, frameHeight: number) {
      elements.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`);
      elements.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`);
      elements.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
    },
  };

  return { element: scroller, scroller: createPagesScroller(scroller), slots };
}

function slotElements(): SlotElements {
  const node = document.createElement("section");
  const frame = document.createElement("div");

  node.className = "ehpeek-page flex w-full h-[var(--ehpeek-page-height)] items-start justify-center pb-8px [#ehpeek-reader[data-view-mode=paged]_&]:(flex-[0_0_100%] w-full h-full items-center p-0)";
  frame.className = "flex w-[var(--ehpeek-frame-width)] h-[var(--ehpeek-frame-height)] items-center justify-center overflow-hidden [#ehpeek-reader[data-view-mode=paged]_&]:(w-full h-full)";
  node.append(frame);

  return { node, frame };
}

function placeholderDom(kind: PageSlotKind, text: string): HTMLElement {
  const placeholder = document.createElement("div");

  placeholder.className =
    "flex w-full h-full items-center justify-center bg-[#151515] text-[rgba(245,245,245,0.72)] leading-1 text-center " +
    (kind === "end"
      ? "p-24px [direction:ltr] text-[clamp(24px,6vw,42px)] font-700 leading-[1.3] [unicode-bidi:plaintext]"
      : "text-[clamp(88px,25vw,180px)] desktop:text-[clamp(72px,10vw,140px)] font-850");
  placeholder.textContent = text;
  return placeholder;
}

function errorPlaceholderDom(pageNum: number, text: string, onReloadPage: (pageNum: number) => void): HTMLElement {
  const button = document.createElement("button");
  const icon = document.createElement("span");
  const placeholder = document.createElement("div");
  const message = document.createElement("div");
  const stop = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  button.className = "inline-flex w-64px h-64px items-center justify-center border border-[rgba(255,178,167,0.64)] rounded-[var(--ehpeek-control-radius-pill)] bg-[rgba(255,178,167,0.12)] text-[#ffddd8] cursor-pointer font-sans text-34px font-700 leading-1 active:scale-96 [touch-action:manipulation]";
  button.type = "button";
  button.setAttribute("aria-label", texts.reader.reload);
  icon.setAttribute("aria-hidden", "true");
  icon.textContent = "↻";
  button.append(icon);
  placeholder.className = "flex w-full h-full flex-col items-center justify-center gap-18px bg-[#151515] p-24px text-[#ffb2a7] text-center text-18px font-700 leading-1";
  message.className = "max-w-[min(86vw,760px)] break-anywhere [direction:ltr] [unicode-bidi:plaintext]";
  message.textContent = text;
  placeholder.append(message, button);
  button.addEventListener("pointerdown", stop);
  button.addEventListener("click", (event) => {
    stop(event);
    onReloadPage(pageNum);
  });
  return placeholder;
}

function pageImageDom(pageNum: number, slotImage: ViewportImage): HTMLImageElement {
  const image = document.createElement("img");

  image.className = "block w-[var(--ehpeek-frame-width)] h-[var(--ehpeek-frame-height)] object-contain select-none [-webkit-user-drag:none] [#ehpeek-reader[data-view-mode=paged]_&]:(w-full h-full)";
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
    moveToTop(scrollTop: number, bounds?: VerticalScrollBounds | null): void {
      element.scrollTop = clampedTop(scrollTop, bounds);
    },
    slotTop(elements: SlotElements): number {
      const elementsRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      return element.scrollTop + elementsRect.top - scrollerRect.top;
    },

    slotOffset(elements: SlotElements, mode: ViewMode): number {
      const pageRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      return mode === "paged" ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
    },

    slotContainsViewportTarget(elements: SlotElements): boolean {
      const scrollerRect = element.getBoundingClientRect();
      const target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
      const rect = elements.node.getBoundingClientRect();
      return rect.top <= target && rect.bottom > target;
    },
  };
}

export class PagesViewport {
  readonly element: HTMLElement;
  private readonly dom: ReturnType<typeof pagesViewportDom>;
  private slots: PageSlot[] = [];
  private readonly horizontalAnimator = new ScrollAnimator("x");
  private readonly flingAnimator = new ScrollFlingAnimator();

  constructor(
    private readonly options: {
      mode: () => ViewMode;
      readDirection: () => ReadDirection;
      closed: () => boolean;
      totalPages: () => number | undefined;
      onReloadPage: (pageNum: number) => void;
    },
  ) {
    this.dom = pagesViewportDom({ onReloadPage: options.onReloadPage });
    this.element = this.dom.element;
  }

  scrollerElement(): HTMLElement {
    return this.dom.scroller.element;
  }

  syncWindow(options: PagesViewportWindowOptions): void {
    const oldSlots = new Map(this.slots.map((slot) => [slot.pageNum, slot]));
    const nextSlots: PageSlot[] = [];

    for (const pageNum of this.windowPageNums(options.currentPageNum, options.windowSize)) {
      const kind = pageSlotKind(pageNum, options.totalPages);
      const oldSlot = oldSlots.get(pageNum);
      const slot = oldSlot && oldSlot.kind === kind ? oldSlot : pageSlot(pageNum, kind);

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

    for (const slot of this.slots) {
      if (!nextSet.has(slot)) {
        this.removeSlot(slot);
      }
    }

    this.slots = nextSlots;
    this.slots.forEach((slot, index) => {
      slot.index = index;
    });
    this.renderSlots();
  }

  resetPosition(): void {
    this.dom.scroller.resetPosition();
  }

  stopMotion(): void {
    this.flingAnimator.cancel();
    this.horizontalAnimator.cancel();
  }

  resizePages(): void {
    for (const slot of this.slots) {
      this.applySlotSize(slot);
    }
  }

  requiredImagePageNums(): number[] {
    return this.slots
      .filter((slot) => slot.kind === "page" && slot.state === "idle")
      .map((slot) => slot.pageNum);
  }

  windowPageNums(currentPageNum: number, windowSize: number): number[] {
    const numbers: number[] = [];

    for (let offset = -windowSize; offset <= windowSize; offset += 1) {
      numbers.push(currentPageNum + offset);
    }

    return numbers;
  }

  markPageLoading(pageNum: number): number | null {
    const slot = this.slotFor(pageNum);

    if (!slot || slot.kind !== "page" || slot.state !== "idle") {
      return null;
    }

    slot.state = "loading";
    slot.token += 1;
    this.refreshSlot(slot);
    return slot.token;
  }

  createPageImage(pageNum: number, slotImage: ViewportImage): HTMLImageElement {
    return pageImageDom(pageNum, slotImage);
  }

  setPageImage(pageNum: number, token: number, slotImage: ViewportImage, image: HTMLImageElement): boolean {
    const slot = this.slotFor(pageNum);

    if (!slot || slot.token !== token || !slot.elements) {
      return false;
    }

    slot.state = "ready";
    slot.imageUrl = slotImage.imageUrl;
    slot.width = positiveDimension(image.naturalWidth) ?? slotImage.width;
    slot.height = positiveDimension(image.naturalHeight) ?? slotImage.height;
    this.applySlotSize(slot);
    this.dom.slots.setImage(slot.elements, image);
    return true;
  }

  setPageError(pageNum: number, token: number, errorMessage: string): boolean {
    const slot = this.slotFor(pageNum);

    if (!slot || slot.token !== token) {
      return false;
    }

    slot.state = "error";
    this.renderSlotPlaceholder(slot, errorMessage);
    return true;
  }

  resetPageError(pageNum: number): boolean {
    const slot = this.slotFor(pageNum);

    if (!slot || slot.kind !== "page" || slot.state !== "error") {
      return false;
    }

    slot.state = "idle";
    this.refreshSlot(slot);
    return true;
  }

  moveToPage(pageNum: number, motion: ScrollMotion = "instant", onComplete?: () => void): void {
    const delta = this.pageOffset(pageNum);

    if (delta === null) {
      return;
    }

    this.moveBy(delta, motion, onComplete);
  }

  moveBy(delta: number, motion: ScrollMotion = "instant", onComplete?: () => void): void {
    if (this.options.mode() === "paged") {
      this.horizontalAnimator.scrollTo(this.dom.scroller.element, this.dom.scroller.scrollLeft() + delta, motion, onComplete);
      return;
    }

    this.moveToTop(this.dom.scroller.scrollTop() + delta);
    onComplete?.();
  }

  moveToTop(scrollTop: number): void {
    this.dom.scroller.moveToTop(scrollTop, this.verticalScrollBounds());
  }

  startDragPosition(): number {
    return this.options.mode() === "paged" ? this.dom.scroller.scrollLeft() : this.dom.scroller.scrollTop();
  }

  dragPage(startPosition: number, delta: { dx: number; dy: number }): void {
    if (this.options.mode() === "paged") {
      this.dom.scroller.moveToLeft(startPosition - delta.dx);
      return;
    }

    this.moveToTop(startPosition - delta.dy);
  }

  scrollTop(): number {
    return this.dom.scroller.scrollTop();
  }

  viewportWidth(): number {
    return this.dom.scroller.viewportWidth();
  }

  viewportHeight(): number {
    return this.dom.scroller.viewportHeight();
  }

  pageOffset(pageNum: number): number | null {
    const elements = this.slotFor(pageNum)?.elements;
    return elements ? this.dom.scroller.slotOffset(elements, this.options.mode()) : null;
  }

  centerPageNum(): number | null {
    for (const slot of this.slots) {
      if (!slot.elements || slot.kind === "blank") {
        continue;
      }

      if (this.dom.scroller.slotContainsViewportTarget(slot.elements)) {
        return slot.pageNum;
      }
    }

    return null;
  }

  isHitEndPage(point: { clientX: number; clientY: number }): boolean {
    const pageNum = this.pageNumAtPoint(point);
    const slot = pageNum === null ? undefined : this.slotFor(pageNum);

    return slot?.kind === "end";
  }

  pageNumAtPoint(point: { clientX: number; clientY: number }): number | null {
    const element = document.elementFromPoint(point.clientX, point.clientY);
    const pageNode = element instanceof Element ? element.closest<HTMLElement>(".ehpeek-page") : null;

    if (!pageNode) {
      return null;
    }

    const pageNum = Number(pageNode.dataset.ehpeekPageNum || "");
    return Number.isFinite(pageNum) ? pageNum : null;
  }

  startVerticalFlingFromDragVelocity(dragVelocityY: number, onStop: () => void): void {
    this.flingAnimator.start({
      scroller: this.dom.scroller.element,
      initialVelocityY: -dragVelocityY,
      setScrollTop: (scrollTop) => this.moveToTop(scrollTop),
      canRun: () => !this.options.closed() && this.options.mode() === "scroll",
      onStop,
    });
  }

  private verticalScrollBounds(): VerticalScrollBounds | null {
    if (this.options.mode() !== "scroll") {
      return null;
    }

    const totalPages = this.options.totalPages();
    return this.verticalScrollBoundsForPages(1, totalPages ? totalPages + 1 : null);
  }

  private verticalScrollBoundsForPages(firstPageNum: number, lastPageNum: number | null): VerticalScrollBounds | null {
    return this.verticalScrollBoundsForElements(
      this.slotFor(firstPageNum)?.elements,
      lastPageNum === null ? null : this.slotFor(lastPageNum)?.elements,
    );
  }

  private verticalScrollBoundsForElements(firstElements: SlotElements | null | undefined, lastElements: SlotElements | null | undefined): VerticalScrollBounds | null {
    const bounds: VerticalScrollBounds = {};

    if (firstElements) {
      bounds.min = this.dom.scroller.slotTop(firstElements);
    }

    if (lastElements) {
      const lastElementsRect = lastElements.node.getBoundingClientRect();
      const lastElementsTop = this.dom.scroller.slotTop(lastElements);
      bounds.max = lastElementsTop + lastElementsRect.height - this.viewportHeight();
    }

    if (bounds.min === undefined && bounds.max === undefined) {
      return null;
    }

    if (bounds.min !== undefined && bounds.max !== undefined) {
      bounds.max = Math.max(bounds.min, bounds.max);
    }

    return bounds;
  }

  private slotFor(pageNum: number): PageSlot | undefined {
    return this.slots.find((slot) => slot.pageNum === pageNum);
  }

  private visualSlotIndex(index: number, slotCount: number): number {
    return this.options.mode() === "paged" && this.options.readDirection() === "rtl"
      ? slotCount - 1 - index
      : index;
  }

  private setSlotPlaceholder(elements: SlotElements, content: SlotContent): void {
    this.dom.slots.setPlaceholder(elements, content, this.slotPlaceholderText(content));
  }

  private removeSlot(slot: PageSlot): void {
    slot.token += 1;

    if (slot.elements) {
      this.dom.slots.removeSlot(slot);
    }
  }

  private renderSlots(): void {
    this.dom.slots.sync(this.slots, {
      refreshSlot: (slot) => this.refreshSlot(slot),
      visualIndex: (slotIndex, slotCount) => this.visualSlotIndex(slotIndex, slotCount),
    });
  }

  private refreshSlot(slot: PageSlot): void {
    if (!slot.elements) {
      return;
    }

    this.dom.slots.setPageNum(slot.elements, slot.pageNum);
    this.applySlotSize(slot);

    if (slot.state === "ready" && slot.imageUrl) {
      return;
    }

    this.renderSlotPlaceholder(slot, undefined);
  }

  private renderSlotPlaceholder(slot: PageSlot, errorMessage: string | undefined): void {
    if (!slot.elements) {
      return;
    }

    this.setSlotPlaceholder(slot.elements, {
      pageNum: slot.pageNum,
      kind: slot.kind,
      state: slot.state,
      errorMessage,
    });
  }

  private applySlotSize(slot: PageSlot): void {
    if (!slot.elements) {
      return;
    }

    const frameWidth = Math.max(1, this.viewportWidth());
    const frameHeight = Math.ceil(frameWidth * pageSlotAspectRatio(slot));
    this.dom.slots.setSize(slot.elements, frameWidth, frameHeight);
  }

  private slotPlaceholderText(content: SlotContent): string {
    if (content.state === "error") {
      const suffix = content.errorMessage ? `: ${content.errorMessage}` : "";
      return `${texts.reader.failedPrefix} ${content.pageNum}${suffix}`;
    }

    if (content.kind === "end") {
      return texts.reader.end;
    }

    if (content.kind === "blank") {
      return "";
    }

    return String(content.pageNum);
  }
}

function positiveDimension(value: number): number | null {
  return Number.isFinite(value) && value > 0 ? value : null;
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
    imageUrl: null,
    width: null,
    height: null,
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
  slot.imageUrl = null;
  slot.width = null;
  slot.height = null;
  slot.token += 1;
}

function clearNonPageSlotMeta(slot: PageSlot): void {
  if (slot.kind !== "blank" && slot.kind !== "end") {
    return;
  }

  slot.state = "ready";
  slot.imageUrl = null;
  slot.width = null;
  slot.height = null;
  slot.token += 1;
}

function pageSlotAspectRatio(slot: PageSlot): number {
  return slot.width && slot.height && slot.width > 0 && slot.height > 0
    ? slot.height / slot.width
    : normalizedAspectRatio(slot.aspectRatio, FALLBACK_ASPECT_RATIO);
}
