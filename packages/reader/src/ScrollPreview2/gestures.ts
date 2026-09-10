import { clamp } from "../kit/helpers";
import { ScrollFlingAnimator } from "../kit/animation";
import type { PointerGestureCallbacks } from "../kit/PointerGesture";

const HORIZONTAL_FLING_VELOCITY_FACTOR = 1.6;
const MAX_CROSS_COUNT = 12;

/** Keeps transient pointer motion out of the viewport's persistent geometry state. */
export class PreviewGestures {
  private readonly fling = new ScrollFlingAnimator();
  private dragDirection: "exit" | "scroll" | null = null;
  private dragStartPosition: number | null = null;
  private pointerActive = false;
  private pinchStartCrossCount = 1;
  private pinchMinimumCrossCount = 1;
  private disposed = false;
  readonly pointer: PointerGestureCallbacks;

  constructor(
    private readonly scroller: () => HTMLDivElement,
    private readonly horizontal: boolean,
    private readonly dismissible: boolean,
    private readonly callbacks: {
      settled(): void;
      scrollEnded(): void;
      exitDragged(offset: number): void;
      exitDragEnded(velocity: number): void;
      resizeStarted(): { crossCount: number; minimumCrossCount: number };
      resized(crossCount: number): void;
      resizeEnded(): void;
    },
  ) {
    this.pointer = {
      dragAxis: dismissible ? "any" : horizontal ? "x" : "y",
      onStart: () => {
        this.fling.cancel();
        this.pointerActive = true;
        this.dragDirection = null;
        this.dragStartPosition = horizontal
          ? scroller().scrollLeft
          : scroller().scrollTop;
      },
      onMove: (info) => {
        if (this.dragDirection === null) {
          const mainDelta = horizontal ? Math.abs(info.dx) : Math.abs(info.dy);
          const exitDelta = horizontal ? Math.abs(info.dy) : Math.abs(info.dx);
          this.dragDirection = dismissible && exitDelta > mainDelta ? "exit" : "scroll";
        }
        if (this.dragDirection === "exit") {
          callbacks.exitDragged(horizontal ? info.dy : info.dx);
          return;
        }
        if (this.dragStartPosition === null) return;
        if (horizontal) scroller().scrollLeft = this.dragStartPosition - info.dx;
        else scroller().scrollTop = this.dragStartPosition - info.dy;
      },
      onEnd: (info) => {
        this.dragStartPosition = null;
        this.pointerActive = false;
        callbacks.settled();
        if (this.dragDirection === "exit") {
          this.dragDirection = null;
          callbacks.exitDragEnded(horizontal ? info.velocityY : info.velocityX);
          return;
        }
        this.dragDirection = null;
        this.fling.start({
          axis: horizontal ? "x" : "y",
          scroller: scroller(),
          initialVelocity: -(horizontal
            ? info.velocityX * HORIZONTAL_FLING_VELOCITY_FACTOR
            : info.velocityY),
          setScrollPosition(position) {
            if (horizontal) scroller().scrollLeft = position;
            else scroller().scrollTop = position;
          },
          canRun: () => !this.disposed && scroller().isConnected,
          onStop: callbacks.scrollEnded,
        });
      },
      onPinchStart: () => {
        this.fling.cancel();
        const resize = callbacks.resizeStarted();
        this.pinchStartCrossCount = resize.crossCount;
        this.pinchMinimumCrossCount = resize.minimumCrossCount;
        return true;
      },
      onPinchMove: (info) => callbacks.resized(clamp(
        Math.round(this.pinchStartCrossCount / info.scale),
        this.pinchMinimumCrossCount,
        MAX_CROSS_COUNT,
      )),
      onPinchEnd: callbacks.resizeEnded,
    };
  }

  get active(): boolean { return this.pointerActive; }

  cancelMotion(): void {
    this.fling.cancel();
  }

  cancel(): void {
    this.fling.cancel();
    this.pointerActive = false;
    this.dragDirection = null;
    this.dragStartPosition = null;
  }

  dispose(): void {
    this.disposed = true;
    this.cancel();
  }
}
