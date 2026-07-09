import { debugLog, targetSummary } from "../../utils";

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
  private mouseDragPointerId = -1;
  private drag: {
    pointerId: number;
    pointerType: string;
    startClientX: number;
    startClientY: number;
    lastClientY: number;
    lastMoveTime: number;
    velocityY: number;
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
  private suppressNextClick = false;

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
    target.addEventListener("click", this.onClick);
    target.addEventListener("scroll", this.onScroll);
    target.addEventListener("wheel", this.onWheel);
    target.addEventListener("pointerdown", this.onPointerDown);
    target.addEventListener("mousedown", this.onMouseDown);
    target.addEventListener("dragstart", this.onDragStartEvent);
  }

  dispose(): void {
    if (this.drag) {
      this.target.releasePointerCapture?.(this.drag.pointerId);
      this.drag = null;
    }

    this.passiveTap = null;
    this.target.classList.remove("ehpeek-scroller-dragging");
    this.removePointerListeners();
    this.target.removeEventListener("click", this.onClick);
    this.target.removeEventListener("scroll", this.onScroll);
    this.target.removeEventListener("wheel", this.onWheel);
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("mousedown", this.onMouseDown);
    this.target.removeEventListener("dragstart", this.onDragStartEvent);
  }

  dragging(): boolean {
    return this.drag !== null;
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

  private onClick = (event: MouseEvent): void => {
    if (this.suppressNextClick) {
      this.suppressNextClick = false;
      event.preventDefault();
      return;
    }

    this.handlers.onTap(
      {
        pointerId: null,
        clientX: event.clientX,
        clientY: event.clientY,
        dx: 0,
        dy: 0,
      },
      event,
    );
  };

  private onWheel = (event: WheelEvent): void => {
    const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    this.handlers.onWheel(delta, event);
  };

  private onDragStartEvent = (event: DragEvent): void => {
    event.preventDefault();
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0) {
      return;
    }

    if (this.drag?.pointerType === "mouse") {
      // Some userscript/browser combinations start the drag with PointerEvent
      // but deliver movement through MouseEvent with a different id.
      this.addMouseListeners();
      return;
    }

    if (typeof PointerEvent !== "undefined" || this.drag) {
      return;
    }

    const synthetic = this.mouseEventToPointerLike(event, "pointerdown");

    if (!this.handlers.shouldStartDrag(synthetic)) {
      return;
    }

    event.preventDefault();
    this.startDragFromPoint(this.mouseDragPointerId, "mouse", event.clientX, event.clientY, event.timeStamp, event);
    this.addMouseListeners();
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.drag || this.drag.pointerType !== "mouse") {
      return;
    }

    this.updateDrag(event.clientX, event.clientY, event.timeStamp, event);
    event.preventDefault();
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (!this.drag || this.drag.pointerType !== "mouse") {
      return;
    }

    this.finishDrag(event.clientX, event.clientY, event);
    this.removeMouseListeners();
  };

  private onPointerDown = (event: PointerEvent): void => {
    debugLog("pointerdown", {
      pointerType: event.pointerType,
      button: event.button,
      buttons: event.buttons,
      target: targetSummary(event.target),
    });

    if (event.pointerType === "mouse" && event.button !== 0) {
      debugLog("pointerdown ignored: mouse buttons", { button: event.button, buttons: event.buttons });
      return;
    }

    if (!this.handlers.shouldStartDrag(event)) {
      this.beginPassiveTap(event);
      return;
    }

    event.preventDefault();
    this.startDragFromPoint(event.pointerId, event.pointerType, event.clientX, event.clientY, event.timeStamp, event);

    if (event.pointerType === "mouse") {
      this.addMouseListeners();
    }
  };

  private startDragFromPoint(
    pointerId: number,
    pointerType: string,
    clientX: number,
    clientY: number,
    timeStamp: number,
    event: PointerEvent | MouseEvent,
  ): void {
    this.drag = {
      pointerId,
      pointerType,
      startClientX: clientX,
      startClientY: clientY,
      lastClientY: clientY,
      lastMoveTime: timeStamp,
      velocityY: 0,
    };

    this.beginDrag(pointerId);
    this.handlers.onDragStart(
      {
        pointerId,
        clientX,
        clientY,
      },
      event,
    );
  }

  private onPointerMove = (event: PointerEvent): void => {
    const drag = this.drag;

    if (!drag) {
      this.trackPassiveTap(event);
      return;
    }

    if (!this.matchesDragPointer(event, drag)) {
      debugLog("pointermove ignored", {
        pointerId: event.pointerId,
        dragPointerId: drag?.pointerId ?? null,
        pointerType: event.pointerType,
        dragging: Boolean(drag),
      });
      return;
    }

    this.updateDrag(event.clientX, event.clientY, event.timeStamp, event);
    event.preventDefault();
  };

  private onPointerUp = (event: PointerEvent): void => {
    const drag = this.drag;

    if (!drag) {
      this.endPassiveTap(event);
      return;
    }

    if (!this.matchesDragPointer(event, drag)) {
      debugLog("pointerup ignored", {
        pointerId: event.pointerId,
        dragPointerId: drag?.pointerId ?? null,
        pointerType: event.pointerType,
        dragging: Boolean(drag),
      });
      return;
    }

    this.finishDrag(event.clientX, event.clientY, event);
  };

  private onScroll = (): void => {
    this.handlers.onNativeScroll();
  };

  private matchesDragPointer(event: PointerEvent, drag: NonNullable<PagesGesture["drag"]>): boolean {
    if (event.pointerId === drag.pointerId) {
      return true;
    }

    return (
      drag.pointerType === "mouse" &&
      event.pointerType === "mouse" &&
      (event.type === "pointerup" || event.type === "pointercancel" || (event.buttons & 1) === 1)
    );
  }

  private beginDrag(pointerId: number): void {
    this.target.classList.add("ehpeek-scroller-dragging");
    if (pointerId !== this.mouseDragPointerId) {
      this.target.setPointerCapture?.(pointerId);
    }
    this.addPointerListeners();
  }

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
    this.addPointerListeners();
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
    this.removePointerListeners();

    if (event.type === "pointercancel") {
      return;
    }

    const dx = event.clientX - tap.startClientX;
    const dy = event.clientY - tap.startClientY;

    if (tap.moved || Math.abs(dx) >= TAP_MOVE_THRESHOLD || Math.abs(dy) >= TAP_MOVE_THRESHOLD) {
      return;
    }

    this.suppressNextClick = true;
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

  private addPointerListeners(): void {
    document.addEventListener("pointermove", this.onPointerMove, true);
    document.addEventListener("pointerup", this.onPointerUp, true);
    document.addEventListener("pointercancel", this.onPointerUp, true);
  }

  private endDrag(pointerId: number): void {
    if (pointerId !== this.mouseDragPointerId) {
      this.target.releasePointerCapture?.(pointerId);
    }
    this.target.classList.remove("ehpeek-scroller-dragging");
    this.removePointerListeners();
  }

  private updateDrag(clientX: number, clientY: number, timeStamp: number, event: PointerEvent | MouseEvent): void {
    const drag = this.drag;

    if (!drag) {
      return;
    }

    const elapsed = Math.max(1, timeStamp - drag.lastMoveTime);
    drag.velocityY = (clientY - drag.lastClientY) / elapsed;
    drag.lastClientY = clientY;
    drag.lastMoveTime = timeStamp;

    this.handlers.onDragMove(
      {
        pointerId: drag.pointerId,
        clientX,
        clientY,
        dx: clientX - drag.startClientX,
        dy: clientY - drag.startClientY,
        velocityY: drag.velocityY,
      },
      event,
    );
  }

  private finishDrag(clientX: number, clientY: number, event: PointerEvent | MouseEvent): void {
    const drag = this.drag;

    if (!drag) {
      return;
    }

    this.drag = null;
    this.endDrag(drag.pointerId);

    const dx = clientX - drag.startClientX;
    const dy = clientY - drag.startClientY;

    if (Math.abs(dx) < TAP_MOVE_THRESHOLD && Math.abs(dy) < TAP_MOVE_THRESHOLD) {
      this.suppressNextClick = true;
      this.handlers.onTap(
        {
          pointerId: drag.pointerId,
          clientX,
          clientY,
          dx,
          dy,
        },
        event,
      );
      return;
    }

    this.handlers.onDragEnd(
      {
        pointerId: drag.pointerId,
        clientX,
        clientY,
        dx,
        dy,
        velocityY: drag.velocityY,
      },
      event,
    );
  }

  private mouseEventToPointerLike(event: MouseEvent, type: string): PointerEvent {
    return {
      ...event,
      type,
      pointerId: this.mouseDragPointerId,
      pointerType: "mouse",
      isPrimary: true,
    } as PointerEvent;
  }

  private removePointerListeners(): void {
    document.removeEventListener("pointermove", this.onPointerMove, true);
    document.removeEventListener("pointerup", this.onPointerUp, true);
    document.removeEventListener("pointercancel", this.onPointerUp, true);
    this.removeMouseListeners();
  }

  private addMouseListeners(): void {
    document.addEventListener("mousemove", this.onMouseMove, true);
    document.addEventListener("mouseup", this.onMouseUp, true);
  }

  private removeMouseListeners(): void {
    document.removeEventListener("mousemove", this.onMouseMove, true);
    document.removeEventListener("mouseup", this.onMouseUp, true);
  }

  private matchesPassiveTapPointer(
    event: PointerEvent,
    tap: NonNullable<PagesGesture["passiveTap"]>,
  ): boolean {
    return event.pointerId === tap.pointerId && event.pointerType === tap.pointerType;
  }
}
