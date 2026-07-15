export type PointerDragStart = {
  clientX: number;
  clientY: number;
  pointerId: number;
};

export type PointerDragMove = PointerDragStart & {
  dx: number;
  dy: number;
  velocityY: number;
};

export type PointerDragEnd = PointerDragMove;
export type PointerDragTap = PointerDragEnd & {
  startTarget: EventTarget | null;
};
export type PointerDragAxis = "any" | "x" | "y";

export type PointerPinchStart = {
  clientX: number;
  clientY: number;
  distance: number;
};

export type PointerPinchMove = PointerPinchStart & {
  scale: number;
};

const DEFAULT_TAP_MOVE_THRESHOLD_PX = 8;
const DEFAULT_DRAG_START_THRESHOLD_PX = 8;
const DEFAULT_DRAG_INTENT_RATIO = 1;

export type PointerGestureCallbacks = {
  dragAxis?: PointerDragAxis;
  dragIntentRatio?: number;
  dragStartThreshold?: number;
  shouldCaptureDrag?: (event: PointerEvent | MouseEvent) => boolean;
  shouldObserveTap?: (event: PointerEvent | MouseEvent) => boolean;
  onStart?: (info: PointerDragStart, event: PointerEvent | MouseEvent) => void;
  onMove?: (info: PointerDragMove, event: PointerEvent | MouseEvent) => void;
  onEnd?: (info: PointerDragEnd, event: PointerEvent | MouseEvent) => void;
  onTap?: (info: PointerDragTap, event: PointerEvent | MouseEvent) => void;
  onPinchStart?: (info: PointerPinchStart, event: PointerEvent) => boolean;
  onPinchMove?: (info: PointerPinchMove, event: PointerEvent) => void;
  onPinchEnd?: () => void;
  tapMoveThreshold?: number;
};

export class PointerGesture {
  private mousePointerId = -1;
  private readonly pinchPointers = new Map<number, { clientX: number; clientY: number }>();
  private drag: GesturePointer | null = null;
  private suppressClick = false;
  private suppressClickTimer: number | null = null;
  private passiveTap: {
    pointerId: number;
    pointerType: string;
    startClientX: number;
    startClientY: number;
    lastClientX: number;
    lastClientY: number;
    startTarget: EventTarget | null;
    moved: boolean;
  } | null = null;
  private pinch: {
    startDistance: number;
  } | null = null;

  constructor(
    private readonly target: HTMLElement,
    private readonly callbacks: PointerGestureCallbacks,
  ) {
    this.setDragging(false);
    target.addEventListener("pointerdown", this.onPointerDown);
    target.addEventListener("mousedown", this.onMouseDown);
    target.addEventListener("dragstart", this.onDragStart);
    target.addEventListener("click", this.onClick, true);
  }

  dispose(): void {
    if (this.drag?.captured) {
      this.target.releasePointerCapture?.(this.drag.pointerId);
    }

    this.drag = null;
    this.setDragging(false);
    this.clearPinch();
    this.passiveTap = null;
    this.removePointerListeners();
    this.removeMouseListeners();
    this.removePassiveTapListeners();
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("mousedown", this.onMouseDown);
    this.target.removeEventListener("dragstart", this.onDragStart);
    this.target.removeEventListener("click", this.onClick, true);

    if (this.suppressClickTimer !== null) {
      window.clearTimeout(this.suppressClickTimer);
      this.suppressClickTimer = null;
    }
  }

  isDragging(): boolean {
    return this.drag?.active === true;
  }

  cancel(): void {
    if (!this.drag) {
      return;
    }

    if (this.drag.captured) {
      this.target.releasePointerCapture?.(this.drag.pointerId);
    }

    this.drag = null;
    this.setDragging(false);
    this.removePointerListeners();
    this.removeMouseListeners();
  }

  private onDragStart = (event: DragEvent): void => {
    if (this.isDragging()) {
      event.preventDefault();
    }
  };

  private onClick = (event: MouseEvent): void => {
    if (!this.suppressClick) {
      return;
    }

    this.suppressClick = false;
    event.preventDefault();
    event.stopPropagation();
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (this.trackPinchPointerDown(event)) {
      return;
    }

    if (this.pinch) {
      return;
    }

    if (this.callbacks.shouldCaptureDrag && !this.callbacks.shouldCaptureDrag(event)) {
      this.beginPassiveTap(event);
      return;
    }

    this.start(event.pointerId, event.pointerType, event.clientX, event.clientY, event);
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || typeof PointerEvent !== "undefined" || this.drag) {
      return;
    }

    if (this.callbacks.shouldCaptureDrag && !this.callbacks.shouldCaptureDrag(event)) {
      return;
    }

    this.start(this.mousePointerId, "mouse", event.clientX, event.clientY, event);
    this.addMouseListeners();
  };

  private start(pointerId: number, pointerType: string, clientX: number, clientY: number, event: PointerEvent | MouseEvent): void {
    this.drag = {
      active: false,
      captured: false,
      pointerId,
      pointerType,
      startClientX: clientX,
      startClientY: clientY,
      lastClientX: clientX,
      lastClientY: clientY,
      lastMoveTime: event.timeStamp,
      startTarget: event.target,
      velocityY: 0,
    };

    this.addPointerListeners();
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) {
      return;
    }

    this.move(event.clientX, event.clientY, event);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) {
      return;
    }

    this.finish(event.clientX, event.clientY, event);
    this.releasePinchPointer(event);
  };

  private onPointerCancel = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) {
      return;
    }

    this.finish(event.clientX, event.clientY, event);
    this.releasePinchPointer(event);
  };

  private onMouseMove = (event: MouseEvent): void => {
    if (!this.drag || this.drag.pointerType !== "mouse") {
      return;
    }

    this.move(event.clientX, event.clientY, event);
  };

  private onMouseUp = (event: MouseEvent): void => {
    if (!this.drag || this.drag.pointerType !== "mouse") {
      return;
    }

    this.finish(event.clientX, event.clientY, event);
  };

  private move(clientX: number, clientY: number, event: PointerEvent | MouseEvent): void {
    const drag = this.drag;

    if (!drag) {
      return;
    }

    if (!drag.active && this.dragIntent(clientX - drag.startClientX, clientY - drag.startClientY) === "cancel") {
      this.cancel();
      return;
    }

    if (!drag.active && this.dragIntent(clientX - drag.startClientX, clientY - drag.startClientY) !== "start") {
      this.updateLastMove(drag, clientX, clientY, event);
      return;
    }

    if (!drag.active) {
      this.activateDrag(drag, event);
    }

    const elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
    drag.velocityY = (clientY - drag.lastClientY) / elapsed;
    drag.lastClientX = clientX;
    drag.lastClientY = clientY;
    drag.lastMoveTime = event.timeStamp;

    this.callbacks.onMove?.(
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

    event.preventDefault();
  }

  private finish(clientX: number, clientY: number, event: PointerEvent | MouseEvent): void {
    const drag = this.drag;

    if (!drag) {
      return;
    }

    this.drag = null;
    this.setDragging(false);
    if (drag.captured) {
      this.target.releasePointerCapture?.(drag.pointerId);
    }
    this.removePointerListeners();
    this.removeMouseListeners();

    const info = {
      pointerId: drag.pointerId,
      clientX,
      clientY,
      dx: clientX - drag.startClientX,
      dy: clientY - drag.startClientY,
      velocityY: drag.velocityY,
    };

    const isTap = Math.abs(info.dx) < this.tapMoveThreshold() && Math.abs(info.dy) < this.tapMoveThreshold();

    if (!drag.active && isTap) {
      this.callbacks.onTap?.({ ...info, startTarget: drag.startTarget }, event);
    }

    if (drag.active) {
      this.suppressNextClick();
      this.callbacks.onEnd?.(info, event);
    }
  }

  private addPointerListeners(): void {
    document.addEventListener("pointermove", this.onPointerMove, true);
    document.addEventListener("pointerup", this.onPointerUp, true);
    document.addEventListener("pointercancel", this.onPointerCancel, true);
  }

  private removePointerListeners(): void {
    document.removeEventListener("pointermove", this.onPointerMove, true);
    document.removeEventListener("pointerup", this.onPointerUp, true);
    document.removeEventListener("pointercancel", this.onPointerCancel, true);
  }

  private addMouseListeners(): void {
    window.addEventListener("mousemove", this.onMouseMove, true);
    window.addEventListener("mouseup", this.onMouseUp, true);
  }

  private removeMouseListeners(): void {
    window.removeEventListener("mousemove", this.onMouseMove, true);
    window.removeEventListener("mouseup", this.onMouseUp, true);
  }

  private beginPassiveTap(event: PointerEvent): void {
    if (!this.callbacks.shouldObserveTap?.(event)) {
      return;
    }

    this.passiveTap = {
      pointerId: event.pointerId,
      pointerType: event.pointerType,
      startClientX: event.clientX,
      startClientY: event.clientY,
      lastClientX: event.clientX,
      lastClientY: event.clientY,
      startTarget: event.target,
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
      Math.abs(event.clientX - tap.startClientX) >= this.tapMoveThreshold() ||
      Math.abs(event.clientY - tap.startClientY) >= this.tapMoveThreshold()
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
    this.releasePinchPointer(event);

    if (event.type === "pointercancel") {
      return;
    }

    const dx = event.clientX - tap.startClientX;
    const dy = event.clientY - tap.startClientY;

    if (tap.moved || Math.abs(dx) >= this.tapMoveThreshold() || Math.abs(dy) >= this.tapMoveThreshold()) {
      return;
    }

    this.callbacks.onTap?.(
      {
        pointerId: event.pointerId,
        clientX: event.clientX,
        clientY: event.clientY,
        dx,
        dy,
        velocityY: 0,
        startTarget: tap.startTarget,
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

  private trackPinchPointerDown(event: PointerEvent): boolean {
    if (!this.callbacks.onPinchStart || event.pointerType === "mouse") {
      return false;
    }

    this.pinchPointers.set(event.pointerId, {
      clientX: event.clientX,
      clientY: event.clientY,
    });

    if (this.pinch || this.pinchPointers.size !== 2) {
      return false;
    }

    const snapshot = this.pinchSnapshot();

    if (!snapshot) {
      return false;
    }

    const started = this.callbacks.onPinchStart(snapshot, event);

    if (!started) {
      return false;
    }

    this.cancel();
    this.passiveTap = null;
    this.removePassiveTapListeners();
    this.pinch = {
      startDistance: snapshot.distance,
    };
    this.addPinchListeners();
    event.preventDefault();
    event.stopPropagation();
    return true;
  }

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

    this.callbacks.onPinchMove?.(
      {
        ...snapshot,
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

    this.callbacks.onPinchEnd?.();
    this.clearPinch();
    event.preventDefault();
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

  private releasePinchPointer(event: PointerEvent): void {
    if (!this.pinch) {
      this.pinchPointers.delete(event.pointerId);
    }
  }

  private pinchSnapshot(): PointerPinchStart | null {
    const points = Array.from(this.pinchPointers.values());

    if (points.length < 2) {
      return null;
    }

    const [first, second] = points;
    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;

    return {
      clientX: (first.clientX + second.clientX) / 2,
      clientY: (first.clientY + second.clientY) / 2,
      distance: Math.hypot(dx, dy),
    };
  }

  private tapMoveThreshold(): number {
    return this.callbacks.tapMoveThreshold ?? DEFAULT_TAP_MOVE_THRESHOLD_PX;
  }

  private dragStartThreshold(): number {
    return this.callbacks.dragStartThreshold ?? DEFAULT_DRAG_START_THRESHOLD_PX;
  }

  private dragIntentRatio(): number {
    return this.callbacks.dragIntentRatio ?? DEFAULT_DRAG_INTENT_RATIO;
  }

  private dragAxis(): PointerDragAxis {
    return this.callbacks.dragAxis ?? "any";
  }

  private dragIntent(dx: number, dy: number): "pending" | "start" | "cancel" {
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    const threshold = this.dragStartThreshold();
    const ratio = this.dragIntentRatio();

    if (this.dragAxis() === "x") {
      if (absY >= threshold && absY > absX) {
        return "cancel";
      }

      return absX >= threshold && absX >= absY * ratio ? "start" : "pending";
    }

    if (this.dragAxis() === "y") {
      if (absX >= threshold && absX > absY) {
        return "cancel";
      }

      return absY >= threshold && absY >= absX * ratio ? "start" : "pending";
    }

    return Math.hypot(dx, dy) >= threshold ? "start" : "pending";
  }

  private activateDrag(drag: GesturePointer, event: PointerEvent | MouseEvent): void {
    drag.active = true;
    this.setDragging(true);
    if (event instanceof PointerEvent && this.target.setPointerCapture) {
      this.target.setPointerCapture(drag.pointerId);
      drag.captured = true;
    }
    this.callbacks.onStart?.(
      {
        pointerId: drag.pointerId,
        clientX: drag.startClientX,
        clientY: drag.startClientY,
      },
      event,
    );
    event.preventDefault();
  }

  private updateLastMove(drag: GesturePointer, clientX: number, clientY: number, event: PointerEvent | MouseEvent): void {
    const elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
    drag.velocityY = (clientY - drag.lastClientY) / elapsed;
    drag.lastClientX = clientX;
    drag.lastClientY = clientY;
    drag.lastMoveTime = event.timeStamp;
  }

  private suppressNextClick(): void {
    this.suppressClick = true;

    if (this.suppressClickTimer !== null) {
      window.clearTimeout(this.suppressClickTimer);
    }

    this.suppressClickTimer = window.setTimeout(() => {
      this.suppressClick = false;
      this.suppressClickTimer = null;
    }, 400);
  }

  private setDragging(dragging: boolean): void {
    this.target.dataset.dragging = String(dragging);
  }

  private matchesPassiveTapPointer(
    event: PointerEvent,
    tap: NonNullable<PointerGesture["passiveTap"]>,
  ): boolean {
    return event.pointerId === tap.pointerId && event.pointerType === tap.pointerType;
  }
}

type GesturePointer = {
  active: boolean;
  captured: boolean;
  pointerId: number;
  pointerType: string;
  startClientX: number;
  startClientY: number;
  lastClientX: number;
  lastClientY: number;
  lastMoveTime: number;
  startTarget: EventTarget | null;
  velocityY: number;
};
