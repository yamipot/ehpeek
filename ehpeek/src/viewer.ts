import texts from "./texts.json";

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

export type ViewerPage = {
  url: string;
  aspectRatio: number;
  displayNumber?: number;
};

export type LoadedViewerPage = {
  imageUrl: string;
  width?: number | null;
  height?: number | null;
  nextPage?: ViewerPage | null;
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
};

type PageState = "idle" | "loading" | "ready" | "error";
type Direction = -1 | 1;

type InternalPage = ViewerPage & {
  index: number;
  state: PageState;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  node: HTMLElement | null;
  frame: HTMLElement | null;
  token: number;
};

let activeViewer: FullscreenViewer | null = null;

export function openFullscreenViewer(options: FullscreenViewerOptions): void {
  activeViewer?.close();
  const viewer = new FullscreenViewer(options);
  activeViewer = viewer;
  viewer.open();
}

class TwoTierImageQueue {
  private nearQueue = new Map<number, InternalPage>();
  private farQueue = new Map<number, InternalPage>();
  private activeNearLoads = 0;
  private activeTotalLoads = 0;
  private timer: number | null = null;
  private disposed = false;

  constructor(
    private readonly loadPage: (page: ViewerPage, index: number) => Promise<LoadedViewerPage>,
    private readonly onLoaded: (page: InternalPage, loaded: LoadedViewerPage, token: number) => void,
    private readonly onError: (page: InternalPage, error: unknown, token: number) => void,
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

  sync(pages: InternalPage[], currentPageNumber: number, direction: Direction, windowNumbers: Set<number>, preloadWindowSize: number): void {
    for (const queue of [this.nearQueue, this.farQueue]) {
      for (const displayNumber of queue.keys()) {
        if (!windowNumbers.has(displayNumber)) {
          queue.delete(displayNumber);
        }
      }
    }

    for (const page of pages) {
      const displayNumber = displayNumberFor(page);

      if (!windowNumbers.has(displayNumber)) {
        this.invalidate(page);
      }
    }

    this.enqueue(pages.find((page) => displayNumberFor(page) === currentPageNumber), "near");

    for (let offset = 1; offset <= preloadWindowSize; offset += 1) {
      const displayNumber = currentPageNumber + offset * direction;
      const page = pages.find((candidate) => displayNumberFor(candidate) === displayNumber);

      if (page) {
        this.enqueue(page, offset <= NEAR_LOAD_AHEAD ? "near" : "far");
      }
    }

    this.schedule();
  }

  invalidate(page: InternalPage): void {
    page.token += 1;
    this.nearQueue.delete(displayNumberFor(page));
    this.farQueue.delete(displayNumberFor(page));

    if (page.state !== "idle") {
      page.state = "idle";
      page.imageUrl = null;
      page.width = null;
      page.height = null;
    }
  }

  private enqueue(page: InternalPage | undefined, tier: "near" | "far"): void {
    if (!page || page.state !== "idle") {
      return;
    }

    const displayNumber = displayNumberFor(page);

    if (tier === "near") {
      this.farQueue.delete(displayNumber);
      this.nearQueue.set(displayNumber, page);
      return;
    }

    if (!this.nearQueue.has(displayNumber)) {
      this.farQueue.set(displayNumber, page);
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
      const page = queue.values().next().value as InternalPage | undefined;

      if (!page) {
        return;
      }

      queue.delete(displayNumberFor(page));

      if (page.state !== "idle") {
        continue;
      }

      this.start(page, tier);
    }
  }

  private currentConcurrency(): number {
    return this.nearQueue.size > 0 || this.activeNearLoads > 0
      ? Math.min(this.nearConcurrentLoads, this.farConcurrentLoads)
      : this.farConcurrentLoads;
  }

  private start(page: InternalPage, tier: "near" | "far"): void {
    page.state = "loading";
    page.token += 1;
    const token = page.token;
    this.activeTotalLoads += 1;

    if (tier === "near") {
      this.activeNearLoads += 1;
    }

    void this.loadPage(page, page.index)
      .then((loaded) => {
        if (!this.disposed) {
          this.onLoaded(page, loaded, token);
        }
      })
      .catch((error) => {
        if (!this.disposed) {
          this.onError(page, error, token);
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
  private pages: InternalPage[];
  private currentPageNumber: number;
  private activeIndex = 0;
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
  private overlay: HTMLDivElement | null = null;
  private scroller: HTMLDivElement | null = null;
  private strip: HTMLElement | null = null;
  private toolbar: HTMLDivElement | null = null;
  private modeButton: HTMLButtonElement | null = null;
  private readDirectionButton: HTMLButtonElement | null = null;
  private rightTapButton: HTMLButtonElement | null = null;
  private pageNumberLabel: HTMLElement | null = null;
  private progressTrack: HTMLDivElement | null = null;
  private progressFill: HTMLDivElement | null = null;
  private progressThumb: HTMLDivElement | null = null;
  private previousBodyOverflow = "";
  private previousDocumentOverflow = "";
  private previousBodyTouchAction = "";
  private previousDocumentTouchAction = "";
  private openLocked = false;
  private openUnlockTimer: number | null = null;
  private scrollFrame: number | null = null;
  private resizeFrame: number | null = null;
  private settleFrame: number | null = null;
  private progressCommitTimer: number | null = null;
  private pendingProgressDisplayNumber: number | null = null;
  private progressDragging = false;
  private progressPointerId: number | null = null;
  private dragging = false;
  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartClientY = 0;
  private dragStartScroll = 0;
  private syncToken = 0;
  private historyEntry = false;
  private closing = false;
  private closed = false;

  constructor(private readonly options: FullscreenViewerOptions) {
    this.pages = options.pages.map((page, index) => toInternalPage(page, index));
    this.activeIndex = clamp(options.startIndex, 0, Math.max(0, this.pages.length - 1));
    this.currentPageNumber = displayNumberFor(this.pages[this.activeIndex]);
    this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
    this.windowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.loadPages = options.loadPages;
    this.onExit = options.onExit;
    this.onActivePageChange = options.onActivePageChange;
    this.imageQueue = new TwoTierImageQueue(
      options.loadPage,
      this.onImageLoaded,
      this.onImageError,
      options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS,
      options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS,
    );
  }

  open(): void {
    if (this.pages.length === 0) {
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
    this.lockOpenScroll();
    void this.syncAfterPageChange({ scrollIntoView: true });
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

    const actions = document.createElement("div");
    actions.className = "ehpeek-actions";
    actions.append(modeButton, readDirectionButton, rightTapButton, closeButton);

    const pageNumberLabel = document.createElement("div");
    pageNumberLabel.className = "ehpeek-pageno";
    this.pageNumberLabel = pageNumberLabel;

    const toolbar = document.createElement("div");
    toolbar.className = "ehpeek-progressbar ehpeek-toolbar-hidden";
    this.toolbar = toolbar;

    const progressTrack = document.createElement("div");
    progressTrack.className = "ehpeek-progress";
    progressTrack.addEventListener("pointerdown", this.onProgressPointerDown);
    progressTrack.addEventListener("pointermove", this.onProgressPointerMove);
    progressTrack.addEventListener("pointerup", this.onProgressPointerUp);
    progressTrack.addEventListener("pointercancel", this.onProgressPointerUp);
    this.progressTrack = progressTrack;

    const progressFill = document.createElement("div");
    progressFill.className = "ehpeek-progress-fill";
    this.progressFill = progressFill;

    const progressThumb = document.createElement("div");
    progressThumb.className = "ehpeek-progress-thumb";
    this.progressThumb = progressThumb;
    progressTrack.append(progressFill, progressThumb);

    const scroller = document.createElement("div");
    scroller.className = "ehpeek-scroller";
    scroller.addEventListener("click", this.onScrollerClick);
    scroller.addEventListener("scroll", this.onScroll, { passive: true });
    scroller.addEventListener("wheel", this.onWheel, { passive: false });
    scroller.addEventListener("pointerdown", this.onPointerDown);
    scroller.addEventListener("pointermove", this.onPointerMove);
    scroller.addEventListener("pointerup", this.onPointerUp);
    scroller.addEventListener("pointercancel", this.onPointerUp);
    this.scroller = scroller;

    const strip = document.createElement("main");
    strip.className = "ehpeek-strip";
    this.strip = strip;

    scroller.append(strip);
    topbar.append(actions);
    toolbar.append(progressTrack);
    overlay.append(topbar, pageNumberLabel, toolbar, scroller);
    document.body.append(overlay);
    this.overlay = overlay;
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
    this.cancelSettle();
    this.cancelProgressCommit();
    this.progressPointerId = null;
    this.imageQueue.dispose();
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("keydown", this.onKeydown, true);
    this.overlay?.remove();
    document.documentElement.style.overflow = this.previousDocumentOverflow;
    document.body.style.overflow = this.previousBodyOverflow;
    document.documentElement.style.touchAction = this.previousDocumentTouchAction;
    document.body.style.touchAction = this.previousBodyTouchAction;

    if (this.openUnlockTimer !== null) {
      window.clearTimeout(this.openUnlockTimer);
    }

    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
    }

    if (this.resizeFrame !== null) {
      window.cancelAnimationFrame(this.resizeFrame);
    }

    if (activeViewer === this) {
      activeViewer = null;
    }
  }

  private async setCurrentPageNumber(pageNumber: number, scrollIntoView: boolean): Promise<void> {
    const target = clamp(Math.round(pageNumber), 1, this.totalPages ?? Number.MAX_SAFE_INTEGER);

    if (target !== this.currentPageNumber) {
      this.direction = target > this.currentPageNumber ? 1 : -1;
      this.currentPageNumber = target;
    }

    await this.syncAfterPageChange({ scrollIntoView });
  }

  private async syncAfterPageChange(options: { scrollIntoView: boolean }): Promise<void> {
    const token = ++this.syncToken;
    const numbers = this.windowNumbers();
    const missing = numbers.filter((number) => !this.pageFor(number));
    const incoming = missing.length > 0 ? await this.loadPages?.(missing) : [];

    if (this.closed || token !== this.syncToken) {
      return;
    }

    this.maintainContainers(numbers, incoming ?? []);
    this.maintainLoadQueue();
    this.notifyActivePageChange();

    if (options.scrollIntoView) {
      this.scrollToCurrentPage();
    }
  }

  private maintainContainers(numbers: number[], incoming: ViewerPage[]): void {
    const keep = new Set(numbers);
    const byNumber = new Map<number, InternalPage>();

    for (const page of this.pages) {
      const number = displayNumberFor(page);

      if (keep.has(number)) {
        byNumber.set(number, page);
      } else {
        this.removePage(page);
      }
    }

    for (const page of incoming) {
      const number = page.displayNumber;

      if (number && keep.has(number) && !byNumber.has(number)) {
        byNumber.set(number, toInternalPage(page, 0));
      }
    }

    this.pages = Array.from(byNumber.values()).sort((left, right) => displayNumberFor(left) - displayNumberFor(right));
    this.pages.forEach((page, index) => {
      page.index = index;
    });
    this.activeIndex = Math.max(0, this.pages.findIndex((page) => displayNumberFor(page) === this.currentPageNumber));
    this.renderContainers();
    this.updatePageNumber();
  }

  private maintainLoadQueue(): void {
    const windowSet = new Set(this.windowNumbers());
    this.imageQueue.sync(this.pages, this.currentPageNumber, this.direction, windowSet, this.preloadWindowSize);
  }

  private renderContainers(): void {
    if (!this.strip) {
      return;
    }

    const keepNumbers = new Set(this.pages.map((page) => displayNumberFor(page)));

    for (const node of Array.from(this.strip.children)) {
      const displayNumber = Number((node as HTMLElement).dataset.ehpeekDisplayNumber ?? "");

      if (!keepNumbers.has(displayNumber)) {
        node.remove();
      }
    }

    for (const page of this.pages) {
      if (page.node && !page.node.isConnected) {
        page.node = null;
        page.frame = null;
      }

      this.mountPage(page);
      page.node?.style.setProperty("order", String(page.index));
      page.node?.setAttribute("data-ehpeek-index", String(page.index));
    }
  }

  private mountPage(page: InternalPage): void {
    if (!this.strip || page.node) {
      if (page.node) {
        this.applyPageSize(page);
      }
      return;
    }

    const section = document.createElement("section");
    section.className = "ehpeek-page";
    section.dataset.ehpeekIndex = String(page.index);
    section.dataset.ehpeekDisplayNumber = String(displayNumberFor(page));

    const frame = document.createElement("div");
    frame.className = "ehpeek-frame";

    const placeholder = document.createElement("div");
    placeholder.className = page.state === "error" ? "ehpeek-error" : "ehpeek-placeholder";
    placeholder.textContent = page.state === "error" ? `${texts.viewer.failedPrefix} ${displayNumberFor(page)}` : String(displayNumberFor(page));
    frame.append(placeholder);
    section.append(frame);
    page.node = section;
    page.frame = frame;
    this.applyPageSize(page);
    this.strip.append(section);

    if (page.state === "ready" && page.imageUrl) {
      void this.installImage(page);
    }
  }

  private removePage(page: InternalPage): void {
    this.imageQueue.invalidate(page);
    page.node?.remove();
    page.node = null;
    page.frame = null;
  }

  private windowNumbers(): number[] {
    const numbers: number[] = [];

    for (let offset = -this.windowSize; offset <= this.windowSize; offset += 1) {
      const number = this.currentPageNumber + offset;

      if (number > 0 && (!this.totalPages || number <= this.totalPages)) {
        numbers.push(number);
      }
    }

    return numbers;
  }

  private pageFor(displayNumber: number): InternalPage | undefined {
    return this.pages.find((page) => displayNumberFor(page) === displayNumber);
  }

  private step(delta: number): void {
    void this.setCurrentPageNumber(this.currentPageNumber + delta, true);
  }

  private scrollToCurrentPage(): void {
    const page = this.pageFor(this.currentPageNumber);

    if (!this.scroller || !page?.node) {
      return;
    }

    const pageRect = page.node.getBoundingClientRect();
    const scrollerRect = this.scroller.getBoundingClientRect();
    const delta = this.horizontal() ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
    this.addScrollPos(delta);
  }

  private readonly onImageLoaded = (page: InternalPage, loaded: LoadedViewerPage, token: number): void => {
    if (page.token !== token || !this.windowNumbers().includes(displayNumberFor(page))) {
      return;
    }

    page.state = "ready";
    page.imageUrl = loaded.imageUrl;
    page.width = positiveNumber(loaded.width);
    page.height = positiveNumber(loaded.height);

    if (page.node) {
      this.applyPageSize(page);
      void this.installImage(page);
    }
  };

  private readonly onImageError = (page: InternalPage, error: unknown, token: number): void => {
    if (page.token !== token || !page.frame) {
      return;
    }

    page.state = "error";
    const message = error instanceof Error ? error.message : texts.errors.loadFailed;
    const errorBox = document.createElement("div");
    errorBox.className = "ehpeek-error";
    errorBox.textContent = `${texts.viewer.failedPrefix} ${displayNumberFor(page)}: ${message}`;
    page.frame.replaceChildren(errorBox);
  };

  private async installImage(page: InternalPage): Promise<void> {
    if (!page.frame || !page.imageUrl) {
      return;
    }

    const imageUrl = page.imageUrl;
    const token = page.token;
    const image = document.createElement("img");
    image.className = "ehpeek-image";
    image.alt = `Page ${displayNumberFor(page)}`;
    image.decoding = "async";
    image.loading = "eager";
    image.draggable = false;
    image.setAttribute("fetchpriority", displayNumberFor(page) === this.currentPageNumber ? "high" : "low");
    image.src = imageUrl;

    if (page.width && page.height) {
      image.width = page.width;
      image.height = page.height;
    }

    try {
      await loadImage(image);
    } catch {
      return;
    }

    if (!this.closed && page.token === token && page.frame && page.imageUrl === imageUrl) {
      page.frame.replaceChildren(image);
    }
  }

  private applyPageSize(page: InternalPage): void {
    if (!page.node || !page.frame) {
      return;
    }

    const frameWidth = Math.max(1, this.scroller?.clientWidth || window.innerWidth || 1);
    const frameHeight = Math.ceil(frameWidth * aspectRatioFor(page));
    page.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`);
    page.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`);
    page.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
  }

  private updatePageNumber(): void {
    if (!this.pageNumberLabel) {
      return;
    }

    this.pageNumberLabel.textContent = this.totalPages ? `${this.currentPageNumber} / ${this.totalPages}` : String(this.currentPageNumber);

    if (this.progressDragging) {
      return;
    }

    this.updateProgressVisual(this.currentPageNumber);
  }

  private notifyActivePageChange(): void {
    const page = this.pageFor(this.currentPageNumber);

    if (page) {
      this.onActivePageChange?.(page, page.index);
    }
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }

    if (this.mode === "paged") {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        this.step(this.leftwardDelta());
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        this.step(this.rightwardDelta());
      }
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      this.step(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      this.step(-1);
    }
  };

  private readonly onWheel = (event: WheelEvent): void => {
    if (this.mode !== "paged") {
      return;
    }

    event.preventDefault();

    if (this.settleFrame !== null || this.dragging) {
      return;
    }

    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;

    if (Math.abs(delta) >= PAGED_WHEEL_THRESHOLD) {
      this.step(delta > 0 ? this.rightwardDelta() : this.leftwardDelta());
    }
  };

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (this.mode !== "paged" || !this.scroller) {
      return;
    }

    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    event.preventDefault();
    this.cancelSettle();
    this.dragging = true;
    this.dragPointerId = event.pointerId;
    this.dragStartClientX = event.clientX;
    this.dragStartClientY = event.clientY;
    this.dragStartScroll = this.scroller.scrollLeft;
    this.scroller.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.dragPointerId || !this.scroller) {
      return;
    }

    this.scroller.scrollLeft = this.dragStartScroll - (event.clientX - this.dragStartClientX);
    event.preventDefault();
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.dragPointerId) {
      return;
    }

    this.dragging = false;
    this.dragPointerId = null;
    this.scroller?.releasePointerCapture?.(event.pointerId);

    const dx = event.clientX - this.dragStartClientX;
    const dy = event.clientY - this.dragStartClientY;

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
      this.scrollToCurrentPage();
    }
  };

  private readonly onScroll = (): void => {
    if (this.openLocked || this.dragging || this.settleFrame !== null || this.mode === "paged") {
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

  private updateCurrentFromScroll(): void {
    if (!this.scroller) {
      return;
    }

    const scrollerRect = this.scroller.getBoundingClientRect();
    const target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);

    for (const page of this.pages) {
      if (!page.node) {
        continue;
      }

      const rect = page.node.getBoundingClientRect();

      if (rect.top <= target && rect.bottom > target) {
        const next = displayNumberFor(page);

        if (next !== this.currentPageNumber) {
          this.direction = next > this.currentPageNumber ? 1 : -1;
          this.currentPageNumber = next;
          void this.syncAfterPageChange({ scrollIntoView: false });
        }
        return;
      }
    }
  }

  private readonly onScrollerClick = (event: MouseEvent): void => {
    if (this.mode !== "scroll" || targetIsToolbar(event.target)) {
      return;
    }

    this.toggleToolbar();
  };

  private readonly onProgressPointerDown = (event: PointerEvent): void => {
    this.progressDragging = true;
    this.progressPointerId = event.pointerId;
    this.cancelProgressCommit();
    this.progressTrack?.setPointerCapture(event.pointerId);
    this.updateProgressFromClientX(event.clientX);
    event.preventDefault();
  };

  private readonly onProgressPointerMove = (event: PointerEvent): void => {
    if (!this.progressDragging || event.pointerId !== this.progressPointerId) {
      return;
    }

    this.updateProgressFromClientX(event.clientX);
    event.preventDefault();
  };

  private readonly onProgressPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.progressPointerId) {
      return;
    }

    this.progressTrack?.releasePointerCapture?.(event.pointerId);
    this.progressPointerId = null;
    this.onProgressCommit();
  };

  private onProgressCommit(): void {
    if (!this.progressDragging && this.pendingProgressDisplayNumber === null) {
      return;
    }

    const displayNumber = this.pendingProgressDisplayNumber ?? this.currentPageNumber;
    this.progressDragging = false;
    this.pendingProgressDisplayNumber = null;
    this.cancelProgressCommit();

    if (Number.isFinite(displayNumber) && displayNumber > 0) {
      void this.setCurrentPageNumber(displayNumber, true);
    }
  }

  private updateProgressFromClientX(clientX: number): void {
    const displayNumber = this.displayNumberFromProgressClientX(clientX);

    if (displayNumber === null) {
      return;
    }

    this.pendingProgressDisplayNumber = displayNumber;
    this.updatePageNumberText(displayNumber);
    this.updateProgressVisual(displayNumber);
    this.cancelProgressCommit();
    this.progressCommitTimer = window.setTimeout(() => this.onProgressCommit(), 1500);
  }

  private displayNumberFromProgressClientX(clientX: number): number | null {
    if (!this.progressTrack) {
      return null;
    }

    const max = Math.max(1, this.totalPages ?? this.currentPageNumber);
    const rect = this.progressTrack.getBoundingClientRect();

    if (rect.width <= 0) {
      return null;
    }

    const ratio =
      this.readDirection === "rtl"
        ? clamp((rect.right - clientX) / rect.width, 0, 1)
        : clamp((clientX - rect.left) / rect.width, 0, 1);
    return clamp(Math.round(1 + ratio * (max - 1)), 1, max);
  }

  private updatePageNumberText(displayNumber: number): void {
    if (this.pageNumberLabel) {
      this.pageNumberLabel.textContent = this.totalPages ? `${displayNumber} / ${this.totalPages}` : String(displayNumber);
    }
  }

  private updateProgressVisual(displayNumber: number): void {
    const max = Math.max(1, this.totalPages ?? displayNumber);
    const ratio = max <= 1 ? 0 : (displayNumber - 1) / (max - 1);
    const percent = `${ratio * 100}%`;

    this.progressFill?.style.setProperty("--ehpeek-progress-value", percent);
    this.progressThumb?.style.setProperty("--ehpeek-progress-value", percent);
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
      for (const page of this.pages) {
        this.applyPageSize(page);
      }
      this.scrollToCurrentPage();
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
    this.lockOpenScroll();
    window.requestAnimationFrame(() => this.scrollToCurrentPage());
  }

  private toggleReadDirection(): void {
    this.readDirection = this.readDirection === "rtl" ? "ltr" : "rtl";
    saveReadDirection(this.readDirection);
    this.overlay?.classList.toggle("ehpeek-read-rtl", this.readDirection === "rtl");
    this.overlay?.classList.toggle("ehpeek-read-ltr", this.readDirection === "ltr");
    this.updateReadDirectionButton();
    this.updateProgressVisual(this.pendingProgressDisplayNumber ?? this.currentPageNumber);
    window.requestAnimationFrame(() => this.scrollToCurrentPage());
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
    this.rightTapButton.textContent = previous ? "R-1" : "R+1";
    this.rightTapButton.title = previous ? texts.viewer.rightTapNext : texts.viewer.rightTapPrevious;
  }

  private toggleToolbar(): void {
    const hidden = this.toolbar?.classList.toggle("ehpeek-toolbar-hidden") ?? false;
    this.modeButton?.classList.toggle("ehpeek-control-hidden", hidden);
    this.readDirectionButton?.classList.toggle("ehpeek-control-hidden", hidden);
    this.rightTapButton?.classList.toggle("ehpeek-control-hidden", hidden);
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

  private lockOpenScroll(): void {
    this.openLocked = true;

    if (this.openUnlockTimer !== null) {
      window.clearTimeout(this.openUnlockTimer);
    }

    this.openUnlockTimer = window.setTimeout(() => {
      this.openLocked = false;
      this.openUnlockTimer = null;
    }, 450);
  }

  private horizontal(): boolean {
    return this.mode === "paged";
  }

  private addScrollPos(delta: number): void {
    if (!this.scroller) {
      return;
    }

    if (this.horizontal()) {
      this.scroller.scrollLeft += delta;
    } else {
      this.scroller.scrollTop += delta;
    }
  }

  private cancelSettle(): void {
    if (this.settleFrame !== null) {
      window.cancelAnimationFrame(this.settleFrame);
      this.settleFrame = null;
    }
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

function toInternalPage(page: ViewerPage, index: number): InternalPage {
  return {
    ...page,
    aspectRatio: normalizedAspectRatio(page.aspectRatio),
    index,
    state: "idle",
    imageUrl: null,
    width: null,
    height: null,
    node: null,
    frame: null,
    token: 0,
  };
}

function displayNumberFor(page: ViewerPage & { index: number }): number {
  return page.displayNumber && page.displayNumber > 0 ? page.displayNumber : page.index + 1;
}

function aspectRatioFor(page: InternalPage): number {
  return page.width && page.height && page.width > 0 && page.height > 0
    ? page.height / page.width
    : normalizedAspectRatio(page.aspectRatio);
}

function targetIsToolbar(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(".ehpeek-topbar, .ehpeek-progressbar"));
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
      min-width: 36px;
      height: 36px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      border-radius: 6px;
      background: rgba(35, 35, 35, 0.88);
      color: #f3f3f3;
      cursor: pointer;
      font: 700 18px/1 system-ui, sans-serif;
    }

    .ehpeek-direction-button {
      min-width: 48px;
      padding: 0 8px;
      font-size: 13px;
    }

    .ehpeek-control-hidden {
      display: none;
    }

    .ehpeek-pageno {
      position: fixed;
      top: calc(12px + env(safe-area-inset-top, 0px));
      left: 50%;
      z-index: 3;
      min-width: 64px;
      padding: 4px 10px;
      border-radius: 6px;
      background: rgba(15, 15, 15, 0.72);
      color: #f3f3f3;
      font: 600 14px/1.4 system-ui, sans-serif;
      white-space: nowrap;
      text-align: center;
      transform: translateX(-50%);
      pointer-events: none;
    }

    .ehpeek-progressbar {
      position: fixed;
      right: 10px;
      bottom: calc(10px + env(safe-area-inset-bottom, 0px));
      left: 10px;
      z-index: 2;
      display: flex;
      align-items: center;
      padding: 8px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 8px;
      background: rgba(15, 15, 15, 0.82);
      box-shadow: 0 8px 28px rgba(0, 0, 0, 0.38);
      backdrop-filter: blur(10px);
      transition: opacity 160ms ease, transform 160ms ease;
    }

    .ehpeek-toolbar-hidden {
      opacity: 0;
      transform: translateY(calc(100% + 16px));
      pointer-events: none;
    }

    .ehpeek-progress {
      position: relative;
      width: 100%;
      height: 32px;
      cursor: pointer;
      touch-action: none;
    }

    .ehpeek-progress::before {
      position: absolute;
      right: 0;
      left: 0;
      top: 50%;
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.24);
      content: "";
      transform: translateY(-50%);
    }

    .ehpeek-progress-fill {
      position: absolute;
      top: 50%;
      width: var(--ehpeek-progress-value, 0%);
      height: 4px;
      border-radius: 999px;
      background: rgba(255, 255, 255, 0.84);
      transform: translateY(-50%);
    }

    .ehpeek-progress-thumb {
      position: absolute;
      top: 50%;
      width: 22px;
      height: 22px;
      border: 2px solid rgba(15, 15, 15, 0.92);
      border-radius: 50%;
      background: #f3f3f3;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
    }

    #${VIEWER_ID}.ehpeek-read-rtl .ehpeek-progress-fill {
      right: 0;
    }

    #${VIEWER_ID}.ehpeek-read-rtl .ehpeek-progress-thumb {
      right: var(--ehpeek-progress-value, 0%);
      transform: translate(50%, -50%);
    }

    #${VIEWER_ID}.ehpeek-read-ltr .ehpeek-progress-fill {
      left: 0;
    }

    #${VIEWER_ID}.ehpeek-read-ltr .ehpeek-progress-thumb {
      left: var(--ehpeek-progress-value, 0%);
      transform: translate(-50%, -50%);
    }

    .ehpeek-scroller {
      width: 100%;
      height: 100%;
      overflow: auto;
      overscroll-behavior: contain;
      scroll-behavior: auto;
      touch-action: pan-y;
      scrollbar-width: none;
      -ms-overflow-style: none;
    }

    .ehpeek-scroller::-webkit-scrollbar {
      display: none;
    }

    .ehpeek-strip {
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
        min-width: 48px;
        height: 48px;
        border-radius: 8px;
        font-size: 24px;
      }

      .ehpeek-direction-button {
        min-width: 56px;
        padding: 0 10px;
        font-size: 15px;
      }

      .ehpeek-topbar {
        top: calc(8px + env(safe-area-inset-top, 0px));
        right: 8px;
      }

      .ehpeek-progressbar {
        right: 8px;
        bottom: calc(8px + env(safe-area-inset-bottom, 0px));
        left: 8px;
        padding: 10px;
      }

      .ehpeek-pageno {
        min-width: 76px;
        font-size: 16px;
      }
    }
  `;
  document.head.append(style);
}
