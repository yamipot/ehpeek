import { debugLog, targetSummary } from "../../utils";
import { PointerGesture, type PointerDragEnd, type PointerDragMove, type PointerDragStart, type PointerDragTap } from "../common/pointerGesture";

const TAP_MOVE_THRESHOLD = 8;

export type GesturePoint = {
  clientX: number;
  clientY: number;
};

export type GestureDragStart = GesturePoint & {
  pointerId: number;
};

export type GestureDragMove = GesturePoint & {
  pointerId: number;
  dx: number;
  dy: number;
  velocityY: number;
};

export type GestureDragEnd = GestureDragMove;

export type GestureTap = GesturePoint & {
  pointerId: number | null;
  dx: number;
  dy: number;
};

export type GesturePinchStart = GesturePoint & {
  distance: number;
};

export type GesturePinchMove = GesturePinchStart & {
  scale: number;
};

export class PagesGesture {
  private readonly pointerGesture: PointerGesture;
  constructor(
    private readonly target: HTMLElement,
    private readonly handlers: {
      onTap: (info: GestureTap, event: PointerEvent | MouseEvent) => void;
      onKeyboardClose: () => void;
      onKeyboardArrow: (direction: "left" | "right") => void;
      onWheel: (delta: number, event: WheelEvent) => void;
      shouldStartDrag: (event: PointerEvent) => boolean;
      onDragStart: (info: GestureDragStart, event: PointerEvent | MouseEvent) => void;
      onDragMove: (info: GestureDragMove, event: PointerEvent | MouseEvent) => void;
      onDragEnd: (info: GestureDragEnd, event: PointerEvent | MouseEvent) => void;
      onPinchStart: (info: GesturePinchStart, event: PointerEvent) => boolean;
      onPinchMove: (info: GesturePinchMove, event: PointerEvent) => void;
      onPinchEnd: () => void;
      onNativeScroll: () => void;
    },
  ) {
    this.pointerGesture = new PointerGesture(target, {
      shouldCaptureDrag: this.shouldStartDrag,
      onStart: this.onDragStart,
      onMove: this.onDragMove,
      onEnd: this.onDragEnd,
      onTap: this.onTap,
      tapMoveThreshold: TAP_MOVE_THRESHOLD,
      shouldObserveTap: this.shouldObserveTap,
      onPinchStart: this.onPinchStart,
      onPinchMove: this.onPinchMove,
      onPinchEnd: this.handlers.onPinchEnd,
    });
    target.addEventListener("scroll", this.onScroll);
    target.addEventListener("wheel", this.onWheel);
  }

  dispose(): void {
    this.pointerGesture.dispose();
    this.target.classList.remove("ehpeek-scroller-dragging");
    this.target.removeEventListener("scroll", this.onScroll);
    this.target.removeEventListener("wheel", this.onWheel);
  }

  dragging(): boolean {
    return this.pointerGesture.dragging();
  }

  onKeydown = (event: KeyboardEvent): void => {
    if (this.shouldIgnoreKeyboardEvent(event)) {
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      this.handlers.onKeyboardClose();
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      this.handlers.onKeyboardArrow("left");
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      this.handlers.onKeyboardArrow("right");
    }
  };

  private shouldStartDrag = (event: PointerEvent | MouseEvent): boolean => {
    if (!(event instanceof PointerEvent)) {
      return false;
    }

    debugLog("pointerdown", {
      pointerType: event.pointerType,
      button: event.button,
      buttons: event.buttons,
      target: targetSummary(event.target),
    });

    if (event.pointerType === "mouse" && event.button !== 0) {
      debugLog("pointerdown ignored: mouse buttons", { button: event.button, buttons: event.buttons });
      return false;
    }

    return this.handlers.shouldStartDrag(event);
  };

  private shouldObserveTap = (event: PointerEvent | MouseEvent): boolean => {
    return event instanceof PointerEvent && event.pointerType !== "mouse" && !this.handlers.shouldStartDrag(event);
  };

  private onDragStart = (info: PointerDragStart, event: PointerEvent | MouseEvent): void => {
    this.target.classList.add("ehpeek-scroller-dragging");
    this.handlers.onDragStart(info, event);
  };

  private onDragMove = (info: PointerDragMove, event: PointerEvent | MouseEvent): void => {
    this.handlers.onDragMove(info, event);
  };

  private onDragEnd = (info: PointerDragEnd, event: PointerEvent | MouseEvent): void => {
    this.target.classList.remove("ehpeek-scroller-dragging");

    if (Math.abs(info.dx) < TAP_MOVE_THRESHOLD && Math.abs(info.dy) < TAP_MOVE_THRESHOLD) {
      return;
    }

    this.handlers.onDragEnd(info, event);
  };

  private onTap = (info: PointerDragTap, event: PointerEvent | MouseEvent): void => {
    this.handlers.onTap(info, event);
  };

  private onPinchStart = (info: GesturePinchStart, event: PointerEvent): boolean => {
    return this.handlers.onPinchStart(info, event);
  };

  private onPinchMove = (info: GesturePinchMove, event: PointerEvent): void => {
    this.handlers.onPinchMove(info, event);
  };

  private shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
    if (event.isComposing) {
      return true;
    }

    const target = event.target;

    if (!(target instanceof Element)) {
      return false;
    }

    return Boolean(target.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
  }

  private onWheel = (event: WheelEvent): void => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    this.handlers.onWheel(delta, event);
  };

  private onScroll = (): void => {
    this.handlers.onNativeScroll();
  };

}
