// ==UserScript==
// @name         ehpeek: E-H/ExH viewer
// @namespace    ehpeek
// @version      0.1.0
// @description  A mobile-optimized E-H/ExH viewer
// @match        *://e-hentai.org/*
// @match        *://exhentai.org/*
// @run-at       document-end
// ==/UserScript==

"use strict";
(() => {
  // src/texts.json
  var texts_default = {
    description: "A mobile-optimized E-H/ExH viewer",
    viewer: {
      close: "Close",
      end: "End of gallery. Tap to exit.",
      failedPrefix: "Failed"
    },
    errors: {
      imageNotFound: "Image not found",
      loadFailed: "Load failed",
      imageLoadFailed: "Image load failed"
    }
  };

  // src/viewer.ts
  var VIEWER_ID = "ehpeek-reader";
  var STYLE_ID = "ehpeek-reader-style";
  var DEFAULT_KEEP_BEHIND = 5;
  var DEFAULT_RENDER_AHEAD = 10;
  var DEFAULT_PRELOAD_AHEAD = 10;
  var DEFAULT_NEAR_CONCURRENT_LOADS = 3;
  var DEFAULT_FAR_CONCURRENT_LOADS = 6;
  var NEAR_LOAD_AHEAD = 3;
  var FALLBACK_ASPECT_RATIO = 1.42;
  var activeViewer = null;
  function openFullscreenViewer(options) {
    activeViewer?.close();
    const viewer = new FullscreenViewer(options);
    activeViewer = viewer;
    viewer.open();
  }
  var FullscreenViewer = class {
    constructor(options) {
      this.overlay = null;
      this.scroller = null;
      this.strip = null;
      this.previousBodyOverflow = "";
      this.previousDocumentOverflow = "";
      this.previousBodyTouchAction = "";
      this.previousDocumentTouchAction = "";
      this.queue = /* @__PURE__ */ new Map();
      this.activeLoadCount = 0;
      this.queueTimer = null;
      this.scrollFrame = null;
      this.resizeFrame = null;
      this.openLocked = false;
      this.openUnlockTimer = null;
      this.closed = false;
      this.reachedEnd = false;
      this.onKeydown = (event) => {
        if (event.key !== "Escape") {
          return;
        }
        event.preventDefault();
        this.close();
      };
      this.onScroll = () => {
        if (this.openLocked) {
          return;
        }
        this.scheduleActivePageUpdate();
      };
      this.onResize = () => {
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
        frame: null
      }));
      this.activeIndex = clamp(options.startIndex, 0, Math.max(0, this.pages.length - 1));
      this.loadPage = options.loadPage;
      this.keepBehind = options.keepBehind ?? DEFAULT_KEEP_BEHIND;
      this.renderAhead = options.renderAhead ?? DEFAULT_RENDER_AHEAD;
      this.preloadAhead = options.preloadAhead ?? DEFAULT_PRELOAD_AHEAD;
      this.nearConcurrentLoads = options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS;
      this.farConcurrentLoads = options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS;
      this.onActivePageChange = options.onActivePageChange;
      this.endPageEntry = {
        url: "__ehpeek_end__",
        aspectRatio: 0.42,
        displayNumber: void 0,
        index: this.pages.length,
        kind: "end",
        state: "ready",
        imageUrl: null,
        width: null,
        height: null,
        node: null,
        frame: null
      };
    }
    open() {
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
      closeButton.title = texts_default.viewer.close;
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
      this.notifyActivePageChange();
      this.queueLoadsForActivePage();
      window.addEventListener("resize", this.onResize);
      document.addEventListener("keydown", this.onKeydown, true);
    }
    close() {
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
    lockOpenScroll() {
      this.openLocked = true;
      if (this.openUnlockTimer !== null) {
        window.clearTimeout(this.openUnlockTimer);
      }
      this.openUnlockTimer = window.setTimeout(() => {
        this.openLocked = false;
        this.openUnlockTimer = null;
      }, 450);
    }
    renderWindow() {
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
    mountPage(page) {
      if (!this.strip || page.node) {
        return;
      }
      const section = document.createElement("section");
      section.className = page.kind === "end" ? "ehpeek-page ehpeek-end-page" : "ehpeek-page";
      section.dataset.ehpeekIndex = String(page.index);
      const frame = document.createElement("div");
      frame.className = "ehpeek-frame";
      const placeholder = document.createElement("div");
      placeholder.className = page.kind === "end" ? "ehpeek-end" : page.state === "error" ? "ehpeek-error" : "ehpeek-placeholder";
      placeholder.textContent = page.kind === "end" ? texts_default.viewer.end : page.state === "error" ? `${texts_default.viewer.failedPrefix} ${this.displayNumberFor(page)}` : String(this.displayNumberFor(page));
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
    unmountPage(page) {
      if (!page.node) {
        return;
      }
      this.withLockedActivePosition(() => {
        page.node?.remove();
      });
      page.node = null;
      page.frame = null;
    }
    applyPageSize(page) {
      if (!page.node || !page.frame) {
        return;
      }
      const frameWidth = this.frameWidth();
      const frameHeight = page.kind === "end" ? Math.max(220, Math.round(window.innerHeight * 0.42)) : Math.ceil(frameWidth * this.aspectRatioFor(page));
      page.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`);
      page.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`);
      page.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
    }
    frameWidth() {
      return Math.max(1, this.scroller?.clientWidth || window.innerWidth || 1);
    }
    aspectRatioFor(page) {
      if (page.width && page.height && page.width > 0 && page.height > 0) {
        return page.height / page.width;
      }
      return normalizedAspectRatio(page.aspectRatio);
    }
    displayNumberFor(page) {
      return page.displayNumber && page.displayNumber > 0 ? page.displayNumber : page.index + 1;
    }
    nextMountedNodeAfter(index) {
      const nextPageNode = this.pages.slice(index + 1).find((candidate) => candidate.node)?.node ?? null;
      if (nextPageNode) {
        return nextPageNode;
      }
      return this.endPageEntry.index > index ? this.endPageEntry.node : null;
    }
    scrollToPage(index) {
      const page = this.pages[index];
      if (!this.scroller || !page?.node) {
        return;
      }
      this.scroller.scrollTop += page.node.getBoundingClientRect().top - this.scroller.getBoundingClientRect().top;
    }
    withLockedActivePosition(change) {
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
    scheduleActivePageUpdate() {
      if (this.scrollFrame !== null) {
        return;
      }
      this.scrollFrame = window.requestAnimationFrame(() => {
        this.scrollFrame = null;
        this.updateActivePageFromScroll();
      });
    }
    updateActivePageFromScroll() {
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
      this.notifyActivePageChange();
      this.queueLoadsForActivePage();
    }
    notifyActivePageChange() {
      const page = this.pages[this.activeIndex];
      if (page) {
        this.onActivePageChange?.(page, this.activeIndex);
      }
    }
    queueLoadsForActivePage() {
      this.queueLoad(this.pages[this.activeIndex]);
      for (let offset = 1; offset <= this.preloadAhead; offset += 1) {
        const page = this.pages[this.activeIndex + offset];
        if (page) {
          this.queueLoad(page);
        }
      }
    }
    queueLoad(page) {
      if (!page || page.state !== "idle") {
        return;
      }
      this.queue.set(page.index, page);
      this.scheduleQueue();
    }
    pruneQueue() {
      const min = this.activeIndex;
      const max = this.activeIndex + this.preloadAhead;
      for (const index of this.queue.keys()) {
        if (index < min || index > max) {
          this.queue.delete(index);
        }
      }
    }
    scheduleQueue() {
      if (this.queueTimer !== null) {
        return;
      }
      this.queueTimer = window.setTimeout(() => {
        this.queueTimer = null;
        this.processQueue();
      }, 0);
    }
    processQueue() {
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
    currentMaxConcurrentLoads() {
      return this.hasNearPageWork() ? Math.min(this.nearConcurrentLoads, this.farConcurrentLoads) : this.farConcurrentLoads;
    }
    hasNearPageWork() {
      const nearEnd = Math.min(this.pages.length - 1, this.activeIndex + NEAR_LOAD_AHEAD);
      for (let index = this.activeIndex; index <= nearEnd; index += 1) {
        const page = this.pages[index];
        if (page?.state === "idle" || page?.state === "loading") {
          return true;
        }
      }
      return false;
    }
    nextQueuedPage() {
      return Array.from(this.queue.values()).sort((left, right) => {
        const leftPriority = left.index === this.activeIndex ? 0 : left.index - this.activeIndex;
        const rightPriority = right.index === this.activeIndex ? 0 : right.index - this.activeIndex;
        return leftPriority - rightPriority || left.index - right.index;
      })[0] ?? null;
    }
    async loadQueuedPage(page) {
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
          const message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
          const errorBox = document.createElement("div");
          errorBox.className = "ehpeek-error";
          errorBox.textContent = `${texts_default.viewer.failedPrefix} ${this.displayNumberFor(page)}: ${message}`;
          page.frame.replaceChildren(errorBox);
        }
      }
    }
    appendPage(page) {
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
        frame: null
      });
      this.endPageEntry.index = this.pages.length;
      this.reachedEnd = false;
    }
    async installImage(page) {
      if (page.kind !== "page" || !page.frame || !page.imageUrl) {
        return;
      }
      const expectedImageUrl = page.imageUrl;
      const image = document.createElement("img");
      image.className = "ehpeek-image";
      image.alt = `Page ${page.index + 1}`;
      image.decoding = "async";
      image.loading = "eager";
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
  };
  async function loadImage(image) {
    if (image.complete && image.naturalWidth > 0) {
      return;
    }
    await new Promise((resolve, reject) => {
      image.addEventListener("load", () => resolve(), { once: true });
      image.addEventListener("error", () => reject(new Error(texts_default.errors.imageLoadFailed)), { once: true });
    });
    try {
      await image.decode();
    } catch {
    }
  }
  function ensureViewerStyle() {
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
    }
  `;
    document.head.append(style);
  }
  function normalizedAspectRatio(value) {
    return value && Number.isFinite(value) && value > 0 ? value : FALLBACK_ASPECT_RATIO;
  }
  function positiveNumber(value) {
    return value && Number.isFinite(value) && value > 0 ? value : null;
  }
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  // src/main.ts
  var REQUEST_TIMEOUT_MS = 3e4;
  function normalizeUrl(url, baseUrl = window.location.href) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return "";
    }
  }
  function isImagePageUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return /^\/s\/[^/]+\/\d+-\d+\/?$/i.test(parsed.pathname);
    } catch {
      return false;
    }
  }
  function imageAspectRatio(image) {
    const width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || "");
    const height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");
    return width > 0 && height > 0 ? height / width : 1.42;
  }
  function galleryPageNumber(url) {
    try {
      const parsed = new URL(url, window.location.href);
      const match = parsed.pathname.match(/\/(\d+)-(\d+)\/?$/);
      const pageNumber = Number(match?.[2] || "");
      return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : void 0;
    } catch {
      return void 0;
    }
  }
  function peekPageFromHash() {
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const page = Number(params.get("peek_page") || "");
    return Number.isFinite(page) && page > 0 ? page : null;
  }
  function updatePeekPageHash(pageNumber) {
    if (!pageNumber || pageNumber <= 0) {
      return;
    }
    const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const nextValue = String(pageNumber);
    if (params.get("peek_page") === nextValue) {
      return;
    }
    params.set("peek_page", nextValue);
    const nextUrl = `${window.location.pathname}${window.location.search}#${params.toString()}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }
  function collectGalleryPages(root = document, baseUrl = window.location.href) {
    const links = Array.from(
      root.querySelectorAll("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']")
    );
    const seen = /* @__PURE__ */ new Set();
    const pages = [];
    for (const link of links) {
      const url = normalizeUrl(link.getAttribute("href") || "", baseUrl);
      if (!url || !isImagePageUrl(url) || seen.has(url)) {
        continue;
      }
      seen.add(url);
      pages.push({
        url,
        aspectRatio: imageAspectRatio(link.querySelector("img")),
        displayNumber: galleryPageNumber(url)
      });
    }
    return pages;
  }
  function previewPageIndex() {
    const value = Number(new URL(window.location.href).searchParams.get("p") || "0");
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }
  function previewPageSize(pages) {
    const displayNumbers = pages.map((page) => page.displayNumber).filter((value) => typeof value === "number").sort((left, right) => left - right);
    if (displayNumbers.length === 0) {
      return 40;
    }
    const currentPreviewIndex = previewPageIndex();
    const firstDisplayNumber = displayNumbers[0];
    if (currentPreviewIndex > 0 && firstDisplayNumber > 1) {
      return Math.max(1, Math.round((firstDisplayNumber - 1) / currentPreviewIndex));
    }
    return Math.max(1, displayNumbers[displayNumbers.length - 1] - firstDisplayNumber + 1);
  }
  function previewUrlForGalleryPage(galleryPage, currentPages) {
    const url = new URL(window.location.href);
    const pageSize = previewPageSize(currentPages);
    const previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize));
    if (previewIndex === 0) {
      url.searchParams.delete("p");
    } else {
      url.searchParams.set("p", String(previewIndex));
    }
    url.hash = "";
    return url.href;
  }
  async function loadPreviewPageForGalleryPage(galleryPage, currentPages) {
    const previewUrl = previewUrlForGalleryPage(galleryPage, currentPages);
    if (previewUrl === normalizeUrl(window.location.pathname + window.location.search)) {
      return currentPages;
    }
    const html = await requestText(previewUrl);
    const doc = new DOMParser().parseFromString(html, "text/html");
    return collectGalleryPages(doc, previewUrl);
  }
  function findClickedImageLink(target) {
    const link = target instanceof Element ? target.closest("a[href]") : null;
    if (!(link instanceof HTMLAnchorElement) || !isImagePageUrl(link.href)) {
      return null;
    }
    if (link.querySelector("img") || link.closest("#gdt, .gdtm, .gdtl")) {
      return link;
    }
    return null;
  }
  async function requestText(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        credentials: "include",
        signal: controller.signal
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.text();
    } finally {
      window.clearTimeout(timeout);
    }
  }
  function firstImagePageHref(doc, selectors, baseUrl) {
    for (const selector of selectors) {
      const link = doc.querySelector(selector);
      const href = link ? normalizeUrl(link.getAttribute("href") || "", baseUrl) : "";
      if (href && isImagePageUrl(href)) {
        return href;
      }
    }
    return null;
  }
  function numericAttribute(element, attribute) {
    const value = Number(element?.getAttribute(attribute) || "");
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  async function loadEhImagePage(page) {
    const html = await requestText(page.url);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const image = doc.querySelector("img#img");
    const imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "";
    const imageUrl = imageSrc ? normalizeUrl(imageSrc, page.url) : "";
    if (!imageUrl) {
      throw new Error(texts_default.errors.imageNotFound);
    }
    const imageLink = image?.closest("a[href]") ?? null;
    const imageLinkUrl = imageLink instanceof HTMLAnchorElement ? normalizeUrl(imageLink.getAttribute("href") || "", page.url) : null;
    const nextPageUrl = firstImagePageHref(doc, ["a#next[href]", "#i3 a[href*='/s/']"], page.url) || (imageLinkUrl && isImagePageUrl(imageLinkUrl) ? imageLinkUrl : null) || firstImagePageHref(doc, ["a[href*='/s/']"], page.url);
    const width = numericAttribute(image, "width");
    const height = numericAttribute(image, "height");
    return {
      imageUrl,
      width,
      height,
      nextPage: nextPageUrl && nextPageUrl !== page.url ? {
        url: nextPageUrl,
        aspectRatio: width && height ? height / width : page.aspectRatio,
        displayNumber: galleryPageNumber(nextPageUrl)
      } : null
    };
  }
  async function openReader(startPageUrl) {
    let pages = collectGalleryPages();
    const startUrl = normalizeUrl(startPageUrl);
    const hashPage = peekPageFromHash();
    let startIndex = hashPage !== null ? pages.findIndex((page) => page.displayNumber === hashPage) : pages.findIndex((page) => page.url === startUrl);
    if (hashPage !== null && startIndex < 0) {
      pages = await loadPreviewPageForGalleryPage(hashPage, pages);
      startIndex = pages.findIndex((page) => page.displayNumber === hashPage);
    }
    if (startIndex < 0) {
      startIndex = 0;
      pages.unshift({ url: startUrl, aspectRatio: 1.42, displayNumber: galleryPageNumber(startUrl) });
    }
    openFullscreenViewer({
      pages,
      startIndex,
      keepBehind: 5,
      renderAhead: 10,
      preloadAhead: 10,
      nearConcurrentLoads: 3,
      farConcurrentLoads: 6,
      loadPage: loadEhImagePage,
      onActivePageChange: (page) => {
        updatePeekPageHash(page.displayNumber);
      }
    });
  }
  function onDocumentClick(event) {
    const link = findClickedImageLink(event.target);
    if (!link) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    void openReader(link.href);
  }
  async function openReaderFromHash() {
    const peekPage = peekPageFromHash();
    if (peekPage === null) {
      return;
    }
    const pages = collectGalleryPages();
    const page = pages.find((item) => item.displayNumber === peekPage) ?? pages[0];
    if (page) {
      await openReader(page.url);
    }
  }
  if (/^\/g\/\d+\/[^/]+\/?$/i.test(window.location.pathname)) {
    document.addEventListener("click", onDocumentClick, true);
    void openReaderFromHash();
  }
})();
