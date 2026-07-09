import { h } from "../../jsx";
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

export class PagesViewport {
  readonly element: HTMLElement;
  private scroller!: HTMLElement;
  private strip!: HTMLElement;
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
    this.element = (
      <div
        className="ehpeek-scroller"
        tabIndex={-1}
        ref={(node: HTMLElement) => (this.scroller = node)}
      >
        <main className="ehpeek-strip" ref={(node: HTMLElement) => (this.strip = node)} />
      </div>
    ) as HTMLElement;
  }

  scrollerElement(): HTMLElement {
    return this.scroller;
  }

  syncWindow(options: PagesViewportWindowOptions): void {
    const oldSlots = new Map(this.slots.map((slot) => [slot.pageNum, slot]));
    const nextSlots: PageSlot[] = [];

    for (const pageNum of this.windowPageNums(options.currentPageNum, options.windowSize)) {
      const kind = this.slotKindFor(pageNum, options.totalPages);
      const oldSlot = oldSlots.get(pageNum);
      const slot = oldSlot && oldSlot.kind === kind ? oldSlot : this.createSlot(pageNum, kind);

      if (kind === "page") {
        const page = options.pages.get(pageNum);

        if (page) {
          this.setSlotMeta(slot, page);
        }
      } else {
        this.clearSlotMeta(slot);
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
    this.scroller.scrollLeft = 0;
    this.scroller.scrollTop = 0;
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
    const image = document.createElement("img");
    image.className = "ehpeek-image";
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

  setPageImage(pageNum: number, token: number, slotImage: ViewportImage, image: HTMLImageElement): boolean {
    const slot = this.slotFor(pageNum);

    if (!slot || slot.token !== token || !slot.view) {
      return false;
    }

    slot.state = "ready";
    slot.imageUrl = slotImage.imageUrl;
    slot.width = slotImage.width;
    slot.height = slotImage.height;
    this.applySlotSize(slot);
    slot.view.frame.replaceChildren(image);
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
      this.horizontalAnimator.scrollTo(this.scroller, this.scroller.scrollLeft + delta, motion, onComplete);
      return;
    }

    this.moveToTop(this.scroller.scrollTop + delta);
    onComplete?.();
  }

  moveToTop(scrollTop: number): void {
    this.scroller.scrollTop = this.clampedTop(scrollTop, this.verticalScrollBounds());
  }

  startDragPosition(): number {
    return this.options.mode() === "paged" ? this.scroller.scrollLeft : this.scroller.scrollTop;
  }

  dragPage(startPosition: number, delta: { dx: number; dy: number }): void {
    if (this.options.mode() === "paged") {
      this.scroller.scrollLeft = startPosition - delta.dx;
      return;
    }

    this.moveToTop(startPosition - delta.dy);
  }

  scrollTop(): number {
    return this.scroller.scrollTop;
  }

  viewportWidth(): number {
    return this.scroller.clientWidth || window.innerWidth || 1;
  }

  viewportHeight(): number {
    return this.scroller.clientHeight;
  }

  pageOffset(pageNum: number): number | null {
    const view = this.slotFor(pageNum)?.view;
    return view ? this.slotOffsetFromViewport(view, this.options.mode()) : null;
  }

  centerPageNum(): number | null {
    for (const slot of this.slots) {
      if (!slot.view || slot.kind === "blank") {
        continue;
      }

      if (this.slotContainsViewportTarget(slot.view)) {
        return slot.pageNum;
      }
    }

    return null;
  }

  isHitEndPage(point: { clientX: number; clientY: number }): boolean {
    const element = document.elementFromPoint(point.clientX, point.clientY);
    const pageNode = element instanceof Element ? element.closest<HTMLElement>(".ehpeek-page") : null;

    if (!pageNode) {
      return false;
    }

    const pageNum = Number(pageNode.dataset.ehpeekPageNum || "");
    const slot = Number.isFinite(pageNum) ? this.slotFor(pageNum) : undefined;

    return slot?.kind === "end";
  }

  startVerticalFlingFromDragVelocity(dragVelocityY: number, onStop: () => void): void {
    this.flingAnimator.start({
      scroller: this.scroller,
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
    const scrollerRect = this.scroller.getBoundingClientRect();

    if (firstView) {
      const firstRect = firstView.node.getBoundingClientRect();
      bounds.min = this.scroller.scrollTop + firstRect.top - scrollerRect.top;
    }

    if (lastView) {
      const lastRect = lastView.node.getBoundingClientRect();
      const lastTop = this.scroller.scrollTop + lastRect.top - scrollerRect.top;
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

  private clampedTop(scrollTop: number, bounds?: VerticalScrollBounds | null): number {
    if (!bounds) {
      return scrollTop;
    }

    return clamp(scrollTop, bounds.min ?? Number.NEGATIVE_INFINITY, bounds.max ?? Number.POSITIVE_INFINITY);
  }

  private slotFor(pageNum: number): PageSlot | undefined {
    return this.slots.find((slot) => slot.pageNum === pageNum);
  }

  private slotKindFor(pageNum: number, totalPages: number | undefined): PageSlotKind {
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

  private slotContainsViewportTarget(view: SlotView): boolean {
    const scrollerRect = this.scroller.getBoundingClientRect();
    const target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
    const rect = view.node.getBoundingClientRect();
    return rect.top <= target && rect.bottom > target;
  }

  private slotOffsetFromViewport(view: SlotView, mode: ViewMode): number {
    const pageRect = view.node.getBoundingClientRect();
    const scrollerRect = this.scroller.getBoundingClientRect();
    return mode === "paged" ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
  }

  private removeStaleSlotNodes(keepNodes: Set<HTMLElement | null>): void {
    for (const node of Array.from(this.strip.children)) {
      if (!keepNodes.has(node as HTMLElement)) {
        node.remove();
      }
    }
  }

  private appendSlotView(view: SlotView): void {
    this.strip.append(view.node);
  }

  private createSlotView(index: number, pageNum: number): SlotView {
    const node = document.createElement("section");
    node.className = "ehpeek-page";

    const frame = document.createElement("div");
    frame.className = "ehpeek-frame";
    node.append(frame);

    const view = { node, frame };
    this.setSlotOrder(view, index, index + 1);
    this.setSlotPageNum(view, pageNum);

    return view;
  }

  private removeSlotView(view: SlotView): void {
    view.node.remove();
  }

  private slotViewConnected(view: SlotView): boolean {
    return view.node.isConnected;
  }

  private setSlotOrder(view: SlotView, index: number, slotCount: number): void {
    const visualIndex = this.options.mode() === "paged" && this.options.readDirection() === "rtl"
      ? slotCount - 1 - index
      : index;
    view.node.style.setProperty("order", String(visualIndex));
    view.node.dataset.ehpeekIndex = String(visualIndex);
  }

  private setSlotPageNum(view: SlotView, pageNum: number): void {
    view.node.dataset.ehpeekPageNum = String(pageNum);
  }

  private setSlotSize(view: SlotView, frameWidth: number, frameHeight: number): void {
    view.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`);
    view.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`);
    view.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
  }

  private setSlotPlaceholder(view: SlotView, content: SlotContent): void {
    const placeholder = document.createElement("div");
    placeholder.className = content.state === "error" ? "ehpeek-error" : "ehpeek-placeholder";
    placeholder.classList.toggle("ehpeek-placeholder-end", content.kind === "end");
    placeholder.textContent = this.slotPlaceholderText(content);

    view.frame.replaceChildren(placeholder);
  }

  private createSlot(pageNum: number, kind: PageSlotKind): PageSlot {
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

  private setSlotMeta(slot: PageSlot, page: PageMeta): void {
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

  private clearSlotMeta(slot: PageSlot): void {
    if (slot.kind === "blank" || slot.kind === "end") {
      slot.state = "ready";
      slot.imageUrl = null;
      slot.width = null;
      slot.height = null;
      slot.token += 1;
    }
  }

  private removeSlot(slot: PageSlot): void {
    slot.token += 1;

    if (slot.view) {
      this.removeSlotView(slot.view);
      slot.view = null;
    }
  }

  private renderSlots(): void {
    const keepNodes = new Set(this.slots.map((slot) => slot.view?.node ?? null).filter(Boolean));
    this.removeStaleSlotNodes(keepNodes);

    for (const slot of this.slots) {
      if (slot.view && !this.slotViewConnected(slot.view)) {
        slot.view = null;
      }

      this.mountSlot(slot);

      if (slot.view) {
        this.setSlotOrder(slot.view, slot.index, this.slots.length);
      }
    }
  }

  private mountSlot(slot: PageSlot): void {
    if (!slot.view) {
      slot.view = this.createSlotView(slot.index, slot.pageNum);
      this.appendSlotView(slot.view);
    }

    this.refreshSlot(slot);
  }

  private refreshSlot(slot: PageSlot): void {
    if (!slot.view) {
      return;
    }

    this.setSlotPageNum(slot.view, slot.pageNum);
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
    const frameHeight = Math.ceil(frameWidth * this.aspectRatioFor(slot));
    this.setSlotSize(slot.view, frameWidth, frameHeight);
  }

  private aspectRatioFor(slot: PageSlot): number {
    return slot.width && slot.height && slot.width > 0 && slot.height > 0
      ? slot.height / slot.width
      : normalizedAspectRatio(slot.aspectRatio, FALLBACK_ASPECT_RATIO);
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
