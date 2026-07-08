import texts from "./texts.json";
import { debugLog } from "./utils";

export type ViewMode = "scroll" | "paged";
type ReadDirection = "ltr" | "rtl";
type RightTapAction = "previous" | "next";

const VIEW_MODE_KEY = "ehpeek:view-mode";
const READ_DIRECTION_KEY = "ehpeek:read-direction";
const RIGHT_TAP_ACTION_KEY = "ehpeek:right-tap-action";
const VIEWER_ID = "ehpeek-reader";
const STYLE_ID = "ehpeek-reader-style";
const DEFAULT_WINDOW_SIZE = 10;
const DEFAULT_NEAR_CONCURRENT_LOADS = 3;
const DEFAULT_FAR_CONCURRENT_LOADS = 6;
const NEAR_LOAD_AHEAD = 3;
const FALLBACK_ASPECT_RATIO = 1.42;
const PAGED_SWIPE_THRESHOLD = 24;
const PAGED_WHEEL_THRESHOLD = 8;
const PAGED_SMOOTH_SCROLL_MS = 180;
const PROGRESS_IDLE_COMMIT_MS = 1000;
const SCROLL_FLING_MIN_VELOCITY = 0.35;
const SCROLL_FLING_STOP_VELOCITY = 0.02;
const SCROLL_FLING_DECAY = 0.0045;

export type ViewerPage = {
  url: string;
  aspectRatio: number;
  displayNumber?: number;
};

export type LoadedViewerPage = {
  imageUrl: string;
  width?: number | null;
  height?: number | null;
};

export type FullscreenViewerOptions = {
  pages: ViewerPage[];
  startIndex: number;
  loadPage: (page: ViewerPage, index: number) => Promise<LoadedViewerPage>;
  loadPages?: (displayNumbers: number[]) => Promise<ViewerPage[]>;
  totalPages?: number;
  onExit?: () => void;
  renderWindowSize?: number;
  preloadWindowSize?: number;
  nearConcurrentLoads?: number;
  farConcurrentLoads?: number;
  onActivePageChange?: (page: ViewerPage, index: number) => void;
  onDisableReader?: () => void;
};

type PageState = "idle" | "loading" | "ready" | "error";
type Direction = -1 | 1;
type SlotKind = "page" | "blank" | "end";

type PageSlot = {
  x: number;
  index: number;
  kind: SlotKind;
  meta: ViewerPage | null;
  state: PageState;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  node: HTMLElement | null;
  frame: HTMLElement | null;
  token: number;
};

type LoadedPageSlot = PageSlot & {
  kind: "page";
  meta: ViewerPage;
};

let activeViewer: FullscreenViewer | null = null;

export function openFullscreenViewer(options: FullscreenViewerOptions): void {
  activeViewer?.close();
  const viewer = new FullscreenViewer(options);
  activeViewer = viewer;
  viewer.open();
}

class TwoTierImageQueue {
  private nearQueue = new Map<number, PageSlot>();
  private farQueue = new Map<number, PageSlot>();
  private activeNearLoads = 0;
  private activeTotalLoads = 0;
  private timer: number | null = null;
  private disposed = false;

  constructor(
    private readonly loadPage: (page: ViewerPage, index: number) => Promise<LoadedViewerPage>,
    private readonly onLoaded: (slot: PageSlot, loaded: LoadedViewerPage, token: number) => void,
    private readonly onError: (slot: PageSlot, error: unknown, token: number) => void,
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

  sync(slots: PageSlot[], currentPageNumber: number, direction: Direction, windowNumbers: Set<number>, preloadWindowSize: number): void {
    for (const queue of [this.nearQueue, this.farQueue]) {
      for (const displayNumber of queue.keys()) {
        if (!windowNumbers.has(displayNumber)) {
          queue.delete(displayNumber);
        }
      }
    }

    for (const slot of slots) {
      const displayNumber = slot.x;

      if (!windowNumbers.has(displayNumber)) {
        this.invalidate(slot);
      }
    }

    this.enqueue(slots.find((slot) => slot.x === currentPageNumber), "near");

    for (let offset = 1; offset <= preloadWindowSize; offset += 1) {
      const displayNumber = currentPageNumber + offset * direction;
      const slot = slots.find((candidate) => candidate.x === displayNumber);

      if (slot) {
        this.enqueue(slot, offset <= NEAR_LOAD_AHEAD ? "near" : "far");
      }
    }

    this.schedule();
  }

  invalidate(slot: PageSlot): void {
    slot.token += 1;
    this.nearQueue.delete(slot.x);
    this.farQueue.delete(slot.x);

    if (slot.state !== "idle") {
      slot.state = "idle";
      slot.imageUrl = null;
      slot.width = null;
      slot.height = null;
    }
  }

  private enqueue(slot: PageSlot | undefined, tier: "near" | "far"): void {
    if (!slot || slot.kind !== "page" || !slot.meta || slot.state !== "idle") {
      return;
    }

    const displayNumber = slot.x;

    if (tier === "near") {
      this.farQueue.delete(displayNumber);
      this.nearQueue.set(displayNumber, slot);
      return;
    }

    if (!this.nearQueue.has(displayNumber)) {
      this.farQueue.set(displayNumber, slot);
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
      const slot = queue.values().next().value as PageSlot | undefined;

      if (!slot) {
        return;
      }

      queue.delete(slot.x);

      if (slot.state !== "idle") {
        continue;
      }

      this.start(slot, tier);
    }
  }

  private currentConcurrency(): number {
    return this.nearQueue.size > 0 || this.activeNearLoads > 0
      ? Math.min(this.nearConcurrentLoads, this.farConcurrentLoads)
      : this.farConcurrentLoads;
  }

  private start(slot: PageSlot, tier: "near" | "far"): void {
    if (!slot.meta) {
      return;
    }

    slot.state = "loading";
    slot.token += 1;
    const token = slot.token;
    const meta = slot.meta;
    this.activeTotalLoads += 1;

    if (tier === "near") {
      this.activeNearLoads += 1;
    }

    void this.loadPage(meta, slot.index)
      .then((loaded) => {
        if (!this.disposed) {
          this.onLoaded(slot, loaded, token);
        }
      })
      .catch((error) => {
        if (!this.disposed) {
          this.onError(slot, error, token);
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

class FullscreenViewer {
  private slots: PageSlot[];
  private currentPageNumber: number;
  private direction: Direction = 1;
  private mode: ViewMode = loadViewMode();
  private readDirection: ReadDirection = loadReadDirection();
  private rightTapAction: RightTapAction = loadRightTapAction();
  private readonly totalPages: number | undefined;
  private readonly windowSize: number;
  private readonly preloadWindowSize: number;
  private readonly imageQueue: TwoTierImageQueue;
  private readonly loadPages: FullscreenViewerOptions["loadPages"];
  private readonly onExit: FullscreenViewerOptions["onExit"];
  private readonly onActivePageChange: ((page: ViewerPage, index: number) => void) | undefined;
  private readonly onDisableReader: (() => void) | undefined;
  private disableReaderButton: HTMLButtonElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private scroller: HTMLDivElement | null = null;
  private strip: HTMLElement | null = null;
  private toolbar: HTMLDivElement | null = null;
  private modeButton: HTMLButtonElement | null = null;
  private readDirectionButton: HTMLButtonElement | null = null;
  private rightTapButton: HTMLButtonElement | null = null;
  private pageNumberLabel: HTMLElement | null = null;
  private progressInput: HTMLInputElement | null = null;
  private previousBodyOverflow = "";
  private previousDocumentOverflow = "";
  private previousBodyTouchAction = "";
  private previousDocumentTouchAction = "";
  private scrollFrame: number | null = null;
  private resizeFrame: number | null = null;
  private flingFrame: number | null = null;
  private pagedScrollCommitTimer: number | null = null;
  private progressCommitTimer: number | null = null;
  private pendingProgressDisplayNumber: number | null = null;
  private progressDragging = false;
  private dragging = false;
  private suppressNextClick = false;
  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartClientY = 0;
  private dragStartScroll = 0;
  private dragLastClientY = 0;
  private dragLastMoveTime = 0;
  private dragVelocityY = 0;
  private flingVelocityY = 0;
  private flingLastFrameTime = 0;
  private syncToken = 0;
  private historyEntry = false;
  private closing = false;
  private closed = false;

  constructor(options: FullscreenViewerOptions) {
    this.slots = options.pages.map((page, index) => toPageSlot(page, index));
    const startIndex = clamp(options.startIndex, 0, Math.max(0, this.slots.length - 1));
    this.currentPageNumber = this.slots[startIndex]?.x ?? 1;
    this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
    this.windowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.loadPages = options.loadPages;
    this.onExit = options.onExit;
    this.onActivePageChange = options.onActivePageChange;
    this.onDisableReader = options.onDisableReader;
    this.imageQueue = new TwoTierImageQueue(
      options.loadPage,
      this.onImageLoaded,
      this.onImageError,
      options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS,
      options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS,
    );
  }

  open(): void {
    if (this.slots.length === 0) {
      return;
    }

    document.getElementById(VIEWER_ID)?.remove();
    ensureViewerStyle();
    this.previousDocumentOverflow = document.documentElement.style.overflow;
    this.previousBodyOverflow = document.body.style.overflow;
    this.previousDocumentTouchAction = document.documentElement.style.touchAction;
    this.previousBodyTouchAction = document.body.style.touchAction;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    document.documentElement.style.touchAction = "none";
    document.body.style.touchAction = "none";
    this.createDom();

    if (this.onExit) {
      window.history.pushState({ ehpeekReader: true }, "", window.location.href);
      this.historyEntry = true;
      window.addEventListener("popstate", this.onPopState);
    }

    window.addEventListener("resize", this.onResize);
    document.addEventListener("keydown", this.onKeydown, true);
    this.syncAfterPageChange({ scrollIntoView: true });
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
  }

  private createDom(): void {
    const overlay = document.createElement("div");
    overlay.id = VIEWER_ID;
    overlay.classList.toggle("ehpeek-paged", this.mode === "paged");
    overlay.classList.toggle("ehpeek-read-rtl", this.readDirection === "rtl");
    overlay.classList.toggle("ehpeek-read-ltr", this.readDirection === "ltr");

    const topbar = document.createElement("div");
    topbar.className = "ehpeek-topbar";
    topbar.addEventListener("click", stopEvent);
    topbar.addEventListener("pointerdown", stopEvent);
    topbar.addEventListener("wheel", stopEvent);

    const readDirectionButton = document.createElement("button");
    readDirectionButton.type = "button";
    readDirectionButton.className = "ehpeek-button ehpeek-direction-button ehpeek-control-hidden";
    readDirectionButton.addEventListener("click", () => this.toggleReadDirection());
    this.readDirectionButton = readDirectionButton;

    const rightTapButton = document.createElement("button");
    rightTapButton.type = "button";
    rightTapButton.className = "ehpeek-button ehpeek-direction-button ehpeek-control-hidden";
    rightTapButton.addEventListener("click", () => this.toggleRightTapAction());
    this.rightTapButton = rightTapButton;

    const modeButton = document.createElement("button");
    modeButton.type = "button";
    modeButton.className = "ehpeek-button ehpeek-control-hidden";
    modeButton.addEventListener("click", () => this.setMode(this.mode === "paged" ? "scroll" : "paged"));
    this.modeButton = modeButton;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "ehpeek-button";
    closeButton.title = texts.viewer.close;
    closeButton.textContent = "X";
    closeButton.addEventListener("click", () => this.close());

    const disableReaderButton = document.createElement("button");
    disableReaderButton.type = "button";
    disableReaderButton.className = "ehpeek-button ehpeek-disable-button ehpeek-control-hidden";
    disableReaderButton.title = texts.viewer.disableReader;
    disableReaderButton.textContent = "off";
    disableReaderButton.addEventListener("click", () => {
      this.onDisableReader?.();
      this.close();
    });
    this.disableReaderButton = disableReaderButton;

    const actions = document.createElement("div");
    actions.className = "ehpeek-actions";
    actions.append(readDirectionButton, rightTapButton, modeButton, disableReaderButton, closeButton);

    const pageNumberLabel = document.createElement("div");
    pageNumberLabel.className = "ehpeek-pageno";
    this.pageNumberLabel = pageNumberLabel;

    const toolbar = document.createElement("div");
    toolbar.className = "ehpeek-progressbar ehpeek-toolbar-hidden";
    toolbar.addEventListener("click", stopEvent);
    toolbar.addEventListener("pointerdown", stopEvent);
    toolbar.addEventListener("wheel", stopEvent);
    this.toolbar = toolbar;

    const progressInput = document.createElement("input");
    progressInput.type = "range";
    progressInput.className = "ehpeek-progress";
    progressInput.min = "1";
    progressInput.step = "1";
    progressInput.addEventListener("pointerdown", this.onProgressPointerDown);
    progressInput.addEventListener("input", this.onProgressInput);
    progressInput.addEventListener("change", this.onProgressCommit);
    progressInput.addEventListener("pointerup", this.onProgressCommit);
    progressInput.addEventListener("pointercancel", this.onProgressCommit);
    this.progressInput = progressInput;

    const scroller = document.createElement("div");
    scroller.className = "ehpeek-scroller";
    scroller.addEventListener("click", this.onScrollerClick);
    scroller.addEventListener("scroll", this.onScroll, { passive: true });
    scroller.addEventListener("wheel", this.onWheel, { passive: false });
    scroller.addEventListener("pointerdown", this.onPointerDown);
    scroller.tabIndex = -1;
    this.scroller = scroller;

    const strip = document.createElement("main");
    strip.className = "ehpeek-strip";
    this.strip = strip;

    scroller.append(strip);
    topbar.append(actions);
    toolbar.append(progressInput);
    overlay.append(topbar, pageNumberLabel, toolbar, scroller);
    document.body.append(overlay);
    this.overlay = overlay;
    scroller.focus({ preventScroll: true });
    this.updateModeButton();
    this.updateReadDirectionButton();
    this.updateRightTapButton();
    this.updatePageNumber();
  }

  private readonly onPopState = (): void => {
    if (!this.historyEntry) {
      return;
    }

    this.historyEntry = false;
    this.finishClose();
    this.onExit?.();
  };

  private finishClose(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.cancelProgressCommit();
    this.imageQueue.dispose();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("keydown", this.onKeydown, true);
    document.removeEventListener("pointermove", this.onPointerMove, true);
    document.removeEventListener("pointerup", this.onPointerUp, true);
    document.removeEventListener("pointercancel", this.onPointerUp, true);
    this.overlay?.remove();
    document.documentElement.style.overflow = this.previousDocumentOverflow;
    document.body.style.overflow = this.previousBodyOverflow;
    document.documentElement.style.touchAction = this.previousDocumentTouchAction;
    document.body.style.touchAction = this.previousBodyTouchAction;

    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
    }

    if (this.resizeFrame !== null) {
      window.cancelAnimationFrame(this.resizeFrame);
    }

    this.cancelScrollFling();

    if (this.pagedScrollCommitTimer !== null) {
      window.clearTimeout(this.pagedScrollCommitTimer);
      this.pagedScrollCommitTimer = null;
    }

    if (activeViewer === this) {
      activeViewer = null;
    }
  }

  private setCurrentPageNumber(pageNumber: number, scrollIntoView: boolean, scrollBehavior: ScrollBehavior = "auto"): void {
    const target = clamp(Math.round(pageNumber), 1, this.maxDisplayNumber());

    if (target !== this.currentPageNumber) {
      this.direction = target > this.currentPageNumber ? 1 : -1;
      this.currentPageNumber = target;
    }

    this.syncAfterPageChange({ scrollIntoView, scrollBehavior });
  }

  private syncAfterPageChange(options: { scrollIntoView: boolean; scrollBehavior?: ScrollBehavior }): void {
    const token = ++this.syncToken;
    const numbers = this.windowNumbers();
    const missing = numbers.filter((number) => this.isRealDisplayNumber(number) && !this.loadedSlotFor(number));

    this.maintainContainers(numbers, []);
    this.maintainLoadQueue();
    this.notifyActivePageChange();

    if (options.scrollIntoView) {
      this.scrollToCurrentPage(options.scrollBehavior);
    }

    if (missing.length > 0) {
      void this.loadMissingPages(missing, token);
    }
  }

  private rebuildForCurrentMode(): void {
    this.cancelScrollFling();

    if (this.pagedScrollCommitTimer !== null) {
      window.clearTimeout(this.pagedScrollCommitTimer);
      this.pagedScrollCommitTimer = null;
    }

    for (const slot of this.slots) {
      slot.node?.remove();
      slot.node = null;
      slot.frame = null;
    }

    if (this.scroller) {
      this.scroller.scrollLeft = 0;
      this.scroller.scrollTop = 0;
    }

    this.syncAfterPageChange({ scrollIntoView: true });
  }

  private async loadMissingPages(displayNumbers: number[], token: number): Promise<void> {
    let incoming: ViewerPage[] | undefined;

    try {
      incoming = await this.loadPages?.(displayNumbers);
    } catch (error) {
      console.error("[ehpeek]", error);
      return;
    }

    if (this.closed || token !== this.syncToken) {
      return;
    }

    this.maintainContainers(this.windowNumbers(), incoming ?? []);
    this.maintainLoadQueue();
    this.notifyActivePageChange();
  }

  private maintainContainers(numbers: number[], incoming: ViewerPage[]): void {
    const oldSlots = new Map(this.slots.map((slot) => [slot.x, slot]));
    const incomingPages = new Map(
      incoming
        .map((page) => [page.displayNumber ?? 0, page] as const)
        .filter(([number]) => number > 0),
    );
    const nextSlots: PageSlot[] = [];

    for (const number of numbers) {
      const kind = this.slotKindFor(number);
      const oldSlot = oldSlots.get(number);
      let slot: PageSlot;

      if (oldSlot && oldSlot.kind === kind) {
        slot = oldSlot;
      } else {
        slot = createSlot(number, kind);
      }

      if (kind === "page") {
        const incomingPage = incomingPages.get(number);

        if (incomingPage) {
          this.fillSlotMetadata(slot, incomingPage);
        }
      } else {
        this.clearSlotMetadata(slot);
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
    this.renderContainers();
    this.updatePageNumber();
  }

  private maintainLoadQueue(): void {
    const loadableSlots = this.slots.filter((slot) => slot.kind === "page" && slot.meta);
    const windowSet = new Set(loadableSlots.map((slot) => slot.x));
    this.imageQueue.sync(loadableSlots, this.currentPageNumber, this.direction, windowSet, this.preloadWindowSize);
  }

  private renderContainers(): void {
    if (!this.strip) {
      return;
    }

    const keepNodes = new Set(this.slots.map((slot) => slot.node).filter(Boolean));

    for (const node of Array.from(this.strip.children)) {
      if (!keepNodes.has(node as HTMLElement)) {
        node.remove();
      }
    }

    for (const slot of this.slots) {
      if (slot.node && !slot.node.isConnected) {
        slot.node = null;
        slot.frame = null;
      }

      this.mountSlot(slot);
      slot.node?.style.setProperty("order", String(slot.index));
      slot.node?.setAttribute("data-ehpeek-index", String(slot.index));
    }
  }

  private mountSlot(slot: PageSlot): void {
    if (!this.strip || slot.node) {
      if (slot.node) {
        this.applySlotSize(slot);
        this.refreshSlot(slot);
      }
      return;
    }

    const section = document.createElement("section");
    section.className = "ehpeek-page";
    section.dataset.ehpeekIndex = String(slot.index);
    section.dataset.ehpeekDisplayNumber = String(slot.x);

    const frame = document.createElement("div");
    frame.className = "ehpeek-frame";

    const placeholder = document.createElement("div");
    placeholder.className = slot.state === "error" ? "ehpeek-error" : "ehpeek-placeholder";
    placeholder.classList.toggle("ehpeek-placeholder-end", slot.kind === "end");
    placeholder.textContent = this.placeholderTextFor(slot);

    if (slot.kind === "end") {
      placeholder.addEventListener("click", () => this.close());
    }

    frame.append(placeholder);
    section.append(frame);
    slot.node = section;
    slot.frame = frame;
    this.applySlotSize(slot);
    this.strip.append(section);

    if (slot.state === "ready" && slot.imageUrl) {
      void this.installImage(slot);
    }
  }

  private fillSlotMetadata(slot: PageSlot, meta: ViewerPage): void {
    slot.meta = { ...meta, aspectRatio: normalizedAspectRatio(meta.aspectRatio), displayNumber: slot.x };
    slot.kind = "page";
    slot.state = "idle";
    slot.imageUrl = null;
    slot.width = null;
    slot.height = null;
    slot.token += 1;

    this.refreshSlot(slot);
  }

  private clearSlotMetadata(slot: PageSlot): void {
    if (!slot.meta && slot.state === "ready" && !slot.imageUrl) {
      return;
    }

    slot.meta = null;
    slot.state = "ready";
    slot.imageUrl = null;
    slot.width = null;
    slot.height = null;
    slot.token += 1;
    this.refreshSlot(slot);
  }

  private refreshSlot(slot: PageSlot): void {
    if (!slot.node || !slot.frame) {
      return;
    }

    slot.node.dataset.ehpeekDisplayNumber = String(slot.x);

    if (slot.state === "ready" && slot.imageUrl) {
      void this.installImage(slot);
      return;
    }

    const placeholder = document.createElement("div");
    placeholder.className = slot.state === "error" ? "ehpeek-error" : "ehpeek-placeholder";
    placeholder.classList.toggle("ehpeek-placeholder-end", slot.kind === "end");
    placeholder.textContent = this.placeholderTextFor(slot);

    if (slot.kind === "end") {
      placeholder.addEventListener("click", () => this.close());
    }

    slot.frame.replaceChildren(placeholder);
  }

  private placeholderTextFor(slot: PageSlot): string {
    if (slot.state === "error") {
      return `${texts.viewer.failedPrefix} ${slot.x}`;
    }

    if (slot.kind === "end") {
      return texts.viewer.end;
    }

    if (slot.kind === "blank") {
      return "";
    }

    return String(slot.x);
  }

  private removeSlot(slot: PageSlot): void {
    this.imageQueue.invalidate(slot);
    slot.node?.remove();
    slot.node = null;
    slot.frame = null;
  }

  private windowNumbers(): number[] {
    const numbers: number[] = [];

    for (let offset = -this.windowSize; offset <= this.windowSize; offset += 1) {
      numbers.push(this.currentPageNumber + offset);
    }

    return numbers;
  }

  private slotFor(displayNumber: number): PageSlot | undefined {
    return this.slots.find((slot) => slot.x === displayNumber);
  }

  private loadedSlotFor(displayNumber: number): LoadedPageSlot | undefined {
    return this.slots.find(
      (slot): slot is LoadedPageSlot => slot.kind === "page" && slot.meta !== null && slot.x === displayNumber,
    );
  }

  private maxDisplayNumber(): number {
    return this.totalPages ? this.totalPages + 1 : Number.MAX_SAFE_INTEGER;
  }

  private isRealDisplayNumber(displayNumber: number): boolean {
    return displayNumber >= 1 && (!this.totalPages || displayNumber <= this.totalPages);
  }

  private slotKindFor(displayNumber: number): SlotKind {
    if (displayNumber < 1) {
      return "blank";
    }

    if (this.totalPages && displayNumber === this.totalPages + 1) {
      return "end";
    }

    if (this.totalPages && displayNumber > this.totalPages + 1) {
      return "blank";
    }

    return "page";
  }

  private step(delta: number): void {
    if (this.mode === "paged") {
      this.animatePagedStep(delta);
      return;
    }

    this.setCurrentPageNumber(this.currentPageNumber + delta, true);
  }

  private animatePagedStep(delta: number): void {
    const target = clamp(Math.round(this.currentPageNumber + delta), 1, this.maxDisplayNumber());

    if (target === this.currentPageNumber) {
      this.scrollToCurrentPage("smooth");
      return;
    }

    const slot = this.slotFor(target);

    if (!slot?.node) {
      this.setCurrentPageNumber(target, true, "smooth");
      return;
    }

    this.direction = target > this.currentPageNumber ? 1 : -1;
    this.scrollToSlot(slot, "smooth");

    if (this.pagedScrollCommitTimer !== null) {
      window.clearTimeout(this.pagedScrollCommitTimer);
    }

    this.pagedScrollCommitTimer = window.setTimeout(() => {
      this.pagedScrollCommitTimer = null;
      this.setCurrentPageNumber(target, true);
    }, PAGED_SMOOTH_SCROLL_MS);
  }

  private scrollToCurrentPage(behavior: ScrollBehavior = "auto"): void {
    const slot = this.slotFor(this.currentPageNumber);

    if (!slot) {
      return;
    }

    this.scrollToSlot(slot, behavior);
  }

  private scrollToSlot(slot: PageSlot, behavior: ScrollBehavior = "auto"): void {
    if (!this.scroller || !slot.node) {
      return;
    }

    const pageRect = slot.node.getBoundingClientRect();
    const scrollerRect = this.scroller.getBoundingClientRect();
    const delta = this.horizontal() ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
    this.addScrollPos(delta, behavior);
  }

  private readonly onImageLoaded = (slot: PageSlot, loaded: LoadedViewerPage, token: number): void => {
    if (slot.token !== token || !this.windowNumbers().includes(slot.x)) {
      return;
    }

    slot.state = "ready";
    slot.imageUrl = loaded.imageUrl;
    slot.width = positiveNumber(loaded.width);
    slot.height = positiveNumber(loaded.height);

    if (slot.node) {
      this.applySlotSize(slot);
      void this.installImage(slot);
    }
  };

  private readonly onImageError = (slot: PageSlot, error: unknown, token: number): void => {
    if (slot.token !== token || !slot.frame) {
      return;
    }

    slot.state = "error";
    const message = error instanceof Error ? error.message : texts.errors.loadFailed;
    const errorBox = document.createElement("div");
    errorBox.className = "ehpeek-error";
    errorBox.textContent = `${texts.viewer.failedPrefix} ${slot.x}: ${message}`;
    slot.frame.replaceChildren(errorBox);
  };

  private async installImage(slot: PageSlot): Promise<void> {
    if (!slot.frame || !slot.imageUrl) {
      return;
    }

    const imageUrl = slot.imageUrl;
    const token = slot.token;
    const image = document.createElement("img");
    image.className = "ehpeek-image";
    image.alt = `Page ${slot.x}`;
    image.decoding = "async";
    image.loading = "eager";
    image.draggable = false;
    image.setAttribute("fetchpriority", slot.x === this.currentPageNumber ? "high" : "low");
    image.src = imageUrl;

    if (slot.width && slot.height) {
      image.width = slot.width;
      image.height = slot.height;
    }

    try {
      await loadImage(image);
    } catch {
      return;
    }

    if (!this.closed && slot.token === token && slot.frame && slot.imageUrl === imageUrl) {
      slot.frame.replaceChildren(image);
    }
  }

  private applySlotSize(slot: PageSlot): void {
    if (!slot.node || !slot.frame) {
      return;
    }

    const frameWidth = Math.max(1, this.scroller?.clientWidth || window.innerWidth || 1);
    const frameHeight = Math.ceil(frameWidth * aspectRatioFor(slot));
    slot.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`);
    slot.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`);
    slot.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
  }

  private updatePageNumber(): void {
    if (!this.pageNumberLabel) {
      return;
    }

    this.pageNumberLabel.textContent = this.pageNumberText(this.currentPageNumber);

    if (!this.progressInput || this.progressDragging) {
      return;
    }

    this.progressInput.max = String(Math.max(1, this.totalPages ? this.totalPages + 1 : this.currentPageNumber));
    this.progressInput.value = String(this.currentPageNumber);
    this.updateProgressFill(this.currentPageNumber);
  }

  private notifyActivePageChange(): void {
    const page = this.loadedSlotFor(this.currentPageNumber);

    if (page) {
      this.onActivePageChange?.(page.meta, page.index);
    }
  }

  private pageNumberText(displayNumber: number): string {
    if (this.totalPages && displayNumber === this.totalPages + 1) {
      return "End";
    }

    return this.totalPages ? `${displayNumber} / ${this.totalPages}` : String(displayNumber);
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.step(this.leftTapDelta());
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.step(this.rightTapDelta());
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.mode !== "paged") {
      return;
    }

    event.preventDefault();

    if (this.dragging) {
      return;
    }

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

    if (Math.abs(delta) >= PAGED_WHEEL_THRESHOLD) {
      this.step(delta > 0 ? this.rightwardDelta() : this.leftwardDelta());
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    debugLog("pointerdown", {
      pointerType: event.pointerType,
      button: event.button,
      buttons: event.buttons,
      mode: this.mode,
      target: targetSummary(event.target),
    });

    if (!this.scroller) {
      debugLog("pointerdown ignored: no scroller");
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      debugLog("pointerdown ignored: mouse buttons", { button: event.button, buttons: event.buttons });
      return;
    }

    event.preventDefault();
    this.cancelScrollFling();
    this.dragging = true;
    this.dragPointerId = event.pointerId;
    this.dragStartClientX = event.clientX;
    this.dragStartClientY = event.clientY;
    this.dragStartScroll = this.mode === "paged" ? this.scroller.scrollLeft : this.scroller.scrollTop;
    this.dragLastClientY = event.clientY;
    this.dragLastMoveTime = event.timeStamp;
    this.dragVelocityY = 0;
    debugLog("drag start", {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startX: this.dragStartClientX,
      startY: this.dragStartClientY,
      startScroll: this.dragStartScroll,
    });
    this.scroller.setPointerCapture?.(event.pointerId);
    this.scroller.classList.add("ehpeek-scroller-dragging");
    document.addEventListener("pointermove", this.onPointerMove, true);
    document.addEventListener("pointerup", this.onPointerUp, true);
    document.addEventListener("pointercancel", this.onPointerUp, true);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    // Some desktop userscript/browser combinations have been observed to report
    // a mouse pointerdown/up and pen pointermove, with different pointerIds for
    // one physical drag. If desktop drag support is revisited, handle non-touch
    // drags with a looser matcher while keeping touch pointerIds strict for
    // future two-finger pinch zoom.
    if (!this.dragging || event.pointerId !== this.dragPointerId || !this.scroller) {
      debugLog("pointermove ignored", {
        pointerId: event.pointerId,
        dragPointerId: this.dragPointerId,
        pointerType: event.pointerType,
        dragging: this.dragging,
        hasScroller: Boolean(this.scroller),
      });
      return;
    }

    if (this.mode === "paged") {
      this.scroller.scrollLeft = this.dragStartScroll - (event.clientX - this.dragStartClientX);
    } else {
      const nextScrollTop = this.dragStartScroll - (event.clientY - this.dragStartClientY);
      const elapsed = Math.max(1, event.timeStamp - this.dragLastMoveTime);
      this.dragVelocityY = (event.clientY - this.dragLastClientY) / elapsed;
      this.dragLastClientY = event.clientY;
      this.dragLastMoveTime = event.timeStamp;
      debugLog("drag move", {
        pointerType: event.pointerType,
        clientY: event.clientY,
        startY: this.dragStartClientY,
        before: this.scroller.scrollTop,
        next: nextScrollTop,
      });
      this.scroller.scrollTop = this.dragStartScroll - (event.clientY - this.dragStartClientY);
    }

    event.preventDefault();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.dragPointerId) {
      debugLog("pointerup ignored", {
        pointerId: event.pointerId,
        dragPointerId: this.dragPointerId,
        pointerType: event.pointerType,
        dragging: this.dragging,
      });
      return;
    }

    debugLog("drag end", {
      pointerType: event.pointerType,
      scrollTop: this.scroller?.scrollTop,
      dx: event.clientX - this.dragStartClientX,
      dy: event.clientY - this.dragStartClientY,
    });
    this.dragging = false;
    this.dragPointerId = null;
    this.scroller?.releasePointerCapture?.(event.pointerId);
    this.scroller?.classList.remove("ehpeek-scroller-dragging");
    document.removeEventListener("pointermove", this.onPointerMove, true);
    document.removeEventListener("pointerup", this.onPointerUp, true);
    document.removeEventListener("pointercancel", this.onPointerUp, true);

    const dx = event.clientX - this.dragStartClientX;
    const dy = event.clientY - this.dragStartClientY;

    if (this.mode !== "paged") {
      if (Math.abs(dx) >= 8 || Math.abs(dy) >= 8) {
        this.suppressNextClick = true;
        this.setScrollTop(this.scroller?.scrollTop ?? 0);
        this.applyScrollFling();
        this.updateCurrentFromScroll();
      } else {
        this.suppressNextClick = true;
        this.toggleToolbar();
      }
      return;
    }

    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
      const width = this.scroller?.clientWidth || window.innerWidth || 1;
      const zone = event.clientX / width;

      if (zone >= 1 / 3 && zone <= 2 / 3) {
        this.toggleToolbar();
      } else {
        this.step(zone < 1 / 3 ? this.leftTapDelta() : this.rightTapDelta());
      }
      return;
    }

    if (dx >= PAGED_SWIPE_THRESHOLD) {
      this.step(this.leftwardDelta());
    } else if (dx <= -PAGED_SWIPE_THRESHOLD) {
      this.step(this.rightwardDelta());
    } else {
      this.scrollToCurrentPage("smooth");
    }
  };

  private readonly onScroll = (): void => {
    if (this.dragging || this.mode === "paged") {
      return;
    }

    const scrollTop = this.clampedScrollTop(this.scroller?.scrollTop ?? 0);

    if (this.scroller && scrollTop !== this.scroller.scrollTop) {
      this.scroller.scrollTop = scrollTop;
      return;
    }

    if (this.scrollFrame !== null) {
      return;
    }

    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.updateCurrentFromScroll();
    });
  };

  private applyScrollFling(): void {
    if (!this.scroller || Math.abs(this.dragVelocityY) < SCROLL_FLING_MIN_VELOCITY) {
      return;
    }

    this.flingVelocityY = -this.dragVelocityY;
    this.flingLastFrameTime = performance.now();
    this.flingFrame = window.requestAnimationFrame(this.onScrollFlingFrame);
  }

  private readonly onScrollFlingFrame = (time: number): void => {
    if (!this.scroller || this.mode !== "scroll") {
      this.cancelScrollFling();
      return;
    }

    const elapsed = Math.min(32, Math.max(1, time - this.flingLastFrameTime));
    this.flingLastFrameTime = time;

    const previousScrollTop = this.scroller.scrollTop;
    this.setScrollTop(previousScrollTop + this.flingVelocityY * elapsed);

    if (this.scroller.scrollTop === previousScrollTop) {
      this.cancelScrollFling();
      this.updateCurrentFromScroll();
      return;
    }

    this.flingVelocityY *= Math.exp(-SCROLL_FLING_DECAY * elapsed);

    if (Math.abs(this.flingVelocityY) < SCROLL_FLING_STOP_VELOCITY) {
      this.cancelScrollFling();
      this.updateCurrentFromScroll();
      return;
    }

    this.flingFrame = window.requestAnimationFrame(this.onScrollFlingFrame);
  };

  private cancelScrollFling(): void {
    if (this.flingFrame !== null) {
      window.cancelAnimationFrame(this.flingFrame);
      this.flingFrame = null;
    }

    this.flingVelocityY = 0;
  }

  private updateCurrentFromScroll(): void {
    if (!this.scroller) {
      return;
    }

    const scrollerRect = this.scroller.getBoundingClientRect();
    const target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);

    for (const slot of this.slots) {
      if (!slot.node || slot.kind === "blank") {
        continue;
      }

      const rect = slot.node.getBoundingClientRect();

      if (rect.top <= target && rect.bottom > target) {
        const next = slot.x;

        if (next !== this.currentPageNumber) {
          this.direction = next > this.currentPageNumber ? 1 : -1;
          this.currentPageNumber = next;
          this.syncAfterPageChange({ scrollIntoView: false });
        }
        return;
      }
    }
  }

  private readonly onScrollerClick = (event: MouseEvent): void => {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      event.preventDefault();
      return;
    }

    if (this.mode !== "scroll" || targetIsToolbar(event.target)) {
      return;
    }

    this.toggleToolbar();
  };

  private readonly onProgressPointerDown = (event: PointerEvent): void => {
    this.progressDragging = true;
    this.cancelProgressCommit();
    event.stopPropagation();
  };

  private readonly onProgressInput = (): void => {
    const displayNumber = Number(this.progressInput?.value || "");

    if (!Number.isFinite(displayNumber) || displayNumber <= 0) {
      return;
    }

    this.progressDragging = true;
    const target = clamp(Math.round(displayNumber), 1, this.maxDisplayNumber());
    this.pendingProgressDisplayNumber = target;
    this.previewProgressPage(target);
    this.cancelProgressCommit();
    this.progressCommitTimer = window.setTimeout(() => this.onProgressCommit(), PROGRESS_IDLE_COMMIT_MS);
  };

  private readonly onProgressCommit = (): void => {
    if (!this.progressDragging && this.pendingProgressDisplayNumber === null) {
      return;
    }

    const displayNumber = this.pendingProgressDisplayNumber ?? Number(this.progressInput?.value || "");
    this.progressDragging = false;
    this.pendingProgressDisplayNumber = null;
    this.cancelProgressCommit();

    if (Number.isFinite(displayNumber) && displayNumber > 0) {
      this.setCurrentPageNumber(displayNumber, true);
    }
  };

  private updatePageNumberText(displayNumber: number): void {
    if (this.pageNumberLabel) {
      this.pageNumberLabel.textContent = this.pageNumberText(displayNumber);
    }

    this.updateProgressFill(displayNumber);
  }

  private updateProgressFill(displayNumber: number): void {
    if (!this.progressInput) {
      return;
    }

    const min = Number(this.progressInput.min || "1");
    const max = Number(this.progressInput.max || "1");
    const value = clamp(displayNumber, min, max);
    const progress = max > min ? ((value - min) / (max - min)) * 100 : 100;
    this.progressInput.style.setProperty("--ehpeek-progress-fill", `${progress}%`);
  }

  private previewProgressPage(displayNumber: number): void {
    const target = clamp(Math.round(displayNumber), 1, this.maxDisplayNumber());

    if (target !== this.currentPageNumber) {
      this.direction = target > this.currentPageNumber ? 1 : -1;
      this.currentPageNumber = target;
    }

    ++this.syncToken;
    this.maintainContainers(this.windowNumbers(), []);
    this.scrollToCurrentPage();
    this.updatePageNumberText(target);
  }

  private cancelProgressCommit(): void {
    if (this.progressCommitTimer !== null) {
      window.clearTimeout(this.progressCommitTimer);
      this.progressCommitTimer = null;
    }
  }

  private readonly onResize = (): void => {
    if (this.resizeFrame !== null) {
      return;
    }

    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = null;
      for (const slot of this.slots) {
        this.applySlotSize(slot);
      }
    });
  };

  private setMode(mode: ViewMode): void {
    if (mode === this.mode) {
      return;
    }

    this.mode = mode;
    saveViewMode(mode);
    this.overlay?.classList.toggle("ehpeek-paged", mode === "paged");
    this.updateModeButton();
    this.rebuildForCurrentMode();
  }

  private toggleReadDirection(): void {
    this.readDirection = this.readDirection === "rtl" ? "ltr" : "rtl";
    saveReadDirection(this.readDirection);
    this.overlay?.classList.toggle("ehpeek-read-rtl", this.readDirection === "rtl");
    this.overlay?.classList.toggle("ehpeek-read-ltr", this.readDirection === "ltr");
    this.updateReadDirectionButton();
  }

  private toggleRightTapAction(): void {
    this.rightTapAction = this.rightTapAction === "previous" ? "next" : "previous";
    saveRightTapAction(this.rightTapAction);
    this.updateRightTapButton();
  }

  private updateModeButton(): void {
    if (!this.modeButton) {
      return;
    }

    const paged = this.mode === "paged";
    this.modeButton.textContent = paged ? "⇔" : "⇕";
    this.modeButton.title = paged ? texts.viewer.scrollMode : texts.viewer.pagedMode;
  }

  private updateReadDirectionButton(): void {
    if (!this.readDirectionButton) {
      return;
    }

    const rtl = this.readDirection === "rtl";
    this.readDirectionButton.textContent = rtl ? "RL" : "LR";
    this.readDirectionButton.title = rtl ? texts.viewer.readLeftToRight : texts.viewer.readRightToLeft;
  }

  private updateRightTapButton(): void {
    if (!this.rightTapButton) {
      return;
    }

    const previous = this.rightTapAction === "previous";
    this.rightTapButton.textContent = previous ? "R-" : "R+";
    this.rightTapButton.title = previous ? texts.viewer.rightTapNext : texts.viewer.rightTapPrevious;
  }

  private toggleToolbar(): void {
    const hidden = this.toolbar?.classList.toggle("ehpeek-toolbar-hidden") ?? false;
    this.overlay?.classList.toggle("ehpeek-toolbar-open", !hidden);
    this.modeButton?.classList.toggle("ehpeek-control-hidden", hidden);
    this.readDirectionButton?.classList.toggle("ehpeek-control-hidden", hidden);
    this.rightTapButton?.classList.toggle("ehpeek-control-hidden", hidden);
    this.disableReaderButton?.classList.toggle("ehpeek-control-hidden", hidden);
  }

  private rightTapDelta(): number {
    return this.rightTapAction === "previous" ? -1 : 1;
  }

  private leftTapDelta(): number {
    return -this.rightTapDelta();
  }

  private rightwardDelta(): number {
    return this.readDirection === "ltr" ? 1 : -1;
  }

  private leftwardDelta(): number {
    return -this.rightwardDelta();
  }

  private horizontal(): boolean {
    return this.mode === "paged";
  }

  private addScrollPos(delta: number, behavior: ScrollBehavior = "auto"): void {
    if (!this.scroller) {
      return;
    }

    if (this.horizontal()) {
      this.scroller.scrollTo({ left: this.scroller.scrollLeft + delta, behavior });
    } else {
      this.setScrollTop(this.scroller.scrollTop + delta);
    }
  }

  private setScrollTop(scrollTop: number): void {
    if (!this.scroller) {
      return;
    }

    this.scroller.scrollTop = this.clampedScrollTop(scrollTop);
  }

  private clampedScrollTop(scrollTop: number): number {
    const bounds = this.scrollBounds();

    if (!bounds) {
      return scrollTop;
    }

    return clamp(
      scrollTop,
      bounds.min ?? Number.NEGATIVE_INFINITY,
      bounds.max ?? Number.POSITIVE_INFINITY,
    );
  }

  private scrollBounds(): { min?: number; max?: number } | null {
    if (!this.scroller || this.mode !== "scroll") {
      return null;
    }

    const firstSlot = this.slotFor(1);
    const lastSlot = this.totalPages ? this.slotFor(this.totalPages + 1) : undefined;

    const scrollerRect = this.scroller.getBoundingClientRect();
    const bounds: { min?: number; max?: number } = {};

    if (firstSlot?.node) {
      const firstRect = firstSlot.node.getBoundingClientRect();
      bounds.min = this.scroller.scrollTop + firstRect.top - scrollerRect.top;
    }

    if (lastSlot?.node) {
      const lastRect = lastSlot.node.getBoundingClientRect();
      const lastTop = this.scroller.scrollTop + lastRect.top - scrollerRect.top;
      bounds.max = lastTop + lastRect.height - this.scroller.clientHeight;
    }

    if (bounds.min === undefined && bounds.max === undefined) {
      return null;
    }

    if (bounds.min !== undefined && bounds.max !== undefined) {
      bounds.max = Math.max(bounds.min, bounds.max);
    }

    return bounds;
  }

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

function toPageSlot(page: ViewerPage, index: number): PageSlot {
  const x = typeof page.displayNumber === "number" && Number.isFinite(page.displayNumber) ? page.displayNumber : index + 1;

  return {
    x,
    index,
    kind: "page",
    meta: { ...page, aspectRatio: normalizedAspectRatio(page.aspectRatio), displayNumber: x },
    state: "idle",
    imageUrl: null,
    width: null,
    height: null,
    node: null,
    frame: null,
    token: 0,
  };
}

function createSlot(x: number, kind: SlotKind): PageSlot {
  return {
    x,
    index: 0,
    kind,
    meta: null,
    state: kind === "page" ? "idle" : "ready",
    imageUrl: null,
    width: null,
    height: null,
    node: null,
    frame: null,
    token: 0,
  };
}

function aspectRatioFor(slot: PageSlot): number {
  return slot.width && slot.height && slot.width > 0 && slot.height > 0
    ? slot.height / slot.width
    : normalizedAspectRatio(slot.meta?.aspectRatio);
}

function targetIsToolbar(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".ehpeek-topbar, .ehpeek-progressbar"));
}

function targetSummary(target: EventTarget | null): string {
  if (!(target instanceof Element)) {
    return String(target);
  }

  const id = target.id ? `#${target.id}` : "";
  const className = typeof target.className === "string" && target.className ? `.${target.className.replace(/\s+/g, ".")}` : "";

  return `${target.tagName.toLowerCase()}${id}${className}`;
}

function loadViewMode(): ViewMode {
  try {
    return window.localStorage.getItem(VIEW_MODE_KEY) === "paged" ? "paged" : "scroll";
  } catch {
    return "scroll";
  }
}

function saveViewMode(mode: ViewMode): void {
  try {
    window.localStorage.setItem(VIEW_MODE_KEY, mode);
  } catch {
    // Ignore storage failures.
  }
}

function loadReadDirection(): ReadDirection {
  try {
    return window.localStorage.getItem(READ_DIRECTION_KEY) === "ltr" ? "ltr" : "rtl";
  } catch {
    return "rtl";
  }
}

function saveReadDirection(direction: ReadDirection): void {
  try {
    window.localStorage.setItem(READ_DIRECTION_KEY, direction);
  } catch {
    // Ignore storage failures.
  }
}

function loadRightTapAction(): RightTapAction {
  try {
    return window.localStorage.getItem(RIGHT_TAP_ACTION_KEY) === "next" ? "next" : "previous";
  } catch {
    return "previous";
  }
}

function saveRightTapAction(action: RightTapAction): void {
  try {
    window.localStorage.setItem(RIGHT_TAP_ACTION_KEY, action);
  } catch {
    // Ignore storage failures.
  }
}

function normalizedAspectRatio(value: number | null | undefined): number {
  return value && Number.isFinite(value) && value > 0 ? value : FALLBACK_ASPECT_RATIO;
}

function positiveNumber(value: number | null | undefined): number | null {
  return value && Number.isFinite(value) && value > 0 ? value : null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function stopEvent(event: Event): void {
  event.stopPropagation();
}

function ensureViewerStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    #${VIEWER_ID} {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      background: #070707;
      color: #f3f3f3;
      font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }

    #${VIEWER_ID} * {
      box-sizing: border-box;
    }

    .ehpeek-topbar {
      position: fixed;
      top: calc(10px + env(safe-area-inset-top, 0px));
      right: 10px;
      z-index: 3;
      display: flex;
      justify-content: flex-end;
      pointer-events: none;
    }

    .ehpeek-actions {
      display: flex;
      flex-direction: row;
      gap: 8px;
      pointer-events: auto;
    }

    .ehpeek-button {
      width: 46px;
      height: 40px;
      padding: 0 10px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 6px;
      background: rgba(35, 35, 35, 0.88);
      color: #f3f3f3;
      cursor: pointer;
      font: 700 16px/1 system-ui, sans-serif;
    }

    .ehpeek-direction-button {
      width: 46px;
      padding: 0 10px;
      font-size: 15px;
    }

    .ehpeek-disable-button {
      width: 46px;
      padding: 0 10px;
      font-size: 13px;
      text-transform: uppercase;
    }

    .ehpeek-control-hidden {
      display: none;
    }

    .ehpeek-pageno {
      position: fixed;
      top: calc(62px + env(safe-area-inset-top, 0px));
      left: 50%;
      z-index: 3;
      min-width: 64px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(15, 15, 15, 0.34);
      color: #f3f3f3;
      font: 600 14px/1.4 system-ui, sans-serif;
      white-space: nowrap;
      text-align: center;
      transform: translateX(-50%);
      pointer-events: none;
    }

    .ehpeek-progressbar {
      position: fixed;
      right: max(12px, env(safe-area-inset-right, 0px));
      bottom: calc(12px + env(safe-area-inset-bottom, 0px));
      left: max(12px, env(safe-area-inset-left, 0px));
      z-index: 2;
      display: flex;
      align-items: center;
      padding: 0;
      transition: opacity 160ms ease, transform 160ms ease;
    }

    .ehpeek-toolbar-hidden {
      opacity: 0;
      transform: translateY(calc(100% + 16px));
      pointer-events: none;
    }

    .ehpeek-progress {
      --ehpeek-progress-fill: 0%;
      width: 100%;
      height: 48px;
      margin: 0;
      padding: 0 12px;
      accent-color: #f3f3f3;
      cursor: grab;
      touch-action: none;
      user-select: none;
      -webkit-appearance: none;
      appearance: none;
    }

    .ehpeek-progress:active {
      cursor: grabbing;
    }

    #${VIEWER_ID}.ehpeek-read-rtl .ehpeek-progress {
      direction: rtl;
    }

    #${VIEWER_ID}.ehpeek-read-ltr .ehpeek-progress {
      direction: ltr;
    }

    .ehpeek-progress::-webkit-slider-runnable-track {
      height: 8px;
      border-radius: 999px;
      background: linear-gradient(
        to right,
        #4da3ff 0 var(--ehpeek-progress-fill),
        rgba(255, 255, 255, 0.34) var(--ehpeek-progress-fill) 100%
      );
    }

    #${VIEWER_ID}.ehpeek-read-rtl .ehpeek-progress::-webkit-slider-runnable-track {
      background: linear-gradient(
        to left,
        #4da3ff 0 var(--ehpeek-progress-fill),
        rgba(255, 255, 255, 0.34) var(--ehpeek-progress-fill) 100%
      );
    }

    .ehpeek-progress::-webkit-slider-thumb {
      width: 30px;
      height: 30px;
      margin-top: -11px;
      border: 2px solid rgba(15, 15, 15, 0.92);
      border-radius: 50%;
      background: #f3f3f3;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
      -webkit-appearance: none;
      appearance: none;
    }

    .ehpeek-progress::-moz-range-track {
      height: 8px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.34);
    }

    .ehpeek-progress::-moz-range-progress {
      height: 8px;
      border-radius: 999px;
      background: #4da3ff;
    }

    .ehpeek-progress::-moz-range-thumb {
      width: 30px;
      height: 30px;
      border: 2px solid rgba(15, 15, 15, 0.92);
      border-radius: 50%;
      background: #f3f3f3;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    }

    .ehpeek-scroller {
      width: 100%;
      height: 100%;
      overflow: auto;
      overscroll-behavior: contain;
      scroll-behavior: auto;
      touch-action: none;
      cursor: grab;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .ehpeek-scroller-dragging {
      cursor: grabbing;
      user-select: none;
    }

    .ehpeek-scroller::-webkit-scrollbar {
      display: none;
    }

    .ehpeek-strip {
      display: flex;
      flex-direction: column;
      width: 100%;
      min-height: 100%;
      padding: 56px 0 72px;
    }

    .ehpeek-page {
      display: flex;
      width: 100%;
      height: var(--ehpeek-page-height);
      align-items: flex-start;
      justify-content: center;
      padding-bottom: 8px;
    }

    .ehpeek-frame {
      display: flex;
      width: var(--ehpeek-frame-width);
      height: var(--ehpeek-frame-height);
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .ehpeek-placeholder,
    .ehpeek-error {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      background: #151515;
      color: rgba(245, 245, 245, 0.72);
      font-size: clamp(88px, 25vw, 180px);
      font-weight: 850;
      line-height: 1;
      text-align: center;
    }

    @media (min-width: 760px) {
      .ehpeek-placeholder {
        font-size: clamp(72px, 10vw, 140px);
      }
    }

    .ehpeek-error {
      color: #ffb2a7;
      font-size: 18px;
      font-weight: 700;
    }

    .ehpeek-placeholder-end {
      padding: 24px;
      direction: ltr;
      font-size: clamp(24px, 6vw, 42px);
      font-weight: 700;
      line-height: 1.3;
      unicode-bidi: plaintext;
    }

    .ehpeek-image {
      display: block;
      width: var(--ehpeek-frame-width);
      height: var(--ehpeek-frame-height);
      object-fit: contain;
      user-select: none;
      -webkit-user-drag: none;
    }

    #${VIEWER_ID}.ehpeek-paged .ehpeek-scroller {
      overflow: hidden;
      touch-action: none;
      user-select: none;
    }

    #${VIEWER_ID}.ehpeek-paged.ehpeek-read-rtl .ehpeek-scroller {
      direction: rtl;
    }

    #${VIEWER_ID}.ehpeek-paged.ehpeek-read-ltr .ehpeek-scroller {
      direction: ltr;
    }

    #${VIEWER_ID}.ehpeek-paged .ehpeek-strip {
      display: flex;
      flex-direction: row;
      width: auto;
      height: 100%;
      min-height: 0;
      padding: 0;
    }

    #${VIEWER_ID}.ehpeek-paged .ehpeek-page {
      flex: 0 0 100%;
      width: 100%;
      height: 100%;
      align-items: center;
      padding: 0;
    }

    #${VIEWER_ID}.ehpeek-paged .ehpeek-frame,
    #${VIEWER_ID}.ehpeek-paged .ehpeek-image {
      width: 100%;
      height: 100%;
    }

    @media (pointer: coarse) {
      .ehpeek-button {
        width: 68px;
        height: 60px;
        padding: 0 16px;
        border-radius: 8px;
        font-size: 18px;
      }

      .ehpeek-disable-button {
        width: 68px;
        font-size: 15px;
      }

      .ehpeek-direction-button {
        width: 68px;
        padding: 0 16px;
        font-size: 16px;
      }

      .ehpeek-pageno {
        top: calc(72px + env(safe-area-inset-top, 0px));
      }

      .ehpeek-topbar {
        top: calc(8px + env(safe-area-inset-top, 0px));
        right: 8px;
      }

      .ehpeek-progressbar {
        right: max(12px, env(safe-area-inset-right, 0px));
        bottom: calc(12px + env(safe-area-inset-bottom, 0px));
        left: max(12px, env(safe-area-inset-left, 0px));
        padding: 0;
      }

      .ehpeek-progress {
        height: 72px;
        padding: 0 19px;
      }

      .ehpeek-progress::-webkit-slider-thumb {
        width: 43px;
        height: 43px;
        margin-top: -17px;
      }

      .ehpeek-progress::-moz-range-thumb {
        width: 43px;
        height: 43px;
      }
    }

    @media (orientation: landscape) {
      .ehpeek-pageno {
        top: calc(54px + env(safe-area-inset-top, 0px));
        right: 10px;
        left: auto;
        min-width: 0;
        max-width: calc(100vw - 20px);
        text-align: right;
        transform: none;
      }
    }

    @media (orientation: landscape) and (pointer: coarse) {
      .ehpeek-pageno {
        top: calc(62px + env(safe-area-inset-top, 0px));
        right: 8px;
        max-width: calc(100vw - 16px);
      }
    }
  `;
  document.head.append(style);
}
