// ==UserScript==
// @name         ehpeek: E-H/ExH viewer
// @namespace    ehpeek
// @version      260708.0457
// @description  A mobile-optimized E-H/ExH viewer
// @match        *://e-hentai.org/*
// @match        *://exhentai.org/*
// @grant        GM_registerMenuCommand
// @grant        GM_unregisterMenuCommand
// @run-at       document-end
// @updateURL    https://github.com/yamipot/userscripts/raw/build-master/ehpeek.user.js
// @downloadURL  https://github.com/yamipot/userscripts/raw/build-master/ehpeek.user.js
// ==/UserScript==

"use strict";
(() => {
  // src/texts.json
  var texts_default = {
    description: "A mobile-optimized E-H/ExH viewer",
    viewer: {
      close: "Close",
      scrollMode: "Switch to scroll mode",
      pagedMode: "Switch to page-flip mode",
      readLeftToRight: "Read left to right",
      readRightToLeft: "Read right to left",
      rightTapPrevious: "Right tap goes to previous page",
      rightTapNext: "Right tap goes to next page",
      disableReader: "Disable Ehpeek Reader",
      end: "End of gallery. Tap to exit.",
      failedPrefix: "Failed"
    },
    settings: {
      openSettings: "Settings",
      menuLabel: "Ehpeek",
      readerOn: "Reader: on",
      readerOff: "Reader: off",
      enableReader: "Enable Ehpeek Reader",
      disableReader: "Disable Ehpeek Reader"
    },
    errors: {
      imageNotFound: "Image not found",
      loadFailed: "Load failed",
      imageLoadFailed: "Image load failed",
      previewPageSizeUnknown: "Cannot determine gallery preview page size"
    }
  };

  // src/viewer.ts
  var VIEW_MODE_KEY = "ehpeek:view-mode", READ_DIRECTION_KEY = "ehpeek:read-direction", RIGHT_TAP_ACTION_KEY = "ehpeek:right-tap-action", VIEWER_ID = "ehpeek-reader", STYLE_ID = "ehpeek-reader-style", DEFAULT_WINDOW_SIZE = 10, DEFAULT_NEAR_CONCURRENT_LOADS = 3, DEFAULT_FAR_CONCURRENT_LOADS = 6, NEAR_LOAD_AHEAD = 3, FALLBACK_ASPECT_RATIO = 1.42, PAGED_SWIPE_THRESHOLD = 24, PAGED_WHEEL_THRESHOLD = 8, PAGED_SMOOTH_SCROLL_MS = 180, PROGRESS_IDLE_COMMIT_MS = 1e3, SCROLL_FLING_MIN_VELOCITY = 0.35, SCROLL_FLING_STOP_VELOCITY = 0.02, SCROLL_FLING_DECAY = 45e-4, activeViewer = null;
  function openFullscreenViewer(options) {
    activeViewer?.close();
    let viewer = new FullscreenViewer(options);
    activeViewer = viewer, viewer.open();
  }
  var TwoTierImageQueue = class {
    constructor(loadPage, onLoaded, onError, nearConcurrentLoads, farConcurrentLoads) {
      this.loadPage = loadPage;
      this.onLoaded = onLoaded;
      this.onError = onError;
      this.nearConcurrentLoads = nearConcurrentLoads;
      this.farConcurrentLoads = farConcurrentLoads;
      this.nearQueue = /* @__PURE__ */ new Map();
      this.farQueue = /* @__PURE__ */ new Map();
      this.activeNearLoads = 0;
      this.activeTotalLoads = 0;
      this.timer = null;
      this.disposed = !1;
    }
    dispose() {
      this.disposed = !0, this.nearQueue.clear(), this.farQueue.clear(), this.timer !== null && (window.clearTimeout(this.timer), this.timer = null);
    }
    sync(slots, currentPageNumber, direction, windowNumbers, preloadWindowSize) {
      for (let queue of [this.nearQueue, this.farQueue])
        for (let displayNumber of queue.keys())
          windowNumbers.has(displayNumber) || queue.delete(displayNumber);
      for (let slot of slots) {
        let displayNumber = slot.x;
        windowNumbers.has(displayNumber) || this.invalidate(slot);
      }
      this.enqueue(slots.find((slot) => slot.x === currentPageNumber), "near");
      for (let offset = 1; offset <= preloadWindowSize; offset += 1) {
        let displayNumber = currentPageNumber + offset * direction, slot = slots.find((candidate) => candidate.x === displayNumber);
        slot && this.enqueue(slot, offset <= NEAR_LOAD_AHEAD ? "near" : "far");
      }
      this.schedule();
    }
    invalidate(slot) {
      slot.token += 1, this.nearQueue.delete(slot.x), this.farQueue.delete(slot.x), slot.state !== "idle" && (slot.state = "idle", slot.imageUrl = null, slot.width = null, slot.height = null);
    }
    enqueue(slot, tier) {
      if (!slot || slot.kind !== "page" || !slot.meta || slot.state !== "idle")
        return;
      let displayNumber = slot.x;
      if (tier === "near") {
        this.farQueue.delete(displayNumber), this.nearQueue.set(displayNumber, slot);
        return;
      }
      this.nearQueue.has(displayNumber) || this.farQueue.set(displayNumber, slot);
    }
    schedule() {
      this.timer !== null || this.disposed || (this.timer = window.setTimeout(() => {
        this.timer = null, this.process();
      }, 0));
    }
    process() {
      if (!this.disposed)
        for (; this.activeTotalLoads < this.currentConcurrency(); ) {
          let tier = this.nearQueue.size > 0 ? "near" : this.activeNearLoads > 0 ? null : "far";
          if (tier === null)
            return;
          let queue = tier === "near" ? this.nearQueue : this.farQueue, slot = queue.values().next().value;
          if (!slot)
            return;
          queue.delete(slot.x), slot.state === "idle" && this.start(slot, tier);
        }
    }
    currentConcurrency() {
      return this.nearQueue.size > 0 || this.activeNearLoads > 0 ? Math.min(this.nearConcurrentLoads, this.farConcurrentLoads) : this.farConcurrentLoads;
    }
    start(slot, tier) {
      if (!slot.meta)
        return;
      slot.state = "loading", slot.token += 1;
      let token = slot.token, meta = slot.meta;
      this.activeTotalLoads += 1, tier === "near" && (this.activeNearLoads += 1), this.loadPage(meta, slot.index).then((loaded) => {
        this.disposed || this.onLoaded(slot, loaded, token);
      }).catch((error) => {
        this.disposed || this.onError(slot, error, token);
      }).finally(() => {
        this.activeTotalLoads -= 1, tier === "near" && (this.activeNearLoads -= 1), this.process();
      });
    }
  }, FullscreenViewer = class {
    constructor(options) {
      this.direction = 1;
      this.mode = loadViewMode();
      this.readDirection = loadReadDirection();
      this.rightTapAction = loadRightTapAction();
      this.disableReaderButton = null;
      this.overlay = null;
      this.scroller = null;
      this.strip = null;
      this.toolbar = null;
      this.modeButton = null;
      this.readDirectionButton = null;
      this.rightTapButton = null;
      this.pageNumberLabel = null;
      this.progressInput = null;
      this.previousBodyOverflow = "";
      this.previousDocumentOverflow = "";
      this.previousBodyTouchAction = "";
      this.previousDocumentTouchAction = "";
      this.scrollFrame = null;
      this.resizeFrame = null;
      this.flingFrame = null;
      this.pagedScrollCommitTimer = null;
      this.progressCommitTimer = null;
      this.pendingProgressDisplayNumber = null;
      this.progressDragging = !1;
      this.dragging = !1;
      this.suppressNextClick = !1;
      this.dragPointerId = null;
      this.dragStartClientX = 0;
      this.dragStartClientY = 0;
      this.dragStartScroll = 0;
      this.dragLastClientY = 0;
      this.dragLastMoveTime = 0;
      this.dragVelocityY = 0;
      this.flingVelocityY = 0;
      this.flingLastFrameTime = 0;
      this.syncToken = 0;
      this.historyEntry = !1;
      this.closing = !1;
      this.closed = !1;
      this.onPopState = () => {
        this.historyEntry && (this.historyEntry = !1, this.finishClose(), this.onExit?.());
      };
      this.onImageLoaded = (slot, loaded, token) => {
        slot.token !== token || !this.windowNumbers().includes(slot.x) || (slot.state = "ready", slot.imageUrl = loaded.imageUrl, slot.width = positiveNumber(loaded.width), slot.height = positiveNumber(loaded.height), slot.node && (this.applySlotSize(slot), this.installImage(slot)));
      };
      this.onImageError = (slot, error, token) => {
        if (slot.token !== token || !slot.frame)
          return;
        slot.state = "error";
        let message = error instanceof Error ? error.message : texts_default.errors.loadFailed, errorBox = document.createElement("div");
        errorBox.className = "ehpeek-error", errorBox.textContent = `${texts_default.viewer.failedPrefix} ${slot.x}: ${message}`, slot.frame.replaceChildren(errorBox);
      };
      this.onKeydown = (event) => {
        if (event.key === "Escape") {
          event.preventDefault(), this.close();
          return;
        }
        if (event.key === "ArrowLeft") {
          event.preventDefault(), this.step(this.leftTapDelta());
          return;
        }
        event.key === "ArrowRight" && (event.preventDefault(), this.step(this.rightTapDelta()));
      };
      this.onWheel = (event) => {
        if (this.mode !== "paged" || (event.preventDefault(), this.dragging))
          return;
        let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        Math.abs(delta) >= PAGED_WHEEL_THRESHOLD && this.step(delta > 0 ? this.rightwardDelta() : this.leftwardDelta());
      };
      this.onPointerDown = (event) => {
        if (event.pointerType, event.button, event.buttons, this.mode, targetSummary(event.target), !this.scroller) {
          return;
        }
        if (event.pointerType === "mouse" && event.button !== 0) {
          event.button, event.buttons;
          return;
        }
        event.preventDefault(), this.cancelScrollFling(), this.dragging = !0, this.dragPointerId = event.pointerId, this.dragStartClientX = event.clientX, this.dragStartClientY = event.clientY, this.dragStartScroll = this.mode === "paged" ? this.scroller.scrollLeft : this.scroller.scrollTop, this.dragLastClientY = event.clientY, this.dragLastMoveTime = event.timeStamp, this.dragVelocityY = 0, event.pointerId, event.pointerType, this.dragStartClientX, this.dragStartClientY, this.dragStartScroll, this.scroller.setPointerCapture?.(event.pointerId), this.scroller.classList.add("ehpeek-scroller-dragging"), document.addEventListener("pointermove", this.onPointerMove, !0), document.addEventListener("pointerup", this.onPointerUp, !0), document.addEventListener("pointercancel", this.onPointerUp, !0);
      };
      this.onPointerMove = (event) => {
        if (!this.dragging || event.pointerId !== this.dragPointerId || !this.scroller) {
          event.pointerId, this.dragPointerId, event.pointerType, this.dragging, this.scroller;
          return;
        }
        if (this.mode === "paged")
          this.scroller.scrollLeft = this.dragStartScroll - (event.clientX - this.dragStartClientX);
        else {
          let nextScrollTop = this.dragStartScroll - (event.clientY - this.dragStartClientY), elapsed = Math.max(1, event.timeStamp - this.dragLastMoveTime);
          this.dragVelocityY = (event.clientY - this.dragLastClientY) / elapsed, this.dragLastClientY = event.clientY, this.dragLastMoveTime = event.timeStamp, event.pointerType, event.clientY, this.dragStartClientY, this.scroller.scrollTop, this.scroller.scrollTop = this.dragStartScroll - (event.clientY - this.dragStartClientY);
        }
        event.preventDefault();
      };
      this.onPointerUp = (event) => {
        if (!this.dragging || event.pointerId !== this.dragPointerId) {
          event.pointerId, this.dragPointerId, event.pointerType, this.dragging;
          return;
        }
        event.pointerType, this.scroller?.scrollTop, event.clientX - this.dragStartClientX, event.clientY - this.dragStartClientY, this.dragging = !1, this.dragPointerId = null, this.scroller?.releasePointerCapture?.(event.pointerId), this.scroller?.classList.remove("ehpeek-scroller-dragging"), document.removeEventListener("pointermove", this.onPointerMove, !0), document.removeEventListener("pointerup", this.onPointerUp, !0), document.removeEventListener("pointercancel", this.onPointerUp, !0);
        let dx = event.clientX - this.dragStartClientX, dy = event.clientY - this.dragStartClientY;
        if (this.mode !== "paged") {
          Math.abs(dx) >= 8 || Math.abs(dy) >= 8 ? (this.suppressNextClick = !0, this.setScrollTop(this.scroller?.scrollTop ?? 0), this.applyScrollFling(), this.updateCurrentFromScroll()) : (this.suppressNextClick = !0, this.toggleToolbar());
          return;
        }
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) {
          let width = this.scroller?.clientWidth || window.innerWidth || 1, zone = event.clientX / width;
          zone >= 1 / 3 && zone <= 2 / 3 ? this.toggleToolbar() : this.step(zone < 1 / 3 ? this.leftTapDelta() : this.rightTapDelta());
          return;
        }
        dx >= PAGED_SWIPE_THRESHOLD ? this.step(this.leftwardDelta()) : dx <= -PAGED_SWIPE_THRESHOLD ? this.step(this.rightwardDelta()) : this.scrollToCurrentPage("smooth");
      };
      this.onScroll = () => {
        if (this.dragging || this.mode === "paged")
          return;
        let scrollTop = this.clampedScrollTop(this.scroller?.scrollTop ?? 0);
        if (this.scroller && scrollTop !== this.scroller.scrollTop) {
          this.scroller.scrollTop = scrollTop;
          return;
        }
        this.scrollFrame === null && (this.scrollFrame = window.requestAnimationFrame(() => {
          this.scrollFrame = null, this.updateCurrentFromScroll();
        }));
      };
      this.onScrollFlingFrame = (time) => {
        if (!this.scroller || this.mode !== "scroll") {
          this.cancelScrollFling();
          return;
        }
        let elapsed = Math.min(32, Math.max(1, time - this.flingLastFrameTime));
        this.flingLastFrameTime = time;
        let previousScrollTop = this.scroller.scrollTop;
        if (this.setScrollTop(previousScrollTop + this.flingVelocityY * elapsed), this.scroller.scrollTop === previousScrollTop) {
          this.cancelScrollFling(), this.updateCurrentFromScroll();
          return;
        }
        if (this.flingVelocityY *= Math.exp(-SCROLL_FLING_DECAY * elapsed), Math.abs(this.flingVelocityY) < SCROLL_FLING_STOP_VELOCITY) {
          this.cancelScrollFling(), this.updateCurrentFromScroll();
          return;
        }
        this.flingFrame = window.requestAnimationFrame(this.onScrollFlingFrame);
      };
      this.onScrollerClick = (event) => {
        if (this.suppressNextClick) {
          this.suppressNextClick = !1, event.preventDefault();
          return;
        }
        this.mode !== "scroll" || targetIsToolbar(event.target) || this.toggleToolbar();
      };
      this.onProgressPointerDown = (event) => {
        this.progressDragging = !0, this.cancelProgressCommit(), event.stopPropagation();
      };
      this.onProgressInput = () => {
        let displayNumber = Number(this.progressInput?.value || "");
        if (!Number.isFinite(displayNumber) || displayNumber <= 0)
          return;
        this.progressDragging = !0;
        let target = clamp(Math.round(displayNumber), 1, this.maxDisplayNumber());
        this.pendingProgressDisplayNumber = target, this.previewProgressPage(target), this.cancelProgressCommit(), this.progressCommitTimer = window.setTimeout(() => this.onProgressCommit(), PROGRESS_IDLE_COMMIT_MS);
      };
      this.onProgressCommit = () => {
        if (!this.progressDragging && this.pendingProgressDisplayNumber === null)
          return;
        let displayNumber = this.pendingProgressDisplayNumber ?? Number(this.progressInput?.value || "");
        this.progressDragging = !1, this.pendingProgressDisplayNumber = null, this.cancelProgressCommit(), Number.isFinite(displayNumber) && displayNumber > 0 && this.setCurrentPageNumber(displayNumber, !0);
      };
      this.onResize = () => {
        this.resizeFrame === null && (this.resizeFrame = window.requestAnimationFrame(() => {
          this.resizeFrame = null;
          for (let slot of this.slots)
            this.applySlotSize(slot);
        }));
      };
      this.slots = options.pages.map((page, index) => toPageSlot(page, index));
      let startIndex = clamp(options.startIndex, 0, Math.max(0, this.slots.length - 1));
      this.currentPageNumber = this.slots[startIndex]?.x ?? 1, this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : void 0, this.windowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE, this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE, this.loadPages = options.loadPages, this.onExit = options.onExit, this.onActivePageChange = options.onActivePageChange, this.onDisableReader = options.onDisableReader, this.imageQueue = new TwoTierImageQueue(
        options.loadPage,
        this.onImageLoaded,
        this.onImageError,
        options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS,
        options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS
      );
    }
    open() {
      this.slots.length !== 0 && (document.getElementById(VIEWER_ID)?.remove(), ensureViewerStyle(), this.previousDocumentOverflow = document.documentElement.style.overflow, this.previousBodyOverflow = document.body.style.overflow, this.previousDocumentTouchAction = document.documentElement.style.touchAction, this.previousBodyTouchAction = document.body.style.touchAction, document.documentElement.style.overflow = "hidden", document.body.style.overflow = "hidden", document.documentElement.style.touchAction = "none", document.body.style.touchAction = "none", this.createDom(), this.onExit && (window.history.pushState({ ehpeekReader: !0 }, "", window.location.href), this.historyEntry = !0, window.addEventListener("popstate", this.onPopState)), window.addEventListener("resize", this.onResize), document.addEventListener("keydown", this.onKeydown, !0), this.syncAfterPageChange({ scrollIntoView: !0 }));
    }
    close() {
      if (!(this.closed || this.closing)) {
        if (this.historyEntry) {
          this.closing = !0, window.history.back();
          return;
        }
        this.finishClose();
      }
    }
    createDom() {
      let overlay = document.createElement("div");
      overlay.id = VIEWER_ID, overlay.classList.toggle("ehpeek-paged", this.mode === "paged"), overlay.classList.toggle("ehpeek-read-rtl", this.readDirection === "rtl"), overlay.classList.toggle("ehpeek-read-ltr", this.readDirection === "ltr");
      let topbar = document.createElement("div");
      topbar.className = "ehpeek-topbar", topbar.addEventListener("click", stopEvent), topbar.addEventListener("pointerdown", stopEvent), topbar.addEventListener("wheel", stopEvent);
      let readDirectionButton = document.createElement("button");
      readDirectionButton.type = "button", readDirectionButton.className = "ehpeek-button ehpeek-direction-button ehpeek-control-hidden", readDirectionButton.addEventListener("click", () => this.toggleReadDirection()), this.readDirectionButton = readDirectionButton;
      let rightTapButton = document.createElement("button");
      rightTapButton.type = "button", rightTapButton.className = "ehpeek-button ehpeek-direction-button ehpeek-control-hidden", rightTapButton.addEventListener("click", () => this.toggleRightTapAction()), this.rightTapButton = rightTapButton;
      let modeButton = document.createElement("button");
      modeButton.type = "button", modeButton.className = "ehpeek-button ehpeek-control-hidden", modeButton.addEventListener("click", () => this.setMode(this.mode === "paged" ? "scroll" : "paged")), this.modeButton = modeButton;
      let closeButton = document.createElement("button");
      closeButton.type = "button", closeButton.className = "ehpeek-button", closeButton.title = texts_default.viewer.close, closeButton.textContent = "X", closeButton.addEventListener("click", () => this.close());
      let disableReaderButton = document.createElement("button");
      disableReaderButton.type = "button", disableReaderButton.className = "ehpeek-button ehpeek-disable-button ehpeek-control-hidden", disableReaderButton.title = texts_default.viewer.disableReader, disableReaderButton.textContent = "off", disableReaderButton.addEventListener("click", () => {
        this.onDisableReader?.(), this.close();
      }), this.disableReaderButton = disableReaderButton;
      let actions = document.createElement("div");
      actions.className = "ehpeek-actions", actions.append(readDirectionButton, rightTapButton, modeButton, disableReaderButton, closeButton);
      let pageNumberLabel = document.createElement("div");
      pageNumberLabel.className = "ehpeek-pageno", this.pageNumberLabel = pageNumberLabel;
      let toolbar = document.createElement("div");
      toolbar.className = "ehpeek-progressbar ehpeek-toolbar-hidden", toolbar.addEventListener("click", stopEvent), toolbar.addEventListener("pointerdown", stopEvent), toolbar.addEventListener("wheel", stopEvent), this.toolbar = toolbar;
      let progressInput = document.createElement("input");
      progressInput.type = "range", progressInput.className = "ehpeek-progress", progressInput.min = "1", progressInput.step = "1", progressInput.addEventListener("pointerdown", this.onProgressPointerDown), progressInput.addEventListener("input", this.onProgressInput), progressInput.addEventListener("change", this.onProgressCommit), progressInput.addEventListener("pointerup", this.onProgressCommit), progressInput.addEventListener("pointercancel", this.onProgressCommit), this.progressInput = progressInput;
      let scroller = document.createElement("div");
      scroller.className = "ehpeek-scroller", scroller.addEventListener("click", this.onScrollerClick), scroller.addEventListener("scroll", this.onScroll, { passive: !0 }), scroller.addEventListener("wheel", this.onWheel, { passive: !1 }), scroller.addEventListener("pointerdown", this.onPointerDown), scroller.tabIndex = -1, this.scroller = scroller;
      let strip = document.createElement("main");
      strip.className = "ehpeek-strip", this.strip = strip, scroller.append(strip), topbar.append(actions), toolbar.append(progressInput), overlay.append(topbar, pageNumberLabel, toolbar, scroller), document.body.append(overlay), this.overlay = overlay, scroller.focus({ preventScroll: !0 }), this.updateModeButton(), this.updateReadDirectionButton(), this.updateRightTapButton(), this.updatePageNumber();
    }
    finishClose() {
      this.closed || (this.closed = !0, this.cancelProgressCommit(), this.imageQueue.dispose(), window.removeEventListener("resize", this.onResize), window.removeEventListener("popstate", this.onPopState), document.removeEventListener("keydown", this.onKeydown, !0), document.removeEventListener("pointermove", this.onPointerMove, !0), document.removeEventListener("pointerup", this.onPointerUp, !0), document.removeEventListener("pointercancel", this.onPointerUp, !0), this.overlay?.remove(), document.documentElement.style.overflow = this.previousDocumentOverflow, document.body.style.overflow = this.previousBodyOverflow, document.documentElement.style.touchAction = this.previousDocumentTouchAction, document.body.style.touchAction = this.previousBodyTouchAction, this.scrollFrame !== null && window.cancelAnimationFrame(this.scrollFrame), this.resizeFrame !== null && window.cancelAnimationFrame(this.resizeFrame), this.cancelScrollFling(), this.pagedScrollCommitTimer !== null && (window.clearTimeout(this.pagedScrollCommitTimer), this.pagedScrollCommitTimer = null), activeViewer === this && (activeViewer = null));
    }
    setCurrentPageNumber(pageNumber, scrollIntoView, scrollBehavior = "auto") {
      let target = clamp(Math.round(pageNumber), 1, this.maxDisplayNumber());
      target !== this.currentPageNumber && (this.direction = target > this.currentPageNumber ? 1 : -1, this.currentPageNumber = target), this.syncAfterPageChange({ scrollIntoView, scrollBehavior });
    }
    syncAfterPageChange(options) {
      let token = ++this.syncToken, numbers = this.windowNumbers(), missing = numbers.filter((number) => this.isRealDisplayNumber(number) && !this.loadedSlotFor(number));
      this.maintainContainers(numbers, []), this.maintainLoadQueue(), this.notifyActivePageChange(), options.scrollIntoView && this.scrollToCurrentPage(options.scrollBehavior), missing.length > 0 && this.loadMissingPages(missing, token);
    }
    rebuildForCurrentMode() {
      this.cancelScrollFling(), this.pagedScrollCommitTimer !== null && (window.clearTimeout(this.pagedScrollCommitTimer), this.pagedScrollCommitTimer = null);
      for (let slot of this.slots)
        slot.node?.remove(), slot.node = null, slot.frame = null;
      this.scroller && (this.scroller.scrollLeft = 0, this.scroller.scrollTop = 0), this.syncAfterPageChange({ scrollIntoView: !0 });
    }
    async loadMissingPages(displayNumbers, token) {
      let incoming;
      try {
        incoming = await this.loadPages?.(displayNumbers);
      } catch (error) {
        console.error("[ehpeek]", error);
        return;
      }
      this.closed || token !== this.syncToken || (this.maintainContainers(this.windowNumbers(), incoming ?? []), this.maintainLoadQueue(), this.notifyActivePageChange());
    }
    maintainContainers(numbers, incoming) {
      let oldSlots = new Map(this.slots.map((slot) => [slot.x, slot])), incomingPages = new Map(
        incoming.map((page) => [page.displayNumber ?? 0, page]).filter(([number]) => number > 0)
      ), nextSlots = [];
      for (let number of numbers) {
        let kind = this.slotKindFor(number), oldSlot = oldSlots.get(number), slot;
        if (oldSlot && oldSlot.kind === kind ? slot = oldSlot : slot = createSlot(number, kind), kind === "page") {
          let incomingPage = incomingPages.get(number);
          incomingPage && this.fillSlotMetadata(slot, incomingPage);
        } else
          this.clearSlotMetadata(slot);
        nextSlots.push(slot);
      }
      let nextSet = new Set(nextSlots);
      for (let slot of this.slots)
        nextSet.has(slot) || this.removeSlot(slot);
      this.slots = nextSlots, this.slots.forEach((slot, index) => {
        slot.index = index;
      }), this.renderContainers(), this.updatePageNumber();
    }
    maintainLoadQueue() {
      let loadableSlots = this.slots.filter((slot) => slot.kind === "page" && slot.meta), windowSet = new Set(loadableSlots.map((slot) => slot.x));
      this.imageQueue.sync(loadableSlots, this.currentPageNumber, this.direction, windowSet, this.preloadWindowSize);
    }
    renderContainers() {
      if (!this.strip)
        return;
      let keepNodes = new Set(this.slots.map((slot) => slot.node).filter(Boolean));
      for (let node of Array.from(this.strip.children))
        keepNodes.has(node) || node.remove();
      for (let slot of this.slots)
        slot.node && !slot.node.isConnected && (slot.node = null, slot.frame = null), this.mountSlot(slot), slot.node?.style.setProperty("order", String(slot.index)), slot.node?.setAttribute("data-ehpeek-index", String(slot.index));
    }
    mountSlot(slot) {
      if (!this.strip || slot.node) {
        slot.node && (this.applySlotSize(slot), this.refreshSlot(slot));
        return;
      }
      let section = document.createElement("section");
      section.className = "ehpeek-page", section.dataset.ehpeekIndex = String(slot.index), section.dataset.ehpeekDisplayNumber = String(slot.x);
      let frame = document.createElement("div");
      frame.className = "ehpeek-frame";
      let placeholder = document.createElement("div");
      placeholder.className = slot.state === "error" ? "ehpeek-error" : "ehpeek-placeholder", placeholder.classList.toggle("ehpeek-placeholder-end", slot.kind === "end"), placeholder.textContent = this.placeholderTextFor(slot), slot.kind === "end" && placeholder.addEventListener("click", () => this.close()), frame.append(placeholder), section.append(frame), slot.node = section, slot.frame = frame, this.applySlotSize(slot), this.strip.append(section), slot.state === "ready" && slot.imageUrl && this.installImage(slot);
    }
    fillSlotMetadata(slot, meta) {
      slot.meta = { ...meta, aspectRatio: normalizedAspectRatio(meta.aspectRatio), displayNumber: slot.x }, slot.kind = "page", slot.state = "idle", slot.imageUrl = null, slot.width = null, slot.height = null, slot.token += 1, this.refreshSlot(slot);
    }
    clearSlotMetadata(slot) {
      !slot.meta && slot.state === "ready" && !slot.imageUrl || (slot.meta = null, slot.state = "ready", slot.imageUrl = null, slot.width = null, slot.height = null, slot.token += 1, this.refreshSlot(slot));
    }
    refreshSlot(slot) {
      if (!slot.node || !slot.frame)
        return;
      if (slot.node.dataset.ehpeekDisplayNumber = String(slot.x), slot.state === "ready" && slot.imageUrl) {
        this.installImage(slot);
        return;
      }
      let placeholder = document.createElement("div");
      placeholder.className = slot.state === "error" ? "ehpeek-error" : "ehpeek-placeholder", placeholder.classList.toggle("ehpeek-placeholder-end", slot.kind === "end"), placeholder.textContent = this.placeholderTextFor(slot), slot.kind === "end" && placeholder.addEventListener("click", () => this.close()), slot.frame.replaceChildren(placeholder);
    }
    placeholderTextFor(slot) {
      return slot.state === "error" ? `${texts_default.viewer.failedPrefix} ${slot.x}` : slot.kind === "end" ? texts_default.viewer.end : slot.kind === "blank" ? "" : String(slot.x);
    }
    removeSlot(slot) {
      this.imageQueue.invalidate(slot), slot.node?.remove(), slot.node = null, slot.frame = null;
    }
    windowNumbers() {
      let numbers = [];
      for (let offset = -this.windowSize; offset <= this.windowSize; offset += 1)
        numbers.push(this.currentPageNumber + offset);
      return numbers;
    }
    slotFor(displayNumber) {
      return this.slots.find((slot) => slot.x === displayNumber);
    }
    loadedSlotFor(displayNumber) {
      return this.slots.find(
        (slot) => slot.kind === "page" && slot.meta !== null && slot.x === displayNumber
      );
    }
    maxDisplayNumber() {
      return this.totalPages ? this.totalPages + 1 : Number.MAX_SAFE_INTEGER;
    }
    isRealDisplayNumber(displayNumber) {
      return displayNumber >= 1 && (!this.totalPages || displayNumber <= this.totalPages);
    }
    slotKindFor(displayNumber) {
      return displayNumber < 1 ? "blank" : this.totalPages && displayNumber === this.totalPages + 1 ? "end" : this.totalPages && displayNumber > this.totalPages + 1 ? "blank" : "page";
    }
    step(delta) {
      if (this.mode === "paged") {
        this.animatePagedStep(delta);
        return;
      }
      this.setCurrentPageNumber(this.currentPageNumber + delta, !0);
    }
    animatePagedStep(delta) {
      let target = clamp(Math.round(this.currentPageNumber + delta), 1, this.maxDisplayNumber());
      if (target === this.currentPageNumber) {
        this.scrollToCurrentPage("smooth");
        return;
      }
      let slot = this.slotFor(target);
      if (!slot?.node) {
        this.setCurrentPageNumber(target, !0, "smooth");
        return;
      }
      this.direction = target > this.currentPageNumber ? 1 : -1, this.scrollToSlot(slot, "smooth"), this.pagedScrollCommitTimer !== null && window.clearTimeout(this.pagedScrollCommitTimer), this.pagedScrollCommitTimer = window.setTimeout(() => {
        this.pagedScrollCommitTimer = null, this.setCurrentPageNumber(target, !0);
      }, PAGED_SMOOTH_SCROLL_MS);
    }
    scrollToCurrentPage(behavior = "auto") {
      let slot = this.slotFor(this.currentPageNumber);
      slot && this.scrollToSlot(slot, behavior);
    }
    scrollToSlot(slot, behavior = "auto") {
      if (!this.scroller || !slot.node)
        return;
      let pageRect = slot.node.getBoundingClientRect(), scrollerRect = this.scroller.getBoundingClientRect(), delta = this.horizontal() ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
      this.addScrollPos(delta, behavior);
    }
    async installImage(slot) {
      if (!slot.frame || !slot.imageUrl)
        return;
      let imageUrl = slot.imageUrl, token = slot.token, image = document.createElement("img");
      image.className = "ehpeek-image", image.alt = `Page ${slot.x}`, image.decoding = "async", image.loading = "eager", image.draggable = !1, image.setAttribute("fetchpriority", slot.x === this.currentPageNumber ? "high" : "low"), image.src = imageUrl, slot.width && slot.height && (image.width = slot.width, image.height = slot.height);
      try {
        await loadImage(image);
      } catch {
        return;
      }
      !this.closed && slot.token === token && slot.frame && slot.imageUrl === imageUrl && slot.frame.replaceChildren(image);
    }
    applySlotSize(slot) {
      if (!slot.node || !slot.frame)
        return;
      let frameWidth = Math.max(1, this.scroller?.clientWidth || window.innerWidth || 1), frameHeight = Math.ceil(frameWidth * aspectRatioFor(slot));
      slot.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`), slot.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`), slot.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
    }
    updatePageNumber() {
      this.pageNumberLabel && (this.pageNumberLabel.textContent = this.pageNumberText(this.currentPageNumber), !(!this.progressInput || this.progressDragging) && (this.progressInput.max = String(Math.max(1, this.totalPages ? this.totalPages + 1 : this.currentPageNumber)), this.progressInput.value = String(this.currentPageNumber), this.updateProgressFill(this.currentPageNumber)));
    }
    notifyActivePageChange() {
      let page = this.loadedSlotFor(this.currentPageNumber);
      page && this.onActivePageChange?.(page.meta, page.index);
    }
    pageNumberText(displayNumber) {
      return this.totalPages && displayNumber === this.totalPages + 1 ? "End" : this.totalPages ? `${displayNumber} / ${this.totalPages}` : String(displayNumber);
    }
    applyScrollFling() {
      !this.scroller || Math.abs(this.dragVelocityY) < SCROLL_FLING_MIN_VELOCITY || (this.flingVelocityY = -this.dragVelocityY, this.flingLastFrameTime = performance.now(), this.flingFrame = window.requestAnimationFrame(this.onScrollFlingFrame));
    }
    cancelScrollFling() {
      this.flingFrame !== null && (window.cancelAnimationFrame(this.flingFrame), this.flingFrame = null), this.flingVelocityY = 0;
    }
    updateCurrentFromScroll() {
      if (!this.scroller)
        return;
      let scrollerRect = this.scroller.getBoundingClientRect(), target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
      for (let slot of this.slots) {
        if (!slot.node || slot.kind === "blank")
          continue;
        let rect = slot.node.getBoundingClientRect();
        if (rect.top <= target && rect.bottom > target) {
          let next = slot.x;
          next !== this.currentPageNumber && (this.direction = next > this.currentPageNumber ? 1 : -1, this.currentPageNumber = next, this.syncAfterPageChange({ scrollIntoView: !1 }));
          return;
        }
      }
    }
    updatePageNumberText(displayNumber) {
      this.pageNumberLabel && (this.pageNumberLabel.textContent = this.pageNumberText(displayNumber)), this.updateProgressFill(displayNumber);
    }
    updateProgressFill(displayNumber) {
      if (!this.progressInput)
        return;
      let min = Number(this.progressInput.min || "1"), max = Number(this.progressInput.max || "1"), value = clamp(displayNumber, min, max), progress = max > min ? (value - min) / (max - min) * 100 : 100;
      this.progressInput.style.setProperty("--ehpeek-progress-fill", `${progress}%`);
    }
    previewProgressPage(displayNumber) {
      let target = clamp(Math.round(displayNumber), 1, this.maxDisplayNumber());
      target !== this.currentPageNumber && (this.direction = target > this.currentPageNumber ? 1 : -1, this.currentPageNumber = target), ++this.syncToken, this.maintainContainers(this.windowNumbers(), []), this.scrollToCurrentPage(), this.updatePageNumberText(target);
    }
    cancelProgressCommit() {
      this.progressCommitTimer !== null && (window.clearTimeout(this.progressCommitTimer), this.progressCommitTimer = null);
    }
    setMode(mode) {
      mode !== this.mode && (this.mode = mode, saveViewMode(mode), this.overlay?.classList.toggle("ehpeek-paged", mode === "paged"), this.updateModeButton(), this.rebuildForCurrentMode());
    }
    toggleReadDirection() {
      this.readDirection = this.readDirection === "rtl" ? "ltr" : "rtl", saveReadDirection(this.readDirection), this.overlay?.classList.toggle("ehpeek-read-rtl", this.readDirection === "rtl"), this.overlay?.classList.toggle("ehpeek-read-ltr", this.readDirection === "ltr"), this.updateReadDirectionButton();
    }
    toggleRightTapAction() {
      this.rightTapAction = this.rightTapAction === "previous" ? "next" : "previous", saveRightTapAction(this.rightTapAction), this.updateRightTapButton();
    }
    updateModeButton() {
      if (!this.modeButton)
        return;
      let paged = this.mode === "paged";
      this.modeButton.textContent = paged ? "⇔" : "⇕", this.modeButton.title = paged ? texts_default.viewer.scrollMode : texts_default.viewer.pagedMode;
    }
    updateReadDirectionButton() {
      if (!this.readDirectionButton)
        return;
      let rtl = this.readDirection === "rtl";
      this.readDirectionButton.textContent = rtl ? "RL" : "LR", this.readDirectionButton.title = rtl ? texts_default.viewer.readLeftToRight : texts_default.viewer.readRightToLeft;
    }
    updateRightTapButton() {
      if (!this.rightTapButton)
        return;
      let previous = this.rightTapAction === "previous";
      this.rightTapButton.textContent = previous ? "R-" : "R+", this.rightTapButton.title = previous ? texts_default.viewer.rightTapNext : texts_default.viewer.rightTapPrevious;
    }
    toggleToolbar() {
      let hidden = this.toolbar?.classList.toggle("ehpeek-toolbar-hidden") ?? !1;
      this.overlay?.classList.toggle("ehpeek-toolbar-open", !hidden), this.modeButton?.classList.toggle("ehpeek-control-hidden", hidden), this.readDirectionButton?.classList.toggle("ehpeek-control-hidden", hidden), this.rightTapButton?.classList.toggle("ehpeek-control-hidden", hidden), this.disableReaderButton?.classList.toggle("ehpeek-control-hidden", hidden);
    }
    rightTapDelta() {
      return this.rightTapAction === "previous" ? -1 : 1;
    }
    leftTapDelta() {
      return -this.rightTapDelta();
    }
    rightwardDelta() {
      return this.readDirection === "ltr" ? 1 : -1;
    }
    leftwardDelta() {
      return -this.rightwardDelta();
    }
    horizontal() {
      return this.mode === "paged";
    }
    addScrollPos(delta, behavior = "auto") {
      this.scroller && (this.horizontal() ? this.scroller.scrollTo({ left: this.scroller.scrollLeft + delta, behavior }) : this.setScrollTop(this.scroller.scrollTop + delta));
    }
    setScrollTop(scrollTop) {
      this.scroller && (this.scroller.scrollTop = this.clampedScrollTop(scrollTop));
    }
    clampedScrollTop(scrollTop) {
      let bounds = this.scrollBounds();
      return bounds ? clamp(
        scrollTop,
        bounds.min ?? Number.NEGATIVE_INFINITY,
        bounds.max ?? Number.POSITIVE_INFINITY
      ) : scrollTop;
    }
    scrollBounds() {
      if (!this.scroller || this.mode !== "scroll")
        return null;
      let firstSlot = this.slotFor(1), lastSlot = this.totalPages ? this.slotFor(this.totalPages + 1) : void 0, scrollerRect = this.scroller.getBoundingClientRect(), bounds = {};
      if (firstSlot?.node) {
        let firstRect = firstSlot.node.getBoundingClientRect();
        bounds.min = this.scroller.scrollTop + firstRect.top - scrollerRect.top;
      }
      if (lastSlot?.node) {
        let lastRect = lastSlot.node.getBoundingClientRect(), lastTop = this.scroller.scrollTop + lastRect.top - scrollerRect.top;
        bounds.max = lastTop + lastRect.height - this.scroller.clientHeight;
      }
      return bounds.min === void 0 && bounds.max === void 0 ? null : (bounds.min !== void 0 && bounds.max !== void 0 && (bounds.max = Math.max(bounds.min, bounds.max)), bounds);
    }
  };
  async function loadImage(image) {
    if (!(image.complete && image.naturalWidth > 0)) {
      await new Promise((resolve, reject) => {
        image.addEventListener("load", () => resolve(), { once: !0 }), image.addEventListener("error", () => reject(new Error(texts_default.errors.imageLoadFailed)), { once: !0 });
      });
      try {
        await image.decode();
      } catch {
      }
    }
  }
  function toPageSlot(page, index) {
    let x = typeof page.displayNumber == "number" && Number.isFinite(page.displayNumber) ? page.displayNumber : index + 1;
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
      token: 0
    };
  }
  function createSlot(x, kind) {
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
      token: 0
    };
  }
  function aspectRatioFor(slot) {
    return slot.width && slot.height && slot.width > 0 && slot.height > 0 ? slot.height / slot.width : normalizedAspectRatio(slot.meta?.aspectRatio);
  }
  function targetIsToolbar(target) {
    return target instanceof Element && !!target.closest(".ehpeek-topbar, .ehpeek-progressbar");
  }
  function targetSummary(target) {
    if (!(target instanceof Element))
      return String(target);
    let id = target.id ? `#${target.id}` : "", className = typeof target.className == "string" && target.className ? `.${target.className.replace(/\s+/g, ".")}` : "";
    return `${target.tagName.toLowerCase()}${id}${className}`;
  }
  function loadViewMode() {
    try {
      return window.localStorage.getItem(VIEW_MODE_KEY) === "paged" ? "paged" : "scroll";
    } catch {
      return "scroll";
    }
  }
  function saveViewMode(mode) {
    try {
      window.localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
    }
  }
  function loadReadDirection() {
    try {
      return window.localStorage.getItem(READ_DIRECTION_KEY) === "ltr" ? "ltr" : "rtl";
    } catch {
      return "rtl";
    }
  }
  function saveReadDirection(direction) {
    try {
      window.localStorage.setItem(READ_DIRECTION_KEY, direction);
    } catch {
    }
  }
  function loadRightTapAction() {
    try {
      return window.localStorage.getItem(RIGHT_TAP_ACTION_KEY) === "next" ? "next" : "previous";
    } catch {
      return "previous";
    }
  }
  function saveRightTapAction(action) {
    try {
      window.localStorage.setItem(RIGHT_TAP_ACTION_KEY, action);
    } catch {
    }
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
  function stopEvent(event) {
    event.stopPropagation();
  }
  function ensureViewerStyle() {
    if (document.getElementById(STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = STYLE_ID, style.textContent = `
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
  `, document.head.append(style);
  }

  // src/main.ts
  var REQUEST_TIMEOUT_MS = 3e4, PREVIEW_CACHE_LIMIT = 10, READER_ENABLED_KEY = "ehpeek:reader-enabled", LEGACY_THUMBNAIL_VIEWER_ENABLED_KEY = "ehpeek:thumbnail-viewer-enabled", SETTINGS_ROOT_ID = "ehpeek-settings-root", SETTINGS_TRIGGER_ID = "ehpeek-settings-trigger", SETTINGS_MENU_ID = "ehpeek-settings-menu", SETTINGS_READER_ID = "ehpeek-reader-setting", SETTINGS_STYLE_ID = "ehpeek-settings-style", menuCommandId = null;
  function readerEnabled() {
    try {
      let value = window.localStorage.getItem(READER_ENABLED_KEY);
      return value !== null ? value !== "false" : window.localStorage.getItem(LEGACY_THUMBNAIL_VIEWER_ENABLED_KEY) !== "false";
    } catch {
      return !0;
    }
  }
  function setReaderEnabled(enabled) {
    try {
      window.localStorage.setItem(READER_ENABLED_KEY, String(enabled)), window.localStorage.removeItem(LEGACY_THUMBNAIL_VIEWER_ENABLED_KEY);
    } catch {
    }
    updateSettingsMenu(), registerUserscriptMenu();
  }
  function toggleReader() {
    setReaderEnabled(!readerEnabled());
  }
  function registerUserscriptMenu() {
    typeof GM_registerMenuCommand == "function" && (menuCommandId !== null && typeof GM_unregisterMenuCommand == "function" && (GM_unregisterMenuCommand(menuCommandId), menuCommandId = null), menuCommandId = GM_registerMenuCommand(
      texts_default.settings.openSettings,
      openSettingsMenu
    ));
  }
  function clamp2(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
  function normalizeUrl(url, baseUrl = window.location.href) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return "";
    }
  }
  function isImagePageUrl(url) {
    try {
      let parsed = new URL(url, window.location.href);
      return /^\/s\/[^/]+\/\d+-\d+\/?$/i.test(parsed.pathname);
    } catch {
      return !1;
    }
  }
  function imageAspectRatio(image) {
    let width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || ""), height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");
    return width > 0 && height > 0 ? height / width : 1.42;
  }
  function galleryPageNumber(url) {
    try {
      let match = new URL(url, window.location.href).pathname.match(/\/(\d+)-(\d+)\/?$/), pageNumber = Number(match?.[2] || "");
      return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : void 0;
    } catch {
      return;
    }
  }
  function peekPageFromHash() {
    let params = new URLSearchParams(window.location.hash.replace(/^#/, "")), page = Number(params.get("peek_page") || "");
    return Number.isFinite(page) && page > 0 ? page : null;
  }
  function updatePeekLocation(pageNumber, pageSize) {
    if (!pageNumber || pageNumber <= 0)
      return;
    let url = new URL(window.location.href), params = new URLSearchParams(window.location.hash.replace(/^#/, "")), nextValue = String(pageNumber), previewIndex = previewPageIndexForGalleryPage(pageNumber, pageSize), changed = !1;
    previewIndex === 0 ? url.searchParams.has("p") && (url.searchParams.delete("p"), changed = !0) : url.searchParams.get("p") !== String(previewIndex) && (url.searchParams.set("p", String(previewIndex)), changed = !0), params.get("peek_page") !== nextValue && (params.set("peek_page", nextValue), changed = !0), changed && (url.hash = params.toString(), window.history.replaceState(window.history.state, "", url.href));
  }
  function collectGalleryPages(root = document, baseUrl = window.location.href) {
    let links = Array.from(
      root.querySelectorAll("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']")
    ), seen = /* @__PURE__ */ new Set(), pages = [];
    for (let link of links) {
      let url = normalizeUrl(link.getAttribute("href") || "", baseUrl);
      !url || !isImagePageUrl(url) || seen.has(url) || (seen.add(url), pages.push({
        url,
        aspectRatio: imageAspectRatio(link.querySelector("img")),
        displayNumber: galleryPageNumber(url)
      }));
    }
    return pages.sort((left, right) => (left.displayNumber ?? Number.MAX_SAFE_INTEGER) - (right.displayNumber ?? Number.MAX_SAFE_INTEGER));
  }
  function previewPageIndex() {
    let value = Number(new URL(window.location.href).searchParams.get("p") || "0");
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }
  function readShowingRange(root = document) {
    let match = (root.querySelector(".gpc")?.textContent ?? "").match(/([\d,]+)\s*-\s*([\d,]+)\s+of\s+([\d,]+)/i);
    if (!match)
      return null;
    let start = Number(match[1].replace(/,/g, "")), end = Number(match[2].replace(/,/g, "")), total = Number(match[3].replace(/,/g, ""));
    return [start, end, total].every((value) => Number.isFinite(value) && value > 0) ? { start, end, total } : null;
  }
  function computePreviewPageSize(root = document) {
    let range = readShowingRange(root);
    if (!range)
      throw new Error(texts_default.errors.previewPageSizeUnknown);
    let currentPageCount = range.end - range.start + 1;
    if (range.end < range.total)
      return currentPageCount;
    let lastPreviewIndex = maxPreviewPageIndex(root);
    if (lastPreviewIndex === null || lastPreviewIndex <= 0)
      return currentPageCount;
    let fullPageCount = (range.total - currentPageCount) / lastPreviewIndex;
    if (!Number.isInteger(fullPageCount) || fullPageCount <= 0)
      throw new Error(texts_default.errors.previewPageSizeUnknown);
    return fullPageCount;
  }
  function maxPreviewPageIndex(root = document, baseUrl = window.location.href) {
    let indexes = Array.from(root.querySelectorAll("a[href*='?p='], a[href*='&p=']")).map((link) => {
      try {
        return Number(new URL(link.getAttribute("href") || "", baseUrl).searchParams.get("p") || "");
      } catch {
        return NaN;
      }
    }).filter((value) => Number.isFinite(value) && value >= 0);
    return indexes.length === 0 ? null : Math.max(...indexes);
  }
  function previewUrlForIndex(previewIndex) {
    let url = new URL(window.location.href);
    return previewIndex <= 0 ? url.searchParams.delete("p") : url.searchParams.set("p", String(previewIndex)), url.hash = "", url.href;
  }
  function previewPageIndexForGalleryPage(galleryPage, pageSize) {
    let previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize)), maxPreviewIndex = maxPreviewPageIndex();
    return maxPreviewIndex === null ? previewIndex : Math.min(previewIndex, maxPreviewIndex);
  }
  async function collectPreviewPage(index, landingIndex, landingPages) {
    if (index === landingIndex)
      return landingPages;
    let previewUrl = previewUrlForIndex(index), html = await requestText(previewUrl), doc = new DOMParser().parseFromString(html, "text/html");
    return collectGalleryPages(doc, previewUrl);
  }
  function findClickedImageLink(target) {
    let link = target instanceof Element ? target.closest("a[href]") : null;
    return !(link instanceof HTMLAnchorElement) || !isImagePageUrl(link.href) ? null : link.querySelector("img") || link.closest("#gdt, .gdtm, .gdtl") ? link : null;
  }
  async function requestText(url) {
    let controller = new AbortController(), timeout = window.setTimeout(() => {
      controller.abort();
    }, REQUEST_TIMEOUT_MS);
    try {
      let response = await fetch(url, {
        credentials: "include",
        signal: controller.signal
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } finally {
      window.clearTimeout(timeout);
    }
  }
  function numericAttribute(element, attribute) {
    let value = Number(element?.getAttribute(attribute) || "");
    return Number.isFinite(value) && value > 0 ? value : null;
  }
  async function loadEhImagePage(page) {
    let html = await requestText(page.url), image = new DOMParser().parseFromString(html, "text/html").querySelector("img#img"), imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "", imageUrl = imageSrc ? normalizeUrl(imageSrc, page.url) : "";
    if (!imageUrl)
      throw new Error(texts_default.errors.imageNotFound);
    let width = numericAttribute(image, "width"), height = numericAttribute(image, "height");
    return {
      imageUrl,
      width,
      height
    };
  }
  var EhGalleryPageProvider = class {
    constructor(landingIndex, landingPages, pageSize, maxPreviewIndex) {
      this.landingIndex = landingIndex;
      this.landingPages = landingPages;
      this.pageSize = pageSize;
      this.maxPreviewIndex = maxPreviewIndex;
      this.previewCache = /* @__PURE__ */ new Map();
      this.previewCache.set(landingIndex, landingPages);
    }
    previewIndexForPage(displayNumber) {
      let previewIndex = Math.max(0, Math.floor((displayNumber - 1) / this.pageSize));
      return this.maxPreviewIndex === null ? previewIndex : Math.min(previewIndex, this.maxPreviewIndex);
    }
    async loadDisplayPages(displayNumbers) {
      let previewIndexes = Array.from(new Set(displayNumbers.map((displayNumber) => this.previewIndexForPage(displayNumber)))).filter(
        (value) => value >= 0 && (this.maxPreviewIndex === null || value <= this.maxPreviewIndex)
      ), requested = new Set(displayNumbers), chunks = await Promise.all(previewIndexes.map((index) => this.cachedPreviewPage(index))), byUrl = /* @__PURE__ */ new Map();
      for (let page of chunks.flat())
        page.displayNumber && requested.has(page.displayNumber) && byUrl.set(page.url, page);
      return Array.from(byUrl.values()).sort(
        (left, right) => (left.displayNumber ?? Number.MAX_SAFE_INTEGER) - (right.displayNumber ?? Number.MAX_SAFE_INTEGER)
      );
    }
    displayWindowAround(displayNumber) {
      let numbers = [];
      for (let offset = -10; offset <= 10; offset += 1) {
        let value = displayNumber + offset;
        value > 0 && numbers.push(value);
      }
      return numbers;
    }
    async cachedPreviewPage(index) {
      let boundedIndex = this.maxPreviewIndex === null ? index : Math.min(index, this.maxPreviewIndex);
      if (boundedIndex < 0)
        return [];
      let cached = this.previewCache.get(boundedIndex);
      if (cached)
        return this.previewCache.delete(boundedIndex), this.previewCache.set(boundedIndex, cached), cached;
      let pages = await collectPreviewPage(boundedIndex, this.landingIndex, this.landingPages);
      for (this.previewCache.set(boundedIndex, pages); this.previewCache.size > PREVIEW_CACHE_LIMIT; ) {
        let oldest = this.previewCache.keys().next().value;
        if (oldest === void 0)
          break;
        this.previewCache.delete(oldest);
      }
      return pages;
    }
  };
  async function openReader(startPageUrl) {
    let landingIndex = previewPageIndex(), landingPages = collectGalleryPages(), pageSize = computePreviewPageSize(), maxPreviewIndex = maxPreviewPageIndex(), provider = new EhGalleryPageProvider(landingIndex, landingPages, pageSize, maxPreviewIndex), startUrl = normalizeUrl(startPageUrl), hashPage = peekPageFromHash(), startDisplayNumber = hashPage ?? galleryPageNumber(startUrl), pages = startDisplayNumber ? await provider.loadDisplayPages(provider.displayWindowAround(startDisplayNumber)) : landingPages, startIndex = hashPage !== null ? pages.findIndex((page) => page.displayNumber === hashPage) : pages.findIndex((page) => page.url === startUrl);
    startIndex < 0 && (startIndex = 0, pages = [{ url: startUrl, aspectRatio: 1.42, displayNumber: galleryPageNumber(startUrl) }, ...pages].sort(
      (left, right) => (left.displayNumber ?? 0) - (right.displayNumber ?? 0)
    ), startIndex = pages.findIndex((page) => page.url === startUrl));
    let lastDisplayNumber = hashPage ?? galleryPageNumber(startUrl);
    openFullscreenViewer({
      pages,
      startIndex,
      renderWindowSize: 10,
      preloadWindowSize: 10,
      nearConcurrentLoads: 3,
      farConcurrentLoads: 6,
      totalPages: readShowingRange()?.total,
      loadPage: loadEhImagePage,
      loadPages: (displayNumbers) => provider.loadDisplayPages(displayNumbers),
      onActivePageChange: (page) => {
        page.displayNumber && (lastDisplayNumber = page.displayNumber), updatePeekLocation(page.displayNumber, pageSize);
      },
      onExit: () => {
        let exitIndex = lastDisplayNumber ? provider.previewIndexForPage(lastDisplayNumber) : landingIndex, galleryUrl = previewUrlForIndex(exitIndex);
        exitIndex === landingIndex ? window.history.replaceState(window.history.state, "", galleryUrl) : window.location.replace(galleryUrl);
      },
      onDisableReader: () => setReaderEnabled(!1)
    });
  }
  function reportOpenError(error) {
    let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
    console.error("[ehpeek]", error), window.alert(message);
  }
  function ensureSettingsStyle() {
    if (document.getElementById(SETTINGS_STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = SETTINGS_STYLE_ID, style.textContent = `
    #${SETTINGS_MENU_ID} {
      position: fixed;
      z-index: 2147483646;
      min-width: 190px;
      padding: 6px;
      border: 1px solid currentColor;
      border-radius: 4px;
      background: Canvas;
      color: CanvasText;
      box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24);
    }

    #${SETTINGS_MENU_ID}[hidden] {
      display: none;
    }

    #${SETTINGS_READER_ID} {
      display: flex;
      width: 100%;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 6px 8px;
      border: 0;
      border-radius: 3px;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
      text-align: left;
    }

    #${SETTINGS_READER_ID}:hover {
      background: color-mix(in srgb, currentColor 10%, transparent);
    }

    #${SETTINGS_READER_ID}::after {
      content: "";
      flex: 0 0 auto;
      width: 10px;
      height: 10px;
      border-radius: 999px;
      background: #2faa44;
    }

    #${SETTINGS_READER_ID}[aria-checked="false"]::after {
      background: #999;
    }
  `, document.head.append(style);
  }
  function positionSettingsMenu() {
    let trigger = document.getElementById(SETTINGS_TRIGGER_ID), menu = document.getElementById(SETTINGS_MENU_ID);
    if (!trigger || !menu || menu.hidden)
      return;
    let gap = 4, edgePadding = 8, triggerRect = trigger.getBoundingClientRect(), menuRect = menu.getBoundingClientRect(), left = clamp2(triggerRect.right - menuRect.width, edgePadding, window.innerWidth - menuRect.width - edgePadding), top = clamp2(triggerRect.bottom + gap, edgePadding, window.innerHeight - menuRect.height - edgePadding);
    menu.style.left = `${left}px`, menu.style.top = `${top}px`;
  }
  function updateSettingsMenu() {
    let trigger = document.getElementById(SETTINGS_TRIGGER_ID), setting = document.getElementById(SETTINGS_READER_ID), menu = document.getElementById(SETTINGS_MENU_ID);
    trigger && (trigger.textContent = texts_default.settings.menuLabel, trigger.setAttribute("aria-expanded", String(menu ? !menu.hidden : !1)), trigger.setAttribute("aria-haspopup", "menu"));
    let enabled = readerEnabled();
    setting && (setting.setAttribute("aria-checked", String(enabled)), setting.textContent = enabled ? texts_default.settings.readerOn : texts_default.settings.readerOff, setting.title = enabled ? texts_default.settings.disableReader : texts_default.settings.enableReader), positionSettingsMenu();
  }
  function closeSettingsMenu() {
    let menu = document.getElementById(SETTINGS_MENU_ID);
    !menu || menu.hidden || (menu.hidden = !0, updateSettingsMenu());
  }
  function toggleSettingsMenu() {
    let menu = document.getElementById(SETTINGS_MENU_ID);
    if (!menu)
      return;
    let nextHidden = !menu.hidden;
    menu.hidden = nextHidden, updateSettingsMenu(), nextHidden || positionSettingsMenu();
  }
  function openSettingsMenu() {
    document.getElementById(SETTINGS_ROOT_ID) || installSettingsMenu();
    let menu = document.getElementById(SETTINGS_MENU_ID);
    menu && (menu.hidden = !1, updateSettingsMenu(), positionSettingsMenu());
  }
  function installSettingsMenu() {
    if (document.getElementById(SETTINGS_ROOT_ID)) {
      updateSettingsMenu();
      return;
    }
    let thumbnailContainer = document.querySelector("#gdt"), titleContainer = document.querySelector("#gd2, h1"), topNav = document.querySelector("#nb"), anchor = thumbnailContainer ?? titleContainer;
    if (!topNav && !anchor?.parentElement)
      return;
    ensureSettingsStyle();
    let root = document.createElement(topNav ? "div" : "span");
    root.id = SETTINGS_ROOT_ID;
    let trigger = topNav ? document.createElement("a") : document.createElement("button");
    trigger.id = SETTINGS_TRIGGER_ID, trigger instanceof HTMLAnchorElement ? trigger.href = "#" : trigger.type = "button", trigger.addEventListener("click", (event) => {
      event.preventDefault(), event.stopPropagation(), toggleSettingsMenu();
    });
    let menu = document.createElement("div");
    menu.id = SETTINGS_MENU_ID, menu.hidden = !0;
    let readerSetting = document.createElement("button");
    if (readerSetting.id = SETTINGS_READER_ID, readerSetting.type = "button", readerSetting.setAttribute("role", "switch"), readerSetting.addEventListener("click", (event) => {
      event.stopPropagation(), toggleReader();
    }), menu.append(readerSetting), root.append(trigger, menu), topNav)
      topNav.append(root);
    else {
      let wrapper = document.createElement("div");
      wrapper.style.textAlign = "right", wrapper.append(root), thumbnailContainer ? anchor?.parentElement?.insertBefore(wrapper, anchor) : anchor?.insertAdjacentElement("afterend", wrapper);
    }
    document.addEventListener("click", (event) => {
      event.target instanceof Element && event.target.closest(`#${SETTINGS_ROOT_ID}`) || closeSettingsMenu();
    }), document.addEventListener("keydown", (event) => {
      event.key === "Escape" && closeSettingsMenu();
    }), window.addEventListener("resize", positionSettingsMenu), window.addEventListener("scroll", positionSettingsMenu, !0), updateSettingsMenu();
  }
  function onDocumentClick(event) {
    if (!readerEnabled())
      return;
    let link = findClickedImageLink(event.target);
    link && (event.preventDefault(), event.stopPropagation(), openReader(link.href).catch(reportOpenError));
  }
  async function openReaderFromHash() {
    let peekPage = peekPageFromHash();
    if (peekPage === null)
      return;
    let pages = collectGalleryPages(), page = pages.find((item) => item.displayNumber === peekPage) ?? pages[0];
    page && await openReader(page.url).catch(reportOpenError);
  }
  registerUserscriptMenu();
  /^\/g\/\d+\/[^/]+\/?$/i.test(window.location.pathname) && (installSettingsMenu(), document.addEventListener("click", onDocumentClick, !0), readerEnabled() && openReaderFromHash());
})();
