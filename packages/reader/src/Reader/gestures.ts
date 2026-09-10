import { createEffect, onCleanup, untrack, type Accessor, type Setter } from "solid-js";
import type { PointerDragEnd, PointerGestureCallbacks } from "../kit/PointerGesture";
import type { ScrollMotion } from "../kit/animation";
import type { ZoomOverlayActions, ZoomOverlayImage } from "./ZoomOverlay";
import { getReaderControls, useReaderContext } from "./Context";
import { clamp } from "../kit/helpers";

const PAGED_SWIPE_THRESHOLD = 24;
const PAGED_PREVIEW_SWIPE_THRESHOLD = 48;
const PAGED_PREVIEW_SWIPE_AXIS_LIMIT = 32;
const MOUSE_HOLD_ZOOM_MS = 350;
const ZOOM_DOUBLE_TAP_MS = 300;
const ZOOM_DOUBLE_TAP_DISTANCE = 36;
const ZOOM_DOUBLE_TAP_SCALE = 1.2;
const TAP_CANCEL_DISTANCE = 8;


/** Geometry commands used only by this viewport's input handling. */
export interface ReaderGestureViewport {
  beginDrag(): void;
  cancelDrag(): void;
  moveDrag(delta: { dx: number; dy: number }): boolean;
  isDragging(): boolean;
  isHitEndPage(point: { clientX: number; clientY: number }): boolean;
  viewportXRatio(clientX: number): number;
  pageNumAtPoint(point: { clientX: number; clientY: number }): number | null;
  pageZoomScale(pageNum: number): number;
  moveToPage(pageNum: number, motion?: ScrollMotion): Promise<boolean>;
  stopMotion(): void;
  moveToTop(value: number): void;
  moveToLeft(value: number): void;
  scrollTop(): number;
  scrollLeft(): number;
  startVerticalFlingFromDragVelocity(velocity: number, onStop: () => void): void;
  startHorizontalFlingFromDragVelocity(velocity: number, onStop: () => void): void;
}

export function createReaderGestures(options: {
  viewport: ReaderGestureViewport;
  zoom: ZoomOverlayActions;
  zoomImage: [Accessor<ZoomOverlayImage | null>, Setter<ZoomOverlayImage | null>];
  onToggleToolbar(): void;
  onHideToolbar(): void;
  followScroll(): void;
}) {
  const ctx = useReaderContext();
  const { viewport, zoom } = options;
  const [zoomImage, setZoomImage] = options.zoomImage;
  const controls = () => getReaderControls(ctx);
  const pagedMode = () => controls().navigationMode === "paged";
  let lastZoomTap: { clientX: number; clientY: number; time: number } | null = null;
  let pinchStart: number | null = null;
  const startPinch = () => {
    const percent = ctx.scrollScale.percent();
    pinchStart = percent === null ? null : percent / 100;
    return pinchStart !== null;
  };
  const movePinch = (scale: number) => {
    if (pinchStart !== null) ctx.scrollScale.resize(clamp(pinchStart * scale, 0.1, 5));
  };
  const endPinch = () => { pinchStart = null; };
  const imageAtPoint = (point: { clientX: number; clientY: number }): ZoomOverlayImage | null => {
    const pageNum = viewport.pageNumAtPoint(point);
    const resource = pageNum === null ? null : ctx.loading.page(pageNum);
    return resource?.status === "ready" && resource.image && pageNum !== null
      ? { pageNum, imageUrl: resource.image.imageUrl,
          width: resource.element?.naturalWidth || resource.image.width || null,
          height: resource.element?.naturalHeight || resource.image.height || null }
      : null;
  };
  const prepareZoom = (point: { clientX: number; clientY: number }, multiplier = 1) => {
    const image = imageAtPoint(point);
    if (!image) return false;
    viewport.stopMotion();
    viewport.cancelDrag();
    setZoomImage(image);
    zoom.reset({ centerX: point.clientX, centerY: point.clientY, scale: viewport.pageZoomScale(image.pageNum) * multiplier });
    return true;
  };
  const isZoomDoubleTap = (
    info: PointerDragEnd,
    event: PointerEvent | MouseEvent,
  ): boolean => {
    const now = event.timeStamp || performance.now();
    const doubleTap = lastZoomTap !== null &&
      now - lastZoomTap.time <= ZOOM_DOUBLE_TAP_MS &&
      Math.hypot(
        info.clientX - lastZoomTap.clientX,
        info.clientY - lastZoomTap.clientY,
      ) <= ZOOM_DOUBLE_TAP_DISTANCE;
    lastZoomTap = doubleTap
      ? null
      : { clientX: info.clientX, clientY: info.clientY, time: now };
    return doubleTap;
  };
  const isPageReloadButtonTarget = (event: PointerEvent | MouseEvent): boolean =>
    event.target instanceof Element &&
    event.target.closest(".ehpeek-reader-page-reload") !== null;
  const shouldStartDrag = (event: PointerEvent): boolean =>
    zoomImage() !== null ||
    pagedMode() ||
    controls().direction !== "ttb" ||
    event.pointerType === "mouse";
  const isPreviewSwipe = (info: PointerDragEnd): boolean => {
    if (!pagedMode()) {
      return false;
    }
    return controls().direction === "ttb"
      ? Math.abs(info.dx) >= PAGED_PREVIEW_SWIPE_THRESHOLD &&
      Math.abs(info.dy) <= PAGED_PREVIEW_SWIPE_AXIS_LIMIT
      : info.dy >= PAGED_PREVIEW_SWIPE_THRESHOLD &&
      Math.abs(info.dx) <= PAGED_PREVIEW_SWIPE_AXIS_LIMIT;
  };
  const runSingleTap = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
    if (zoomImage() !== null) {
      event.preventDefault();
    } else if (viewport.isHitEndPage(info)) {
      ctx.finish();
    } else {
      const zone = viewport.viewportXRatio(info.clientX);
      if (zone >= 1 / 3 && zone <= 2 / 3) {
        options.onToggleToolbar();
      } else {
        ctx.position.turnPage(zone < 1 / 3 ? (controls().rightTapAction === "previous" ? 1 : -1) : (controls().rightTapAction === "previous" ? -1 : 1));
      }
    }
  };

  const pointer: PointerGestureCallbacks = {
    dragAxis: "any",
    onTap: (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
      viewport.cancelDrag();
      if (zoomImage() !== null) {
        if (isZoomDoubleTap(info, event)) {
          setZoomImage(null);
        }
        event.preventDefault();
        return;
      }

      const zone = viewport.viewportXRatio(info.clientX);
      const centerTap = zone >= 1 / 3 && zone <= 2 / 3;
      if (centerTap) {
        if (
          isZoomDoubleTap(info, event) &&
          prepareZoom(info, ZOOM_DOUBLE_TAP_SCALE)
        ) {
          options.onHideToolbar();
          event.preventDefault();
          return;
        }
      } else {
        lastZoomTap = null;
      }
      runSingleTap(info, event);
    },
    holdDelay: MOUSE_HOLD_ZOOM_MS,
    onHold: (info, event) => {
      const mouseInput = event instanceof PointerEvent
        ? event.pointerType === "mouse"
        : event instanceof MouseEvent;
      if (!mouseInput) {
        return false;
      }
      lastZoomTap = null;
      if (zoomImage() !== null) {
        setZoomImage(null);
        return "consume";
      }
      if (!prepareZoom(info)) {
        return false;
      }
      zoom.movePinch({ centerX: info.clientX, centerY: info.clientY, scale: 2 });
      zoom.endPinch();
      return "drag";
    },
    onStart: (): void => {
      if (zoomImage() !== null) {
        zoom.startDrag();
        return;
      }
      viewport.stopMotion();
      viewport.beginDrag();
    },
    onMove: (info: PointerDragEnd): void => {
      if (zoomImage() !== null) {
        zoom.moveDrag(info);
        return;
      }
      if (!viewport.moveDrag({ dx: info.dx, dy: info.dy })) {
        return;
      }
    },
    onEnd: (info: PointerDragEnd): void => {
      if (zoomImage() !== null) {
        return;
      }
      viewport.cancelDrag();
      if (isPreviewSwipe(info)) {
        // Preview disables Reader and cancels motion, so alignment must finish before coverage.
        void viewport.moveToPage(ctx.position.page()).then(completed => {
          if (completed) ctx.openPreview();
        });
        return;
      }
      if (!pagedMode()) {
        if (controls().direction === "ttb") {
          viewport.moveToTop(viewport.scrollTop());
          viewport.startVerticalFlingFromDragVelocity(info.velocityY, () => options.followScroll());
        } else {
          viewport.moveToLeft(viewport.scrollLeft());
          viewport.startHorizontalFlingFromDragVelocity(info.velocityX, () => options.followScroll());
        }
        options.followScroll();
        return;
      }
      if (controls().direction === "ttb") {
        if (info.dy >= PAGED_SWIPE_THRESHOLD) {
          ctx.position.turnPage(-1);
        } else if (info.dy <= -PAGED_SWIPE_THRESHOLD) {
          ctx.position.turnPage(1);
        } else {
          viewport.moveToPage(ctx.position.page(), "animated");
        }
        return;
      }
      if (info.dx >= PAGED_SWIPE_THRESHOLD) {
        ctx.position.turnPage((controls().direction === "rtl" ? 1 : -1));
      }
      else if (info.dx <= -PAGED_SWIPE_THRESHOLD) {
        ctx.position.turnPage((controls().direction === "rtl" ? -1 : 1));
      }
      else {
        viewport.moveToPage(ctx.position.page(), "animated");
      }
    },
    onPinchStart: (info: {
      clientX: number;
      clientY: number;
    }): boolean => {
      lastZoomTap = null;
      viewport.stopMotion();
      viewport.cancelDrag();
      if (!pagedMode() && zoomImage() === null) {
        return startPinch();
      }
      if (zoomImage() !== null) {
        zoom.startPinch({ centerX: info.clientX, centerY: info.clientY });
        return true;
      }
      const image = imageAtPoint(info);
      if (!image) {
        return false;
      }
      const zoomScale = viewport.pageZoomScale(image.pageNum);
      setZoomImage(image);
      zoom.reset({ centerX: info.clientX, centerY: info.clientY, scale: zoomScale });
      return true;
    },
    onPinchMove: (info: { clientX: number; clientY: number; scale: number }) => {
      if ((pinchStart !== null)) {
        movePinch(info.scale);
        return;
      }
      zoom.movePinch({
        centerX: info.clientX,
        centerY: info.clientY,
        scale: info.scale,
      });
    },
    onPinchEnd: () => {
      if ((pinchStart !== null)) {
        endPinch();
        return;
      }
      zoom.endPinch();
    },
    shouldCaptureDrag: (event) => {
      if (isPageReloadButtonTarget(event)) {
        return false;
      }
      if (!(event instanceof PointerEvent)) {
        return false;
      }
      if (event.pointerType === "mouse" && event.button !== 0) {
        return false;
      }
      return shouldStartDrag(event);
    },
    shouldObserveTap: (event) =>
      event instanceof PointerEvent &&
      !isPageReloadButtonTarget(event) &&
      event.pointerType !== "mouse" &&
      !shouldStartDrag(event),
    dragStartThreshold: TAP_CANCEL_DISTANCE,
    tapMoveThreshold: TAP_CANCEL_DISTANCE,
  };
  const wheel = (event: WheelEvent) => {
    if (ctx.disabled()) return;
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    const pixels = delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1);
    if (zoomImage()) {
      event.preventDefault();
      zoom.moveWheel({ centerX: event.clientX, centerY: event.clientY, delta: pixels });
    } else if (event.ctrlKey || event.metaKey) {
      event.preventDefault();
      if (!pagedMode()) {
        if (startPinch()) { movePinch(Math.exp(-clamp(pixels, -100, 100) * 0.0025)); endPinch(); }
      } else if (prepareZoom(event)) zoom.moveWheel({ centerX: event.clientX, centerY: event.clientY, delta: pixels });
    } else if (pagedMode()) {
      event.preventDefault();
      if (!viewport.isDragging() && Math.abs(delta) >= 8) ctx.position.turnPage(delta > 0 ? 1 : -1);
    } else if (controls().direction !== "ttb") {
      event.preventDefault();
      viewport.moveToLeft(viewport.scrollLeft() + pixels * (controls().direction === "rtl" ? -1 : 1) * 0.5);
    }
  };
  const keydown = (event: KeyboardEvent) => {
    if (ctx.disabled() || event.isComposing ||
      (event.target instanceof Element && event.target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"))) return;
    if (event.key === "Escape") {
      event.preventDefault();
      ctx.close();
    } else if (event.key === "ArrowLeft" || event.key === "ArrowRight" ||
      (controls().direction === "ttb" && (event.key === "ArrowUp" || event.key === "ArrowDown"))) {
      event.preventDefault();
      if (zoomImage()) return;
      ctx.position.turnPage(event.key === "ArrowUp" ? -1 : event.key === "ArrowDown" ? 1
        : event.key === "ArrowLeft" ? (controls().rightTapAction === "previous" ? 1 : -1)
        : (controls().rightTapAction === "previous" ? -1 : 1));
    }
  };
  document.addEventListener("keydown", keydown, true);
  onCleanup(() => document.removeEventListener("keydown", keydown, true));
  createEffect(() => {
    if (!ctx.disabled()) return;
    untrack(() => { endPinch(); lastZoomTap = null; viewport.stopMotion(); viewport.cancelDrag(); });
  });
  return { pointer, wheel };
}
