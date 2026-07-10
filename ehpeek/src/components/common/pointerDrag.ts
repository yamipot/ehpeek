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

const SUPPRESS_CLICK_MAX_AGE_MS = 500;
const SUPPRESS_CLICK_DISTANCE_PX = 24;

export class PointerDrag {
  private mousePointerId = -1;
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
  private suppressedClick:
    | {
        clientX: number;
        clientY: number;
        until: number;
      }
    | null = null;

  constructor(
    private readonly target: HTMLElement,
    private readonly handlers: {
      shouldStart?: (event: PointerEvent | MouseEvent) => boolean;
      onStart?: (info: PointerDragStart, event: PointerEvent | MouseEvent) => void;
      onMove?: (info: PointerDragMove, event: PointerEvent | MouseEvent) => void;
      onEnd?: (info: PointerDragEnd, event: PointerEvent | MouseEvent) => void;
      onTap?: (info: PointerDragTap, event: PointerEvent | MouseEvent) => void;
      onSuppressClick?: (event: MouseEvent) => void;
      shouldSuppressClick?: (info: PointerDragEnd) => boolean;
    },
  ) {
    target.addEventListener("click", this.onClick, true);
    target.addEventListener("pointerdown", this.onPointerDown);
    target.addEventListener("mousedown", this.onMouseDown);
    target.addEventListener("dragstart", this.onDragStart);
  }

  dispose(): void {
    if (this.drag) {
      this.target.releasePointerCapture?.(this.drag.pointerId);
      this.drag = null;
    }

    this.removePointerListeners();
    this.removeMouseListeners();
    this.target.removeEventListener("click", this.onClick, true);
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

  private onClick = (event: MouseEvent): void => {
    if (!this.shouldSuppressClickEvent(event)) {
      return;
    }

    this.suppressedClick = null;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    this.handlers.onSuppressClick?.(event);
  };

  private onDragStart = (event: DragEvent): void => {
    event.preventDefault();
  };

  private onPointerDown = (event: PointerEvent): void => {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    if (this.handlers.shouldStart && !this.handlers.shouldStart(event)) {
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

    if (this.handlers.shouldStart && !this.handlers.shouldStart(event)) {
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
  };

  private onPointerCancel = (event: PointerEvent): void => {
    if (!this.drag || event.pointerId !== this.drag.pointerId) {
      return;
    }

    this.finish(event.clientX, event.clientY, event);
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

    const suppressClick = this.handlers.shouldSuppressClick?.(info) ?? (Math.abs(info.dx) > 8 || Math.abs(info.dy) > 8);
    if (suppressClick) {
      this.suppressedClick = {
        clientX,
        clientY,
        until: performance.now() + SUPPRESS_CLICK_MAX_AGE_MS,
      };
    }

    if (!suppressClick) {
      this.handlers.onTap?.({ ...info, startTarget: drag.startTarget }, event);
    }

    this.handlers.onEnd?.(info, event);
  }

  private shouldSuppressClickEvent(event: MouseEvent): boolean {
    const suppressedClick = this.suppressedClick;

    if (!suppressedClick) {
      return false;
    }

    if (performance.now() > suppressedClick.until) {
      this.suppressedClick = null;
      return false;
    }

    const closeToDragEnd =
      Math.abs(event.clientX - suppressedClick.clientX) <= SUPPRESS_CLICK_DISTANCE_PX &&
      Math.abs(event.clientY - suppressedClick.clientY) <= SUPPRESS_CLICK_DISTANCE_PX;

    if (!closeToDragEnd) {
      this.suppressedClick = null;
    }

    return closeToDragEnd;
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
}
