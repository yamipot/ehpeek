// ==UserScript==
// @name         ehpeek: E-H/ExH viewer
// @namespace    ehpeek
// @version      260710.0325
// @description  A mobile-optimized E-H/ExH viewer
// @match        *://e-hentai.org/*
// @match        *://exhentai.org/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @grant        GM_listValues
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
    reader: {
      close: "Close",
      scrollMode: "Switch to scroll mode",
      pagedMode: "Switch to page-flip mode",
      readLeftToRight: "Read left to right",
      readRightToLeft: "Read right to left",
      rightTapPrevious: "Right tap goes to previous page",
      rightTapNext: "Right tap goes to next page",
      disableReader: "Disable Ehpeek Reader",
      download: "Download",
      startReading: "Read",
      continueReading: "Continue",
      pages: "Pages",
      endPage: "End",
      end: "End of gallery. Tap to exit.",
      failedPrefix: "Failed"
    },
    settings: {
      openSettings: "Settings",
      menuLabel: "Ehpeek",
      readerOn: "Reader: on",
      readerOff: "Reader: off",
      enhanceSearchOn: "Enhance Search Grids: on",
      enhanceSearchOff: "Enhance Search Grids: off",
      enhanceThumbsOn: "Enhance Thumbs Preview: on",
      enhanceThumbsOff: "Enhance Thumbs Preview: off",
      touchUiOn: "Touch UI: on",
      touchUiOff: "Touch UI: off"
    },
    errors: {
      imageNotFound: "Image not found",
      loadFailed: "Load failed",
      imageLoadFailed: "Image load failed",
      previewPageSizeUnknown: "Cannot determine gallery preview page size",
      searchPageContentNotFound: "Cannot find search page content"
    }
  };

  // src/state.ts
  var state = {
    reader: {
      enabled: persisted("ehpeek:reader:enabled", !0),
      viewMode: persisted("ehpeek:reader:view-mode", "scroll"),
      readDirection: persisted("ehpeek:reader:read-direction", "rtl"),
      rightTapAction: persisted("ehpeek:reader:right-tap-action", "previous")
    },
    gallery: {
      enhanceThumbs: persisted("ehpeek:enhance-thumbs:enabled", !0)
    },
    search: {
      enhance: persisted("ehpeek:enhance-search:enabled", !0)
    },
    touch: {
      enabled: persisted("ehpeek:touch-ui:enabled", !0)
    }
  };
  function persisted(key, defaultValue) {
    let item = {
      key,
      defaultValue,
      value: GM_getValue(key, defaultValue),
      set(value) {
        item.value = value, GM_setValue(key, value);
      },
      reload() {
        return item.value = GM_getValue(key, defaultValue), item.value;
      }
    };
    return item;
  }

  // src/utils.ts
  function clamp(value, min, max) {
    return max < min ? min : Math.min(max, Math.max(min, value));
  }
  function normalizeUrl(url, baseUrl = window.location.href) {
    try {
      return new URL(url, baseUrl).href;
    } catch {
      return "";
    }
  }
  async function requestText(url) {
    let controller = new AbortController(), timeout = window.setTimeout(() => {
      controller.abort();
    }, 3e4);
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
  function normalizedAspectRatio(value, fallback) {
    return value && Number.isFinite(value) && value > 0 ? value : fallback;
  }
  function positiveNumber(value) {
    return value && Number.isFinite(value) && value > 0 ? value : null;
  }
  function stopEvent(event) {
    event.stopPropagation();
  }
  function targetSummary(target) {
    if (!(target instanceof Element))
      return String(target);
    let id = target.id ? `#${target.id}` : "", className = typeof target.className == "string" && target.className ? `.${target.className.replace(/\s+/g, ".")}` : "";
    return `${target.tagName.toLowerCase()}${id}${className}`;
  }

  // src/components/common/pointerDrag.ts
  var PointerDrag = class {
    constructor(target, handlers) {
      this.target = target;
      this.handlers = handlers;
      this.mousePointerId = -1;
      this.drag = null;
      this.suppressedClick = null;
      this.onClick = (event) => {
        this.shouldSuppressClickEvent(event) && (this.suppressedClick = null, event.preventDefault(), event.stopPropagation(), this.handlers.onSuppressClick?.(event));
      };
      this.onDragStart = (event) => {
        event.preventDefault();
      };
      this.onPointerDown = (event) => {
        event.pointerType === "mouse" && event.button !== 0 || this.handlers.shouldStart && !this.handlers.shouldStart(event) || (event.preventDefault(), this.start(event.pointerId, event.pointerType, event.clientX, event.clientY, event), event.pointerType === "mouse" && this.addMouseListeners());
      };
      this.onMouseDown = (event) => {
        event.button !== 0 || typeof PointerEvent < "u" || this.drag || this.handlers.shouldStart && !this.handlers.shouldStart(event) || (event.preventDefault(), this.start(this.mousePointerId, "mouse", event.clientX, event.clientY, event), this.addMouseListeners());
      };
      this.onPointerMove = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || (this.move(event.clientX, event.clientY, event), event.preventDefault());
      };
      this.onPointerUp = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || this.finish(event.clientX, event.clientY, event);
      };
      this.onPointerCancel = (event) => {
        !this.drag || event.pointerId !== this.drag.pointerId || this.finish(event.clientX, event.clientY, event);
      };
      this.onMouseMove = (event) => {
        !this.drag || this.drag.pointerType !== "mouse" || (this.move(event.clientX, event.clientY, event), event.preventDefault());
      };
      this.onMouseUp = (event) => {
        !this.drag || this.drag.pointerType !== "mouse" || this.finish(event.clientX, event.clientY, event);
      };
      target.addEventListener("click", this.onClick, !0), target.addEventListener("pointerdown", this.onPointerDown), target.addEventListener("mousedown", this.onMouseDown), target.addEventListener("dragstart", this.onDragStart);
    }
    dispose() {
      this.drag && (this.target.releasePointerCapture?.(this.drag.pointerId), this.drag = null), this.removePointerListeners(), this.removeMouseListeners(), this.target.removeEventListener("click", this.onClick, !0), this.target.removeEventListener("pointerdown", this.onPointerDown), this.target.removeEventListener("mousedown", this.onMouseDown), this.target.removeEventListener("dragstart", this.onDragStart);
    }
    dragging() {
      return this.drag !== null;
    }
    cancel() {
      this.drag && (this.target.releasePointerCapture?.(this.drag.pointerId), this.drag = null, this.target.classList.remove("ehpeek-dragging"), this.removePointerListeners(), this.removeMouseListeners());
    }
    start(pointerId, pointerType, clientX, clientY, event) {
      this.drag = {
        pointerId,
        pointerType,
        startClientX: clientX,
        startClientY: clientY,
        lastClientY: clientY,
        lastMoveTime: event.timeStamp,
        velocityY: 0
      }, this.target.classList.add("ehpeek-dragging"), this.target.setPointerCapture?.(pointerId), this.addPointerListeners(), this.handlers.onStart?.({ pointerId, clientX, clientY }, event);
    }
    move(clientX, clientY, event) {
      let drag = this.drag;
      if (!drag)
        return;
      let elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
      drag.velocityY = (clientY - drag.lastClientY) / elapsed, drag.lastClientY = clientY, drag.lastMoveTime = event.timeStamp, this.handlers.onMove?.(
        {
          pointerId: drag.pointerId,
          clientX,
          clientY,
          dx: clientX - drag.startClientX,
          dy: clientY - drag.startClientY,
          velocityY: drag.velocityY
        },
        event
      );
    }
    finish(clientX, clientY, event) {
      let drag = this.drag;
      if (!drag)
        return;
      this.drag = null, this.target.classList.remove("ehpeek-dragging"), this.target.releasePointerCapture?.(drag.pointerId), this.removePointerListeners(), this.removeMouseListeners();
      let info = {
        pointerId: drag.pointerId,
        clientX,
        clientY,
        dx: clientX - drag.startClientX,
        dy: clientY - drag.startClientY,
        velocityY: drag.velocityY
      };
      (this.handlers.shouldSuppressClick?.(info) ?? (Math.abs(info.dx) > 8 || Math.abs(info.dy) > 8)) && (this.suppressedClick = {
        clientX,
        clientY,
        until: performance.now() + 500
      }), this.handlers.onEnd?.(info, event);
    }
    shouldSuppressClickEvent(event) {
      let suppressedClick = this.suppressedClick;
      if (!suppressedClick)
        return !1;
      if (performance.now() > suppressedClick.until)
        return this.suppressedClick = null, !1;
      let closeToDragEnd = Math.abs(event.clientX - suppressedClick.clientX) <= 24 && Math.abs(event.clientY - suppressedClick.clientY) <= 24;
      return closeToDragEnd || (this.suppressedClick = null), closeToDragEnd;
    }
    addPointerListeners() {
      this.target.addEventListener("pointermove", this.onPointerMove), this.target.addEventListener("pointerup", this.onPointerUp), this.target.addEventListener("pointercancel", this.onPointerCancel);
    }
    removePointerListeners() {
      this.target.removeEventListener("pointermove", this.onPointerMove), this.target.removeEventListener("pointerup", this.onPointerUp), this.target.removeEventListener("pointercancel", this.onPointerCancel);
    }
    addMouseListeners() {
      window.addEventListener("mousemove", this.onMouseMove, !0), window.addEventListener("mouseup", this.onMouseUp, !0);
    }
    removeMouseListeners() {
      window.removeEventListener("mousemove", this.onMouseMove, !0), window.removeEventListener("mouseup", this.onMouseUp, !0);
    }
  };

  // src/components/Reader/Gesture.ts
  var TAP_MOVE_THRESHOLD = 8, PagesGesture = class {
    constructor(target, handlers) {
      this.target = target;
      this.handlers = handlers;
      this.pinchPointers = /* @__PURE__ */ new Map();
      this.pinch = null;
      this.passiveTap = null;
      this.onKeydown = (event) => {
        if (!this.shouldIgnoreKeyboardEvent(event)) {
          if (event.key === "Escape") {
            event.preventDefault(), this.handlers.onKeyboardClose();
            return;
          }
          if (event.key === "ArrowLeft") {
            event.preventDefault(), this.handlers.onKeyboardArrow("left");
            return;
          }
          event.key === "ArrowRight" && (event.preventDefault(), this.handlers.onKeyboardArrow("right"));
        }
      };
      this.shouldStartDrag = (event) => !(event instanceof PointerEvent) || this.pinch ? !1 : (event.pointerType, event.button, event.buttons, targetSummary(event.target), event.pointerType === "mouse" && event.button !== 0 ? (event.button, event.buttons, !1) : this.handlers.shouldStartDrag(event) ? !0 : (this.beginPassiveTap(event), !1));
      this.onPinchPointerDown = (event) => {
        if (event.pointerType === "mouse" || (this.pinchPointers.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY
        }), this.pinchPointers.size !== 2 || this.pinch))
          return;
        let snapshot = this.pinchSnapshot();
        !snapshot || !this.handlers.onPinchStart(
          {
            clientX: snapshot.centerX,
            clientY: snapshot.centerY,
            distance: snapshot.distance
          },
          event
        ) || (this.pointerDrag.cancel(), this.passiveTap = null, this.removePassiveTapListeners(), this.pinch = {
          startDistance: snapshot.distance
        }, this.addPinchListeners(), event.preventDefault(), event.stopPropagation());
      };
      this.onPinchPointerMove = (event) => {
        if (!this.pinch || !this.pinchPointers.has(event.pointerId))
          return;
        this.pinchPointers.set(event.pointerId, {
          clientX: event.clientX,
          clientY: event.clientY
        });
        let snapshot = this.pinchSnapshot();
        snapshot && (this.handlers.onPinchMove(
          {
            clientX: snapshot.centerX,
            clientY: snapshot.centerY,
            distance: snapshot.distance,
            scale: snapshot.distance / this.pinch.startDistance
          },
          event
        ), event.preventDefault());
      };
      this.onPinchPointerEnd = (event) => {
        this.pinchPointers.has(event.pointerId) && (this.pinchPointers.delete(event.pointerId), !(!this.pinch || this.pinchPointers.size >= 2) && (this.handlers.onPinchEnd(), this.clearPinch(), event.preventDefault()));
      };
      this.onPinchPointerRelease = (event) => {
        this.pinch || this.pinchPointers.delete(event.pointerId);
      };
      this.onDragStart = (info, event) => {
        this.target.classList.add("ehpeek-scroller-dragging"), this.handlers.onDragStart(info, event);
      };
      this.onDragMove = (info, event) => {
        this.handlers.onDragMove(info, event);
      };
      this.onDragEnd = (info, event) => {
        if (this.target.classList.remove("ehpeek-scroller-dragging"), Math.abs(info.dx) < TAP_MOVE_THRESHOLD && Math.abs(info.dy) < TAP_MOVE_THRESHOLD) {
          this.handlers.onTap(info, event);
          return;
        }
        this.handlers.onDragEnd(info, event);
      };
      this.onWheel = (event) => {
        let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
        this.handlers.onWheel(delta, event);
      };
      this.onScroll = () => {
        this.handlers.onNativeScroll();
      };
      this.onPassiveTapMove = (event) => {
        this.trackPassiveTap(event);
      };
      this.onPassiveTapEnd = (event) => {
        this.endPassiveTap(event);
      };
      this.pointerDrag = new PointerDrag(target, {
        shouldStart: this.shouldStartDrag,
        onStart: this.onDragStart,
        onMove: this.onDragMove,
        onEnd: this.onDragEnd,
        shouldSuppressClick: () => !0
      }), target.addEventListener("pointerdown", this.onPinchPointerDown, !0), target.addEventListener("pointerup", this.onPinchPointerRelease, !0), target.addEventListener("pointercancel", this.onPinchPointerRelease, !0), target.addEventListener("scroll", this.onScroll), target.addEventListener("wheel", this.onWheel);
    }
    dispose() {
      this.pointerDrag.dispose(), this.clearPinch(), this.passiveTap = null, this.target.classList.remove("ehpeek-scroller-dragging"), this.removePassiveTapListeners(), this.target.removeEventListener("pointerdown", this.onPinchPointerDown, !0), this.target.removeEventListener("pointerup", this.onPinchPointerRelease, !0), this.target.removeEventListener("pointercancel", this.onPinchPointerRelease, !0), this.target.removeEventListener("scroll", this.onScroll), this.target.removeEventListener("wheel", this.onWheel);
    }
    dragging() {
      return this.pointerDrag.dragging();
    }
    shouldIgnoreKeyboardEvent(event) {
      if (event.isComposing)
        return !0;
      let target = event.target;
      return target instanceof Element ? !!target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']") : !1;
    }
    beginPassiveTap(event) {
      event.pointerType !== "mouse" && (this.passiveTap = {
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startClientX: event.clientX,
        startClientY: event.clientY,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        moved: !1
      }, this.addPassiveTapListeners());
    }
    trackPassiveTap(event) {
      let tap = this.passiveTap;
      !tap || !this.matchesPassiveTapPointer(event, tap) || (tap.lastClientX = event.clientX, tap.lastClientY = event.clientY, (Math.abs(event.clientX - tap.startClientX) >= TAP_MOVE_THRESHOLD || Math.abs(event.clientY - tap.startClientY) >= TAP_MOVE_THRESHOLD) && (tap.moved = !0));
    }
    endPassiveTap(event) {
      let tap = this.passiveTap;
      if (!tap || !this.matchesPassiveTapPointer(event, tap) || (this.passiveTap = null, this.removePassiveTapListeners(), event.type === "pointercancel"))
        return;
      let dx = event.clientX - tap.startClientX, dy = event.clientY - tap.startClientY;
      tap.moved || Math.abs(dx) >= TAP_MOVE_THRESHOLD || Math.abs(dy) >= TAP_MOVE_THRESHOLD || this.handlers.onTap(
        {
          pointerId: event.pointerId,
          clientX: event.clientX,
          clientY: event.clientY,
          dx,
          dy
        },
        event
      );
    }
    addPassiveTapListeners() {
      document.addEventListener("pointermove", this.onPassiveTapMove, !0), document.addEventListener("pointerup", this.onPassiveTapEnd, !0), document.addEventListener("pointercancel", this.onPassiveTapEnd, !0);
    }
    removePassiveTapListeners() {
      document.removeEventListener("pointermove", this.onPassiveTapMove, !0), document.removeEventListener("pointerup", this.onPassiveTapEnd, !0), document.removeEventListener("pointercancel", this.onPassiveTapEnd, !0);
    }
    addPinchListeners() {
      document.addEventListener("pointermove", this.onPinchPointerMove, !0), document.addEventListener("pointerup", this.onPinchPointerEnd, !0), document.addEventListener("pointercancel", this.onPinchPointerEnd, !0);
    }
    removePinchListeners() {
      document.removeEventListener("pointermove", this.onPinchPointerMove, !0), document.removeEventListener("pointerup", this.onPinchPointerEnd, !0), document.removeEventListener("pointercancel", this.onPinchPointerEnd, !0);
    }
    clearPinch() {
      this.pinch = null, this.pinchPointers.clear(), this.removePinchListeners();
    }
    pinchSnapshot() {
      let points = Array.from(this.pinchPointers.values());
      if (points.length < 2)
        return null;
      let [first, second] = points, dx = second.clientX - first.clientX, dy = second.clientY - first.clientY;
      return {
        centerX: (first.clientX + second.clientX) / 2,
        centerY: (first.clientY + second.clientY) / 2,
        distance: Math.hypot(dx, dy)
      };
    }
    matchesPassiveTapPointer(event, tap) {
      return event.pointerId === tap.pointerId && event.pointerType === tap.pointerType;
    }
  };

  // src/jsx.ts
  function h(tag, props, ...children) {
    let node = document.createElement(tag);
    return props && applyProps(node, props), appendChildren(node, children), props?.ref?.(node), node;
  }
  function applyProps(node, props) {
    for (let [name, value] of Object.entries(props))
      if (!(name === "children" || name === "ref" || value === void 0 || value === null || value === !1)) {
        if (name === "className") {
          node.className = String(value);
          continue;
        }
        if (name.startsWith("on") && typeof value == "function") {
          node.addEventListener(name.slice(2).toLowerCase(), value);
          continue;
        }
        if (value === !0) {
          node.setAttribute(name, "");
          continue;
        }
        name in node ? node[name] = value : node.setAttribute(name, String(value));
      }
  }
  function appendChildren(parent, children) {
    for (let child of children.flat())
      child == null || typeof child == "boolean" || parent.appendChild(child instanceof Node ? child : document.createTextNode(String(child)));
  }

  // src/components/common/animation.ts
  var SCROLL_ANIMATION_MODE = "raf", SCROLL_ANIMATION_MS = 180, SCROLL_EASING_POWER = 3, ANIMATION_FRAME_MIN_DELTA_MS = 1, ANIMATION_FRAME_MAX_DELTA_MS = 32, SCROLL_FLING_MIN_VELOCITY = 0.35, SCROLL_FLING_STOP_VELOCITY = 0.02, SCROLL_FLING_DECAY = 45e-4, ScrollAnimator = class {
    constructor(axis) {
      this.axis = axis;
      this.frame = null;
    }
    scrollTo(scroller, target, motion = "instant", onComplete) {
      if (this.cancel(), motion !== "animated" || SCROLL_ANIMATION_MODE === "none") {
        this.setScrollPosition(scroller, target), onComplete?.();
        return;
      }
      if (SCROLL_ANIMATION_MODE === "native") {
        scroller.scrollTo(this.axis === "x" ? { left: target, behavior: "smooth" } : { top: target, behavior: "smooth" }), window.setTimeout(() => onComplete?.(), SCROLL_ANIMATION_MS);
        return;
      }
      this.scrollWithRaf(scroller, target, onComplete);
    }
    cancel() {
      this.frame !== null && (window.cancelAnimationFrame(this.frame), this.frame = null);
    }
    scrollWithRaf(scroller, target, onComplete) {
      let start = this.scrollPosition(scroller), delta = target - start, lastFrameTime = performance.now(), animationTime = 0, step = (time) => {
        let elapsed = clamp(time - lastFrameTime, ANIMATION_FRAME_MIN_DELTA_MS, ANIMATION_FRAME_MAX_DELTA_MS);
        lastFrameTime = time, animationTime += elapsed;
        let progress = clamp(animationTime / SCROLL_ANIMATION_MS, 0, 1), eased = 1 - Math.pow(1 - progress, SCROLL_EASING_POWER);
        if (this.setScrollPosition(scroller, start + delta * eased), progress >= 1) {
          this.frame = null, onComplete?.();
          return;
        }
        this.frame = window.requestAnimationFrame(step);
      };
      this.frame = window.requestAnimationFrame(step);
    }
    scrollPosition(scroller) {
      return this.axis === "x" ? scroller.scrollLeft : scroller.scrollTop;
    }
    setScrollPosition(scroller, value) {
      this.axis === "x" ? scroller.scrollLeft = value : scroller.scrollTop = value;
    }
  }, ScrollFlingAnimator = class {
    constructor() {
      this.frame = null;
      this.velocityY = 0;
      this.lastFrameTime = 0;
    }
    start(options) {
      if (this.cancel(), Math.abs(options.initialVelocityY) < SCROLL_FLING_MIN_VELOCITY)
        return;
      this.velocityY = options.initialVelocityY, this.lastFrameTime = performance.now();
      let step = (time) => {
        if (!options.canRun()) {
          this.cancel();
          return;
        }
        let elapsed = clamp(time - this.lastFrameTime, ANIMATION_FRAME_MIN_DELTA_MS, ANIMATION_FRAME_MAX_DELTA_MS);
        this.lastFrameTime = time;
        let previousScrollTop = options.scroller.scrollTop;
        if (options.setScrollTop(previousScrollTop + this.velocityY * elapsed), options.scroller.scrollTop === previousScrollTop) {
          this.cancel(), options.onStop();
          return;
        }
        if (this.velocityY *= Math.exp(-SCROLL_FLING_DECAY * elapsed), Math.abs(this.velocityY) < SCROLL_FLING_STOP_VELOCITY) {
          this.cancel(), options.onStop();
          return;
        }
        this.frame = window.requestAnimationFrame(step);
      };
      this.frame = window.requestAnimationFrame(step);
    }
    cancel() {
      this.frame !== null && (window.cancelAnimationFrame(this.frame), this.frame = null), this.velocityY = 0;
    }
  };

  // src/components/Reader/Viewport.tsx
  var FALLBACK_ASPECT_RATIO = 1.42, PagesViewport = class {
    constructor(options) {
      this.options = options;
      this.slots = [];
      this.horizontalAnimator = new ScrollAnimator("x");
      this.flingAnimator = new ScrollFlingAnimator();
      this.element = /* @__PURE__ */ h(
        "div",
        {
          className: "ehpeek-scroller",
          tabIndex: -1,
          ref: (node) => this.scroller = node
        },
        /* @__PURE__ */ h("main", { className: "ehpeek-strip", ref: (node) => this.strip = node })
      );
    }
    scrollerElement() {
      return this.scroller;
    }
    syncWindow(options) {
      let oldSlots = new Map(this.slots.map((slot) => [slot.pageNum, slot])), nextSlots = [];
      for (let pageNum of this.windowPageNums(options.currentPageNum, options.windowSize)) {
        let kind = this.slotKindFor(pageNum, options.totalPages), oldSlot = oldSlots.get(pageNum), slot = oldSlot && oldSlot.kind === kind ? oldSlot : this.createSlot(pageNum, kind);
        if (kind === "page") {
          let page = options.pages.get(pageNum);
          page && this.setSlotMeta(slot, page);
        } else
          this.clearSlotMeta(slot);
        nextSlots.push(slot);
      }
      let nextSet = new Set(nextSlots);
      for (let slot of this.slots)
        nextSet.has(slot) || this.removeSlot(slot);
      this.slots = nextSlots, this.slots.forEach((slot, index) => {
        slot.index = index;
      }), this.renderSlots();
    }
    resetPosition() {
      this.scroller.scrollLeft = 0, this.scroller.scrollTop = 0;
    }
    stopMotion() {
      this.flingAnimator.cancel(), this.horizontalAnimator.cancel();
    }
    resizePages() {
      for (let slot of this.slots)
        this.applySlotSize(slot);
    }
    requiredImagePageNums() {
      return this.slots.filter((slot) => slot.kind === "page" && slot.state === "idle").map((slot) => slot.pageNum);
    }
    windowPageNums(currentPageNum, windowSize) {
      let numbers = [];
      for (let offset = -windowSize; offset <= windowSize; offset += 1)
        numbers.push(currentPageNum + offset);
      return numbers;
    }
    markPageLoading(pageNum) {
      let slot = this.slotFor(pageNum);
      return !slot || slot.kind !== "page" || slot.state !== "idle" ? null : (slot.state = "loading", slot.token += 1, this.refreshSlot(slot), slot.token);
    }
    createPageImage(pageNum, slotImage) {
      let image = /* @__PURE__ */ h(
        "img",
        {
          className: "ehpeek-image",
          alt: `Page ${pageNum}`,
          decoding: "async",
          loading: "eager",
          draggable: !1,
          fetchpriority: slotImage.highPriority ? "high" : "low",
          src: slotImage.imageUrl
        }
      );
      return slotImage.width && slotImage.height && (image.width = slotImage.width, image.height = slotImage.height), image;
    }
    setPageImage(pageNum, token, slotImage, image) {
      let slot = this.slotFor(pageNum);
      return !slot || slot.token !== token || !slot.view ? !1 : (slot.state = "ready", slot.imageUrl = slotImage.imageUrl, slot.width = positiveDimension(image.naturalWidth) ?? slotImage.width, slot.height = positiveDimension(image.naturalHeight) ?? slotImage.height, this.applySlotSize(slot), slot.view.frame.replaceChildren(image), !0);
    }
    setPageError(pageNum, token, errorMessage) {
      let slot = this.slotFor(pageNum);
      return !slot || slot.token !== token ? !1 : (slot.state = "error", this.renderSlotPlaceholder(slot, errorMessage), !0);
    }
    moveToPage(pageNum, motion = "instant", onComplete) {
      let delta = this.pageOffset(pageNum);
      delta !== null && this.moveBy(delta, motion, onComplete);
    }
    moveBy(delta, motion = "instant", onComplete) {
      if (this.options.mode() === "paged") {
        this.horizontalAnimator.scrollTo(this.scroller, this.scroller.scrollLeft + delta, motion, onComplete);
        return;
      }
      this.moveToTop(this.scroller.scrollTop + delta), onComplete?.();
    }
    moveToTop(scrollTop) {
      this.scroller.scrollTop = this.clampedTop(scrollTop, this.verticalScrollBounds());
    }
    startDragPosition() {
      return this.options.mode() === "paged" ? this.scroller.scrollLeft : this.scroller.scrollTop;
    }
    dragPage(startPosition, delta) {
      if (this.options.mode() === "paged") {
        this.scroller.scrollLeft = startPosition - delta.dx;
        return;
      }
      this.moveToTop(startPosition - delta.dy);
    }
    scrollTop() {
      return this.scroller.scrollTop;
    }
    viewportWidth() {
      return this.scroller.clientWidth || window.innerWidth || 1;
    }
    viewportHeight() {
      return this.scroller.clientHeight;
    }
    pageOffset(pageNum) {
      let view = this.slotFor(pageNum)?.view;
      return view ? this.slotOffsetFromViewport(view, this.options.mode()) : null;
    }
    centerPageNum() {
      for (let slot of this.slots)
        if (!(!slot.view || slot.kind === "blank") && this.slotContainsViewportTarget(slot.view))
          return slot.pageNum;
      return null;
    }
    isHitEndPage(point) {
      let pageNum = this.pageNumAtPoint(point);
      return (pageNum === null ? void 0 : this.slotFor(pageNum))?.kind === "end";
    }
    pageNumAtPoint(point) {
      let element = document.elementFromPoint(point.clientX, point.clientY), pageNode = element instanceof Element ? element.closest(".ehpeek-page") : null;
      if (!pageNode)
        return null;
      let pageNum = Number(pageNode.dataset.ehpeekPageNum || "");
      return Number.isFinite(pageNum) ? pageNum : null;
    }
    startVerticalFlingFromDragVelocity(dragVelocityY, onStop) {
      this.flingAnimator.start({
        scroller: this.scroller,
        initialVelocityY: -dragVelocityY,
        setScrollTop: (scrollTop) => this.moveToTop(scrollTop),
        canRun: () => !this.options.closed() && this.options.mode() === "scroll",
        onStop
      });
    }
    verticalScrollBounds() {
      if (this.options.mode() !== "scroll")
        return null;
      let totalPages = this.options.totalPages();
      return this.verticalScrollBoundsForPages(1, totalPages ? totalPages + 1 : null);
    }
    verticalScrollBoundsForPages(firstPageNum, lastPageNum) {
      return this.verticalScrollBoundsForViews(
        this.slotFor(firstPageNum)?.view,
        lastPageNum === null ? null : this.slotFor(lastPageNum)?.view
      );
    }
    verticalScrollBoundsForViews(firstView, lastView) {
      let bounds = {}, scrollerRect = this.scroller.getBoundingClientRect();
      if (firstView) {
        let firstRect = firstView.node.getBoundingClientRect();
        bounds.min = this.scroller.scrollTop + firstRect.top - scrollerRect.top;
      }
      if (lastView) {
        let lastRect = lastView.node.getBoundingClientRect(), lastTop = this.scroller.scrollTop + lastRect.top - scrollerRect.top;
        bounds.max = lastTop + lastRect.height - this.viewportHeight();
      }
      return bounds.min === void 0 && bounds.max === void 0 ? null : (bounds.min !== void 0 && bounds.max !== void 0 && (bounds.max = Math.max(bounds.min, bounds.max)), bounds);
    }
    clampedTop(scrollTop, bounds) {
      return bounds ? clamp(scrollTop, bounds.min ?? Number.NEGATIVE_INFINITY, bounds.max ?? Number.POSITIVE_INFINITY) : scrollTop;
    }
    slotFor(pageNum) {
      return this.slots.find((slot) => slot.pageNum === pageNum);
    }
    slotKindFor(pageNum, totalPages) {
      return pageNum < 1 ? "blank" : totalPages && pageNum === totalPages + 1 ? "end" : totalPages && pageNum > totalPages + 1 ? "blank" : "page";
    }
    slotContainsViewportTarget(view) {
      let scrollerRect = this.scroller.getBoundingClientRect(), target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14), rect = view.node.getBoundingClientRect();
      return rect.top <= target && rect.bottom > target;
    }
    slotOffsetFromViewport(view, mode) {
      let pageRect = view.node.getBoundingClientRect(), scrollerRect = this.scroller.getBoundingClientRect();
      return mode === "paged" ? pageRect.left - scrollerRect.left : pageRect.top - scrollerRect.top;
    }
    removeStaleSlotNodes(keepNodes) {
      for (let node of Array.from(this.strip.children))
        keepNodes.has(node) || node.remove();
    }
    appendSlotView(view) {
      this.strip.append(view.node);
    }
    createSlotView(index, pageNum) {
      let frame, view = { node: /* @__PURE__ */ h("section", { className: "ehpeek-page" }, /* @__PURE__ */ h("div", { className: "ehpeek-frame", ref: (element) => frame = element })), frame };
      return this.setSlotOrder(view, index, index + 1), this.setSlotPageNum(view, pageNum), view;
    }
    removeSlotView(view) {
      view.node.remove();
    }
    slotViewConnected(view) {
      return view.node.isConnected;
    }
    setSlotOrder(view, index, slotCount) {
      let visualIndex = this.options.mode() === "paged" && this.options.readDirection() === "rtl" ? slotCount - 1 - index : index;
      view.node.style.setProperty("order", String(visualIndex)), view.node.dataset.ehpeekIndex = String(visualIndex);
    }
    setSlotPageNum(view, pageNum) {
      view.node.dataset.ehpeekPageNum = String(pageNum);
    }
    setSlotSize(view, frameWidth, frameHeight) {
      view.node.style.setProperty("--ehpeek-page-height", `${frameHeight + 8}px`), view.node.style.setProperty("--ehpeek-frame-width", `${frameWidth}px`), view.node.style.setProperty("--ehpeek-frame-height", `${frameHeight}px`);
    }
    setSlotPlaceholder(view, content) {
      let placeholder = /* @__PURE__ */ h("div", { className: content.state === "error" ? "ehpeek-error" : "ehpeek-placeholder" }, this.slotPlaceholderText(content));
      placeholder.classList.toggle("ehpeek-placeholder-end", content.kind === "end"), view.frame.replaceChildren(placeholder);
    }
    createSlot(pageNum, kind) {
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
        token: 0
      };
    }
    setSlotMeta(slot, page) {
      let aspectRatio = normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO);
      slot.aspectRatio === aspectRatio && slot.state !== "error" || (slot.aspectRatio = aspectRatio, slot.kind = "page", slot.state = "idle", slot.imageUrl = null, slot.width = null, slot.height = null, slot.token += 1);
    }
    clearSlotMeta(slot) {
      (slot.kind === "blank" || slot.kind === "end") && (slot.state = "ready", slot.imageUrl = null, slot.width = null, slot.height = null, slot.token += 1);
    }
    removeSlot(slot) {
      slot.token += 1, slot.view && (this.removeSlotView(slot.view), slot.view = null);
    }
    renderSlots() {
      let keepNodes = new Set(this.slots.map((slot) => slot.view?.node ?? null).filter(Boolean));
      this.removeStaleSlotNodes(keepNodes);
      for (let slot of this.slots)
        slot.view && !this.slotViewConnected(slot.view) && (slot.view = null), this.mountSlot(slot), slot.view && this.setSlotOrder(slot.view, slot.index, this.slots.length);
    }
    mountSlot(slot) {
      slot.view || (slot.view = this.createSlotView(slot.index, slot.pageNum), this.appendSlotView(slot.view)), this.refreshSlot(slot);
    }
    refreshSlot(slot) {
      slot.view && (this.setSlotPageNum(slot.view, slot.pageNum), this.applySlotSize(slot), !(slot.state === "ready" && slot.imageUrl) && this.renderSlotPlaceholder(slot, void 0));
    }
    renderSlotPlaceholder(slot, errorMessage) {
      slot.view && this.setSlotPlaceholder(slot.view, {
        pageNum: slot.pageNum,
        kind: slot.kind,
        state: slot.state,
        errorMessage
      });
    }
    applySlotSize(slot) {
      if (!slot.view)
        return;
      let frameWidth = Math.max(1, this.viewportWidth()), frameHeight = Math.ceil(frameWidth * this.aspectRatioFor(slot));
      this.setSlotSize(slot.view, frameWidth, frameHeight);
    }
    aspectRatioFor(slot) {
      return slot.width && slot.height && slot.width > 0 && slot.height > 0 ? slot.height / slot.width : normalizedAspectRatio(slot.aspectRatio, FALLBACK_ASPECT_RATIO);
    }
    slotPlaceholderText(content) {
      if (content.state === "error") {
        let suffix = content.errorMessage ? `: ${content.errorMessage}` : "";
        return `${texts_default.reader.failedPrefix} ${content.pageNum}${suffix}`;
      }
      return content.kind === "end" ? texts_default.reader.end : content.kind === "blank" ? "" : String(content.pageNum);
    }
  };
  function positiveDimension(value) {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  // src/components/Reader/Reader.css
  var Reader_default = `#ehpeek-reader {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  background: #070707;
  color: #f3f3f3;
  font: 13px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

#ehpeek-reader * {
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

#ehpeek-reader.ehpeek-read-rtl .ehpeek-progress {
  direction: rtl;
}

#ehpeek-reader.ehpeek-read-ltr .ehpeek-progress {
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

#ehpeek-reader.ehpeek-read-rtl .ehpeek-progress::-webkit-slider-runnable-track {
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
  touch-action: pan-y;
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

.ehpeek-zoom-overlay {
  position: fixed;
  inset: 0;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #070707;
  pointer-events: none;
}

.ehpeek-zoom-overlay[hidden] {
  display: none;
}

.ehpeek-zoom-image {
  display: block;
  max-width: 100vw;
  max-height: 100vh;
  object-fit: contain;
  transform-origin: center center;
  user-select: none;
  will-change: transform;
  -webkit-user-drag: none;
}

#ehpeek-reader.ehpeek-paged .ehpeek-scroller {
  overflow: hidden;
  touch-action: none;
  user-select: none;
}

#ehpeek-reader.ehpeek-paged .ehpeek-strip {
  display: flex;
  flex-direction: row;
  width: auto;
  height: 100%;
  min-height: 0;
  padding: 0;
}

#ehpeek-reader.ehpeek-paged .ehpeek-page {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  align-items: center;
  padding: 0;
}

#ehpeek-reader.ehpeek-paged .ehpeek-frame,
#ehpeek-reader.ehpeek-paged .ehpeek-image {
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

  // src/components/Reader/Root.tsx
  var VIEWER_ID = "ehpeek-reader", STYLE_ID = "ehpeek-reader-style", ReaderRoot = class {
    constructor(children) {
      this.previousBodyOverflow = "";
      this.previousDocumentOverflow = "";
      this.element = /* @__PURE__ */ h("div", { id: VIEWER_ID }, children);
    }
    mount(focusTarget) {
      document.getElementById(VIEWER_ID)?.remove(), ensureReaderStyle(), this.lockPageScroll(), document.body.append(this.element), focusTarget?.focus({ preventScroll: !0 });
    }
    remove() {
      this.element.remove(), this.unlockPageScroll();
    }
    setMode(mode) {
      this.element.classList.toggle("ehpeek-paged", mode === "paged");
    }
    setReadDirection(direction) {
      this.element.classList.toggle("ehpeek-read-rtl", direction === "rtl"), this.element.classList.toggle("ehpeek-read-ltr", direction === "ltr");
    }
    setToolbarOpen(open) {
      this.element.classList.toggle("ehpeek-toolbar-open", open);
    }
    lockPageScroll() {
      this.previousDocumentOverflow = document.documentElement.style.overflow, this.previousBodyOverflow = document.body.style.overflow, document.documentElement.style.overflow = "hidden", document.body.style.overflow = "hidden";
    }
    unlockPageScroll() {
      document.documentElement.style.overflow = this.previousDocumentOverflow, document.body.style.overflow = this.previousBodyOverflow;
    }
  };
  function ensureReaderStyle() {
    if (document.getElementById(STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = STYLE_ID, style.textContent = Reader_default, document.head.append(style);
  }

  // src/components/Reader/Toolbar.tsx
  var Toolbar = class {
    constructor(handlers, onToolbarOpenChange) {
      this.handlers = handlers;
      this.onToolbarOpenChange = onToolbarOpenChange;
      let topbar = /* @__PURE__ */ h("div", { className: "ehpeek-topbar", onClick: stopEvent, onPointerDown: stopEvent, onWheel: stopEvent }, /* @__PURE__ */ h("div", { className: "ehpeek-actions" }, /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "ehpeek-button ehpeek-direction-button ehpeek-control-hidden",
          ref: (node) => this.readDirectionButton = node,
          onClick: handlers.onReadDirectionClick
        }
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "ehpeek-button ehpeek-direction-button ehpeek-control-hidden",
          ref: (node) => this.rightTapButton = node,
          onClick: handlers.onRightTapClick
        }
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "ehpeek-button ehpeek-control-hidden",
          ref: (node) => this.modeButton = node,
          onClick: handlers.onModeClick
        }
      ), /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "ehpeek-button ehpeek-disable-button ehpeek-control-hidden",
          title: texts_default.reader.disableReader,
          ref: (node) => this.disableReaderButton = node,
          onClick: handlers.onDisableReaderClick
        },
        "off"
      ), /* @__PURE__ */ h("button", { type: "button", className: "ehpeek-button", title: texts_default.reader.close, onClick: handlers.onCloseClick }, "X"))), pageNumber = /* @__PURE__ */ h("div", { className: "ehpeek-pageno", ref: (node) => this.pageNumberLabel = node }), progress = /* @__PURE__ */ h(
        "div",
        {
          className: "ehpeek-progressbar ehpeek-toolbar-hidden",
          ref: (node) => this.toolbar = node,
          onClick: stopEvent,
          onPointerDown: stopEvent,
          onWheel: stopEvent
        },
        /* @__PURE__ */ h(
          "input",
          {
            type: "range",
            className: "ehpeek-progress",
            min: "1",
            step: "1",
            ref: (node) => this.progressInput = node,
            onPointerDown: handlers.onProgressPointerDown,
            onInput: handlers.onProgressInput,
            onChange: handlers.onProgressCommit,
            onPointerUp: handlers.onProgressCommit,
            onPointerCancel: handlers.onProgressCommit
          }
        )
      );
      this.elements = [topbar, pageNumber, progress];
    }
    setControls(controls) {
      this.setModeButton(controls.mode), this.setReadDirectionButton(controls.readDirection), this.setRightTapButton(controls.rightTapAction);
    }
    setProgress(progress) {
      this.pageNumberLabel.textContent = this.pageNumberText(progress.pageNum, progress.totalPages), this.progressInput.max = String(Math.max(1, progress.maxProgressPageNum)), progress.keepInputValue || (this.progressInput.value = String(progress.pageNum)), this.setProgressFill(this.progressFillPercent(progress.pageNum));
    }
    progressValue() {
      return Number(this.progressInput.value || "");
    }
    toggle() {
      let hidden = this.toolbar.classList.toggle("ehpeek-toolbar-hidden");
      return this.modeButton.classList.toggle("ehpeek-control-hidden", hidden), this.readDirectionButton.classList.toggle("ehpeek-control-hidden", hidden), this.rightTapButton.classList.toggle("ehpeek-control-hidden", hidden), this.disableReaderButton.classList.toggle("ehpeek-control-hidden", hidden), this.onToolbarOpenChange(!hidden), hidden;
    }
    setModeButton(mode) {
      let paged = mode === "paged";
      this.modeButton.textContent = paged ? "⇔" : "⇕", this.modeButton.title = paged ? texts_default.reader.scrollMode : texts_default.reader.pagedMode;
    }
    setReadDirectionButton(direction) {
      let rtl = direction === "rtl";
      this.readDirectionButton.textContent = rtl ? "RL" : "LR", this.readDirectionButton.title = rtl ? texts_default.reader.readLeftToRight : texts_default.reader.readRightToLeft;
    }
    setRightTapButton(action) {
      let previous = action === "previous";
      this.rightTapButton.textContent = previous ? "R-" : "R+", this.rightTapButton.title = previous ? texts_default.reader.rightTapNext : texts_default.reader.rightTapPrevious;
    }
    progressRange() {
      return {
        min: Number(this.progressInput.min || "1"),
        max: Number(this.progressInput.max || "1")
      };
    }
    setProgressFill(fillPercent) {
      this.progressInput.style.setProperty("--ehpeek-progress-fill", `${fillPercent}%`);
    }
    pageNumberText(pageNum, totalPages) {
      return totalPages && pageNum === totalPages + 1 ? texts_default.reader.endPage : totalPages ? `${pageNum} / ${totalPages}` : String(pageNum);
    }
    progressFillPercent(pageNum) {
      let { min, max } = this.progressRange(), value = Math.min(max, Math.max(min, pageNum));
      return max > min ? (value - min) / (max - min) * 100 : 100;
    }
  };

  // src/components/Reader/ZoomOverlay.tsx
  var MIN_SCALE = 1, MAX_SCALE = 5, CLOSE_SCALE = 1.02, ZoomOverlay = class {
    constructor() {
      this.activeImage = null;
      this.scale = 1;
      this.requestedScale = 1;
      this.offsetX = 0;
      this.offsetY = 0;
      this.pinchStartScale = 1;
      this.pinchStartOffsetX = 0;
      this.pinchStartOffsetY = 0;
      this.pinchStartCenterX = 0;
      this.pinchStartCenterY = 0;
      this.dragStartOffsetX = 0;
      this.dragStartOffsetY = 0;
      this.element = /* @__PURE__ */ h("div", { className: "ehpeek-zoom-overlay", hidden: !0 }, /* @__PURE__ */ h("img", { className: "ehpeek-zoom-image", ref: (node) => this.image = node }));
    }
    active() {
      return this.activeImage !== null;
    }
    start(image, pinch) {
      this.activeImage = image, this.scale = 1, this.requestedScale = 1, this.offsetX = 0, this.offsetY = 0, this.image.src = image.imageUrl, this.image.alt = `Page ${image.pageNum}`, image.width && image.height ? (this.image.width = image.width, this.image.height = image.height) : (this.image.removeAttribute("width"), this.image.removeAttribute("height")), this.element.hidden = !1, this.startPinch(pinch), this.render();
    }
    startPinch(pinch) {
      this.pinchStartScale = this.scale, this.pinchStartOffsetX = this.offsetX, this.pinchStartOffsetY = this.offsetY, this.pinchStartCenterX = pinch.centerX, this.pinchStartCenterY = pinch.centerY;
    }
    movePinch(pinch) {
      if (!this.active())
        return;
      this.requestedScale = this.pinchStartScale * pinch.scale, this.scale = clamp(this.requestedScale, MIN_SCALE, MAX_SCALE);
      let rect = this.element.getBoundingClientRect(), viewportCenterX = rect.left + rect.width / 2, viewportCenterY = rect.top + rect.height / 2, ratio = this.scale / this.pinchStartScale;
      this.offsetX = pinch.centerX - viewportCenterX - (this.pinchStartCenterX - viewportCenterX - this.pinchStartOffsetX) * ratio, this.offsetY = pinch.centerY - viewportCenterY - (this.pinchStartCenterY - viewportCenterY - this.pinchStartOffsetY) * ratio, this.render();
    }
    endPinch() {
      if (this.requestedScale <= CLOSE_SCALE) {
        this.close();
        return;
      }
      this.render();
    }
    startDrag() {
      this.dragStartOffsetX = this.offsetX, this.dragStartOffsetY = this.offsetY;
    }
    moveDrag(move) {
      this.active() && (this.offsetX = this.dragStartOffsetX + move.dx, this.offsetY = this.dragStartOffsetY + move.dy, this.render());
    }
    close() {
      this.activeImage = null, this.element.hidden = !0, this.image.removeAttribute("src");
    }
    render() {
      this.image.style.transform = `translate3d(${this.offsetX}px, ${this.offsetY}px, 0) scale(${this.scale})`;
    }
  };

  // src/components/Reader/index.ts
  var DEFAULT_WINDOW_SIZE = 10, DEFAULT_NEAR_CONCURRENT_LOADS = 3, DEFAULT_FAR_CONCURRENT_LOADS = 6, NEAR_LOAD_AHEAD = 3, PAGED_SWIPE_THRESHOLD = 24, PAGED_WHEEL_THRESHOLD = 8, PROGRESS_IDLE_COMMIT_MS = 1e3, DOUBLE_TAP_MS = 340, DOUBLE_TAP_DISTANCE = 36, TAP_CANCEL_DISTANCE = 8, FALLBACK_ASPECT_RATIO2 = 1.42, TwoTierImageQueue = class {
    constructor(loadTarget, markLoading, onLoaded, onError, nearConcurrentLoads, farConcurrentLoads) {
      this.loadTarget = loadTarget;
      this.markLoading = markLoading;
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
    sync(targets, currentPageNum, direction, windowNumbers, preloadWindowSize) {
      for (let queue of [this.nearQueue, this.farQueue])
        for (let pageNum of queue.keys())
          windowNumbers.has(pageNum) || queue.delete(pageNum);
      this.enqueue(targets.find((target) => target.pageNum === currentPageNum), "near");
      for (let offset = 1; offset <= preloadWindowSize; offset += 1) {
        let pageNum = currentPageNum + offset * direction, target = targets.find((candidate) => candidate.pageNum === pageNum);
        target && this.enqueue(target, offset <= NEAR_LOAD_AHEAD ? "near" : "far");
      }
      this.schedule();
    }
    enqueue(target, tier) {
      if (!target)
        return;
      let pageNum = target.pageNum;
      if (tier === "near") {
        this.farQueue.delete(pageNum), this.nearQueue.set(pageNum, target);
        return;
      }
      this.nearQueue.has(pageNum) || this.farQueue.set(pageNum, target);
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
          let queue = tier === "near" ? this.nearQueue : this.farQueue, target = queue.values().next().value;
          if (!target)
            return;
          queue.delete(target.pageNum), this.start(target, tier);
        }
    }
    currentConcurrency() {
      return this.nearQueue.size > 0 || this.activeNearLoads > 0 ? Math.min(this.nearConcurrentLoads, this.farConcurrentLoads) : this.farConcurrentLoads;
    }
    start(target, tier) {
      let token = this.markLoading(target.pageNum);
      token !== null && (this.activeTotalLoads += 1, tier === "near" && (this.activeNearLoads += 1), this.loadTarget(target).then((loaded) => {
        this.disposed || this.onLoaded(target, loaded, token);
      }).catch((error) => {
        this.disposed || this.onError(target, error, token);
      }).finally(() => {
        this.activeTotalLoads -= 1, tier === "near" && (this.activeNearLoads -= 1), this.process();
      }));
    }
  }, activeReader = null;
  function openFullscreenReader(options) {
    activeReader?.close();
    let reader = new FullscreenReader(options);
    activeReader = reader, reader.open();
  }
  var FullscreenReader = class {
    constructor(options) {
      this.pages = /* @__PURE__ */ new Map();
      this.loadedImages = /* @__PURE__ */ new Map();
      this.direction = 1;
      this.scrollFrame = null;
      this.resizeFrame = null;
      this.progressNavigationTimer = null;
      this.tapTimer = null;
      this.pendingTap = null;
      this.pendingProgressNavigationPageNum = null;
      this.progressNavigating = !1;
      this.viewportDrag = null;
      this.pagedTargetPageNumber = null;
      this.syncToken = 0;
      this.historyEntry = !1;
      this.closing = !1;
      this.closed = !1;
      this.onPopState = () => {
        this.historyEntry && (this.historyEntry = !1, this.finishClose(), this.onExit?.());
      };
      this.onImageLoaded = (target, loaded, token) => {
        this.viewport.windowPageNums(this.currentPageNum, this.renderWindowSize).includes(target.pageNum) && this.installImage(target, loaded, token);
      };
      this.onImageError = (target, error, token) => {
        let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
        this.viewport.setPageError(target.pageNum, token, message);
      };
      this.onProgressPointerDown = (event) => {
        this.progressNavigating = !0, this.cancelProgressNavigation(), event.stopPropagation();
      };
      this.onProgressInput = () => {
        let pageNum = this.toolbar.progressValue();
        if (!Number.isFinite(pageNum) || pageNum <= 0)
          return;
        this.progressNavigating = !0;
        let target = clamp(Math.round(pageNum), 1, this.maxProgressPageNum());
        this.pendingProgressNavigationPageNum = target, this.navigateProgressPage(target), this.cancelProgressNavigation(), this.progressNavigationTimer = window.setTimeout(() => this.onProgressCommit(), PROGRESS_IDLE_COMMIT_MS);
      };
      this.onProgressCommit = () => {
        if (!this.progressNavigating && this.pendingProgressNavigationPageNum === null)
          return;
        let pageNum = this.pendingProgressNavigationPageNum ?? this.toolbar.progressValue();
        this.progressNavigating = !1, this.pendingProgressNavigationPageNum = null, this.cancelProgressNavigation(), Number.isFinite(pageNum) && pageNum > 0 && this.setCurrentPageNumber(pageNum, !0);
      };
      this.onResize = () => {
        this.resizeFrame === null && (this.resizeFrame = window.requestAnimationFrame(() => {
          this.resizeFrame = null, this.viewport.resizePages();
        }));
      };
      this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : void 0, this.renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
      for (let [index, page] of options.pages.entries()) {
        let pageNum = pageNumForPage(page, index);
        this.pages.set(pageNum, {
          ...page,
          aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO2),
          pageNum
        });
      }
      let startIndex = clamp(options.startIndex, 0, Math.max(0, options.pages.length - 1));
      this.currentPageNum = pageNumForPage(options.pages[startIndex], startIndex), this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE, this.loadPages = options.loadPages, this.onExit = options.onExit, this.onActivePageChange = options.onActivePageChange, this.onDisableReader = options.onDisableReader, this.viewport = new PagesViewport({
        mode: () => state.reader.viewMode.value,
        readDirection: () => state.reader.readDirection.value,
        closed: () => this.closed,
        totalPages: () => this.totalPages
      }), this.zoomOverlay = new ZoomOverlay(), this.toolbar = new Toolbar(
        {
          onReadDirectionClick: () => this.toggleReadDirection(),
          onRightTapClick: () => this.toggleRightTapAction(),
          onModeClick: () => this.setMode(state.reader.viewMode.value === "paged" ? "scroll" : "paged"),
          onCloseClick: () => this.close(),
          onDisableReaderClick: () => {
            this.onDisableReader?.(), this.close();
          },
          onProgressPointerDown: this.onProgressPointerDown,
          onProgressInput: this.onProgressInput,
          onProgressCommit: this.onProgressCommit
        },
        (open) => this.root.setToolbarOpen(open)
      ), this.root = new ReaderRoot([...this.toolbar.elements, this.viewport.element, this.zoomOverlay.element]), this.gesture = new PagesGesture(this.viewport.scrollerElement(), {
        onTap: (info, event) => this.handleTap(info, event),
        onKeyboardClose: () => this.handleKeyboardClose(),
        onKeyboardArrow: (direction) => this.handleKeyboardArrow(direction),
        onWheel: (delta, event) => this.handleWheel(delta, event),
        shouldStartDrag: (event) => this.shouldStartDrag(event),
        onDragStart: (info, event) => this.handleDragStart(info, event),
        onDragMove: (info, event) => this.handleDragMove(info, event),
        onDragEnd: (info, event) => this.handleDragEnd(info, event),
        onPinchStart: (info) => this.handlePinchStart(info),
        onPinchMove: (info) => this.zoomOverlay.movePinch({ centerX: info.clientX, centerY: info.clientY, scale: info.scale }),
        onPinchEnd: () => this.zoomOverlay.endPinch(),
        onNativeScroll: () => this.handleNativeScroll()
      }), this.imageQueue = new TwoTierImageQueue(
        (target) => options.loadPage(target.page, target.index),
        (pageNum) => this.viewport.markPageLoading(pageNum),
        this.onImageLoaded,
        this.onImageError,
        options.nearConcurrentLoads ?? DEFAULT_NEAR_CONCURRENT_LOADS,
        options.farConcurrentLoads ?? DEFAULT_FAR_CONCURRENT_LOADS
      ), this.syncInitialUi();
    }
    open() {
      this.pages.size !== 0 && (this.root.mount(this.viewport.scrollerElement()), this.onExit && (window.history.pushState({ ehpeekReader: !0 }, "", window.location.href), this.historyEntry = !0, window.addEventListener("popstate", this.onPopState)), window.addEventListener("resize", this.onResize), document.addEventListener("keydown", this.gesture.onKeydown, !0), this.syncAfterPageChange({ scrollIntoView: !0 }));
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
    syncInitialUi() {
      this.syncReaderControls(), this.updatePageNumber();
    }
    finishClose() {
      this.closed || (this.closed = !0, this.cancelProgressNavigation(), this.cancelPendingTap(), this.imageQueue.dispose(), window.removeEventListener("resize", this.onResize), window.removeEventListener("popstate", this.onPopState), document.removeEventListener("keydown", this.gesture.onKeydown, !0), this.gesture.dispose(), this.root.remove(), this.scrollFrame !== null && window.cancelAnimationFrame(this.scrollFrame), this.resizeFrame !== null && window.cancelAnimationFrame(this.resizeFrame), this.viewport.stopMotion(), activeReader === this && (activeReader = null));
    }
    setCurrentPageNumber(pageNumber, scrollIntoView, scrollMotion = "instant") {
      this.pagedTargetPageNumber = null;
      let target = clamp(Math.round(pageNumber), 1, this.maxProgressPageNum());
      target !== this.currentPageNum && (this.direction = target > this.currentPageNum ? 1 : -1, this.currentPageNum = target), this.syncAfterPageChange({ scrollIntoView, scrollMotion });
    }
    syncAfterPageChange(options) {
      let token = ++this.syncToken, missing = this.viewport.windowPageNums(this.currentPageNum, this.renderWindowSize).filter((number) => this.isRealPageNum(number) && !this.pages.has(number));
      this.syncViewportWindow(), this.maintainLoadQueue(), this.notifyActivePageChange(), options.scrollIntoView && this.scrollToCurrentPage(options.scrollMotion), missing.length > 0 && this.loadMissingPages(missing, token);
    }
    rebuildForCurrentMode() {
      this.viewport.stopMotion(), this.viewport.resetPosition(), this.syncAfterPageChange({ scrollIntoView: !0 });
    }
    async loadMissingPages(pageNums, token) {
      let incoming;
      try {
        incoming = await this.loadPages?.(pageNums);
      } catch (error) {
        console.error("[ehpeek]", error);
        return;
      }
      this.closed || token !== this.syncToken || (this.addPages(incoming ?? []), this.syncViewportWindow(), this.maintainLoadQueue(), this.notifyActivePageChange());
    }
    addPages(pages) {
      for (let [index, page] of pages.entries()) {
        let pageNum = pageNumForPage(page, index);
        pageNum > 0 && this.pages.set(pageNum, {
          ...page,
          aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO2),
          pageNum
        });
      }
    }
    syncViewportWindow() {
      this.viewport.syncWindow({
        currentPageNum: this.currentPageNum,
        windowSize: this.renderWindowSize,
        totalPages: this.totalPages,
        pages: this.pageMetaForViewport()
      }), this.updatePageNumber();
    }
    maintainLoadQueue() {
      let targets = this.viewport.requiredImagePageNums().map((pageNum) => this.loadTargetFor(pageNum)).filter((target) => !!target), windowSet = new Set(targets.map((target) => target.pageNum));
      this.imageQueue.sync(targets, this.currentPageNum, this.direction, windowSet, this.preloadWindowSize);
    }
    pageMetaForViewport() {
      return new Map(Array.from(this.pages, ([pageNum, page]) => [pageNum, { aspectRatio: page.aspectRatio }]));
    }
    loadTargetFor(pageNum) {
      let page = this.pages.get(pageNum);
      return page ? { pageNum, page, index: pageNum - 1 } : null;
    }
    maxProgressPageNum() {
      return this.totalPages ? this.totalPages + 1 : Number.MAX_SAFE_INTEGER;
    }
    isRealPageNum(pageNum) {
      return pageNum >= 1 && (!this.totalPages || pageNum <= this.totalPages);
    }
    turnPageBy(delta) {
      if (state.reader.viewMode.value === "paged") {
        this.animatePagedStep(delta);
        return;
      }
      this.setCurrentPageNumber(this.currentPageNum + delta, !0);
    }
    animatePagedStep(delta) {
      let base = this.pagedTargetPageNumber ?? this.currentPageNum, target = clamp(Math.round(base + delta), 1, this.maxProgressPageNum());
      if (target === base) {
        this.scrollToCurrentPage("animated");
        return;
      }
      if (this.viewport.pageOffset(target) === null) {
        this.pagedTargetPageNumber = null, this.setCurrentPageNumber(target, !0, "animated");
        return;
      }
      this.direction = target > base ? 1 : -1, this.pagedTargetPageNumber = target, this.viewport.moveToPage(target, "animated", () => {
        this.pagedTargetPageNumber === target && (this.pagedTargetPageNumber = null, this.setCurrentPageNumber(target, !0));
      });
    }
    scrollToCurrentPage(motion = "instant") {
      this.viewport.moveToPage(this.currentPageNum, motion);
    }
    async installImage(target, loaded, token) {
      let imageUrl = loaded.imageUrl, width = positiveNumber(loaded.width), height = positiveNumber(loaded.height), image = this.viewport.createPageImage(target.pageNum, {
        imageUrl,
        highPriority: target.pageNum === this.currentPageNum,
        width,
        height
      });
      try {
        await loadImage(image);
      } catch {
        return;
      }
      this.closed || (this.loadedImages.set(target.pageNum, { pageNum: target.pageNum, imageUrl, width, height }), this.viewport.setPageImage(target.pageNum, token, { imageUrl, highPriority: target.pageNum === this.currentPageNum, width, height }, image));
    }
    updatePageNumber() {
      this.toolbar.setProgress({
        pageNum: this.currentPageNum,
        totalPages: this.totalPages,
        maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
        keepInputValue: this.progressNavigating
      });
    }
    notifyActivePageChange() {
      let page = this.pages.get(this.currentPageNum);
      page && this.onActivePageChange?.(page, this.currentPageNum - 1);
    }
    handleKeyboardArrow(direction) {
      this.zoomOverlay.active() || this.turnPageBy(direction === "left" ? this.leftTapDelta() : this.rightTapDelta());
    }
    handleWheel(delta, event) {
      if (this.zoomOverlay.active()) {
        event.preventDefault();
        return;
      }
      state.reader.viewMode.value === "paged" && (event.preventDefault(), !this.gesture.dragging() && Math.abs(delta) >= PAGED_WHEEL_THRESHOLD && this.turnPageBy(delta > 0 ? 1 : -1));
    }
    shouldStartDrag(event) {
      return this.zoomOverlay.active() ? !0 : state.reader.viewMode.value === "paged" || event.pointerType === "mouse";
    }
    handleDragStart(_info, _event) {
      if (this.zoomOverlay.active()) {
        this.zoomOverlay.startDrag();
        return;
      }
      this.viewport.stopMotion(), this.viewportDrag = {
        startScroll: this.viewport.startDragPosition()
      };
    }
    handleDragMove(info, event) {
      if (this.zoomOverlay.active()) {
        this.zoomOverlay.moveDrag(info);
        return;
      }
      let drag = this.viewportDrag;
      drag && ((Math.abs(info.dx) >= TAP_CANCEL_DISTANCE || Math.abs(info.dy) >= TAP_CANCEL_DISTANCE) && this.cancelPendingTap(), pointerTypeForEvent(event), info.clientY, this.viewport.scrollTop(), this.viewport.dragPage(drag.startScroll, { dx: info.dx, dy: info.dy }));
    }
    handleDragEnd(info, event) {
      if (!this.zoomOverlay.active()) {
        if (pointerTypeForEvent(event), this.viewport.scrollTop(), info.dx, info.dy, this.viewportDrag = null, state.reader.viewMode.value !== "paged") {
          this.viewport.moveToTop(this.viewport.scrollTop()), this.viewport.startVerticalFlingFromDragVelocity(info.velocityY, () => this.updateCurrentFromScroll()), this.updateCurrentFromScroll();
          return;
        }
        info.dx >= PAGED_SWIPE_THRESHOLD ? this.turnPageBy(this.rightDragDelta()) : info.dx <= -PAGED_SWIPE_THRESHOLD ? this.turnPageBy(this.leftDragDelta()) : this.scrollToCurrentPage("animated");
      }
    }
    handleNativeScroll() {
      if (this.zoomOverlay.active() || this.gesture.dragging() || state.reader.viewMode.value === "paged")
        return;
      let previousScrollTop = this.viewport.scrollTop();
      this.viewport.moveToTop(previousScrollTop), this.viewport.scrollTop() === previousScrollTop && this.scrollFrame === null && (this.scrollFrame = window.requestAnimationFrame(() => {
        this.scrollFrame = null, this.updateCurrentFromScroll();
      }));
    }
    updateCurrentFromScroll() {
      let next = this.viewport.centerPageNum();
      next !== null && next !== this.currentPageNum && (this.direction = next > this.currentPageNum ? 1 : -1, this.currentPageNum = next, this.syncAfterPageChange({ scrollIntoView: !1 }));
    }
    handleTap(info, event) {
      this.viewportDrag = null, !this.consumeDoubleTap(info, event) && this.queueSingleTap(info, event);
    }
    runSingleTap(info, event) {
      if (this.zoomOverlay.active()) {
        event.preventDefault();
        return;
      }
      if (this.handleViewportTap(info))
        return;
      if (state.reader.viewMode.value === "scroll") {
        this.toggleToolbar();
        return;
      }
      let width = this.viewport.viewportWidth(), zone = info.clientX / width;
      zone >= 1 / 3 && zone <= 2 / 3 ? this.toggleToolbar() : this.turnPageBy(zone < 1 / 3 ? this.leftTapDelta() : this.rightTapDelta());
    }
    handleViewportTap(point) {
      return this.viewport.isHitEndPage(point) ? (this.close(), !0) : !1;
    }
    handleKeyboardClose() {
      if (this.zoomOverlay.active()) {
        this.zoomOverlay.close();
        return;
      }
      this.close();
    }
    handlePinchStart(info) {
      if (this.cancelPendingTap(), this.viewport.stopMotion(), this.viewportDrag = null, this.zoomOverlay.active())
        return this.zoomOverlay.startPinch({ centerX: info.clientX, centerY: info.clientY }), !0;
      let image = this.imageAtPoint(info);
      return image ? (this.zoomOverlay.start(image, { centerX: info.clientX, centerY: info.clientY }), !0) : !1;
    }
    toggleZoomAtPoint(point) {
      if (this.zoomOverlay.active())
        return this.zoomOverlay.close(), !0;
      let image = this.imageAtPoint(point);
      return image ? (this.viewport.stopMotion(), this.viewportDrag = null, this.zoomOverlay.start(image, { centerX: point.clientX, centerY: point.clientY }), this.zoomOverlay.movePinch({ centerX: point.clientX, centerY: point.clientY, scale: 2 }), this.zoomOverlay.endPinch(), !0) : !1;
    }
    imageAtPoint(point) {
      let pageNum = this.viewport.pageNumAtPoint(point);
      return pageNum === null ? null : this.loadedImages.get(pageNum) ?? null;
    }
    consumeDoubleTap(info, event) {
      let now = event.timeStamp || performance.now(), pending = this.pendingTap, nativeDoubleClick = (event instanceof MouseEvent ? event.detail : 0) >= 2, nearPendingTap = pending ? now - pending.time <= DOUBLE_TAP_MS && Math.hypot(info.clientX - pending.info.clientX, info.clientY - pending.info.clientY) <= DOUBLE_TAP_DISTANCE : !1;
      return !nativeDoubleClick && !nearPendingTap ? !1 : (this.cancelPendingTap(), this.toggleZoomAtPoint(info) ? (event.preventDefault(), !0) : !1);
    }
    queueSingleTap(info, event) {
      this.cancelPendingTap(), this.pendingTap = {
        info,
        event,
        time: event.timeStamp || performance.now()
      }, this.tapTimer = window.setTimeout(() => {
        let pending = this.pendingTap;
        this.pendingTap = null, this.tapTimer = null, pending && this.runSingleTap(pending.info, pending.event);
      }, DOUBLE_TAP_MS);
    }
    cancelPendingTap() {
      this.tapTimer !== null && (window.clearTimeout(this.tapTimer), this.tapTimer = null), this.pendingTap = null;
    }
    navigateProgressPage(pageNum) {
      let target = clamp(Math.round(pageNum), 1, this.maxProgressPageNum());
      target !== this.currentPageNum && (this.direction = target > this.currentPageNum ? 1 : -1, this.currentPageNum = target), ++this.syncToken, this.syncViewportWindow(), this.scrollToCurrentPage(), this.toolbar.setProgress({
        pageNum: target,
        totalPages: this.totalPages,
        maxProgressPageNum: Math.max(1, this.maxProgressPageNum()),
        keepInputValue: !0
      });
    }
    cancelProgressNavigation() {
      this.progressNavigationTimer !== null && (window.clearTimeout(this.progressNavigationTimer), this.progressNavigationTimer = null);
    }
    setMode(mode) {
      mode !== state.reader.viewMode.value && (state.reader.viewMode.set(mode), this.syncReaderControls(), this.rebuildForCurrentMode());
    }
    toggleReadDirection() {
      let readDirection = state.reader.readDirection.value === "rtl" ? "ltr" : "rtl";
      state.reader.readDirection.set(readDirection), this.syncReaderControls(), this.syncViewportWindow(), this.scrollToCurrentPage();
    }
    toggleRightTapAction() {
      let rightTapAction = state.reader.rightTapAction.value === "previous" ? "next" : "previous";
      state.reader.rightTapAction.set(rightTapAction), this.syncReaderControls();
    }
    syncReaderControls() {
      this.root.setMode(state.reader.viewMode.value), this.root.setReadDirection(state.reader.readDirection.value), this.toolbar.setControls({
        mode: state.reader.viewMode.value,
        readDirection: state.reader.readDirection.value,
        rightTapAction: state.reader.rightTapAction.value
      });
    }
    toggleToolbar() {
      this.toolbar.toggle();
    }
    rightTapDelta() {
      return state.reader.rightTapAction.value === "previous" ? -1 : 1;
    }
    leftTapDelta() {
      return -this.rightTapDelta();
    }
    rightDragDelta() {
      return state.reader.readDirection.value === "rtl" ? 1 : -1;
    }
    leftDragDelta() {
      return -this.rightDragDelta();
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
  function pageNumForPage(page, index) {
    let pageNum = page?.pageNum;
    return typeof pageNum == "number" && Number.isFinite(pageNum) && pageNum > 0 ? pageNum : index + 1;
  }
  function pointerTypeForEvent(event) {
    return "pointerType" in event ? event.pointerType : "mouse";
  }

  // src/components/SettingsMenu.css
  var SettingsMenu_default = `.ehpeek-settings-menu {
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

.ehpeek-settings-menu[hidden] {
  display: none;
}

.ehpeek-settings-item {
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

.ehpeek-settings-item:hover {
  background: color-mix(in srgb, currentColor 10%, transparent);
}

.ehpeek-settings-item::after {
  content: "";
  flex: 0 0 auto;
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #2faa44;
}

.ehpeek-settings-item[aria-checked="false"]::after {
  background: #999;
}
`;

  // src/components/SettingsMenu.tsx
  var STYLE_ID2 = "ehpeek-settings-style", SettingsMenu = class {
    constructor(triggerTagName, state2, handlers) {
      this.state = state2;
      this.handlers = handlers;
      this.root = triggerTagName === "a" ? /* @__PURE__ */ h("div", { className: "ehpeek-settings-root" }) : /* @__PURE__ */ h("span", { className: "ehpeek-settings-root" }), this.trigger = this.createTrigger(triggerTagName), this.menu = /* @__PURE__ */ h("div", { className: "ehpeek-settings-menu", hidden: !0 }), this.readerSetting = this.createSwitchButton(() => {
        this.handlers.onReaderToggle();
      }), this.enhanceThumbsGridsSetting = this.createSwitchButton(() => {
        this.handlers.onEnhanceThumbsGridsToggle(), this.update();
      }), this.enhanceSearchGridsSetting = this.createSwitchButton(() => {
        this.handlers.onEnhanceSearchGridsToggle(), this.update();
      }), this.touchUiSetting = this.createSwitchButton(() => {
        this.handlers.onTouchUiToggle(), this.update();
      }), this.menu.append(this.readerSetting, this.enhanceSearchGridsSetting, this.enhanceThumbsGridsSetting, this.touchUiSetting), this.root.append(this.trigger, this.menu), this.update();
    }
    mount(parent) {
      ensureSettingsStyle(), parent.append(this.root), this.bindGlobalEvents(), this.update();
    }
    open() {
      this.menu.hidden = !1, this.update(), this.position();
    }
    close() {
      this.menu.hidden || (this.menu.hidden = !0, this.update());
    }
    update() {
      let current = this.state();
      this.trigger.textContent = texts_default.settings.menuLabel, this.trigger.setAttribute("aria-expanded", String(!this.menu.hidden)), this.trigger.setAttribute("aria-haspopup", "menu"), this.updateSwitch(
        this.readerSetting,
        current.readerEnabled,
        current.readerEnabled ? texts_default.settings.readerOn : texts_default.settings.readerOff
      ), this.updateSwitch(
        this.enhanceSearchGridsSetting,
        current.enhanceSearchGridsEnabled,
        current.enhanceSearchGridsEnabled ? texts_default.settings.enhanceSearchOn : texts_default.settings.enhanceSearchOff
      ), this.updateSwitch(
        this.enhanceThumbsGridsSetting,
        current.enhanceThumbsGridsEnabled,
        current.enhanceThumbsGridsEnabled ? texts_default.settings.enhanceThumbsOn : texts_default.settings.enhanceThumbsOff
      ), this.updateSwitch(
        this.touchUiSetting,
        current.touchUiEnabled,
        current.touchUiEnabled ? texts_default.settings.touchUiOn : texts_default.settings.touchUiOff
      ), this.position();
    }
    createTrigger(tagName) {
      let onClick = (event) => {
        event.preventDefault(), event.stopPropagation(), this.toggle();
      };
      return tagName === "a" ? /* @__PURE__ */ h("a", { className: "ehpeek-settings-trigger", href: "#", onClick }) : /* @__PURE__ */ h("button", { type: "button", className: "ehpeek-settings-trigger", onClick });
    }
    createSwitchButton(onClick) {
      return /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "ehpeek-settings-item",
          role: "switch",
          onClick: (event) => {
            event.stopPropagation(), onClick();
          }
        }
      );
    }
    updateSwitch(button, checked, label) {
      button.setAttribute("aria-checked", String(checked)), button.textContent = label, button.removeAttribute("title");
    }
    toggle() {
      this.menu.hidden = !this.menu.hidden, this.update(), this.menu.hidden || this.position();
    }
    position() {
      this.menu.hidden || (this.menu.style.top = "8px", this.menu.style.right = "8px", this.menu.style.left = "");
    }
    bindGlobalEvents() {
      document.addEventListener("click", (event) => {
        event.target instanceof Element && this.root.contains(event.target) || this.close();
      }), document.addEventListener("keydown", (event) => {
        event.key === "Escape" && this.close();
      }), window.addEventListener("resize", () => this.position()), window.addEventListener("scroll", () => this.position(), !0);
    }
  };
  function ensureSettingsStyle() {
    if (document.getElementById(STYLE_ID2))
      return;
    let style = document.createElement("style");
    style.id = STYLE_ID2, style.textContent = SettingsMenu_default, document.head.append(style);
  }

  // src/components/Enhance/ScrollPageBar.tsx
  var SCROLL_PAGE_BAR_CLASS = "ehpeek-scroll-page-bar", SCROLL_PAGE_BAR_TOP_CLASS = "ehpeek-scroll-page-bar-top", SCROLL_PAGE_BAR_BOTTOM_CLASS = "ehpeek-scroll-page-bar-bottom", SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR = "data-ehpeek-window-index", DRAG_PIXEL_STEP = 18, galleryPageBarWindowIndex = null, ScrollPageBar = class {
    constructor(options) {
      this.dragStartWindowIndex = 0;
      let maxIndex = Math.max(0, options.maxIndex ?? options.currentIndex), currentIndex = clamp(options.currentIndex, 0, maxIndex);
      this.currentIndex = currentIndex, this.maxIndex = maxIndex, this.urlForIndex = options.urlForIndex, this.windowIndex = clamp(galleryPageBarWindowIndex ?? options.initialWindowIndex ?? currentIndex, 0, maxIndex), this.element = /* @__PURE__ */ h("table", { className: `${SCROLL_PAGE_BAR_CLASS} ${options.top ? SCROLL_PAGE_BAR_TOP_CLASS : SCROLL_PAGE_BAR_BOTTOM_CLASS}` }, /* @__PURE__ */ h("tbody", null)), this.render(), this.installDrag();
    }
    render() {
      let body = this.element.tBodies[0] ?? this.element.createTBody(), slots = pageSlots(this.windowIndex, this.currentIndex, this.maxIndex), firstSlotIndex = slots[0]?.pageIndex ?? this.currentIndex, lastSlotIndex = slots[slots.length - 1]?.pageIndex ?? this.currentIndex, currentBeforeWindow = this.currentIndex < firstSlotIndex, currentAfterWindow = this.currentIndex > lastSlotIndex, row = /* @__PURE__ */ h("tr", null, this.linkCell("<<", 0, this.currentIndex === 0), currentBeforeWindow ? this.linkCell(String(this.currentIndex + 1), this.currentIndex, !0) : this.emptyCell(), this.linkCell("<", Math.max(0, this.currentIndex - 1), this.currentIndex === 0), slots.map(
        (slot) => slot ? this.linkCell(String(slot.pageIndex + 1), slot.pageIndex, slot.pageIndex === this.currentIndex) : this.emptyCell()
      ), this.linkCell(">", Math.min(this.maxIndex, this.currentIndex + 1), this.currentIndex === this.maxIndex), currentAfterWindow ? this.linkCell(String(this.currentIndex + 1), this.currentIndex, !0) : this.emptyCell(), this.linkCell(">>", this.maxIndex, this.currentIndex === this.maxIndex));
      body.replaceChildren(row), this.element.setAttribute(SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR, String(this.windowIndex));
    }
    linkCell(text, pageIndex, current) {
      return current ? /* @__PURE__ */ h("td", { className: "ptds" }, /* @__PURE__ */ h("span", null, text)) : /* @__PURE__ */ h("td", null, /* @__PURE__ */ h("a", { href: this.urlForIndex(pageIndex), "data-page-index": String(pageIndex) }, text));
    }
    emptyCell() {
      return /* @__PURE__ */ h("td", { className: "ehpeek-scroll-page-bar-empty" }, /* @__PURE__ */ h("span", null));
    }
    installDrag() {
      new PointerDrag(this.element, {
        shouldStart: () => this.draggable(),
        onStart: () => {
          this.dragStartWindowIndex = this.windowIndex, this.element.classList.add("ehpeek-scroll-page-bar-dragging");
        },
        onMove: (info) => {
          if (Math.abs(info.dx) < Math.abs(info.dy))
            return;
          let nextIndex = clamp(this.dragStartWindowIndex - acceleratedPageOffset(info.dx), 0, this.maxIndex);
          nextIndex !== this.windowIndex && (this.windowIndex = nextIndex, galleryPageBarWindowIndex = nextIndex, this.render());
        },
        onEnd: () => {
          this.element.classList.remove("ehpeek-scroll-page-bar-dragging");
        }
      });
    }
    draggable() {
      return this.maxIndex + 1 > 7;
    }
  };
  function createScrollPageBar(options) {
    return new ScrollPageBar(options).element;
  }
  function setScrollPageBarWindowIndex(index) {
    galleryPageBarWindowIndex = Math.max(0, Math.round(index));
  }
  function pageSlots(windowIndex, currentIndex, maxIndex) {
    if (maxIndex + 1 <= 7)
      return range(0, maxIndex).map((pageIndex) => ({ type: "page", pageIndex }));
    let windowStart = clamp(windowIndex - 3, -1, maxIndex - 5);
    return range(windowStart, windowStart + 6).map(
      (pageIndex) => pageIndex >= 0 && pageIndex <= maxIndex ? { type: "page", pageIndex } : null
    );
  }
  function range(start, end) {
    let output = [];
    for (let index = start; index <= end; index += 1)
      output.push(index);
    return output;
  }
  function acceleratedPageOffset(dx) {
    let distance = Math.abs(dx), direction = dx > 0 ? 1 : -1, pages = Math.floor((distance / DRAG_PIXEL_STEP) ** 1.35);
    return direction * pages;
  }

  // src/components/Enhance/ScrollPageBar.css
  var ScrollPageBar_default = `.ehpeek-scroll-page-bar {
  border-collapse: separate;
  border-spacing: 4px;
  margin-left: auto;
  margin-right: auto;
  touch-action: pan-y;
}

.ehpeek-scroll-page-bar-top {
  margin-top: 2px;
  margin-bottom: 0;
}

.ehpeek-scroll-page-bar-bottom {
  margin-top: 0;
  margin-bottom: 10px;
}

.ehpeek-scroll-page-bar td {
  min-width: 34px;
  height: 34px;
  padding: 0;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  vertical-align: middle;
  user-select: none;
}

.ehpeek-scroll-page-bar-dragging {
  cursor: grabbing;
}

.ehpeek-scroll-page-bar-dragging td {
  cursor: grabbing;
}

.ehpeek-scroll-page-bar a,
.ehpeek-scroll-page-bar button,
.ehpeek-scroll-page-bar span {
  display: flex;
  min-width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  padding: 0 8px;
  border: 1px solid currentColor;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  text-decoration: none;
}

.ehpeek-scroll-page-bar button {
  color: inherit;
  cursor: pointer;
}

.ehpeek-scroll-page-bar a:hover,
.ehpeek-scroll-page-bar button:hover {
  text-decoration: none;
}

.ehpeek-scroll-page-bar a:active,
.ehpeek-scroll-page-bar button:active {
  text-decoration: none;
}

.ehpeek-scroll-page-bar .ptds span,
.ehpeek-scroll-page-bar .ptds a {
  padding: 0 10px;
}

.ehpeek-scroll-page-bar .ehpeek-scroll-page-bar-empty {
  cursor: default;
}

.ehpeek-scroll-page-bar .ehpeek-scroll-page-bar-empty span {
  visibility: hidden;
}

.ehpeek-preview-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.72;
}

.ehpeek-preview-placeholder::before {
  content: "Loading...";
  font-weight: 700;
}

@media (pointer: coarse) {
  .ehpeek-scroll-page-bar {
    border-spacing: 6px;
  }

  .ehpeek-scroll-page-bar td {
    min-width: 38px;
    height: 38px;
    border-radius: 6px;
  }

  .ehpeek-scroll-page-bar a,
  .ehpeek-scroll-page-bar button,
  .ehpeek-scroll-page-bar span {
    min-width: 38px;
    height: 38px;
    padding: 0 10px;
  }

  .ehpeek-scroll-page-bar .ptds span {
    padding: 0 12px;
  }
}
`;

  // src/eh/dom.ts
  var GALLERY_STYLE_ID = "ehpeek-gallery-style", TOUCH_GALLERY_PANEL_PAGE_STYLE_ID = "ehpeek-touch-gallery-panel-page-style", TOUCH_TOP_BAR_PAGE_STYLE_ID = "ehpeek-touch-top-bar-page-style", SCROLL_PAGE_BAR_TOP_CLASS2 = "ehpeek-scroll-page-bar-top", SCROLL_PAGE_BAR_BOTTOM_CLASS2 = "ehpeek-scroll-page-bar-bottom", PREVIEW_PLACEHOLDER_CLASS = "ehpeek-preview-placeholder", originalTopBar = null, originalGalleryPanel = null, TOUCH_GALLERY_PANEL_PAGE_CSS = `
@media (max-width: 760px), (pointer: coarse) {
  #gd2,
  #gd5 {
    display: none !important;
  }

  .ptt,
  .ptb,
  .ehpeek-scroll-page-bar {
    max-width: 100% !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch;
  }

  #gdt {
    width: 100% !important;
    margin: 8px 0 !important;
    padding: 0 !important;
    text-align: center !important;
  }

  #gdt .gdtm,
  #gdt .gdtl,
  #gdt > div {
    display: inline-flex !important;
    min-width: 132px !important;
    align-items: center !important;
    justify-content: center !important;
    vertical-align: top;
  }

  #gdt a {
    display: flex !important;
    min-height: 150px;
    align-items: center;
    justify-content: center;
  }

  .ehpeek-touch-gallery-rating #gdr {
    margin: 0 !important;
  }
}
`, TOUCH_TOP_BAR_PAGE_CSS = "";
  function imageAspectRatio(image) {
    let width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || ""), height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");
    return width > 0 && height > 0 ? height / width : 1.42;
  }
  function collectGalleryPages(extractPageType2, root = document, baseUrl = window.location.href) {
    let links = Array.from(
      root.querySelectorAll("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']")
    ), seen = /* @__PURE__ */ new Set(), pages = [];
    for (let link of links) {
      let url = normalizeUrl(link.getAttribute("href") || "", baseUrl), page = extractPageType2(url);
      !url || page.type !== "image" || seen.has(url) || (seen.add(url), pages.push({
        url,
        aspectRatio: imageAspectRatio(link.querySelector("img")),
        pageNum: page.pageNum
      }));
    }
    return pages.sort((left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER));
  }
  function readShowingRange(root = document) {
    let match = (root.querySelector(".gpc")?.textContent ?? "").match(/([\d,]+)\s*-\s*([\d,]+)\s+of\s+([\d,]+)/i);
    if (!match)
      return null;
    let start = Number(match[1].replace(/,/g, "")), end = Number(match[2].replace(/,/g, "")), total = Number(match[3].replace(/,/g, ""));
    return [start, end, total].every((value) => Number.isFinite(value) && value > 0) ? { start, end, total } : null;
  }
  function searchPageNavigation(root = document) {
    let previousUrl = root.querySelector(".searchnav a[id$='prev'][href]")?.href ?? null, nextUrl = root.querySelector(".searchnav a[id$='next'][href]")?.href ?? null;
    return previousUrl || nextUrl ? { previousUrl, nextUrl } : null;
  }
  function searchResultList(root = document) {
    return root.querySelector(".itg");
  }
  function searchNavigationBars(root = document) {
    return Array.from(root.querySelectorAll(".searchnav"));
  }
  function findSearchNavigationLink(target) {
    let link = target instanceof Element ? target.closest(
      ".searchnav a[id$='first'][href], .searchnav a[id$='prev'][href], .searchnav a[id$='next'][href], .searchnav a[id$='last'][href]"
    ) : null;
    return link instanceof HTMLAnchorElement ? link : null;
  }
  function replaceSearchPageContent(doc) {
    let currentList = searchResultList(), incomingList = searchResultList(doc);
    if (!currentList || !incomingList)
      return null;
    replaceFirstElement("#rangebar", doc), replaceFirstElement(".searchtext", doc), replaceSearchRangeScript(doc), replaceSearchNavigationBars(doc);
    let importedList = document.importNode(incomingList, !0);
    return currentList.replaceWith(importedList), importedList;
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
  function findClickedImageLink(target, extractPageType2) {
    let link = target instanceof Element ? target.closest("a[href]") : null;
    return !(link instanceof HTMLAnchorElement) || extractPageType2(link.href).type !== "image" ? null : link.querySelector("img") || link.closest("#gdt, .gdtm, .gdtl") ? link : null;
  }
  function replaceGalleryPageBar(options) {
    ensureGalleryStyle();
    let originals = Array.from(document.querySelectorAll(".ptt, .ptb")), topSource = originals.find((item) => item.classList.contains("ptt")) ?? originals[0], bottomSource = originals.find((item) => item.classList.contains("ptb")) ?? originals[1] ?? originals[0];
    topSource && replaceGalleryPageBarAt(topSource, !0, options), bottomSource && replaceGalleryPageBarAt(bottomSource, !1, options);
    for (let original of originals)
      original.hidden = !0;
  }
  function restoreGalleryPageBar() {
    document.querySelectorAll(`.${SCROLL_PAGE_BAR_TOP_CLASS2}, .${SCROLL_PAGE_BAR_BOTTOM_CLASS2}`).forEach((item) => {
      item.remove();
    }), document.querySelectorAll(".ptt, .ptb").forEach((item) => {
      item.hidden = !1;
    });
  }
  function snapshotPreview() {
    return {
      description: document.querySelector(".gpc")?.cloneNode(!0) ?? null,
      thumbs: document.querySelector("#gdt")?.cloneNode(!0) ?? null
    };
  }
  function installPreviewPlaceholder() {
    let current = document.querySelector("#gdt");
    if (!current)
      return;
    let rect = current.getBoundingClientRect(), placeholder = document.createElement("div");
    placeholder.id = "gdt", placeholder.className = PREVIEW_PLACEHOLDER_CLASS, placeholder.style.minHeight = `${Math.max(160, Math.round(rect.height))}px`, placeholder.setAttribute("aria-busy", "true"), current.replaceWith(placeholder);
  }
  function replacePreviewContent(doc) {
    replaceFirstElement(".gpc", doc), replaceFirstElement("#gdt", doc);
  }
  function restorePreview(snapshot) {
    let currentDescription = document.querySelector(".gpc"), currentThumbs = document.querySelector("#gdt");
    snapshot.description && currentDescription && currentDescription.replaceWith(snapshot.description), snapshot.thumbs && currentThumbs && currentThumbs.replaceWith(snapshot.thumbs);
  }
  function mountSettingsMenu(settingsMenu2) {
    let touchTopBarMenu = document.querySelector(".ehpeek-touch-top-bar-menu-panel"), thumbnailContainer = document.querySelector("#gdt"), titleContainer = document.querySelector("#gd2, h1"), topNav = document.querySelector("#nb"), anchor = thumbnailContainer ?? titleContainer;
    if (touchTopBarMenu)
      return settingsMenu2.mount(touchTopBarMenu), !0;
    if (topNav)
      return settingsMenu2.mount(topNav), !0;
    if (!anchor?.parentElement)
      return !1;
    let wrapper = document.createElement("div");
    return wrapper.style.textAlign = "right", thumbnailContainer ? anchor.parentElement.insertBefore(wrapper, anchor) : anchor.insertAdjacentElement("afterend", wrapper), settingsMenu2.mount(wrapper), !0;
  }
  function settingsMenuTriggerTagName() {
    return document.querySelector("#nb") && !document.querySelector(".ehpeek-touch-top-bar") ? "a" : "button";
  }
  function installTouchGalleryPanelPageStyle() {
    if (document.getElementById(TOUCH_GALLERY_PANEL_PAGE_STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = TOUCH_GALLERY_PANEL_PAGE_STYLE_ID, style.textContent = TOUCH_GALLERY_PANEL_PAGE_CSS, document.head.append(style);
  }
  function uninstallTouchGalleryPanelPageStyle() {
    document.getElementById(TOUCH_GALLERY_PANEL_PAGE_STYLE_ID)?.remove();
  }
  function installTouchTopBarPageStyle() {
    if (document.getElementById(TOUCH_TOP_BAR_PAGE_STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = TOUCH_TOP_BAR_PAGE_STYLE_ID, style.textContent = TOUCH_TOP_BAR_PAGE_CSS, document.head.append(style);
  }
  function uninstallTouchTopBarPageStyle() {
    document.getElementById(TOUCH_TOP_BAR_PAGE_STYLE_ID)?.remove();
  }
  function mountTouchTopBar(topBar) {
    let original = document.querySelector("#nb");
    return original?.parentElement ? (originalTopBar = original, original.replaceWith(topBar), !0) : !1;
  }
  function restoreTouchTopBar() {
    let current = document.querySelector(".ehpeek-touch-top-bar");
    current && originalTopBar ? current.replaceWith(originalTopBar) : current?.remove(), originalTopBar = null;
  }
  function mountTouchGalleryPanel(panel) {
    let original = document.querySelector("#gmid");
    return original?.parentElement ? (originalGalleryPanel = original, original.replaceWith(panel), !0) : !1;
  }
  function restoreTouchGalleryPanel() {
    let current = document.querySelector(".ehpeek-touch-gallery");
    current && originalGalleryPanel ? current.replaceWith(originalGalleryPanel) : current?.remove(), originalGalleryPanel = null;
  }
  function readTouchTopBarInfo() {
    let navItems = Array.from(document.querySelectorAll("#nb a[href]")).map((link) => {
      let clone = link.cloneNode(!0);
      return clone.removeAttribute("id"), clone.className = "ehpeek-touch-top-bar-menu-item", clone;
    });
    return {
      available: navItems.length > 0,
      navItems,
      homeHref: navItems.find((item) => item instanceof HTMLAnchorElement)?.href ?? "/"
    };
  }
  function readGalleryInfo() {
    let meta = readGalleryMeta(), range2 = readShowingRange(), coverSource = document.querySelector("#gd1 img"), coverUrl = coverSource?.currentSrc || coverSource?.src || coverSource?.getAttribute("src") || backgroundImageUrl(document.querySelector("#gd1")), summary = [
      meta.get("language"),
      range2?.total ? `${range2.total} ${texts_default.reader.pages.toLowerCase()}` : void 0,
      meta.get("file size") ?? meta.get("size"),
      meta.get("favorited"),
      meta.get("posted") ?? meta.get("parent")
    ].filter((value) => !!value).slice(0, 6).map((value) => ({ value }));
    return {
      available: !!document.querySelector("#gmid"),
      titleMain: textOf("#gn"),
      titleSub: textOf("#gj"),
      category: textOf("#gdc"),
      cover: coverUrl ? createGalleryCoverImage(coverUrl) : null,
      summary,
      actions: readGalleryActions(),
      rating: readGalleryRating(),
      tagGroups: readGalleryTagGroups()
    };
  }
  function replaceGalleryPageBarAt(source, top, options) {
    let className = top ? SCROLL_PAGE_BAR_TOP_CLASS2 : SCROLL_PAGE_BAR_BOTTOM_CLASS2, existing = document.querySelector(`.${className}`), initialWindowIndex = existing ? Number(existing.getAttribute(SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR) || "") : void 0, pageBar = createScrollPageBar({
      currentIndex: options.currentIndex,
      initialWindowIndex: Number.isFinite(initialWindowIndex) ? initialWindowIndex : void 0,
      maxIndex: options.maxIndex,
      top,
      urlForIndex: options.previewUrlForIndex
    });
    existing ? existing.replaceWith(pageBar) : source.insertAdjacentElement("afterend", pageBar);
  }
  function replaceFirstElement(selector, doc) {
    let current = document.querySelector(selector), incoming = doc.querySelector(selector);
    !current || !incoming || current.replaceWith(document.importNode(incoming, !0));
  }
  function replaceSearchNavigationBars(doc) {
    let currentBars = searchNavigationBars(), incomingBars = searchNavigationBars(doc), count = Math.min(currentBars.length, incomingBars.length);
    for (let index = 0; index < count; index += 1)
      currentBars[index].replaceWith(document.importNode(incomingBars[index], !0));
  }
  function replaceSearchRangeScript(doc) {
    let incomingScript = Array.from(doc.querySelectorAll("script")).find(
      (item) => item.textContent?.includes("build_rangebar()")
    );
    if (!incomingScript)
      return;
    let currentScript = Array.from(document.querySelectorAll("script")).find(
      (item) => item.textContent?.includes("build_rangebar()")
    ), script = document.createElement("script");
    script.type = incomingScript.type || "text/javascript", script.textContent = incomingScript.textContent, currentScript ? currentScript.replaceWith(script) : searchNavigationBars()[0]?.before(script);
  }
  function ensureGalleryStyle() {
    if (document.getElementById(GALLERY_STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = GALLERY_STYLE_ID, style.textContent = ScrollPageBar_default, document.head.append(style);
  }
  function readGalleryMeta() {
    let entries = Array.from(document.querySelectorAll("#gdd tr")).map((row) => {
      let cells = Array.from(row.cells), label = cells[0]?.textContent?.trim().replace(/:$/, "").toLowerCase() ?? "", value = cells.slice(1).map((cell) => cell.textContent?.trim() ?? "").filter(Boolean).join(" ");
      return [label, value];
    }).filter(([label, value]) => label && value);
    return new Map(entries);
  }
  function readGalleryRating() {
    let element = document.querySelector("#gdr") ?? document.querySelector("#rating") ?? document.querySelector("#rating_label")?.parentElement ?? null;
    if (!element)
      return null;
    let wrapper = document.createElement("div"), scaler = document.createElement("div");
    return wrapper.className = "ehpeek-touch-gallery-rating", scaler.className = "ehpeek-touch-gallery-rating-scale", scaler.append(element), wrapper.append(scaler), wrapper;
  }
  function readGalleryActions() {
    return Array.from(document.querySelectorAll("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']")).map((item) => {
      let clone = item.cloneNode(!0);
      return clone.removeAttribute("id"), clone.classList.add("ehpeek-touch-gallery-actions-menu-item"), clone;
    }).slice(0, 6);
  }
  function readGalleryTagGroups() {
    let rows = Array.from(document.querySelectorAll("#taglist tr"));
    if (rows.length > 0)
      return rows.map((row) => {
        let namespace = row.querySelector(".tc, td:first-child")?.textContent?.trim().replace(/:$/, "") || "tag", tags = Array.from(row.querySelectorAll("a")).map(cloneGalleryTag).filter(Boolean).slice(0, 30);
        return { namespace, tags };
      }).filter((group) => group.tags.length > 0);
    let groups = /* @__PURE__ */ new Map();
    for (let tag of Array.from(document.querySelectorAll("#taglist a")).slice(0, 60)) {
      let clone = cloneGalleryTag(tag), tags = groups.get("tag") ?? [];
      tags.push(clone), groups.set("tag", tags);
    }
    return Array.from(groups, ([namespace, tags]) => ({ namespace, tags }));
  }
  function cloneGalleryTag(tag) {
    let clone = tag.cloneNode(!0);
    return clone.removeAttribute("id"), clone;
  }
  function findDownloadAction() {
    let actions = Array.from(document.querySelectorAll("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']"));
    return actions.find((item) => /download|archive/i.test(item.textContent ?? item.getAttribute("value") ?? "")) ?? actions[0] ?? null;
  }
  function clickGalleryDownloadAction() {
    findDownloadAction()?.click();
  }
  function mountGalleryContinueReadingButton(button) {
    let viewerOptions = document.querySelector("#gd5");
    if (viewerOptions) {
      viewerOptions.classList.add("ehpeek-gallery-actions"), viewerOptions.append(button);
      return;
    }
    document.body.append(button);
  }
  function textOf(selector) {
    return document.querySelector(selector)?.textContent?.trim() ?? "";
  }
  function createGalleryCoverImage(imageUrl) {
    let image = document.createElement("img");
    return image.src = imageUrl, image.alt = "", image.decoding = "async", image.loading = "eager", image;
  }
  function backgroundImageUrl(root) {
    if (!root)
      return "";
    for (let item of [root, ...Array.from(root.querySelectorAll("*"))]) {
      let match = window.getComputedStyle(item).backgroundImage.match(/url\(["']?(.+?)["']?\)/);
      if (match?.[1])
        return match[1];
    }
    return "";
  }

  // src/components/Enhance/TouchGalleryPanel.css
  var TouchGalleryPanel_default = `.ehpeek-touch-gallery {
  display: none;
}

@media (max-width: 760px), (pointer: coarse) {
  html,
  body {
    min-width: 0 !important;
    overflow-x: hidden !important;
    text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
  }

  body {
    box-sizing: border-box;
    padding-left: 0 !important;
    padding-right: 0 !important;
    background: #34353b !important;
    font-size: 14px !important;
    line-height: 1.35 !important;
  }

  .ehpeek-touch-gallery {
    display: flex;
    box-sizing: border-box;
    width: 100%;
    flex-direction: column !important;
    gap: 0;
    margin: 0 0 12px;
    color: #d9d9d9;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .ehpeek-touch-gallery-hero {
    position: relative;
    display: grid;
    height: clamp(260px, 42vh, 340px);
    padding: 18px max(16px, env(safe-area-inset-right, 0px)) 48px max(16px, env(safe-area-inset-left, 0px));
    background: #4f535b;
    color: #f1f1f1;
  }

  .ehpeek-touch-gallery-summary {
    display: grid;
    height: 100%;
    min-height: 0;
    grid-template-columns: 36% minmax(0, 1fr);
    gap: 18px;
    align-items: start;
  }

  .ehpeek-touch-gallery-cover {
    display: flex;
    align-self: center;
    width: 100%;
    aspect-ratio: 2 / 3;
    height: auto;
    max-height: 100%;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    background: transparent;
  }

  .ehpeek-touch-gallery-cover img,
  .ehpeek-touch-gallery-cover > * {
    display: block;
    width: 100% !important;
    max-width: 100% !important;
    height: 100% !important;
    max-height: 100% !important;
    margin: 0 auto;
    object-fit: contain;
    object-position: center;
  }

  .ehpeek-touch-gallery-hero-side {
    display: flex;
    align-self: stretch;
    min-width: 0;
    min-height: 0;
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding-top: 2px;
  }

  .ehpeek-touch-gallery-heading {
    display: flex;
    min-width: 0;
    min-height: 0;
    width: 100%;
    flex-direction: column;
    gap: 6px;
    align-items: flex-start;
    overflow: hidden;
  }

  .ehpeek-touch-gallery-title-main {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 4;
    font-size: clamp(22px, 5.9vw, 32px);
    font-weight: 400;
    line-height: 1.1;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .ehpeek-touch-gallery-title-sub {
    display: -webkit-box;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
    opacity: 0.88;
    font-size: clamp(17px, 4.6vw, 25px);
    line-height: 1.15;
    text-align: left;
    overflow-wrap: anywhere;
  }

  .ehpeek-touch-gallery-category-row {
    display: flex;
    width: 100%;
    min-height: 64px;
    gap: 4px;
    align-items: center;
    margin-top: auto;
  }

  .ehpeek-touch-gallery-category {
    min-width: 0;
    align-self: center;
    justify-self: start;
    padding: 6px 12px;
    background: #34353b;
    color: #f0b35a;
    font-size: 17px;
    font-weight: 700;
    line-height: 1.1;
    text-transform: uppercase;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .ehpeek-touch-gallery-rating {
    position: relative;
    display: flex !important;
    min-width: 0;
    flex: 1 1 auto;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 0;
    width: auto !important;
    min-height: var(--ehpeek-rating-height, auto) !important;
    height: auto !important;
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background: transparent !important;
    overflow: visible;
    text-align: left;
    font-size: 20px;
    line-height: 1.15;
  }

  .ehpeek-touch-gallery-rating-scale {
    width: max-content;
    max-width: none !important;
    transform: scale(var(--ehpeek-rating-scale, 1));
    transform-origin: left top;
  }

  .ehpeek-touch-gallery-rating img,
  .ehpeek-touch-gallery-rating input,
  .ehpeek-touch-gallery-rating button,
  .ehpeek-touch-gallery-rating table,
  .ehpeek-touch-gallery-rating tbody,
  .ehpeek-touch-gallery-rating tr,
  .ehpeek-touch-gallery-rating td,
  .ehpeek-touch-gallery-rating > * {
    margin: 0 !important;
    padding: 0 !important;
    border: 0 !important;
    background-color: transparent !important;
    max-width: 100%;
    min-height: 24px;
    height: auto;
    overflow: visible;
    touch-action: manipulation;
  }

  .ehpeek-touch-gallery-rating table {
    border-collapse: collapse !important;
    border-spacing: 0 !important;
  }

  .ehpeek-touch-gallery-primary {
    position: relative;
    z-index: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    min-height: 87px;
    margin: -18px max(14px, env(safe-area-inset-right, 0px)) 0 max(14px, env(safe-area-inset-left, 0px));
    overflow: hidden;
    border-radius: 3px;
    background: #3f4249;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.32);
  }

  .ehpeek-touch-gallery-primary-button {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: center;
    padding: 12px 15px;
    border: 0;
    background: transparent;
    color: #f0b35a;
    font-size: 26px;
    font-weight: 700;
    text-align: center;
    text-decoration: none;
    text-transform: uppercase;
    touch-action: manipulation;
  }

  .ehpeek-touch-gallery-primary > * + * {
    border-left: 1px solid rgba(255, 255, 255, 0.12);
  }

  .ehpeek-touch-gallery-content {
    display: flex;
    flex-direction: column;
    gap: 16px;
    padding: 28px max(16px, env(safe-area-inset-right, 0px)) 18px max(16px, env(safe-area-inset-left, 0px));
    background: #34353b;
  }

  .ehpeek-touch-gallery-meta {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 14px 18px;
    align-items: center;
    font-size: 27px;
    line-height: 1.2;
    text-align: center;
  }

  .ehpeek-touch-gallery-meta-value {
    display: -webkit-box;
    min-width: 0;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    white-space: normal;
    overflow-wrap: normal;
    word-break: normal;
  }

  .ehpeek-touch-gallery-actions-menu {
    position: relative;
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: center;
  }

  .ehpeek-touch-gallery-actions-menu-button {
    display: inline-flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: #f1f1f1;
    font-size: 28px;
    line-height: 1;
  }

  .ehpeek-touch-gallery-actions-menu-panel {
    position: absolute;
    top: 48px;
    right: 0;
    z-index: 2147483644;
    display: flex;
    min-width: 285px;
    max-width: min(78vw, 320px);
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #8d7454;
    border-radius: 4px;
    background: #3f4249;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.38);
  }

  .ehpeek-touch-gallery-actions-menu-panel[hidden] {
    display: none;
  }

  .ehpeek-touch-gallery-actions-menu-panel a,
  .ehpeek-touch-gallery-actions-menu-panel button,
  .ehpeek-touch-gallery-actions-menu-panel input[type="button"],
  .ehpeek-touch-gallery-actions-menu-panel input[type="submit"] {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-height: 56px;
    padding: 14px 18px;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    color: #f1f1f1 !important;
    font-size: 21px;
    line-height: 1.2;
    text-align: left;
    text-decoration: none;
  }

  .ehpeek-touch-gallery-tag-groups {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding-top: 2px;
  }

  .ehpeek-touch-gallery-tag-group {
    display: grid;
    grid-template-columns: minmax(88px, 28%) minmax(0, 1fr);
    gap: 8px;
    align-items: start;
  }

  .ehpeek-touch-gallery-tag-group-name {
    min-height: 34px;
    padding: 7px 10px;
    border-radius: 999px;
    background: #5b3f5f;
    color: #f0b35a;
    font-size: 21px;
    text-align: center;
    text-transform: lowercase;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .ehpeek-touch-gallery-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .ehpeek-touch-gallery-tags a,
  .ehpeek-touch-gallery-tag {
    display: inline-flex;
    min-height: 51px;
    align-items: center;
    padding: 0 21px;
    border: 1px solid #8d7454;
    border-radius: 999px;
    background: #4f535b;
    color: #f0b35a !important;
    font-size: 23px;
    text-decoration: none;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
}
`;

  // src/components/Enhance/TouchGalleryPanel.tsx
  var STYLE_ID3 = "ehpeek-touch-gallery-panel-style", MOBILE_QUERY = "(max-width: 760px), (pointer: coarse)", TouchGalleryPanel = class {
    install() {
      if (ensureTouchGalleryPanelStyle(), installTouchGalleryPanelPageStyle(), !this.isActive() || document.querySelector(".ehpeek-touch-gallery"))
        return;
      let source = readGalleryInfo();
      if (!source.available)
        return;
      let shell = this.createShell(source);
      this.prepareRatingScale(shell), mountTouchGalleryPanel(shell) || document.body.prepend(shell);
    }
    mountContinueButton(button) {
      if (!this.isActive())
        return !1;
      let actions = document.querySelector(".ehpeek-touch-gallery-primary-actions");
      return actions ? (actions.append(button), !0) : !1;
    }
    remove() {
      restoreTouchGalleryPanel(), document.getElementById(STYLE_ID3)?.remove(), uninstallTouchGalleryPanelPageStyle();
    }
    createShell(source) {
      let cover = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-cover" }), category = textBlock("ehpeek-touch-gallery-category", source.category), categoryRow = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-category-row" }), heading = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-heading" }, textBlock("ehpeek-touch-gallery-title-main", source.titleMain), textBlock("ehpeek-touch-gallery-title-sub", source.titleSub)), primaryActions = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-primary-actions" }), meta = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-meta" }), tagGroups = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-tag-groups" }), content = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-content" });
      source.cover && cover.append(source.cover);
      for (let item of source.summary)
        meta.append(textBlock("ehpeek-touch-gallery-meta-value", item.value));
      meta.append(this.createActionsMenu(source.actions)), categoryRow.append(category), source.rating && categoryRow.append(source.rating), content.append(meta);
      for (let group of source.tagGroups)
        tagGroups.append(this.createTagGroup(group));
      return tagGroups.childNodes.length > 0 && content.append(tagGroups), /* @__PURE__ */ h("section", { className: "ehpeek-touch-gallery" }, /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-hero" }, /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-summary" }, cover, /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-hero-side" }, heading, categoryRow))), /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-primary" }, this.createDownloadButton(), primaryActions), content);
    }
    createActionsMenu(actions) {
      let menu = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-actions-menu" }), panel = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-actions-menu-panel", hidden: !0 }), button = /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "ehpeek-touch-gallery-actions-menu-button",
          "aria-haspopup": "menu",
          "aria-expanded": "false",
          onClick: (event) => {
            event.stopPropagation(), panel.hidden = !panel.hidden, button.setAttribute("aria-expanded", String(!panel.hidden));
          }
        },
        "⋮"
      );
      return panel.append(...actions), document.addEventListener("click", (event) => {
        event.target instanceof Element && menu.contains(event.target) || (panel.hidden = !0, button.setAttribute("aria-expanded", "false"));
      }), menu.append(button, panel), menu;
    }
    createTagGroup(group) {
      let wrapper = /* @__PURE__ */ h("section", { className: "ehpeek-touch-gallery-tag-group" }), tags = /* @__PURE__ */ h("div", { className: "ehpeek-touch-gallery-tags" });
      wrapper.append(textBlock("ehpeek-touch-gallery-tag-group-name", group.namespace));
      for (let tag of group.tags)
        tags.append(tag);
      return wrapper.append(tags), wrapper;
    }
    createDownloadButton() {
      return /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "ehpeek-touch-gallery-primary-button",
          onClick: () => {
            clickGalleryDownloadAction();
          }
        },
        texts_default.reader.download
      );
    }
    isActive() {
      return window.matchMedia(MOBILE_QUERY).matches;
    }
    prepareRatingScale(shell) {
      let wrapper = shell.querySelector(".ehpeek-touch-gallery-rating"), scaler = shell.querySelector(".ehpeek-touch-gallery-rating-scale");
      if (!wrapper || !scaler)
        return;
      let previousStyle = {
        position: shell.style.position,
        visibility: shell.style.visibility,
        pointerEvents: shell.style.pointerEvents,
        left: shell.style.left,
        top: shell.style.top,
        width: shell.style.width
      };
      shell.style.position = "absolute", shell.style.visibility = "hidden", shell.style.pointerEvents = "none", shell.style.left = "0", shell.style.top = "0", shell.style.width = "100%", document.body.append(shell);
      let wrapperWidth = wrapper.getBoundingClientRect().width, scalerRect = scaler.getBoundingClientRect(), scale = scalerRect.width > 0 && wrapperWidth > 0 ? Math.min(2, Math.max(1, wrapperWidth / scalerRect.width)) : 1;
      wrapper.style.setProperty("--ehpeek-rating-scale", String(scale)), wrapper.style.setProperty("--ehpeek-rating-height", `${Math.ceil(scalerRect.height * scale)}px`), shell.remove(), shell.style.position = previousStyle.position, shell.style.visibility = previousStyle.visibility, shell.style.pointerEvents = previousStyle.pointerEvents, shell.style.left = previousStyle.left, shell.style.top = previousStyle.top, shell.style.width = previousStyle.width;
    }
  };
  function ensureTouchGalleryPanelStyle() {
    if (document.getElementById(STYLE_ID3))
      return;
    let style = document.createElement("style");
    style.id = STYLE_ID3, style.textContent = TouchGalleryPanel_default, document.head.append(style);
  }
  function textBlock(className, text) {
    let element = /* @__PURE__ */ h("div", { className });
    return element.textContent = text, element;
  }

  // src/components/Enhance/TouchTopBar.css
  var TouchTopBar_default = `.ehpeek-touch-top-bar {
  display: none;
}

@media (max-width: 760px), (pointer: coarse) {
  .ehpeek-touch-top-bar {
    position: relative;
    z-index: 2147483640;
    display: flex;
    box-sizing: border-box;
    width: 100%;
    min-height: 56px;
    align-items: center;
    justify-content: space-between;
    padding: 6px max(16px, env(safe-area-inset-right, 0px)) 6px max(16px, env(safe-area-inset-left, 0px));
    background: #4f535b;
    color: #f1f1f1;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  }

  .ehpeek-touch-top-bar-menu {
    position: relative;
  }

  .ehpeek-touch-top-bar-home,
  .ehpeek-touch-top-bar-menu-button {
    display: inline-flex;
    width: 44px;
    height: 44px;
    align-items: center;
    justify-content: center;
    border: 0;
    background: transparent;
    color: #f1f1f1;
    font-size: 28px;
    line-height: 1;
    text-decoration: none;
  }

  .ehpeek-touch-top-bar-menu-panel {
    position: fixed;
    top: max(56px, env(safe-area-inset-top, 0px));
    right: max(16px, env(safe-area-inset-right, 0px));
    z-index: 2147483645;
    display: flex;
    min-width: 285px;
    max-width: min(78vw, 320px);
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #8d7454;
    border-radius: 4px;
    background: #3f4249;
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.38);
  }

  .ehpeek-touch-top-bar-menu-panel[hidden] {
    display: none;
  }

  .ehpeek-touch-top-bar-menu-item,
  .ehpeek-touch-top-bar-menu-panel .ehpeek-settings-trigger {
    display: block;
    box-sizing: border-box;
    width: 100%;
    min-height: 63px;
    padding: 15px 21px;
    border: 0;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    background: transparent;
    color: #f1f1f1 !important;
    font-size: 24px;
    line-height: 1.2;
    text-align: left;
    text-decoration: none;
  }
}
`;

  // src/components/Enhance/TouchTopBar.tsx
  var STYLE_ID4 = "ehpeek-touch-top-bar-style", MOBILE_QUERY2 = "(max-width: 760px), (pointer: coarse)", TouchTopBar = class {
    install() {
      if (ensureTouchTopBarStyle(), installTouchTopBarPageStyle(), !this.isActive() || document.querySelector(".ehpeek-touch-top-bar"))
        return;
      let info = readTouchTopBarInfo();
      if (!info.available)
        return;
      let shell = this.createShell(info);
      mountTouchTopBar(shell) || document.body.prepend(shell);
    }
    remove() {
      restoreTouchTopBar(), document.getElementById(STYLE_ID4)?.remove(), uninstallTouchTopBarPageStyle();
    }
    createShell(info) {
      return /* @__PURE__ */ h("nav", { className: "ehpeek-touch-top-bar" }, /* @__PURE__ */ h("a", { className: "ehpeek-touch-top-bar-home", href: info.homeHref }, "⌂"), this.createMenu(info.navItems));
    }
    createMenu(navItems) {
      let menu = /* @__PURE__ */ h("div", { className: "ehpeek-touch-top-bar-menu" }), panel = /* @__PURE__ */ h("div", { className: "ehpeek-touch-top-bar-menu-panel", hidden: !0 }), button = /* @__PURE__ */ h(
        "button",
        {
          type: "button",
          className: "ehpeek-touch-top-bar-menu-button",
          "aria-haspopup": "menu",
          "aria-expanded": "false",
          onClick: (event) => {
            event.stopPropagation(), panel.hidden = !panel.hidden, button.setAttribute("aria-expanded", String(!panel.hidden));
          }
        },
        "⋮"
      );
      return panel.append(...navItems), document.addEventListener("click", (event) => {
        event.target instanceof Element && menu.contains(event.target) || (panel.hidden = !0, button.setAttribute("aria-expanded", "false"));
      }), menu.append(button, panel), menu;
    }
    isActive() {
      return window.matchMedia(MOBILE_QUERY2).matches;
    }
  };
  function ensureTouchTopBarStyle() {
    if (document.getElementById(STYLE_ID4))
      return;
    let style = document.createElement("style");
    style.id = STYLE_ID4, style.textContent = TouchTopBar_default, document.head.append(style);
  }

  // src/eh/index.ts
  function extractPageType(url = window.location.href) {
    try {
      let parsed = new URL(url, window.location.href), galleryMatch = parsed.pathname.match(/^\/g\/(\d+)\/([^/]+)\/?$/i);
      if (galleryMatch) {
        let galleryId = Number(galleryMatch[1]);
        if (Number.isFinite(galleryId) && galleryId > 0)
          return {
            type: "gallery",
            url: parsed.href,
            galleryId,
            token: galleryMatch[2],
            previewIndex: previewPageIndex(parsed.href),
            peekPage: peekPageFromHash(parsed.hash)
          };
      }
      let imageMatch = parsed.pathname.match(/^\/s\/[^/]+\/(\d+)-(\d+)\/?$/i);
      if (imageMatch) {
        let galleryId = Number(imageMatch[1]), pageNum = Number(imageMatch[2]);
        if (Number.isFinite(galleryId) && galleryId > 0 && Number.isFinite(pageNum) && pageNum > 0)
          return {
            type: "image",
            url: parsed.href,
            galleryId,
            pageNum
          };
      }
      return parsed.pathname === "/" || parsed.pathname.startsWith("/tag/") || parsed.pathname === "/watched" ? {
        type: "search",
        url: parsed.href
      } : {
        type: "other",
        url: parsed.href
      };
    } catch {
      return {
        type: "other",
        url
      };
    }
  }
  function galleryPageNumber(url) {
    let page = extractPageType(url);
    return page.type === "image" ? page.pageNum : void 0;
  }
  function previewPageIndexFromUrl(url, pageUrl = window.location.href) {
    try {
      let parsed = new URL(url, pageUrl), current = new URL(pageUrl);
      if (parsed.origin !== current.origin || parsed.pathname !== current.pathname)
        return null;
      let value = Number(parsed.searchParams.get("p") || "0");
      return Number.isFinite(value) && value >= 0 ? value : null;
    } catch {
      return null;
    }
  }
  function previewPageIndex(url = window.location.href) {
    try {
      let value = Number(new URL(url).searchParams.get("p") || "0");
      return Number.isFinite(value) && value >= 0 ? value : 0;
    } catch {
      return 0;
    }
  }
  function previewUrlForIndex(previewIndex, pageUrl = window.location.href) {
    let url = new URL(pageUrl);
    return previewIndex <= 0 ? url.searchParams.delete("p") : url.searchParams.set("p", String(previewIndex)), url.hash = "", url.href;
  }
  function previewPageIndexForGalleryPage(galleryPage, pageSize, maxPreviewIndex) {
    let previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize));
    return maxPreviewIndex === null ? previewIndex : Math.min(previewIndex, maxPreviewIndex);
  }
  function peekPageFromHash(hash = window.location.hash) {
    let params = new URLSearchParams(hash.replace(/^#/, "")), page = Number(params.get("peek_page") || "");
    return Number.isFinite(page) && page > 0 ? page : null;
  }
  function updatePeekLocation(pageNumber, pageSize, maxPreviewIndex) {
    if (!pageNumber || pageNumber <= 0)
      return;
    let url = new URL(window.location.href), params = new URLSearchParams(window.location.hash.replace(/^#/, "")), nextValue = String(pageNumber), nextPreviewIndex = previewPageIndexForGalleryPage(pageNumber, pageSize, maxPreviewIndex), changed = !1;
    nextPreviewIndex === 0 ? url.searchParams.has("p") && (url.searchParams.delete("p"), changed = !0) : url.searchParams.get("p") !== String(nextPreviewIndex) && (url.searchParams.set("p", String(nextPreviewIndex)), changed = !0), params.get("peek_page") !== nextValue && (params.set("peek_page", nextValue), changed = !0), changed && (url.hash = params.toString(), window.history.replaceState(window.history.state, "", url.href));
  }
  function collectGalleryPages2(root = document, baseUrl = window.location.href) {
    return collectGalleryPages(extractPageType, root, baseUrl);
  }
  function readShowingRange2(root = document) {
    return readShowingRange(root);
  }
  function searchPageNavigation2(root = document) {
    return searchPageNavigation(root);
  }
  function searchResultList2(root = document) {
    return searchResultList(root);
  }
  function findSearchNavigationLink2(target) {
    return findSearchNavigationLink(target);
  }
  async function replaceSearchPageContentFromUrl(url) {
    let html = await requestText(url), doc = new DOMParser().parseFromString(html, "text/html"), list = replaceSearchPageContent(doc);
    if (!list)
      throw new Error(texts_default.errors.searchPageContentNotFound);
    return list;
  }
  function computePreviewPageSize(root = document) {
    let range2 = readShowingRange2(root);
    if (!range2)
      throw new Error(texts_default.errors.previewPageSizeUnknown);
    let currentPageCount = range2.end - range2.start + 1;
    if (range2.end < range2.total)
      return currentPageCount;
    let lastPreviewIndex = maxPreviewPageIndex2(root);
    if (lastPreviewIndex === null || lastPreviewIndex <= 0)
      return currentPageCount;
    let fullPageCount = (range2.total - currentPageCount) / lastPreviewIndex;
    if (!Number.isInteger(fullPageCount) || fullPageCount <= 0)
      throw new Error(texts_default.errors.previewPageSizeUnknown);
    return fullPageCount;
  }
  function maxPreviewPageIndex2(root = document, baseUrl = window.location.href) {
    return maxPreviewPageIndex(root, baseUrl);
  }
  async function pullPreviewPage(index, landingIndex, landingPages) {
    if (index === landingIndex)
      return landingPages;
    let previewUrl = previewUrlForIndex(index), html = await requestText(previewUrl), doc = new DOMParser().parseFromString(html, "text/html");
    return collectGalleryPages2(doc, previewUrl);
  }
  function findClickedImageLink2(target) {
    return findClickedImageLink(target, extractPageType);
  }
  async function loadEhImagePage(page) {
    let html = await requestText(page.url), image = new DOMParser().parseFromString(html, "text/html").querySelector("img#img"), imageSrc = image?.getAttribute("src") || image?.getAttribute("data-src") || image?.currentSrc || "", imageUrl = imageSrc ? normalizeUrl(imageSrc, page.url) : "";
    if (!imageUrl)
      throw new Error(texts_default.errors.imageNotFound);
    return {
      imageUrl,
      width: numericAttribute(image, "width"),
      height: numericAttribute(image, "height")
    };
  }
  function replaceGalleryPageBar2(currentIndex, maxIndex) {
    replaceGalleryPageBar({
      currentIndex,
      maxIndex,
      previewUrlForIndex
    });
  }
  function restoreGalleryPageBar2() {
    restoreGalleryPageBar();
  }
  function snapshotPreview2() {
    return snapshotPreview();
  }
  function installPreviewPlaceholder2() {
    installPreviewPlaceholder();
  }
  function replacePreviewContent2(doc, baseUrl) {
    replacePreviewContent(doc), replaceGalleryPageBar2(previewPageIndexFromUrl(baseUrl) ?? previewPageIndex(), maxPreviewPageIndex2(doc, baseUrl));
  }
  function restorePreview2(snapshot) {
    restorePreview(snapshot);
  }
  function mountSettingsMenu2(settingsMenu2) {
    return mountSettingsMenu(settingsMenu2);
  }
  function settingsMenuTriggerTagName2() {
    return settingsMenuTriggerTagName();
  }
  function mountGalleryContinueReadingButton2(button) {
    mountGalleryContinueReadingButton(button);
  }
  function numericAttribute(element, attribute) {
    let value = Number(element?.getAttribute(attribute) || "");
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  // src/components/Enhance/EnhanceThumbsGrids.tsx
  var PREVIEW_CACHE_LIMIT = 10, galleryThumbEnhancementErrorHandler = null, galleryThumbEnhancementClickInstalled = !1;
  function enhanceThumbsGridsEnabled() {
    return state.gallery.enhanceThumbs.value;
  }
  function toggleEnhanceThumbsGrids() {
    let enabled = !enhanceThumbsGridsEnabled();
    return state.gallery.enhanceThumbs.set(enabled), enabled;
  }
  var GalleryPageProvider = class {
    constructor(landingIndex, landingPages, pageSize, maxPreviewIndex, windowSize, loadPreviewPage) {
      this.landingIndex = landingIndex;
      this.landingPages = landingPages;
      this.pageSize = pageSize;
      this.maxPreviewIndex = maxPreviewIndex;
      this.windowSize = windowSize;
      this.loadPreviewPage = loadPreviewPage;
      this.previewCache = /* @__PURE__ */ new Map();
      this.previewCache.set(landingIndex, landingPages);
    }
    previewIndexForPage(pageNum) {
      return previewPageIndexForGalleryPage(pageNum, this.pageSize, this.maxPreviewIndex);
    }
    async loadDisplayPages(pageNums) {
      let previewIndexes = Array.from(new Set(pageNums.map((pageNum) => this.previewIndexForPage(pageNum)))).filter(
        (value) => value >= 0 && (this.maxPreviewIndex === null || value <= this.maxPreviewIndex)
      ), requested = new Set(pageNums), chunks = await Promise.all(previewIndexes.map((index) => this.cachedPreviewPage(index))), byUrl = /* @__PURE__ */ new Map();
      for (let page of chunks.flat())
        page.pageNum && requested.has(page.pageNum) && byUrl.set(page.url, page);
      return Array.from(byUrl.values()).sort(
        (left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER)
      );
    }
    displayWindowAround(pageNum) {
      let numbers = [];
      for (let offset = -this.windowSize; offset <= this.windowSize; offset += 1) {
        let value = pageNum + offset;
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
      let pages = await this.loadPreviewPage(boundedIndex, this.landingIndex, this.landingPages);
      for (this.previewCache.set(boundedIndex, pages); this.previewCache.size > PREVIEW_CACHE_LIMIT; ) {
        let oldest = this.previewCache.keys().next().value;
        if (oldest === void 0)
          break;
        this.previewCache.delete(oldest);
      }
      return pages;
    }
  };
  function installEnhanceThumbsGrids(onError) {
    galleryThumbEnhancementErrorHandler = onError, enhanceThumbsGridsEnabled() && installGalleryPageBar(), !galleryThumbEnhancementClickInstalled && (galleryThumbEnhancementClickInstalled = !0, document.addEventListener("click", onPageBarClick, !0));
  }
  async function navigateGalleryPreview(url, historyMode) {
    let previousUrl = window.location.href, snapshot = snapshotPreview2(), targetPreviewIndex = previewPageIndexFromUrl(url);
    historyMode === "push" ? window.history.pushState(window.history.state, "", url) : window.history.replaceState(window.history.state, "", url), targetPreviewIndex !== null && replaceGalleryPageBar2(targetPreviewIndex, maxPreviewPageIndex2()), installPreviewPlaceholder2();
    try {
      let html = await requestText(url), doc = new DOMParser().parseFromString(html, "text/html");
      replacePreviewContent2(doc, url);
    } catch (error) {
      throw restorePreview2(snapshot), window.history.replaceState(window.history.state, "", previousUrl), replaceGalleryPageBar2(previewPageIndex(), maxPreviewPageIndex2()), error;
    }
  }
  function onPageBarClick(event) {
    if (!enhanceThumbsGridsEnabled() || !(event.target instanceof Element))
      return;
    let barItem = event.target.closest(`.${SCROLL_PAGE_BAR_CLASS} a[data-page-index], .${SCROLL_PAGE_BAR_CLASS} button[data-page-jump]`);
    if (!barItem)
      return;
    event.preventDefault(), event.stopPropagation();
    let url = pageBarUrl(barItem);
    if (!url)
      return;
    let fromBottomBar = !!barItem.closest(`.${SCROLL_PAGE_BAR_BOTTOM_CLASS}`), targetPreviewIndex = previewPageIndexFromUrl(url);
    targetPreviewIndex !== null && setScrollPageBarWindowIndex(targetPreviewIndex), fromBottomBar && scrollToTopPageBar(), navigateGalleryPreview(url, "push").catch((error) => galleryThumbEnhancementErrorHandler?.(error));
  }
  function scrollToTopPageBar() {
    document.querySelector(`.${SCROLL_PAGE_BAR_TOP_CLASS}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  }
  function installGalleryPageBar() {
    replaceGalleryPageBar2(previewPageIndex(), maxPreviewPageIndex2());
  }
  function pageBarUrl(item) {
    if (item instanceof HTMLAnchorElement)
      return previewPageIndexFromUrl(item.href) === null ? null : item.href;
    let maxPreviewIndex = maxPreviewPageIndex2();
    if (maxPreviewIndex === null)
      return null;
    let page = window.prompt(`Jump to page: (1-${maxPreviewIndex + 1})`, String(previewPageIndex() + 1)), pageNumber = Number(page || "");
    return Number.isFinite(pageNumber) ? previewUrlForIndex(clamp(Math.round(pageNumber) - 1, 0, maxPreviewIndex)) : null;
  }

  // src/components/Enhance/EnhanceSearchGrids.css
  var EnhanceSearchGrids_default = `.ehpeek-search-swipe-wrapper {
  position: relative;
}

.ehpeek-search-swipe-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: transparent;
  overscroll-behavior-x: contain;
  touch-action: pan-y;
}

.ehpeek-search-swipe-indicator {
  --ehpeek-search-swipe-pull: 0px;
  position: fixed;
  top: 50%;
  z-index: 2147483645;
  width: 42px;
  height: 108px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 22px;
  display: none;
  align-items: center;
  justify-content: center;
  color: rgba(255, 255, 255, 0.88);
  background: rgba(16, 16, 16, 0.38);
  backdrop-filter: blur(8px);
  font-size: 52px;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-weight: 300;
  line-height: 1;
  pointer-events: none;
  user-select: none;
  transition: opacity 120ms ease;
}

.ehpeek-search-swipe-indicator-active {
  display: flex;
}

.ehpeek-search-swipe-indicator-left {
  right: 6px;
  transform: translate(calc(42px - var(--ehpeek-search-swipe-pull)), -50%);
}

.ehpeek-search-swipe-indicator-right {
  left: 6px;
  transform: translate(calc(-42px + var(--ehpeek-search-swipe-pull)), -50%);
}

.ehpeek-search-swipe-indicator-disabled {
  color: rgba(255, 255, 255, 0.34);
  background: rgba(16, 16, 16, 0.22);
}
`;

  // src/components/Enhance/EnhanceSearchGrids.tsx
  var SWIPE_MIN_DISTANCE = 96, SWIPE_INTENT_DISTANCE = 28, HORIZONTAL_INTENT_RATIO = 2.2, SWIPE_MAX_VERTICAL_RATIO = 0.38, SEARCH_SWIPE_STYLE_ID = "ehpeek-search-swipe-style", SEARCH_SWIPE_WRAPPER_CLASS = "ehpeek-search-swipe-wrapper", SEARCH_SWIPE_OVERLAY_CLASS = "ehpeek-search-swipe-overlay", SEARCH_SWIPE_INDICATOR_CLASS = "ehpeek-search-swipe-indicator", SEARCH_SWIPE_INDICATOR_ACTIVE_CLASS = "ehpeek-search-swipe-indicator-active", SEARCH_SWIPE_INDICATOR_LEFT_CLASS = "ehpeek-search-swipe-indicator-left", SEARCH_SWIPE_INDICATOR_RIGHT_CLASS = "ehpeek-search-swipe-indicator-right", SEARCH_SWIPE_INDICATOR_DISABLED_CLASS = "ehpeek-search-swipe-indicator-disabled", installed = !1, overlayElement = null, indicatorElement = null, swipeState = null, searchNavigationLoading = !1;
  function installEnhanceSearchGrids(pageType2) {
    if (installed || pageType2.type !== "search" || !searchPageNavigation2())
      return;
    let resultList = searchResultList2();
    resultList?.parentElement && (installed = !0, ensureSearchSwipeStyle(), installResultListEnhancement(resultList), document.addEventListener("click", onSearchNavigationClick, !0));
  }
  function uninstallEnhanceSearchGrids() {
    overlayElement?.remove(), overlayElement = null, indicatorElement = null, swipeState = null, installed = !1, document.removeEventListener("click", onSearchNavigationClick, !0);
  }
  function installResultListEnhancement(resultList) {
    overlayElement = installResultListOverlay(resultList), new PointerDrag(overlayElement, {
      onStart: () => {
        swipeState = { horizontal: !1, cancelled: !1, suppressClick: !1 }, hideSwipeIndicator();
      },
      onMove: (info, event) => {
        updateSwipeState(info, event), updateSwipeIndicator(info);
      },
      onEnd: (info, event) => {
        navigateBySwipe(info, event), swipeState = null, hideSwipeIndicator();
      },
      shouldSuppressClick: () => swipeState?.suppressClick ?? !1,
      onSuppressClick: () => {
        swipeState = null, hideSwipeIndicator();
      }
    }), overlayElement.addEventListener("click", onOverlayClick);
  }
  function installResultListOverlay(resultList) {
    let overlay, existingWrapper = resultList.parentElement?.classList.contains(SEARCH_SWIPE_WRAPPER_CLASS) ? resultList.parentElement : null, wrapper = existingWrapper ?? /* @__PURE__ */ h("div", { className: SEARCH_SWIPE_WRAPPER_CLASS });
    return wrapper.querySelectorAll(`:scope > .${SEARCH_SWIPE_OVERLAY_CLASS}`).forEach((item) => item.remove()), overlay = /* @__PURE__ */ h("div", { className: SEARCH_SWIPE_OVERLAY_CLASS, "aria-hidden": "true" }, /* @__PURE__ */ h(
      "div",
      {
        className: SEARCH_SWIPE_INDICATOR_CLASS,
        "aria-hidden": "true",
        ref: (node) => {
          indicatorElement = node;
        }
      }
    )), existingWrapper || (resultList.before(wrapper), wrapper.append(resultList)), wrapper.append(overlay), overlay;
  }
  function onOverlayClick(event) {
    swipeState?.suppressClick || (event.preventDefault(), event.stopPropagation(), forwardClickThroughOverlay(event.clientX, event.clientY));
  }
  function onSearchNavigationClick(event) {
    let link = findSearchNavigationLink2(event.target);
    link && (event.preventDefault(), event.stopPropagation(), navigateSearchPage(link.href, isNextPageOrJump(link)));
  }
  function forwardClickThroughOverlay(clientX, clientY) {
    if (!overlayElement)
      return;
    overlayElement.style.pointerEvents = "none";
    let target = document.elementFromPoint(clientX, clientY);
    if (overlayElement.style.pointerEvents = "", !(target instanceof Element))
      return;
    let link = target.closest("a[href]");
    if (link) {
      link.click();
      return;
    }
    target.dispatchEvent(
      new MouseEvent("click", {
        bubbles: !0,
        cancelable: !0,
        clientX,
        clientY
      })
    );
  }
  function updateSwipeState(info, event) {
    if (!swipeState)
      return;
    let dx = info.dx, dy = info.dy, absX = Math.abs(dx), absY = Math.abs(dy);
    if (!(swipeState.horizontal || swipeState.cancelled)) {
      if (absY >= SWIPE_INTENT_DISTANCE && absY > absX) {
        swipeState.cancelled = !0, hideSwipeIndicator();
        return;
      }
      absX >= SWIPE_INTENT_DISTANCE && absX >= absY * HORIZONTAL_INTENT_RATIO && (swipeState.horizontal = !0, swipeState.suppressClick = !0, event.preventDefault());
    }
  }
  function updateSwipeIndicator(info) {
    if (!indicatorElement || !swipeState?.horizontal || swipeState.cancelled)
      return;
    let direction = info.dx < 0 ? "left" : "right", availableUrl = swipeUrlForDelta(info.dx), progress = Math.min(1, Math.max(0, (Math.abs(info.dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE))), pull = Math.round(48 * progress);
    indicatorElement.textContent = direction === "left" ? "‹" : "›", indicatorElement.classList.add(SEARCH_SWIPE_INDICATOR_ACTIVE_CLASS), indicatorElement.classList.toggle(SEARCH_SWIPE_INDICATOR_LEFT_CLASS, direction === "left"), indicatorElement.classList.toggle(SEARCH_SWIPE_INDICATOR_RIGHT_CLASS, direction === "right"), indicatorElement.classList.toggle(SEARCH_SWIPE_INDICATOR_DISABLED_CLASS, !availableUrl), indicatorElement.style.opacity = String(0.35 + progress * 0.65), indicatorElement.style.setProperty("--ehpeek-search-swipe-pull", `${pull}px`);
  }
  function hideSwipeIndicator() {
    indicatorElement && (indicatorElement.classList.remove(
      SEARCH_SWIPE_INDICATOR_ACTIVE_CLASS,
      SEARCH_SWIPE_INDICATOR_LEFT_CLASS,
      SEARCH_SWIPE_INDICATOR_RIGHT_CLASS,
      SEARCH_SWIPE_INDICATOR_DISABLED_CLASS
    ), indicatorElement.style.opacity = "", indicatorElement.style.removeProperty("--ehpeek-search-swipe-pull"));
  }
  function navigateBySwipe(info, event) {
    if (!swipeState?.horizontal || swipeState.cancelled)
      return;
    let dx = info.dx, dy = info.dy, absX = Math.abs(dx), absY = Math.abs(dy);
    if (absX < SWIPE_MIN_DISTANCE || absY > absX * SWIPE_MAX_VERTICAL_RATIO)
      return;
    let url = swipeUrlForDelta(dx);
    url && (swipeState.suppressClick = !0, event.preventDefault(), navigateSearchPage(url, dx < 0));
  }
  async function navigateSearchPage(url, scrollToTopNavigation) {
    if (!searchNavigationLoading) {
      searchNavigationLoading = !0, overlayElement?.setAttribute("aria-busy", "true"), scrollSearchNavigationIntoView(scrollToTopNavigation);
      try {
        let resultList = await replaceSearchPageContentFromUrl(url);
        window.history.pushState(window.history.state, "", url), installResultListEnhancement(resultList);
      } catch (error) {
        console.error("[ehpeek]", error);
      } finally {
        searchNavigationLoading = !1, overlayElement?.removeAttribute("aria-busy");
      }
    }
  }
  function swipeUrlForDelta(dx) {
    let nav = searchPageNavigation2();
    return nav ? dx < 0 ? nav.nextUrl : nav.previousUrl : null;
  }
  function scrollSearchNavigationIntoView(enabled) {
    if (!enabled)
      return;
    let target = document.querySelector(".searchnav");
    if (!target)
      return;
    let rect = target.getBoundingClientRect(), currentTop = window.scrollY, targetTop = Math.max(0, currentTop + rect.top);
    currentTop <= targetTop || window.scrollTo({ top: targetTop, behavior: "auto" });
  }
  function isNextPageOrJump(link) {
    let id = link.id.toLowerCase();
    return id.endsWith("next") || id.endsWith("last");
  }
  function ensureSearchSwipeStyle() {
    if (document.getElementById(SEARCH_SWIPE_STYLE_ID))
      return;
    let style = document.createElement("style");
    style.id = SEARCH_SWIPE_STYLE_ID, style.textContent = EnhanceSearchGrids_default, document.head.append(style);
  }

  // src/components/Enhance/ReadButton.css
  var ReadButton_default = `.ehpeek-gallery-actions {
  box-sizing: border-box;
}

.ehpeek-continue-reading {
  display: block;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin-top: 4px;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  background: rgba(18, 18, 18, 0.82);
  color: #f5f5f5;
  box-shadow: none;
  cursor: pointer;
  text-align: center;
  font: 700 13px/1.15 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ehpeek-continue-reading:hover {
  background: rgba(32, 32, 32, 0.9);
}

.ehpeek-continue-reading-page {
  display: block;
  margin-top: 1px;
  opacity: 0.72;
  font-size: 11px;
  font-weight: 600;
}

@media (max-width: 760px), (pointer: coarse) {
  .ehpeek-touch-gallery-primary-actions .ehpeek-continue-reading {
    min-height: 87px;
    margin: 0;
    padding: 12px 15px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #f0b35a;
    box-shadow: none;
    font-size: 26px;
    text-transform: uppercase;
  }

  .ehpeek-touch-gallery-primary-actions .ehpeek-continue-reading-page {
    margin-top: 2px;
    color: #f0b35a;
    font-size: 18px;
    opacity: 0.78;
    text-transform: none;
  }

  .ehpeek-gallery-actions {
    display: flex;
    height: auto !important;
    min-height: 0 !important;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    overflow: visible !important;
  }

  .ehpeek-gallery-actions > * {
    box-sizing: border-box;
    max-width: 100%;
  }

  .ehpeek-gallery-actions a,
  .ehpeek-gallery-actions button,
  .ehpeek-gallery-actions input[type="button"],
  .ehpeek-gallery-actions input[type="submit"] {
    min-height: 63px;
    touch-action: manipulation;
  }

  .ehpeek-continue-reading {
    margin-top: 0;
    padding: 12px 15px;
    font-size: 23px;
  }

  .ehpeek-continue-reading-page {
    font-size: 18px;
  }
}
`;

  // src/components/Enhance/ReadButton.tsx
  var STYLE_ID5 = "ehpeek-continue-reading-style";
  function installReadButton(info, onClick, mountMobileButton) {
    document.querySelector(".ehpeek-continue-reading")?.remove(), ensureReadButtonStyle();
    let button = /* @__PURE__ */ h(
      "button",
      {
        type: "button",
        className: "ehpeek-continue-reading",
        onClick: (event) => {
          event.preventDefault(), event.stopPropagation(), onClick();
        }
      },
      info.label,
      /* @__PURE__ */ h("span", { className: "ehpeek-continue-reading-page" }, info.detail)
    );
    mountMobileButton?.(button) || mountGalleryContinueReadingButton2(button);
  }
  function uninstallReadButton() {
    document.querySelector(".ehpeek-continue-reading")?.remove();
  }
  function ensureReadButtonStyle() {
    if (document.getElementById(STYLE_ID5))
      return;
    let style = document.createElement("style");
    style.id = STYLE_ID5, style.textContent = ReadButton_default, document.head.append(style);
  }

  // src/history.ts
  var HISTORY_KEY_PREFIX = "ehpeek:history:", HISTORY_COUNT_KEY = "ehpeek:history-count";
  var ReaderHistorySession = class {
    constructor(baseRecord) {
      this.baseRecord = baseRecord;
      this.pending = null;
      this.lastSaved = null;
      this.timer = null;
      this.flush = () => {
        this.timer !== null && (window.clearTimeout(this.timer), this.timer = null), this.pending && (this.sameProgress(this.pending, this.lastSaved) || (saveReaderHistory(this.pending), this.lastSaved = this.pending), this.pending = null);
      };
      this.onVisibilityChange = () => {
        document.visibilityState === "hidden" && this.flush();
      };
      window.addEventListener("pagehide", this.flush), document.addEventListener("visibilitychange", this.onVisibilityChange);
    }
    update(pageNum, totalPages) {
      if (!pageNum || pageNum <= 0)
        return;
      let nextRecord = {
        ...this.baseRecord,
        pageNum,
        totalPages,
        updatedAt: Date.now()
      };
      this.sameProgress(nextRecord, this.lastSaved) || (this.pending = nextRecord, this.schedule());
    }
    dispose() {
      this.flush(), window.removeEventListener("pagehide", this.flush), document.removeEventListener("visibilitychange", this.onVisibilityChange);
    }
    schedule() {
      this.timer === null && (this.timer = window.setTimeout(this.flush, 1e4));
    }
    sameProgress(left, right) {
      return !!(left && right && left.galleryId === right.galleryId && left.token === right.token && left.pageNum === right.pageNum && left.totalPages === right.totalPages);
    }
  };
  function loadReaderHistory(galleryId, token) {
    return GM_getValue(historyKey(galleryId, token), null);
  }
  function saveReaderHistory(record) {
    let key = historyKey(record.galleryId, record.token), exists = GM_getValue(key, null) !== null;
    if (GM_setValue(key, record), !exists) {
      let count = GM_getValue(HISTORY_COUNT_KEY, 0) + 1;
      GM_setValue(HISTORY_COUNT_KEY, count), count > 2e3 && pruneReaderHistory();
    }
  }
  function historyKey(galleryId, token) {
    return `${HISTORY_KEY_PREFIX}${galleryId}:${token}`;
  }
  function pruneReaderHistory() {
    let records = GM_listValues().filter((key) => key.startsWith(HISTORY_KEY_PREFIX)).map((key) => ({ key, record: GM_getValue(key, null) })).filter((entry) => entry.record !== null).sort((left, right) => left.record.updatedAt - right.record.updatedAt);
    for (let entry of records.slice(0, 1e3))
      GM_deleteValue(entry.key);
    GM_setValue(HISTORY_COUNT_KEY, Math.max(0, records.length - 1e3));
  }

  // src/main.ts
  var READER_WINDOW_SIZE = 10, menuCommandId = null, settingsMenu = null, touchGalleryPanel = null, touchTopBar = null;
  function updateReaderEnabled(enabled) {
    state.reader.enabled.set(enabled), pageType.type === "gallery" && (enabled ? installContinueReading() : uninstallReadButton()), settingsMenu?.update(), registerUserscriptMenu();
  }
  function toggleReader() {
    updateReaderEnabled(!state.reader.enabled.value);
  }
  function registerUserscriptMenu() {
    typeof GM_registerMenuCommand == "function" && (menuCommandId !== null && typeof GM_unregisterMenuCommand == "function" && (GM_unregisterMenuCommand(menuCommandId), menuCommandId = null), menuCommandId = GM_registerMenuCommand(
      texts_default.settings.openSettings,
      openSettingsMenu
    ));
  }
  function toggleEnhanceThumbsGridsSetting() {
    let enabled = toggleEnhanceThumbsGrids();
    pageType.type === "gallery" && (enabled ? installEnhanceThumbsGrids(reportOpenError) : restoreGalleryPageBar2()), settingsMenu?.update();
  }
  function toggleEnhanceSearchGridsSetting() {
    state.search.enhance.set(!state.search.enhance.value), state.search.enhance.value && pageType.type === "search" ? installEnhanceSearchGrids(pageType) : pageType.type === "search" && uninstallEnhanceSearchGrids(), settingsMenu?.update();
  }
  function toggleTouchUiSetting() {
    state.touch.enabled.set(!state.touch.enabled.value), state.touch.enabled.value ? (installTouchUi(), pageType.type === "gallery" && installContinueReading()) : (touchTopBar?.remove(), touchGalleryPanel?.remove(), pageType.type === "gallery" && installContinueReading()), settingsMenu?.update();
  }
  function settingsMenuState() {
    return {
      readerEnabled: state.reader.enabled.value,
      enhanceThumbsGridsEnabled: enhanceThumbsGridsEnabled(),
      enhanceSearchGridsEnabled: state.search.enhance.value,
      touchUiEnabled: state.touch.enabled.value
    };
  }
  async function openReader(startPageUrl, preferredPageNum) {
    if (!state.reader.enabled.value)
      return;
    let pageType2 = extractPageType();
    if (pageType2.type !== "gallery")
      return;
    let landingIndex = previewPageIndex(), landingPages = collectGalleryPages2(), pageSize = computePreviewPageSize(), maxPreviewIndex = maxPreviewPageIndex2(), totalPages = readShowingRange2()?.total, provider = new GalleryPageProvider(
      landingIndex,
      landingPages,
      pageSize,
      maxPreviewIndex,
      READER_WINDOW_SIZE,
      pullPreviewPage
    ), startUrl = normalizeUrl(startPageUrl), hashPage = preferredPageNum ?? peekPageFromHash(), startPageNum = hashPage ?? galleryPageNumber(startUrl), pages = startPageNum ? await provider.loadDisplayPages(provider.displayWindowAround(startPageNum)) : landingPages, startIndex = hashPage !== null ? pages.findIndex((page) => page.pageNum === hashPage) : pages.findIndex((page) => page.url === startUrl);
    startIndex < 0 && (startIndex = 0, pages = [{ url: startUrl, aspectRatio: 1.42, pageNum: galleryPageNumber(startUrl) }, ...pages].sort(
      (left, right) => (left.pageNum ?? 0) - (right.pageNum ?? 0)
    ), startIndex = pages.findIndex((page) => page.url === startUrl));
    let lastPageNum = hashPage ?? galleryPageNumber(startUrl), historySession = new ReaderHistorySession({
      galleryId: pageType2.galleryId,
      token: pageType2.token,
      galleryUrl: previewUrlForIndex(landingIndex),
      totalPages
    });
    if (!state.reader.enabled.value) {
      historySession.dispose();
      return;
    }
    openFullscreenReader({
      pages,
      startIndex,
      renderWindowSize: READER_WINDOW_SIZE,
      preloadWindowSize: READER_WINDOW_SIZE,
      nearConcurrentLoads: 3,
      farConcurrentLoads: 6,
      totalPages,
      loadPage: loadEhImagePage,
      loadPages: (pageNums) => provider.loadDisplayPages(pageNums),
      onActivePageChange: (page) => {
        page.pageNum && (lastPageNum = page.pageNum, enhanceThumbsGridsEnabled() && replaceGalleryPageBar2(provider.previewIndexForPage(page.pageNum), maxPreviewIndex)), historySession.update(page.pageNum, totalPages), updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
      },
      onExit: () => {
        historySession.dispose(), installContinueReading();
        let exitIndex = lastPageNum ? provider.previewIndexForPage(lastPageNum) : landingIndex, galleryUrl = previewUrlForIndex(exitIndex);
        if (enhanceThumbsGridsEnabled()) {
          replaceGalleryPageBar2(exitIndex, maxPreviewIndex), navigateGalleryPreview(galleryUrl, "replace").catch(() => {
            window.location.replace(galleryUrl);
          });
          return;
        }
        exitIndex === landingIndex ? window.history.replaceState(window.history.state, "", galleryUrl) : window.location.replace(galleryUrl);
      },
      onDisableReader: () => {
        historySession.dispose(), updateReaderEnabled(!1);
      }
    });
  }
  function reportOpenError(error) {
    let message = error instanceof Error ? error.message : texts_default.errors.loadFailed;
    console.error("[ehpeek]", error), window.alert(message);
  }
  function openSettingsMenu() {
    installSettingsMenu(), settingsMenu?.open();
  }
  function installSettingsMenu() {
    if (settingsMenu) {
      settingsMenu.update();
      return;
    }
    settingsMenu = new SettingsMenu(settingsMenuTriggerTagName2(), settingsMenuState, {
      onReaderToggle: toggleReader,
      onEnhanceThumbsGridsToggle: toggleEnhanceThumbsGridsSetting,
      onEnhanceSearchGridsToggle: toggleEnhanceSearchGridsSetting,
      onTouchUiToggle: toggleTouchUiSetting
    }), mountSettingsMenu2(settingsMenu) || (settingsMenu = null);
  }
  function installTouchGalleryPanel() {
    return touchGalleryPanel ?? (touchGalleryPanel = new TouchGalleryPanel()), touchGalleryPanel.install(), touchGalleryPanel;
  }
  function installTouchTopBar() {
    return touchTopBar ?? (touchTopBar = new TouchTopBar()), touchTopBar.install(), touchTopBar;
  }
  function installTouchUi() {
    installTouchTopBar(), pageType.type === "gallery" && installTouchGalleryPanel();
  }
  function onDocumentClick(event) {
    if (!state.reader.enabled.value)
      return;
    let link = findClickedImageLink2(event.target);
    link && (event.preventDefault(), event.stopPropagation(), openReader(link.href).catch(reportOpenError));
  }
  async function openReaderFromHash() {
    let peekPage = peekPageFromHash();
    if (peekPage === null)
      return;
    let pages = collectGalleryPages2(), page = pages.find((item) => item.pageNum === peekPage) ?? pages[0];
    page && await openReader(page.url).catch(reportOpenError);
  }
  registerUserscriptMenu();
  var pageType = extractPageType();
  state.touch.enabled.value && installTouchUi();
  installSettingsMenu();
  pageType.type === "gallery" ? (installEnhanceThumbsGrids(reportOpenError), installContinueReading(), document.addEventListener("click", onDocumentClick, !0), state.reader.enabled.value && pageType.peekPage !== null && openReaderFromHash()) : pageType.type === "search" && state.search.enhance.value && installEnhanceSearchGrids(pageType);
  function installContinueReading() {
    if (pageType.type !== "gallery" || !state.reader.enabled.value)
      return;
    let record = loadReaderHistory(pageType.galleryId, pageType.token), pageNum = record?.pageNum && record.pageNum > 0 ? record.pageNum : 1, totalPages = record?.totalPages ?? readShowingRange2()?.total, detail = record && totalPages ? `${pageNum}/${totalPages}` : totalPages ? `${totalPages} ${texts_default.reader.pages}` : String(pageNum), galleryPanel = state.touch.enabled.value ? installTouchGalleryPanel() : null;
    installReadButton(
      {
        label: record ? texts_default.reader.continueReading : texts_default.reader.startReading,
        detail
      },
      () => {
        let page = collectGalleryPages2()[0];
        page && openReader(page.url, pageNum).catch(reportOpenError);
      },
      (button) => galleryPanel?.mountContinueButton(button) ?? !1
    );
  }
})();
