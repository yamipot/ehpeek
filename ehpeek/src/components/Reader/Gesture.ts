import { debugLog, targetSummary } from "../../utils";
import { PointerDrag, type PointerDragEnd, type PointerDragMove, type PointerDragStart } from "../common/pointerDrag";

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

export class PagesGesture {
  private readonly pointerDrag: PointerDrag;
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
      onNativeScroll: () => void;
    },
  ) {
    this.pointerDrag = new PointerDrag(target, {
      shouldStart: this.shouldStartDrag,
      onStart: this.onDragStart,
      onMove: this.onDragMove,
      onEnd: this.onDragEnd,
      shouldSuppressClick: () => true,
    });
    target.addEventListener("scroll", this.onScroll);
    target.addEventListener("wheel", this.onWheel);
  }

  dispose(): void {
    this.pointerDrag.dispose();
    this.passiveTap = null;
    this.target.classList.remove("ehpeek-scroller-dragging");
    this.removePassiveTapListeners();
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
      this.handlers.onTap(info, event);
      return;
    }

    this.handlers.onDragEnd(info, event);
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

  private matchesPassiveTapPointer(
    event: PointerEvent,
    tap: NonNullable<PagesGesture["passiveTap"]>,
  ): boolean {
    return event.pointerId === tap.pointerId && event.pointerType === tap.pointerType;
  }
}
