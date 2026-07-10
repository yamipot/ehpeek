import { debugLog, targetSummary } from "../../utils";
import { PointerDrag, type PointerDragEnd, type PointerDragMove, type PointerDragStart, type PointerDragTap } from "../common/pointerDrag";

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
  private readonly pointerDrag: PointerDrag;
  private readonly pinchPointers = new Map<number, GesturePoint>();
  private pinch: {
    startDistance: number;
  } | null = null;
  private passiveTap: {
    pointerId: number;
    pointerType: string;
    startClientX: number;
    startClientY: number;
    lastClientX: number;
    lastClientY: number;
    moved: boolean;
  } | null = null;
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
    this.pointerDrag = new PointerDrag(target, {
      shouldStart: this.shouldStartDrag,
      onStart: this.onDragStart,
      onMove: this.onDragMove,
      onEnd: this.onDragEnd,
      onTap: this.onTap,
      tapMoveThreshold: TAP_MOVE_THRESHOLD,
    });
    target.addEventListener("pointerdown", this.onPinchPointerDown, true);
    target.addEventListener("pointerup", this.onPinchPointerRelease, true);
    target.addEventListener("pointercancel", this.onPinchPointerRelease, true);
    target.addEventListener("scroll", this.onScroll);
    target.addEventListener("wheel", this.onWheel);
  }

  dispose(): void {
    this.pointerDrag.dispose();
    this.clearPinch();
    this.passiveTap = null;
    this.target.classList.remove("ehpeek-scroller-dragging");
    this.removePassiveTapListeners();
    this.target.removeEventListener("pointerdown", this.onPinchPointerDown, true);
    this.target.removeEventListener("pointerup", this.onPinchPointerRelease, true);
    this.target.removeEventListener("pointercancel", this.onPinchPointerRelease, true);
    this.target.removeEventListener("scroll", this.onScroll);
    this.target.removeEventListener("wheel", this.onWheel);
  }

  dragging(): boolean {
    return this.pointerDrag.dragging();
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

    if (this.pinch) {
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

    if (!this.handlers.shouldStartDrag(event)) {
      this.beginPassiveTap(event);
      return false;
    }

    return true;
  };

  private onPinchPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse") {
      return;
    }

    this.pinchPointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (this.pinchPointers.size !== 2 || this.pinch) {
      return;
    }

    const snapshot = this.pinchSnapshot();

    if (!snapshot) {
      return;
    }

    const started = this.handlers.onPinchStart(
      {
        clientX: snapshot.centerX,
        clientY: snapshot.centerY,
        distance: snapshot.distance,
      },
      event,
    );

    if (!started) {
      return;
    }

    this.pointerDrag.cancel();
    this.passiveTap = null;
    this.removePassiveTapListeners();
    this.pinch = {
      startDistance: snapshot.distance,
    };
    this.addPinchListeners();
    event.preventDefault();
    event.stopPropagation();
  };

  private onPinchPointerMove = (event: PointerEvent): void => {
    if (!this.pinch || !this.pinchPointers.has(event.pointerId)) {
      return;
    }

    this.pinchPointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    const snapshot = this.pinchSnapshot();

    if (!snapshot) {
      return;
    }

    this.handlers.onPinchMove(
      {
        clientX: snapshot.centerX,
        clientY: snapshot.centerY,
        distance: snapshot.distance,
        scale: snapshot.distance / this.pinch.startDistance,
      },
      event,
    );
    event.preventDefault();
  };

  private onPinchPointerEnd = (event: PointerEvent): void => {
    if (!this.pinchPointers.has(event.pointerId)) {
      return;
    }

    this.pinchPointers.delete(event.pointerId);

    if (!this.pinch || this.pinchPointers.size >= 2) {
      return;
    }

    this.handlers.onPinchEnd();
    this.clearPinch();
    event.preventDefault();
  };

  private onPinchPointerRelease = (event: PointerEvent): void => {
    if (!this.pinch) {
      this.pinchPointers.delete(event.pointerId);
    }
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

  private beginPassiveTap(event: PointerEvent): void {
    if (event.pointerType === "mouse") {
      return;
    }

    this.passiveTap = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      moved: false,
    };
    this.addPassiveTapListeners();
  }

  private trackPassiveTap(event: PointerEvent): void {
    const tap = this.passiveTap;

    if (!tap || !this.matchesPassiveTapPointer(event, tap)) {
      return;
    }

    tap.lastClientX = event.clientX;
    tap.lastClientY = event.clientY;

    if (
      Math.abs(event.clientX - tap.startClientX) >= TAP_MOVE_THRESHOLD ||
      Math.abs(event.clientY - tap.startClientY) >= TAP_MOVE_THRESHOLD
    ) {
      tap.moved = true;
    }
  }

  private endPassiveTap(event: PointerEvent): void {
    const tap = this.passiveTap;

    if (!tap || !this.matchesPassiveTapPointer(event, tap)) {
      return;
    }

    this.passiveTap = null;
    this.removePassiveTapListeners();

    if (event.type === "pointercancel") {
      return;
    }

    const dx = event.clientX - tap.startClientX;
    const dy = event.clientY - tap.startClientY;

    if (tap.moved || Math.abs(dx) >= TAP_MOVE_THRESHOLD || Math.abs(dy) >= TAP_MOVE_THRESHOLD) {
      return;
    }

    this.handlers.onTap(
      {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        dx,
        dy,
      },
      event,
    );
  }

  private addPassiveTapListeners(): void {
    document.addEventListener("pointermove", this.onPassiveTapMove, true);
    document.addEventListener("pointerup", this.onPassiveTapEnd, true);
    document.addEventListener("pointercancel", this.onPassiveTapEnd, true);
  }

  private removePassiveTapListeners(): void {
    document.removeEventListener("pointermove", this.onPassiveTapMove, true);
    document.removeEventListener("pointerup", this.onPassiveTapEnd, true);
    document.removeEventListener("pointercancel", this.onPassiveTapEnd, true);
  }

  private onPassiveTapMove = (event: PointerEvent): void => {
    this.trackPassiveTap(event);
  };

  private onPassiveTapEnd = (event: PointerEvent): void => {
    this.endPassiveTap(event);
  };

  private addPinchListeners(): void {
    document.addEventListener("pointermove", this.onPinchPointerMove, true);
    document.addEventListener("pointerup", this.onPinchPointerEnd, true);
    document.addEventListener("pointercancel", this.onPinchPointerEnd, true);
  }

  private removePinchListeners(): void {
    document.removeEventListener("pointermove", this.onPinchPointerMove, true);
    document.removeEventListener("pointerup", this.onPinchPointerEnd, true);
    document.removeEventListener("pointercancel", this.onPinchPointerEnd, true);
  }

  private clearPinch(): void {
    this.pinch = null;
    this.pinchPointers.clear();
    this.removePinchListeners();
  }

  private pinchSnapshot(): { centerX: number; centerY: number; distance: number } | null {
    const points = Array.from(this.pinchPointers.values());

    if (points.length < 2) {
      return null;
    }

    const [first, second] = points;
    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;

    return {
      centerX: (first.clientX + second.clientX) / 2,
      centerY: (first.clientY + second.clientY) / 2,
      distance: Math.hypot(dx, dy),
    };
  }

  private matchesPassiveTapPointer(
    event: PointerEvent,
    tap: NonNullable<PagesGesture["passiveTap"]>,
  ): boolean {
    return event.pointerId === tap.pointerId && event.pointerType === tap.pointerType;
  }
}
