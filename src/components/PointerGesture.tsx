import { createEffect, onCleanup, type Accessor } from "solid-js";

type PointerDragStart = {
  clientX: number;
  clientY: number;
  pointerId: number;
};

type PointerDragMove = PointerDragStart & {
  dx: number;
  dy: number;
  velocityX: number;
  velocityY: number;
};

export type PointerDragEnd = PointerDragMove;
type PointerDragTap = PointerDragEnd & {
  startTarget: EventTarget | null;
};
type PointerDragAxis = "any" | "x" | "y";

type PointerPinchStart = {
  clientX: number;
  clientY: number;
  distance: number;
};

type PointerPinchMove = PointerPinchStart & {
  scale: number;
};

const DEFAULT_TAP_MOVE_THRESHOLD_PX = 8;
const DEFAULT_DRAG_START_THRESHOLD_PX = 8;
const DEFAULT_DRAG_INTENT_RATIO = 1;
const MOUSE_POINTER_ID = -1;

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

class PointerGesture {
  private readonly pinchPointers = new Map<number, { clientX: number; clientY: number }>();
  private drag: GesturePointer | null = null;
  private suppressClick = false;
  private suppressClickPoint: { clientX: number; clientY: number } | null = null;
  private suppressClickTimer: number | null = null;
  private pinch: {
    startDistance: number;
  } | null = null;

  constructor(
    private readonly target: HTMLElement,
    private readonly callbacks: Accessor<PointerGestureCallbacks>,
  ) {
    this.setDragging(false);
    target.addEventListener("pointerdown", this.onPointerDown);
    target.addEventListener("mousedown", this.onMouseDown);
    target.addEventListener("dragstart", this.onDragStart);
    target.addEventListener("contextmenu", this.onContextMenu);
  }

  dispose(): void {
    if (this.drag) {
      this.releaseCapture(this.drag);
    }

    this.drag = null;
    this.setDragging(false);
    this.clearPinch();
    this.removePointerListeners();
    this.removeMouseListeners();
    this.target.removeEventListener("pointerdown", this.onPointerDown);
    this.target.removeEventListener("mousedown", this.onMouseDown);
    this.target.removeEventListener("dragstart", this.onDragStart);
    this.target.removeEventListener("contextmenu", this.onContextMenu);
    this.clearClickSuppression();
  }

  isDragging(): boolean {
    return this.drag?.active === true;
  }

  cancel(preservePinchPointers = false): void {
    const drag = this.drag;
    if (!drag) {
      return;
    }

    this.releaseCapture(drag);
    if (!preservePinchPointers) {
      this.pinchPointers.delete(drag.pointerId);
    }

    this.drag = null;
    this.setDragging(false);
    this.removePointerListeners();
    this.removeMouseListeners();
  }

  private onDragStart = (event: DragEvent): void => {
    if (this.drag?.canDrag) {
      event.preventDefault();
    }
  };

  private onClick = (event: MouseEvent): void => {
    const point = this.suppressClickPoint;
    const targetInside = event.target instanceof Node && this.target.contains(event.target);
    const nearReleasePoint = point !== null && Math.hypot(
      event.clientX - point.clientX,
      event.clientY - point.clientY,
    ) <= 24;
    if (!this.suppressClick || (!targetInside && !nearReleasePoint)) {
      return;
    }

    this.clearClickSuppression();
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  private onClickSuppressionPointerDown = (): void => {
    this.clearClickSuppression();
  };

  private onContextMenu = (): void => {
    if (!this.drag?.active) {
      this.cancel();
      this.clearPinch();
    }
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

    if (this.drag) {
      return;
    }

    const callbacks = this.callbacks();
    const canDrag = callbacks.shouldCaptureDrag?.(event) ?? true;
    const observeTap = canDrag || (callbacks.shouldObserveTap?.(event) ?? false);

    if (!observeTap) {
      return;
    }

    this.start(event.pointerId, event.pointerType, event.clientX, event.clientY, event, canDrag);

    if (event.pointerType === "mouse") {
      this.addMouseListeners();
    }
  };

  private onMouseDown = (event: MouseEvent): void => {
    if (event.button !== 0 || typeof PointerEvent !== "undefined" || this.drag) {
      return;
    }

    const canDrag = this.callbacks().shouldCaptureDrag?.(event) ?? true;

    if (!canDrag) {
      return;
    }

    this.start(MOUSE_POINTER_ID, "mouse", event.clientX, event.clientY, event, true);
    this.addMouseListeners();
  };

  private start(
    pointerId: number,
    pointerType: string,
    clientX: number,
    clientY: number,
    event: PointerEvent | MouseEvent,
    canDrag: boolean,
  ): void {
    this.drag = {
      active: false,
      canDrag,
      captureTarget: null,
      pointerId,
      pointerType,
      startClientX: clientX,
      startClientY: clientY,
      lastClientX: clientX,
      lastClientY: clientY,
      lastMoveTime: event.timeStamp,
      startTarget: event.target,
      tapCancelled: false,
      velocityX: 0,
      velocityY: 0,
    };

    const captureTarget = event.target as Element | null;

    if (canDrag && "pointerId" in event && typeof captureTarget?.setPointerCapture === "function") {
      captureTarget.setPointerCapture(pointerId);
      this.drag.captureTarget = captureTarget;
    }

    this.addPointerListeners();
  }

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId || this.drag.pointerType === "mouse") {
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

    this.finish(event.clientX, event.clientY, event, true);
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

    const dx = clientX - drag.startClientX;
    const dy = clientY - drag.startClientY;

    const tapMoveThreshold = this.tapMoveThreshold();
    if (Math.abs(dx) >= tapMoveThreshold || Math.abs(dy) >= tapMoveThreshold) {
      drag.tapCancelled = true;
    }

    if (!drag.canDrag) {
      this.updateLastMove(drag, clientX, clientY, event);
      return;
    }

    const intent = this.dragIntent(dx, dy);

    if (!drag.active && intent === "cancel") {
      this.cancel();
      return;
    }

    if (!drag.active && intent !== "start") {
      this.updateLastMove(drag, clientX, clientY, event);
      return;
    }

    if (!drag.active) {
      this.activateDrag(drag, event);
    }

    const elapsed = Math.max(1, event.timeStamp - drag.lastMoveTime);
    drag.velocityX = (clientX - drag.lastClientX) / elapsed;
    drag.velocityY = (clientY - drag.lastClientY) / elapsed;
    drag.lastClientX = clientX;
    drag.lastClientY = clientY;
    drag.lastMoveTime = event.timeStamp;

    this.callbacks().onMove?.(
      {
        pointerId: drag.pointerId,
        clientX,
        clientY,
        dx: clientX - drag.startClientX,
        dy: clientY - drag.startClientY,
        velocityX: drag.velocityX,
        velocityY: drag.velocityY,
      },
      event,
    );

    event.preventDefault();
  }

  private finish(clientX: number, clientY: number, event: PointerEvent | MouseEvent, cancelled = false): void {
    const drag = this.drag;

    if (!drag) {
      return;
    }

    this.drag = null;
    this.setDragging(false);
    this.releaseCapture(drag);
    this.removePointerListeners();
    this.removeMouseListeners();

    const info = {
      pointerId: drag.pointerId,
      clientX,
      clientY,
      dx: clientX - drag.startClientX,
      dy: clientY - drag.startClientY,
      velocityX: drag.velocityX,
      velocityY: drag.velocityY,
    };

    const tapMoveThreshold = this.tapMoveThreshold();
    const isTap = !drag.tapCancelled &&
      Math.abs(info.dx) < tapMoveThreshold &&
      Math.abs(info.dy) < tapMoveThreshold;

    if (!cancelled && !drag.active && isTap) {
      this.callbacks().onTap?.({ ...info, startTarget: drag.startTarget }, event);
    }

    if (drag.active) {
      if (cancelled) {
        this.callbacks().onEnd?.({ ...info, dx: 0, dy: 0, velocityX: 0, velocityY: 0 }, event);
        return;
      }

      this.suppressNextClick(info.clientX, info.clientY);
      this.callbacks().onEnd?.(info, event);
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

  private trackPinchPointerDown(event: PointerEvent): boolean {
    const callbacks = this.callbacks();
    if (!callbacks.onPinchStart || event.pointerType === "mouse") {
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

    const started = callbacks.onPinchStart(snapshot, event);

    if (!started) {
      this.pinchPointers.delete(event.pointerId);
      return false;
    }

    this.cancel(true);
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

    this.callbacks().onPinchMove?.(
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

    this.callbacks().onPinchEnd?.();
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

    const first = points[0];
    const second = points[1];
    if (!first || !second) {
      return null;
    }

    const dx = second.clientX - first.clientX;
    const dy = second.clientY - first.clientY;

    return {
      clientX: (first.clientX + second.clientX) / 2,
      clientY: (first.clientY + second.clientY) / 2,
      distance: Math.hypot(dx, dy),
    };
  }

  private tapMoveThreshold(): number {
    return this.callbacks().tapMoveThreshold ?? DEFAULT_TAP_MOVE_THRESHOLD_PX;
  }

  private dragStartThreshold(): number {
    return this.callbacks().dragStartThreshold ?? DEFAULT_DRAG_START_THRESHOLD_PX;
  }

  private dragIntentRatio(): number {
    return this.callbacks().dragIntentRatio ?? DEFAULT_DRAG_INTENT_RATIO;
  }

  private dragAxis(): PointerDragAxis {
    return this.callbacks().dragAxis ?? "any";
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
    if (drag.pointerType === "mouse") {
      window.getSelection()?.removeAllRanges();
    }
    this.callbacks().onStart?.(
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
    drag.velocityX = (clientX - drag.lastClientX) / elapsed;
    drag.velocityY = (clientY - drag.lastClientY) / elapsed;
    drag.lastClientX = clientX;
    drag.lastClientY = clientY;
    drag.lastMoveTime = event.timeStamp;
  }

  private suppressNextClick(clientX: number, clientY: number): void {
    this.suppressClick = true;
    this.suppressClickPoint = { clientX, clientY };
    window.addEventListener("click", this.onClick, true);
    window.addEventListener("mousedown", this.onClickSuppressionPointerDown, true);
    window.addEventListener("pointerdown", this.onClickSuppressionPointerDown, true);

    if (this.suppressClickTimer !== null) {
      window.clearTimeout(this.suppressClickTimer);
    }

    this.suppressClickTimer = window.setTimeout(() => {
      this.clearClickSuppression();
    }, 400);
  }

  private clearClickSuppression(): void {
    this.suppressClick = false;
    this.suppressClickPoint = null;
    window.removeEventListener("click", this.onClick, true);
    window.removeEventListener("mousedown", this.onClickSuppressionPointerDown, true);
    window.removeEventListener("pointerdown", this.onClickSuppressionPointerDown, true);
    if (this.suppressClickTimer !== null) {
      window.clearTimeout(this.suppressClickTimer);
      this.suppressClickTimer = null;
    }
  }

  private setDragging(dragging: boolean): void {
    this.target.dataset.dragging = String(dragging);
  }

  private releaseCapture(drag: GesturePointer): void {
    if (drag.captureTarget?.hasPointerCapture(drag.pointerId)) {
      drag.captureTarget.releasePointerCapture(drag.pointerId);
    }
  }
}

type GesturePointer = {
  active: boolean;
  canDrag: boolean;
  captureTarget: Element | null;
  pointerId: number;
  pointerType: string;
  startClientX: number;
  startClientY: number;
  lastClientX: number;
  lastClientY: number;
  lastMoveTime: number;
  startTarget: EventTarget | null;
  tapCancelled: boolean;
  velocityX: number;
  velocityY: number;
};

export function createPointerGestureElement<E extends HTMLElement>(
  target: Accessor<E | null>,
  callbacks: Accessor<PointerGestureCallbacks>,
): Accessor<boolean> {
  let gesture: PointerGesture | null = null;

  createEffect(() => {
    const element = target();

    if (!element) {
      return;
    }

    gesture = new PointerGesture(element, callbacks);

    onCleanup(() => {
      gesture?.dispose();
      gesture = null;
    });
  });

  return () => gesture?.isDragging() ?? false;
}
