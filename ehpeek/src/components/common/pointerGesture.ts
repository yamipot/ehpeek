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

export type PointerPinchStart = {
  clientX: number;
  clientY: number;
  distance: number;
};

export type PointerPinchMove = PointerPinchStart & {
  scale: number;
};

const DEFAULT_TAP_MOVE_THRESHOLD_PX = 8;

export class PointerGesture {
  private mousePointerId = -1;
  private readonly pinchPointers = new Map<number, { clientX: number; clientY: number }>();
  private drag: {
    pointerId: number;
    pointerType: string;
    startClientX: number;
    startClientY: number;
    lastClientY: number;
    lastMoveTime: number;
    startTarget: EventTarget | null;
    velocityY: number;
  } | null = null;
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
    private readonly handlers: {
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
    },
  ) {
    target.addEventListener("pointerdown", this.onPointerDown);
    target.addEventListener("mousedown", this.onMouseDown);
    target.addEventListener("dragstart", this.onDragStart);
  }

  dispose(): void {
    if (this.drag) {
      this.target.releasePointerCapture?.(this.drag.pointerId);
      this.drag = null;
    }

    this.clearPinch();
    this.passiveTap = null;
    this.removePointerListeners();
    this.removeMouseListeners();
    this.removePassiveTapListeners();
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("mousedown", this.onMouseDown);
    this.target.removeEventListener("dragstart", this.onDragStart);
  }

  dragging(): boolean {
    return this.drag !== null;
  }

  cancel(): void {
    if (!this.drag) {
      return;
    }

    this.target.releasePointerCapture?.(this.drag.pointerId);
    this.drag = null;
    this.target.classList.remove("ehpeek-dragging");
    this.removePointerListeners();
    this.removeMouseListeners();
  }

  private onDragStart = (event: DragEvent): void => {
    event.preventDefault();
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

    if (this.handlers.shouldCaptureDrag && !this.handlers.shouldCaptureDrag(event)) {
      this.beginPassiveTap(event);
      return;
    }

    event.preventDefault();
    this.start(event.pointerId, event.pointerType, event.clientX, event.clientY, event);

    if (event.pointerType === "mouse") {
      this.addMouseListeners();
    }
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || typeof PointerEvent !== "undefined" || this.drag) {
      return;
    }

    if (this.handlers.shouldCaptureDrag && !this.handlers.shouldCaptureDrag(event)) {
      return;
    }

    event.preventDefault();
    this.start(this.mousePointerId, "mouse", event.clientX, event.clientY, event);
    this.addMouseListeners();
  };

  private start(pointerId: number, pointerType: string, clientX: number, clientY: number, event: PointerEvent | MouseEvent): void {
    this.drag = {
      pointerId,
      pointerType,
      startClientX: clientX,
      startClientY: clientY,
      lastClientY: clientY,
      lastMoveTime: event.timeStamp,
      startTarget: event.target,
      velocityY: 0,
    };

    this.target.classList.add("ehpeek-dragging");
    this.target.setPointerCapture?.(pointerId);
    this.addPointerListeners();
    this.handlers.onStart?.({ pointerId, clientX, clientY }, event);
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) {
      return;
    }

    this.move(event.clientX, event.clientY, event);
    event.preventDefault();
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
    event.preventDefault();
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

    const elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
    drag.velocityY = (clientY - drag.lastClientY) / elapsed;
    drag.lastClientY = clientY;
    drag.lastMoveTime = event.timeStamp;

    this.handlers.onMove?.(
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

  private finish(clientX: number, clientY: number, event: PointerEvent | MouseEvent): void {
    const drag = this.drag;

    if (!drag) {
      return;
    }

    this.drag = null;
    this.target.classList.remove("ehpeek-dragging");
    this.target.releasePointerCapture?.(drag.pointerId);
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

    if (isTap) {
      this.handlers.onTap?.({ ...info, startTarget: drag.startTarget }, event);
    }

    this.handlers.onEnd?.(info, event);
  }

  private addPointerListeners(): void {
    this.target.addEventListener("pointermove", this.onPointerMove);
    this.target.addEventListener("pointerup", this.onPointerUp);
    this.target.addEventListener("pointercancel", this.onPointerCancel);
  }

  private removePointerListeners(): void {
    this.target.removeEventListener("pointermove", this.onPointerMove);
    this.target.removeEventListener("pointerup", this.onPointerUp);
    this.target.removeEventListener("pointercancel", this.onPointerCancel);
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
    if (!this.handlers.shouldObserveTap?.(event)) {
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

    this.handlers.onTap?.(
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
    if (!this.handlers.onPinchStart || event.pointerType === "mouse") {
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

    const started = this.handlers.onPinchStart(snapshot, event);

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

    this.handlers.onPinchMove?.(
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

    this.handlers.onPinchEnd?.();
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
    return this.handlers.tapMoveThreshold ?? DEFAULT_TAP_MOVE_THRESHOLD_PX;
  }

  private matchesPassiveTapPointer(
    event: PointerEvent,
    tap: NonNullable<PointerGesture["passiveTap"]>,
  ): boolean {
    return event.pointerId === tap.pointerId && event.pointerType === tap.pointerType;
  }
}
