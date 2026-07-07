export type ViewerPage = {
  url: string;
  aspectRatio: number;
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
  keepBehind?: number;
  renderAhead?: number;
  preloadAhead?: number;
  maxConcurrentLoads?: number;
};

const VIEWER_ID = "ehpeek-reader";
const STYLE_ID = "ehpeek-reader-style";
const DEFAULT_KEEP_BEHIND = 5;
const DEFAULT_RENDER_AHEAD = 10;
const DEFAULT_PRELOAD_AHEAD = 10;
const DEFAULT_MAX_CONCURRENT_LOADS = 3;
const FALLBACK_ASPECT_RATIO = 1.42;

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
  private readonly keepBehind: number;
  private readonly renderAhead: number;
  private readonly preloadAhead: number;
  private readonly maxConcurrentLoads: number;
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

  constructor(options: FullscreenViewerOptions) {
    this.pages = options.pages.map((page, index) => ({
      ...page,
      aspectRatio: normalizedAspectRatio(page.aspectRatio),
      index,
      state: "idle",
      imageUrl: null,
      width: null,
      height: null,
      node: null,
      frame: null,
    }));
    this.activeIndex = clamp(options.startIndex, 0, Math.max(0, this.pages.length - 1));
    this.loadPage = options.loadPage;
    this.keepBehind = options.keepBehind ?? DEFAULT_KEEP_BEHIND;
    this.renderAhead = options.renderAhead ?? DEFAULT_RENDER_AHEAD;
    this.preloadAhead = options.preloadAhead ?? DEFAULT_PRELOAD_AHEAD;
    this.maxConcurrentLoads = options.maxConcurrentLoads ?? DEFAULT_MAX_CONCURRENT_LOADS;
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

    const toolbar = document.createElement("div");
    toolbar.className = "ehpeek-toolbar";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "ehpeek-button";
    closeButton.title = "Close";
    closeButton.textContent = "x";
    closeButton.addEventListener("click", () => this.close());

    const scroller = document.createElement("div");
    scroller.className = "ehpeek-scroller";
    scroller.addEventListener("scroll", this.onScroll, { passive: true });

    const strip = document.createElement("main");
    strip.className = "ehpeek-strip";

    scroller.append(strip);
    toolbar.append(closeButton);
    overlay.append(toolbar, scroller);
    document.body.append(overlay);

    this.overlay = overlay;
    this.scroller = scroller;
    this.strip = strip;

    this.lockOpenScroll();
    this.renderWindow();
    this.scrollToPage(this.activeIndex);
    this.queueLoadsForActivePage();
    window.addEventListener("resize", this.onResize);
    document.addEventListener("keydown", this.onKeydown, true);
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.queue.clear();
    this.scroller?.removeEventListener("scroll", this.onScroll);
    window.removeEventListener("resize", this.onResize);
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
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    this.close();
  };

  private readonly onScroll = (): void => {
    if (this.openLocked) {
      return;
    }

    this.scheduleActivePageUpdate();
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
    const lastIndex = Math.min(this.pages.length - 1, this.activeIndex + this.renderAhead);

    for (const page of this.pages) {
      if (page.index < firstIndex || page.index > lastIndex) {
        this.unmountPage(page);
      }
    }

    for (let index = firstIndex; index <= lastIndex; index += 1) {
      this.mountPage(this.pages[index]);
    }
  }

  private mountPage(page: InternalPage): void {
    if (!this.strip || page.node) {
      return;
    }

    const section = document.createElement("section");
    section.className = "ehpeek-page";
    section.dataset.ehpeekIndex = String(page.index);

    const frame = document.createElement("div");
    frame.className = "ehpeek-frame";

    const placeholder = document.createElement("div");
    placeholder.className = page.state === "error" ? "ehpeek-error" : "ehpeek-placeholder";
    placeholder.textContent = String(page.index + 1);
    frame.append(placeholder);
    section.append(frame);

    page.node = section;
    page.frame = frame;
    this.applyPageSize(page);

    const nextNode = this.pages.slice(page.index + 1).find((candidate) => candidate.node)?.node ?? null;
    this.withLockedActivePosition(() => {
      this.strip?.insertBefore(section, nextNode);
    });

    if (page.state === "ready" && page.imageUrl) {
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
    const frameHeight = Math.ceil(frameWidth * this.aspectRatioFor(page));
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

  private scrollToPage(index: number): void {
    const page = this.pages[index];

    if (!this.scroller || !page?.node) {
      return;
    }

    this.scroller.scrollTop += page.node.getBoundingClientRect().top - this.scroller.getBoundingClientRect().top;
  }

  private withLockedActivePosition(change: () => void): void {
    const activeNode = this.pages[this.activeIndex]?.node;
    const beforeTop = activeNode?.getBoundingClientRect().top ?? null;

    change();

    if (!this.scroller || beforeTop === null || !activeNode?.isConnected) {
      return;
    }

    const afterTop = activeNode.getBoundingClientRect().top;
    const delta = afterTop - beforeTop;

    if (Math.abs(delta) >= 0.5) {
      this.scroller.scrollTop += delta;
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
    const targetY = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
    let nextActiveIndex = this.activeIndex;

    for (const page of this.pages) {
      if (!page.node) {
        continue;
      }

      const rect = page.node.getBoundingClientRect();

      if (rect.top <= targetY && rect.bottom > targetY) {
        nextActiveIndex = page.index;
        break;
      }
    }

    if (nextActiveIndex === this.activeIndex) {
      return;
    }

    this.activeIndex = nextActiveIndex;
    this.renderWindow();
    this.pruneQueue();
    this.queueLoadsForActivePage();
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

    while (this.activeLoadCount < this.maxConcurrentLoads && this.queue.size > 0) {
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
      }

      if (page.node) {
        this.applyPageSize(page);
        this.installImage(page);
      }

      this.renderWindow();
      this.queueLoadsForActivePage();
    } catch (error) {
      page.state = "error";

      if (page.frame) {
        const message = error instanceof Error ? error.message : "load failed";
        const errorBox = document.createElement("div");
        errorBox.className = "ehpeek-error";
        errorBox.textContent = `Failed ${page.index + 1}: ${message}`;
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
      state: "idle",
      imageUrl: null,
      width: null,
      height: null,
      node: null,
      frame: null,
    });
  }

  private installImage(page: InternalPage): void {
    if (!page.frame || !page.imageUrl) {
      return;
    }

    const image = document.createElement("img");
    image.className = "ehpeek-image";
    image.alt = `Page ${page.index + 1}`;
    image.decoding = "async";
    image.loading = "eager";
    image.setAttribute("fetchpriority", page.index === this.activeIndex ? "high" : "low");
    image.src = page.imageUrl;

    if (page.width && page.height) {
      image.width = page.width;
      image.height = page.height;
    }

    page.frame.replaceChildren(image);
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
      left: 10px;
      z-index: 2;
      display: flex;
      align-items: center;
      justify-content: flex-end;
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
      width: min(100% - 24px, 720px);
      height: min(180px, 100%);
      align-items: center;
      justify-content: center;
      border: 1px solid rgba(255, 255, 255, 0.14);
      border-radius: 6px;
      color: #cfcfcf;
      background: #111;
      font-size: clamp(96px, 34vw, 180px);
      font-weight: 800;
      line-height: 1;
      text-align: center;
    }

    @media (min-width: 760px) {
      .ehpeek-placeholder {
        font-size: clamp(72px, 12vw, 150px);
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
