import texts from "./texts.json";

export type ViewMode = "scroll" | "paged";

const VIEW_MODE_KEY = "ehpeek:view-mode";

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
    // Ignore storage failures (private mode, disabled storage, etc.).
  }
}

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

type PageState = "idle" | "loading" | "ready" | "error";

type InternalPage = ViewerPage & {
  index: number;
  kind: "page" | "end";
  state: PageState;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  node: HTMLElement | null;
  frame: HTMLElement | null;
};

export type FullscreenViewerOptions = {
  pages: ViewerPage[];
  startIndex: number;
  loadPage: (page: ViewerPage, index: number) => Promise<LoadedViewerPage>;
  loadBefore?: (firstPage: ViewerPage) => Promise<ViewerPage[]>;
  loadAfter?: (lastPage: ViewerPage) => Promise<ViewerPage[]>;
  onExit?: () => void;
  keepBehind?: number;
  renderAhead?: number;
  preloadAhead?: number;
  nearConcurrentLoads?: number;
  farConcurrentLoads?: number;
  onActivePageChange?: (page: ViewerPage, index: number) => void;
};

const VIEWER_ID = "ehpeek-reader";
const STYLE_ID = "ehpeek-reader-style";
const DEFAULT_KEEP_BEHIND = 5;
const DEFAULT_RENDER_AHEAD = 10;
const DEFAULT_PRELOAD_AHEAD = 10;
const DEFAULT_NEAR_CONCURRENT_LOADS = 3;
const DEFAULT_FAR_CONCURRENT_LOADS = 6;
const NEAR_LOAD_AHEAD = 3;
const FALLBACK_ASPECT_RATIO = 1.42;
const PAGED_SWIPE_THRESHOLD = 24;

let activeViewer: FullscreenViewer | null = null;

export function openFullscreenViewer(options: FullscreenViewerOptions): void {
  activeViewer?.close();
  const viewer = new FullscreenViewer(options);
  activeViewer = viewer;
  viewer.open();
}

class FullscreenViewer {
  private pages: InternalPage[];
  private activeIndex: number;
  private readonly loadPage: FullscreenViewerOptions["loadPage"];
  private readonly loadBefore: FullscreenViewerOptions["loadBefore"];
  private readonly loadAfter: FullscreenViewerOptions["loadAfter"];
  private readonly onExit: FullscreenViewerOptions["onExit"];
  private readonly keepBehind: number;
  private readonly renderAhead: number;
  private readonly preloadAhead: number;
  private readonly nearConcurrentLoads: number;
  private readonly farConcurrentLoads: number;
  private readonly onActivePageChange: ((page: ViewerPage, index: number) => void) | undefined;
  private readonly endPageEntry: InternalPage;
  private mode: ViewMode = loadViewMode();
  private modeButton: HTMLButtonElement | null = null;
  private overlay: HTMLDivElement | null = null;
  private scroller: HTMLDivElement | null = null;
  private strip: HTMLElement | null = null;
  private previousBodyOverflow = "";
  private previousDocumentOverflow = "";
  private previousBodyTouchAction = "";
  private previousDocumentTouchAction = "";
  private queue = new Map<number, InternalPage>();
  private activeLoadCount = 0;
  private queueTimer: number | null = null;
  private scrollFrame: number | null = null;
  private resizeFrame: number | null = null;
  private openLocked = false;
  private openUnlockTimer: number | null = null;
  private closed = false;
  private reachedEnd = false;
  private loadingBefore = false;
  private noMoreBefore = false;
  private loadingAfter = false;
  private noMoreAfter = false;
  private historyEntry = false;
  private closing = false;
  private dragging = false;
  private dragPointerId: number | null = null;
  private dragStartClientX = 0;
  private dragStartScroll = 0;
  private settleFrame: number | null = null;

  constructor(options: FullscreenViewerOptions) {
    this.pages = options.pages.map((page, index) => ({
      ...page,
      aspectRatio: normalizedAspectRatio(page.aspectRatio),
      index,
      kind: "page",
      state: "idle",
      imageUrl: null,
      width: null,
      height: null,
      node: null,
      frame: null,
    }));
    this.activeIndex = clamp(options.startIndex, 0, Math.max(0, this.pages.length - 1));
    this.loadPage = options.loadPage;
    this.loadBefore = options.loadBefore;
    this.loadAfter = options.loadAfter;
    this.onExit = options.onExit;
    this.noMoreBefore = !options.loadBefore;
    this.noMoreAfter = !options.loadAfter;
    this.keepBehind = options.keepBehind ?? DEFAULT_KEEP_BEHIND;
    this.renderAhead = options.renderAhead ?? DEFAULT_RENDER_AHEAD;
    this.preloadAhead = options.preloadAhead ?? DEFAULT_PRELOAD_AHEAD;
    this.nearConcurrentLoads = options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS;
    this.farConcurrentLoads = options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS;
    this.onActivePageChange = options.onActivePageChange;
    this.endPageEntry = {
      url: "__ehpeek_end__",
      aspectRatio: 0.42,
      displayNumber: undefined,
      index: this.pages.length,
      kind: "end",
      state: "ready",
      imageUrl: null,
      width: null,
      height: null,
      node: null,
      frame: null,
    };
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

    const overlay = document.createElement("div");
    overlay.id = VIEWER_ID;
    overlay.classList.toggle("ehpeek-paged", this.mode === "paged");

    const toolbar = document.createElement("div");
    toolbar.className = "ehpeek-toolbar";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "ehpeek-button";
    closeButton.title = texts.viewer.close;
    closeButton.textContent = "x";
    closeButton.addEventListener("click", () => this.close());

    const modeButton = document.createElement("button");
    modeButton.type = "button";
    modeButton.className = "ehpeek-button";
    modeButton.addEventListener("click", () => this.setMode(this.mode === "paged" ? "scroll" : "paged"));
    this.modeButton = modeButton;

    const scroller = document.createElement("div");
    scroller.className = "ehpeek-scroller";
    scroller.addEventListener("scroll", this.onScroll, { passive: true });
    scroller.addEventListener("pointerdown", this.onPointerDown);
    scroller.addEventListener("pointermove", this.onPointerMove);
    scroller.addEventListener("pointerup", this.onPointerUp);
    scroller.addEventListener("pointercancel", this.onPointerUp);

    const strip = document.createElement("main");
    strip.className = "ehpeek-strip";

    scroller.append(strip);
    toolbar.append(closeButton, modeButton);
    overlay.append(toolbar, scroller);
    document.body.append(overlay);

    this.updateModeButton();

    this.overlay = overlay;
    this.scroller = scroller;
    this.strip = strip;

    if (this.onExit) {
      window.history.pushState({ ehpeekReader: true }, "", window.location.href);
      this.historyEntry = true;
      window.addEventListener("popstate", this.onPopState);
    }

    this.lockOpenScroll();
    this.renderWindow();
    this.scrollToPage(this.activeIndex);
    this.notifyActivePageChange();
    this.queueLoadsForActivePage();
    this.maybeLoadBefore();
    this.maybeLoadAfter();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("keydown", this.onKeydown, true);
  }

  // Closing via the button/Escape unwinds the pushed history entry, so exiting the reader always
  // routes through popstate (finishClose + onExit) the same way the browser Back button does.
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
    this.queue.clear();
    this.scroller?.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("popstate", this.onPopState);
    document.removeEventListener("keydown", this.onKeydown, true);
    this.overlay?.remove();
    document.documentElement.style.overflow = this.previousDocumentOverflow;
    document.body.style.overflow = this.previousBodyOverflow;
    document.documentElement.style.touchAction = this.previousDocumentTouchAction;
    document.body.style.touchAction = this.previousBodyTouchAction;

    if (activeViewer === this) {
      activeViewer = null;
    }

    if (this.queueTimer !== null) {
      window.clearTimeout(this.queueTimer);
    }

    if (this.scrollFrame !== null) {
      window.cancelAnimationFrame(this.scrollFrame);
    }

    if (this.resizeFrame !== null) {
      window.cancelAnimationFrame(this.resizeFrame);
    }

    if (this.openUnlockTimer !== null) {
      window.clearTimeout(this.openUnlockTimer);
    }
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.close();
      return;
    }

    if (this.mode === "paged" && (event.key === "ArrowLeft" || event.key === "ArrowRight")) {
      event.preventDefault();
      // Right-to-left reading: Left advances to the next (higher-numbered) page.
      this.step(event.key === "ArrowLeft" ? 1 : -1);
    }
  };

  private setMode(mode: ViewMode): void {
    if (mode === this.mode) {
      return;
    }

    this.mode = mode;
    saveViewMode(mode);
    this.overlay?.classList.toggle("ehpeek-paged", mode === "paged");
    this.updateModeButton();

    for (const page of this.pages) {
      this.applyPageSize(page);
    }
    this.applyPageSize(this.endPageEntry);

    this.lockOpenScroll();
    window.requestAnimationFrame(() => this.scrollToPage(this.activeIndex));
  }

  private updateModeButton(): void {
    if (!this.modeButton) {
      return;
    }

    const paged = this.mode === "paged";
    this.modeButton.textContent = paged ? "⇔" : "⇕";
    this.modeButton.title = paged ? texts.viewer.scrollMode : texts.viewer.pagedMode;
  }

  private step(delta: number): void {
    this.settleToPage(this.activeIndex + delta);
  }

  // The end "tap to exit" slide sits just past the last image once the gallery end is loaded.
  private maxNavIndex(): number {
    return this.reachedEnd ? this.pages.length : this.pages.length - 1;
  }

  private nodeAt(index: number): HTMLElement | null {
    if (this.reachedEnd && index === this.endPageEntry.index) {
      return this.endPageEntry.node;
    }

    return this.pages[index]?.node ?? null;
  }

  // Commit to a single page and spring to its centered position, so a gesture never rests half-way.
  private settleToPage(index: number): void {
    const target = clamp(index, 0, this.maxNavIndex());

    if (target !== this.activeIndex) {
      this.activeIndex = target;
      this.renderWindow();
      this.pruneQueue();
      this.notifyActivePageChange();
      this.queueLoadsForActivePage();
      this.maybeLoadBefore();
      this.maybeLoadAfter();
    }

    const node = this.nodeAt(this.activeIndex);

    if (!this.scroller || !node) {
      return;
    }

    const pageRect = node.getBoundingClientRect();
    const scrollerRect = this.scroller.getBoundingClientRect();
    const delta = this.horizontal() ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
    this.animateSettle(delta);
  }

  private animateSettle(delta: number): void {
    this.cancelSettle();

    if (!this.scroller || Math.abs(delta) < 0.5) {
      return;
    }

    const horizontal = this.horizontal();
    const startPos = horizontal ? this.scroller.scrollLeft : this.scroller.scrollTop;
    const startTime = performance.now();
    const duration = 220;

    const tick = (now: number): void => {
      if (this.closed || !this.scroller) {
        this.settleFrame = null;
        return;
      }

      const progress = Math.min(1, (now - startTime) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      const position = startPos + delta * eased;

      if (horizontal) {
        this.scroller.scrollLeft = position;
      } else {
        this.scroller.scrollTop = position;
      }

      this.settleFrame = progress < 1 ? window.requestAnimationFrame(tick) : null;
    };

    this.settleFrame = window.requestAnimationFrame(tick);
  }

  private cancelSettle(): void {
    if (this.settleFrame !== null) {
      window.cancelAnimationFrame(this.settleFrame);
      this.settleFrame = null;
    }
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

  private readonly onScroll = (): void => {
    if (this.openLocked || this.dragging || this.settleFrame !== null) {
      return;
    }

    this.scheduleActivePageUpdate();
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
    this.dragStartScroll = this.scroller.scrollLeft;
    this.scroller.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (!this.dragging || event.pointerId !== this.dragPointerId || !this.scroller) {
      return;
    }

    // Follow the finger: moving right shifts content right, revealing the page to the left.
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

    // One gesture flips at most one page: drag right -> next (higher number, to the left) and back.
    if (dx >= PAGED_SWIPE_THRESHOLD) {
      this.settleToPage(this.activeIndex + 1);
    } else if (dx <= -PAGED_SWIPE_THRESHOLD) {
      this.settleToPage(this.activeIndex - 1);
    } else {
      this.settleToPage(this.activeIndex);
    }
  };

  private readonly onResize = (): void => {
    if (this.resizeFrame !== null) {
      return;
    }

    this.resizeFrame = window.requestAnimationFrame(() => {
      this.resizeFrame = null;
      this.withLockedActivePosition(() => {
        for (const page of this.pages) {
          if (page.node) {
            this.applyPageSize(page);
          }
        }
      });
      this.scrollToPage(this.activeIndex);
    });
  };

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

  private renderWindow(): void {
    const firstIndex = Math.max(0, this.activeIndex - this.keepBehind);
    const maxRenderableIndex = this.reachedEnd ? this.pages.length : this.pages.length - 1;
    const lastIndex = Math.min(maxRenderableIndex, this.activeIndex + this.renderAhead);

    for (const page of this.pages) {
      if (page.index < firstIndex || page.index > lastIndex) {
        this.unmountPage(page);
      }
    }

    if (!this.reachedEnd || this.endPageEntry.index < firstIndex || this.endPageEntry.index > lastIndex) {
      this.unmountPage(this.endPageEntry);
    }

    for (let index = firstIndex; index <= lastIndex; index += 1) {
      const page = this.pages[index] ?? (this.reachedEnd ? this.endPageEntry : null);

      if (!page) {
        continue;
      }

      this.mountPage(page);
    }
  }

  private mountPage(page: InternalPage): void {
    if (!this.strip || page.node) {
      return;
    }

    const section = document.createElement("section");
    section.className = page.kind === "end" ? "ehpeek-page ehpeek-end-page" : "ehpeek-page";
    section.dataset.ehpeekIndex = String(page.index);

    const frame = document.createElement("div");
    frame.className = "ehpeek-frame";

    const placeholder = document.createElement("div");
    placeholder.className =
      page.kind === "end" ? "ehpeek-end" : page.state === "error" ? "ehpeek-error" : "ehpeek-placeholder";
    placeholder.textContent =
      page.kind === "end"
        ? texts.viewer.end
        : page.state === "error"
          ? `${texts.viewer.failedPrefix} ${this.displayNumberFor(page)}`
          : String(this.displayNumberFor(page));
    if (page.kind === "end") {
      placeholder.addEventListener("click", () => this.close());
    }
    frame.append(placeholder);
    section.append(frame);

    page.node = section;
    page.frame = frame;
    this.applyPageSize(page);

    const nextNode = this.nextMountedNodeAfter(page.index);
    this.withLockedActivePosition(() => {
      this.strip?.insertBefore(section, nextNode);
    });

    if (page.kind === "page" && page.state === "ready" && page.imageUrl) {
      this.installImage(page);
    }
  }

  private unmountPage(page: InternalPage): void {
    if (!page.node) {
      return;
    }

    this.withLockedActivePosition(() => {
      page.node?.remove();
    });
    page.node = null;
    page.frame = null;
  }

  private applyPageSize(page: InternalPage): void {
    if (!page.node || !page.frame) {
      return;
    }

    const frameWidth = this.frameWidth();
    const frameHeight =
      page.kind === "end" ? Math.max(220, Math.round(window.innerHeight * 0.42)) : Math.ceil(frameWidth * this.aspectRatioFor(page));
    page.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`);
    page.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`);
    page.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
  }

  private frameWidth(): number {
    return Math.max(1, this.scroller?.clientWidth || window.innerWidth || 1);
  }

  private aspectRatioFor(page: InternalPage): number {
    if (page.width && page.height && page.width > 0 && page.height > 0) {
      return page.height / page.width;
    }

    return normalizedAspectRatio(page.aspectRatio);
  }

  private displayNumberFor(page: InternalPage): number {
    return page.displayNumber && page.displayNumber > 0 ? page.displayNumber : page.index + 1;
  }

  private nextMountedNodeAfter(index: number): HTMLElement | null {
    const nextPageNode = this.pages.slice(index + 1).find((candidate) => candidate.node)?.node ?? null;

    if (nextPageNode) {
      return nextPageNode;
    }

    return this.endPageEntry.index > index ? this.endPageEntry.node : null;
  }

  private scrollToPage(index: number): void {
    const node = this.nodeAt(index);

    if (!this.scroller || !node) {
      return;
    }

    const pageRect = node.getBoundingClientRect();
    const scrollerRect = this.scroller.getBoundingClientRect();
    const delta = this.horizontal() ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
    this.addScrollPos(delta);
  }

  private withLockedActivePosition(change: () => void): void {
    const activeNode = this.pages[this.activeIndex]?.node;
    const beforeRect = activeNode?.getBoundingClientRect();
    const beforeStart = beforeRect ? (this.horizontal() ? beforeRect.left : beforeRect.top) : null;

    change();

    if (!this.scroller || beforeStart === null || !activeNode?.isConnected) {
      return;
    }

    const afterRect = activeNode.getBoundingClientRect();
    const afterStart = this.horizontal() ? afterRect.left : afterRect.top;
    const delta = afterStart - beforeStart;

    if (Math.abs(delta) >= 0.5) {
      this.addScrollPos(delta);
    }
  }

  private scheduleActivePageUpdate(): void {
    if (this.scrollFrame !== null) {
      return;
    }

    this.scrollFrame = window.requestAnimationFrame(() => {
      this.scrollFrame = null;
      this.updateActivePageFromScroll();
    });
  }

  private updateActivePageFromScroll(): void {
    if (!this.scroller) {
      return;
    }

    const scrollerRect = this.scroller.getBoundingClientRect();
    const horizontal = this.horizontal();
    const target = horizontal
      ? scrollerRect.left + scrollerRect.width * 0.5
      : scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
    let nextActiveIndex = this.activeIndex;

    for (const page of this.pages) {
      if (!page.node) {
        continue;
      }

      const rect = page.node.getBoundingClientRect();
      const start = horizontal ? rect.left : rect.top;
      const end = horizontal ? rect.right : rect.bottom;

      if (start <= target && end > target) {
        nextActiveIndex = page.index;
        break;
      }
    }

    if (nextActiveIndex !== this.activeIndex) {
      this.activeIndex = nextActiveIndex;
      this.renderWindow();
      this.pruneQueue();
      this.notifyActivePageChange();
      this.queueLoadsForActivePage();
    }

    this.maybeLoadBefore();
    this.maybeLoadAfter();
  }

  private maybeLoadAfter(): void {
    if (
      this.loadingAfter ||
      this.noMoreAfter ||
      this.reachedEnd ||
      !this.loadAfter ||
      this.activeIndex < this.pages.length - 1 - this.keepBehind
    ) {
      return;
    }

    const lastPage = this.pages[this.pages.length - 1];

    if (!lastPage) {
      return;
    }

    this.loadingAfter = true;
    void this.loadAfter({
      url: lastPage.url,
      aspectRatio: lastPage.aspectRatio,
      displayNumber: lastPage.displayNumber,
    })
      .then((incoming) => {
        if (this.closed) {
          return;
        }

        if (incoming.length === 0 || this.appendPages(incoming) === 0) {
          this.noMoreAfter = true;
        }
      })
      .catch(() => {
        // Leave noMoreAfter unset so a later scroll can retry.
      })
      .finally(() => {
        this.loadingAfter = false;
      });
  }

  private appendPages(incoming: ViewerPage[]): number {
    const before = this.pages.length;

    for (const page of incoming) {
      this.appendPage(page);
    }

    const added = this.pages.length - before;

    if (added > 0) {
      this.renderWindow();
      this.queueLoadsForActivePage();
    }

    return added;
  }

  private maybeLoadBefore(): void {
    if (this.loadingBefore || this.noMoreBefore || !this.loadBefore || this.activeIndex > this.keepBehind) {
      return;
    }

    const firstPage = this.pages[0];

    if (!firstPage) {
      return;
    }

    this.loadingBefore = true;
    void this.loadBefore({
      url: firstPage.url,
      aspectRatio: firstPage.aspectRatio,
      displayNumber: firstPage.displayNumber,
    })
      .then((incoming) => {
        if (this.closed) {
          return;
        }

        if (incoming.length === 0 || this.prependPages(incoming) === 0) {
          this.noMoreBefore = true;
        }
      })
      .catch(() => {
        // Leave noMoreBefore unset so a later scroll can retry.
      })
      .finally(() => {
        this.loadingBefore = false;
      });
  }

  private prependPages(incoming: ViewerPage[]): number {
    const existing = new Set(this.pages.map((page) => page.url));
    const fresh = incoming.filter((page) => !existing.has(page.url));

    if (fresh.length === 0) {
      return 0;
    }

    const prepended: InternalPage[] = fresh.map((page) => ({
      ...page,
      aspectRatio: normalizedAspectRatio(page.aspectRatio),
      index: 0,
      kind: "page",
      state: "idle",
      imageUrl: null,
      width: null,
      height: null,
      node: null,
      frame: null,
    }));

    this.pages = [...prepended, ...this.pages];
    this.pages.forEach((page, index) => {
      page.index = index;

      if (page.node) {
        page.node.dataset.ehpeekIndex = String(index);
      }
    });
    this.endPageEntry.index = this.pages.length;
    this.activeIndex += fresh.length;

    const requeued = new Map<number, InternalPage>();
    for (const page of this.queue.values()) {
      requeued.set(page.index, page);
    }
    this.queue = requeued;

    this.renderWindow();
    this.queueLoadsForActivePage();
    return fresh.length;
  }

  private notifyActivePageChange(): void {
    const page = this.pages[this.activeIndex];

    if (page) {
      this.onActivePageChange?.(page, this.activeIndex);
    }
  }

  private queueLoadsForActivePage(): void {
    this.queueLoad(this.pages[this.activeIndex]);

    for (let offset = 1; offset <= this.preloadAhead; offset += 1) {
      const page = this.pages[this.activeIndex + offset];

      if (page) {
        this.queueLoad(page);
      }
    }
  }

  private queueLoad(page: InternalPage | undefined): void {
    if (!page || page.state !== "idle") {
      return;
    }

    this.queue.set(page.index, page);
    this.scheduleQueue();
  }

  private pruneQueue(): void {
    const min = this.activeIndex;
    const max = this.activeIndex + this.preloadAhead;

    for (const index of this.queue.keys()) {
      if (index < min || index > max) {
        this.queue.delete(index);
      }
    }
  }

  private scheduleQueue(): void {
    if (this.queueTimer !== null) {
      return;
    }

    this.queueTimer = window.setTimeout(() => {
      this.queueTimer = null;
      this.processQueue();
    }, 0);
  }

  private processQueue(): void {
    if (this.closed) {
      return;
    }

    while (this.activeLoadCount < this.currentMaxConcurrentLoads() && this.queue.size > 0) {
      const page = this.nextQueuedPage();

      if (!page) {
        return;
      }

      this.queue.delete(page.index);

      if (page.state !== "idle") {
        continue;
      }

      this.activeLoadCount += 1;
      void this.loadQueuedPage(page).finally(() => {
        this.activeLoadCount -= 1;
        this.processQueue();
      });
    }
  }

  private currentMaxConcurrentLoads(): number {
    return this.hasNearPageWork()
      ? Math.min(this.nearConcurrentLoads, this.farConcurrentLoads)
      : this.farConcurrentLoads;
  }

  private hasNearPageWork(): boolean {
    const nearEnd = Math.min(this.pages.length - 1, this.activeIndex + NEAR_LOAD_AHEAD);

    for (let index = this.activeIndex; index <= nearEnd; index += 1) {
      const page = this.pages[index];

      if (page?.state === "idle" || page?.state === "loading") {
        return true;
      }
    }

    return false;
  }

  private nextQueuedPage(): InternalPage | null {
    return (
      Array.from(this.queue.values()).sort((left, right) => {
        const leftPriority = left.index === this.activeIndex ? 0 : left.index - this.activeIndex;
        const rightPriority = right.index === this.activeIndex ? 0 : right.index - this.activeIndex;
        return leftPriority - rightPriority || left.index - right.index;
      })[0] ?? null
    );
  }

  private async loadQueuedPage(page: InternalPage): Promise<void> {
    page.state = "loading";

    try {
      const loaded = await this.loadPage(page, page.index);

      if (this.closed) {
        return;
      }

      page.state = "ready";
      page.imageUrl = loaded.imageUrl;
      page.width = positiveNumber(loaded.width);
      page.height = positiveNumber(loaded.height);

      if (loaded.nextPage) {
        this.appendPage(loaded.nextPage);
      } else if (page.index === this.pages.length - 1) {
        this.reachedEnd = true;
        this.endPageEntry.index = this.pages.length;
      }

      if (page.node) {
        this.applyPageSize(page);
        void this.installImage(page);
      }

      this.renderWindow();
      this.queueLoadsForActivePage();
    } catch (error) {
      page.state = "error";

      if (page.frame) {
        const message = error instanceof Error ? error.message : texts.errors.loadFailed;
        const errorBox = document.createElement("div");
        errorBox.className = "ehpeek-error";
        errorBox.textContent = `${texts.viewer.failedPrefix} ${this.displayNumberFor(page)}: ${message}`;
        page.frame.replaceChildren(errorBox);
      }
    }
  }

  private appendPage(page: ViewerPage): void {
    if (this.pages.some((existing) => existing.url === page.url)) {
      return;
    }

    this.pages.push({
      ...page,
      aspectRatio: normalizedAspectRatio(page.aspectRatio),
      index: this.pages.length,
      kind: "page",
      state: "idle",
      imageUrl: null,
      width: null,
      height: null,
      node: null,
      frame: null,
    });
    this.endPageEntry.index = this.pages.length;
    this.reachedEnd = false;
  }

  private async installImage(page: InternalPage): Promise<void> {
    if (page.kind !== "page" || !page.frame || !page.imageUrl) {
      return;
    }

    const expectedImageUrl = page.imageUrl;
    const image = document.createElement("img");
    image.className = "ehpeek-image";
    image.alt = `Page ${page.index + 1}`;
    image.decoding = "async";
    image.loading = "eager";
    image.draggable = false;
    image.setAttribute("fetchpriority", page.index === this.activeIndex ? "high" : "low");
    image.src = expectedImageUrl;

    if (page.width && page.height) {
      image.width = page.width;
      image.height = page.height;
    }

    try {
      await loadImage(image);
    } catch {
      return;
    }

    if (!this.closed && page.frame && page.imageUrl === expectedImageUrl) {
      page.frame.replaceChildren(image);
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
    // Some browsers reject decode for already-renderable images; load is enough.
  }
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

    .ehpeek-toolbar {
      position: fixed;
      top: 10px;
      right: 10px;
      z-index: 2;
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 8px;
      pointer-events: none;
    }

    .ehpeek-button {
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(15, 15, 15, 0.82);
      color: #f3f3f3;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.34);
      backdrop-filter: blur(8px);
    }

    .ehpeek-button {
      min-width: 36px;
      height: 36px;
      border-radius: 6px;
      cursor: pointer;
      font: 700 18px/1 system-ui, sans-serif;
      pointer-events: auto;
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
    .ehpeek-error,
    .ehpeek-end {
      display: flex;
      width: 100%;
      height: 100%;
      align-items: center;
      justify-content: center;
      color: rgba(245, 245, 245, 0.72);
      background: #151515;
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

    .ehpeek-end {
      cursor: pointer;
      color: rgba(245, 245, 245, 0.78);
      font-size: clamp(22px, 6vw, 34px);
      font-weight: 760;
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
      user-select: none;
    }

    #${VIEWER_ID}.ehpeek-paged .ehpeek-scroller {
      overflow: hidden;
      direction: rtl;
      touch-action: none;
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

    #${VIEWER_ID}.ehpeek-paged .ehpeek-frame {
      width: 100%;
      height: 100%;
    }

    #${VIEWER_ID}.ehpeek-paged .ehpeek-image {
      width: 100%;
      height: 100%;
    }
  `;
  document.head.append(style);
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
