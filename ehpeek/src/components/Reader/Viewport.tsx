import { h } from "../../jsx";
import type { ReadDirection, ViewMode } from "../../state";
import texts from "../../texts.json";
import { clamp, normalizedAspectRatio } from "../../utils";
import { ScrollAnimator, ScrollFlingAnimator, type ScrollMotion } from "../common/animation";

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

type SlotView = {
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
  view: SlotView | null;
  token: number;
};

function pagesViewportDom() {
  let scroller!: HTMLElement;
  let strip!: HTMLElement;
  const element = (
    <div
      className="ehpeek-scroller"
      tabIndex={-1}
      ref={(node: HTMLElement) => (scroller = node)}
    >
      <main className="ehpeek-strip" ref={(node: HTMLElement) => (strip = node)} />
    </div>
  ) as HTMLElement;

  const setOrder = (view: SlotView, visualIndex: number) => {
    view.node.style.setProperty("order", String(visualIndex));
    view.node.dataset.ehpeekIndex = String(visualIndex);
  };

  const setPageNum = (view: SlotView, pageNum: number) => {
    view.node.dataset.ehpeekPageNum = String(pageNum);
  };

  const createView = (pageNum: number, visualIndex: number): SlotView => {
    const view = slotViewDom();
    setOrder(view, visualIndex);
    setPageNum(view, pageNum);
    return view;
  };

  const appendView = (view: SlotView) => {
    strip.append(view.node);
  };

  const removeView = (view: SlotView) => {
    view.node.remove();
  };

  const removeStaleViews = (keepNodes: Set<HTMLElement | null>) => {
    for (const node of Array.from(strip.children)) {
      if (!keepNodes.has(node as HTMLElement)) {
        node.remove();
      }
    }
  };

  const viewConnected = (view: SlotView) => view.node.isConnected;
  const slots = {
    sync(
      pageSlots: PageSlot[],
      options: {
        refreshSlot: (slot: PageSlot) => void;
        visualIndex: (slotIndex: number, slotCount: number) => number;
      },
    ) {
      const keepNodes = new Set(pageSlots.map((slot) => slot.view?.node ?? null).filter(Boolean));
      removeStaleViews(keepNodes);

      for (const slot of pageSlots) {
        if (slot.view && !viewConnected(slot.view)) {
          slot.view = null;
        }

        if (!slot.view) {
          slot.view = createView(slot.pageNum, options.visualIndex(slot.index, pageSlots.length));
          appendView(slot.view);
        }

        options.refreshSlot(slot);

        if (slot.view) {
          setOrder(slot.view, options.visualIndex(slot.index, pageSlots.length));
        }
      }
    },
    removeSlot(slot: PageSlot) {
      if (!slot.view) {
        return;
      }

      removeView(slot.view);
      slot.view = null;
    },
    setImage(view: SlotView, image: HTMLImageElement) {
      view.frame.replaceChildren(image);
    },
    setPageNum,
    setPlaceholder(view: SlotView, content: SlotContent, text: string) {
      const placeholder = (
        <div className={content.state === "error" ? "ehpeek-error" : "ehpeek-placeholder"}>
          {text}
        </div>
      ) as HTMLElement;

      placeholder.classList.toggle("ehpeek-placeholder-end", content.kind === "end");
      view.frame.replaceChildren(placeholder);
    },
    setSize(view: SlotView, frameWidth: number, frameHeight: number) {
      view.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`);
      view.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`);
      view.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
    },
  };

  return { element, scroller: new PagesScrollerDom(scroller), slots };
}

function slotViewDom(): SlotView {
  let frame!: HTMLElement;
  const node = (
    <section className="ehpeek-page">
      <div className="ehpeek-frame" ref={(element: HTMLElement) => (frame = element)} />
    </section>
  ) as HTMLElement;

  return { node, frame };
}

function pageImageDom(pageNum: number, slotImage: ViewportImage): HTMLImageElement {
  const image = (
    <img
      className="ehpeek-image"
      alt={`Page ${pageNum}`}
      decoding="async"
      loading="eager"
      draggable={false}
      fetchpriority={slotImage.highPriority ? "high" : "low"}
      src={slotImage.imageUrl}
    />
  ) as HTMLImageElement;

  if (slotImage.width && slotImage.height) {
    image.width = slotImage.width;
    image.height = slotImage.height;
  }

  return image;
}

class PagesScrollerDom {
  constructor(readonly element: HTMLElement) {}

  resetPosition(): void {
    this.element.scrollLeft = 0;
    this.element.scrollTop = 0;
  }

  scrollLeft(): number {
    return this.element.scrollLeft;
  }

  scrollTop(): number {
    return this.element.scrollTop;
  }

  viewportWidth(): number {
    return this.element.clientWidth || window.innerWidth || 1;
  }

  viewportHeight(): number {
    return this.element.clientHeight;
  }

  moveToLeft(scrollLeft: number): void {
    this.element.scrollLeft = scrollLeft;
  }

  moveToTop(scrollTop: number, bounds?: VerticalScrollBounds | null): void {
    this.element.scrollTop = this.clampedTop(scrollTop, bounds);
  }

  viewTop(view: SlotView): number {
    const viewRect = view.node.getBoundingClientRect();
    const scrollerRect = this.element.getBoundingClientRect();
    return this.element.scrollTop + viewRect.top - scrollerRect.top;
  }

  viewOffset(view: SlotView, mode: ViewMode): number {
    const pageRect = view.node.getBoundingClientRect();
    const scrollerRect = this.element.getBoundingClientRect();
    return mode === "paged" ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
  }

  viewContainsViewportTarget(view: SlotView): boolean {
    const scrollerRect = this.element.getBoundingClientRect();
    const target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
    const rect = view.node.getBoundingClientRect();
    return rect.top <= target && rect.bottom > target;
  }

  private clampedTop(scrollTop: number, bounds?: VerticalScrollBounds | null): number {
    if (!bounds) {
      return scrollTop;
    }

    return clamp(scrollTop, bounds.min ?? Number.NEGATIVE_INFINITY, bounds.max ?? Number.POSITIVE_INFINITY);
  }
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
    },
  ) {
    this.dom = pagesViewportDom();
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
      const slot = oldSlot && oldSlot.kind === kind ? oldSlot : createPageSlot(pageNum, kind);

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

    if (!slot || slot.token !== token || !slot.view) {
      return false;
    }

    slot.state = "ready";
    slot.imageUrl = slotImage.imageUrl;
    slot.width = positiveDimension(image.naturalWidth) ?? slotImage.width;
    slot.height = positiveDimension(image.naturalHeight) ?? slotImage.height;
    this.applySlotSize(slot);
    this.dom.slots.setImage(slot.view, image);
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
    const view = this.slotFor(pageNum)?.view;
    return view ? this.dom.scroller.viewOffset(view, this.options.mode()) : null;
  }

  centerPageNum(): number | null {
    for (const slot of this.slots) {
      if (!slot.view || slot.kind === "blank") {
        continue;
      }

      if (this.dom.scroller.viewContainsViewportTarget(slot.view)) {
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
    return this.verticalScrollBoundsForViews(
      this.slotFor(firstPageNum)?.view,
      lastPageNum === null ? null : this.slotFor(lastPageNum)?.view,
    );
  }

  private verticalScrollBoundsForViews(firstView: SlotView | null | undefined, lastView: SlotView | null | undefined): VerticalScrollBounds | null {
    const bounds: VerticalScrollBounds = {};

    if (firstView) {
      bounds.min = this.dom.scroller.viewTop(firstView);
    }

    if (lastView) {
      const lastRect = lastView.node.getBoundingClientRect();
      const lastTop = this.dom.scroller.viewTop(lastView);
      bounds.max = lastTop + lastRect.height - this.viewportHeight();
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

  private setSlotPlaceholder(view: SlotView, content: SlotContent): void {
    this.dom.slots.setPlaceholder(view, content, this.slotPlaceholderText(content));
  }

  private removeSlot(slot: PageSlot): void {
    slot.token += 1;

    if (slot.view) {
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
    if (!slot.view) {
      return;
    }

    this.dom.slots.setPageNum(slot.view, slot.pageNum);
    this.applySlotSize(slot);

    if (slot.state === "ready" && slot.imageUrl) {
      return;
    }

    this.renderSlotPlaceholder(slot, undefined);
  }

  private renderSlotPlaceholder(slot: PageSlot, errorMessage: string | undefined): void {
    if (!slot.view) {
      return;
    }

    this.setSlotPlaceholder(slot.view, {
      pageNum: slot.pageNum,
      kind: slot.kind,
      state: slot.state,
      errorMessage,
    });
  }

  private applySlotSize(slot: PageSlot): void {
    if (!slot.view) {
      return;
    }

    const frameWidth = Math.max(1, this.viewportWidth());
    const frameHeight = Math.ceil(frameWidth * pageSlotAspectRatio(slot));
    this.dom.slots.setSize(slot.view, frameWidth, frameHeight);
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

function createPageSlot(pageNum: number, kind: PageSlotKind): PageSlot {
  return {
    pageNum,
    index: 0,
    kind,
    state: kind === "page" ? "idle" : "ready",
    aspectRatio: FALLBACK_ASPECT_RATIO,
    imageUrl: null,
    width: null,
    height: null,
    view: null,
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
