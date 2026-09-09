import type { PointerDragEnd, PointerGestureCallbacks } from "../kit/PointerGesture";
import type { ReaderSession } from "./session";
import type { PagesViewportActions } from "./Viewport";
import type { ZoomOverlayActions, ZoomOverlayImage } from "./ZoomOverlay";
import type { ScrollScaleAdjustment } from "./ViewportCanvas";
import type { ScrollMotion } from "../kit/animation";

const PAGED_SWIPE_THRESHOLD = 24;
const PAGED_PREVIEW_SWIPE_THRESHOLD = 48;
const PAGED_PREVIEW_SWIPE_AXIS_LIMIT = 32;
const MOUSE_HOLD_ZOOM_MS = 350;
const ZOOM_DOUBLE_TAP_MS = 300;
const ZOOM_DOUBLE_TAP_DISTANCE = 36;
const ZOOM_DOUBLE_TAP_SCALE = 1.2;
const TAP_CANCEL_DISTANCE = 8;

/** Pointer routing owns double-tap recognition, not reader navigation or image resources. */
export class ReaderGestures {
  // Child actions are connected once during this Reader mount.
  viewport!: PagesViewportActions;
  zoom!: ZoomOverlayActions;
  private lastZoomTap: { clientX: number; clientY: number; time: number } | null = null;
  constructor(
    private readonly state: ReaderSession["state"],
    private readonly scale: ScrollScaleAdjustment,
    private readonly actions: {
      close: () => void; onEnd: () => void; openPreview: (pageNum: number) => void;
      turnPageBy: (delta: number) => void;
      prepareZoom: (point: { clientX: number; clientY: number }, scale?: number) => boolean;
      realign: (options?: { motion?: ScrollMotion }) => void;
      followScroll: () => void; stopMotion: () => void; cancelPageTarget: () => void;
      imageAtPoint: (point: { clientX: number; clientY: number }) => ZoomOverlayImage | null;
    },
  ) { }

  private pagedMode(): boolean { return this.state.ctrls.value().navigationMode === "paged"; }

  private readonly isZoomDoubleTap = (
    info: PointerDragEnd,
    event: PointerEvent | MouseEvent,
  ): boolean => {
    const now = event.timeStamp || performance.now();
    const doubleTap = this.lastZoomTap !== null &&
      now - this.lastZoomTap.time <= ZOOM_DOUBLE_TAP_MS &&
      Math.hypot(
        info.clientX - this.lastZoomTap.clientX,
        info.clientY - this.lastZoomTap.clientY,
      ) <= ZOOM_DOUBLE_TAP_DISTANCE;
    this.lastZoomTap = doubleTap
      ? null
      : { clientX: info.clientX, clientY: info.clientY, time: now };
    return doubleTap;
  };
  private readonly isPageReloadButtonTarget = (event: PointerEvent | MouseEvent): boolean =>
    event.target instanceof Element &&
    event.target.closest(".ehpeek-reader-page-reload") !== null;
  private readonly shouldStartDrag = (event: PointerEvent): boolean =>
    this.state.overlay.image() !== null ||
    this.pagedMode() ||
    this.state.ctrls.value().direction !== "ttb" ||
    event.pointerType === "mouse";
  private readonly isPreviewSwipe = (info: PointerDragEnd): boolean => {
    if (!this.pagedMode()) {
      return false;
    }
    return this.state.ctrls.value().direction === "ttb"
      ? Math.abs(info.dx) >= PAGED_PREVIEW_SWIPE_THRESHOLD &&
      Math.abs(info.dy) <= PAGED_PREVIEW_SWIPE_AXIS_LIMIT
      : info.dy >= PAGED_PREVIEW_SWIPE_THRESHOLD &&
      Math.abs(info.dx) <= PAGED_PREVIEW_SWIPE_AXIS_LIMIT;
  };
  private readonly runSingleTap = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
    if (this.state.overlay.image() !== null) {
      event.preventDefault();
    } else if (this.viewport.isHitEndPage(info)) {
      this.actions.onEnd();
      this.actions.close();
    } else {
      const zone = this.viewport.viewportXRatio(info.clientX);
      if (zone >= 1 / 3 && zone <= 2 / 3) {
        this.state.toolbar.toggle();
      } else {
        this.actions.turnPageBy(zone < 1 / 3 ? this.state.navi.leftTapDelta() : this.state.navi.rightTapDelta());
      }
    }
  };

  readonly callbacks: PointerGestureCallbacks = {
    dragAxis: "any",
    onTap: (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
      this.viewport.cancelDrag();
      if (this.state.overlay.image() !== null) {
        if (this.isZoomDoubleTap(info, event)) {
          this.state.overlay.update(null);
        }
        event.preventDefault();
        return;
      }

      const zone = this.viewport.viewportXRatio(info.clientX);
      const centerTap = zone >= 1 / 3 && zone <= 2 / 3;
      if (centerTap) {
        if (
          this.isZoomDoubleTap(info, event) &&
          this.actions.prepareZoom(info, ZOOM_DOUBLE_TAP_SCALE)
        ) {
          this.state.toolbar.close();
          event.preventDefault();
          return;
        }
      } else {
        this.lastZoomTap = null;
      }
      this.runSingleTap(info, event);
    },
    holdDelay: MOUSE_HOLD_ZOOM_MS,
    onHold: (info, event) => {
      const mouseInput = event instanceof PointerEvent
        ? event.pointerType === "mouse"
        : event instanceof MouseEvent;
      if (!mouseInput) {
        return false;
      }
      this.lastZoomTap = null;
      if (this.state.overlay.image() !== null) {
        this.state.overlay.update(null);
        return "consume";
      }
      if (!this.actions.prepareZoom(info)) {
        return false;
      }
      this.zoom.movePinch({ centerX: info.clientX, centerY: info.clientY, scale: 2 });
      this.zoom.endPinch();
      return "drag";
    },
    onStart: (): void => {
      if (this.state.overlay.image() !== null) {
        this.zoom.startDrag();
        return;
      }
      this.actions.cancelPageTarget();
      this.viewport.beginDrag();
    },
    onMove: (info: PointerDragEnd): void => {
      if (this.state.overlay.image() !== null) {
        this.zoom.moveDrag(info);
        return;
      }
      if (!this.viewport.moveDrag({ dx: info.dx, dy: info.dy })) {
        return;
      }
    },
    onEnd: (info: PointerDragEnd): void => {
      if (this.state.overlay.image() !== null) {
        return;
      }
      this.viewport.cancelDrag();
      if (this.isPreviewSwipe(info)) {
        this.actions.realign({ motion: "animated" });
        this.actions.openPreview(this.state.navi.currentPageNum());
        return;
      }
      if (!this.pagedMode()) {
        if (this.state.ctrls.value().direction === "ttb") {
          this.viewport.moveToTop(this.viewport.scrollTop());
          this.viewport.startVerticalFlingFromDragVelocity(info.velocityY, () => this.actions.followScroll());
        } else {
          this.viewport.moveToLeft(this.viewport.scrollLeft());
          this.viewport.startHorizontalFlingFromDragVelocity(info.velocityX, () => this.actions.followScroll());
        }
        this.actions.followScroll();
        return;
      }
      if (this.state.ctrls.value().direction === "ttb") {
        if (info.dy >= PAGED_SWIPE_THRESHOLD) {
          this.actions.turnPageBy(-1);
        } else if (info.dy <= -PAGED_SWIPE_THRESHOLD) {
          this.actions.turnPageBy(1);
        } else {
          this.actions.realign({ motion: "animated" });
        }
        return;
      }
      if (info.dx >= PAGED_SWIPE_THRESHOLD) {
        this.actions.turnPageBy(this.state.navi.rightDragDelta());
      }
      else if (info.dx <= -PAGED_SWIPE_THRESHOLD) {
        this.actions.turnPageBy(this.state.navi.leftDragDelta());
      }
      else {
        this.actions.realign({ motion: "animated" });
      }
    },
    onPinchStart: (info: {
      clientX: number;
      clientY: number;
    }): boolean => {
      this.lastZoomTap = null;
      this.actions.stopMotion();
      this.viewport.cancelDrag();
      if (!this.pagedMode() && this.state.overlay.image() === null) {
        return this.scale.startPinch();
      }
      if (this.state.overlay.image() !== null) {
        this.zoom.startPinch({ centerX: info.clientX, centerY: info.clientY });
        return true;
      }
      const image = this.actions.imageAtPoint(info);
      if (!image) {
        return false;
      }
      const zoomScale = this.viewport.pageZoomScale(image.pageNum);
      this.state.overlay.update(image);
      this.zoom.reset({ centerX: info.clientX, centerY: info.clientY, scale: zoomScale });
      return true;
    },
    onPinchMove: (info: { clientX: number; clientY: number; scale: number }) => {
      if (this.scale.pinching()) {
        this.scale.movePinch(info.scale);
        return;
      }
      this.zoom.movePinch({
        centerX: info.clientX,
        centerY: info.clientY,
        scale: info.scale,
      });
    },
    onPinchEnd: () => {
      if (this.scale.pinching()) {
        this.scale.endPinch();
        return;
      }
      this.zoom.endPinch();
    },
    shouldCaptureDrag: (event) => {
      if (this.isPageReloadButtonTarget(event)) {
        return false;
      }
      if (!(event instanceof PointerEvent)) {
        return false;
      }
      if (event.pointerType === "mouse" && event.button !== 0) {
        return false;
      }
      return this.shouldStartDrag(event);
    },
    shouldObserveTap: (event) =>
      event instanceof PointerEvent &&
      !this.isPageReloadButtonTarget(event) &&
      event.pointerType !== "mouse" &&
      !this.shouldStartDrag(event),
    dragStartThreshold: TAP_CANCEL_DISTANCE,
    tapMoveThreshold: TAP_CANCEL_DISTANCE,
  };
}
