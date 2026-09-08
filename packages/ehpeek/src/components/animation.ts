import { clamp } from "../utils";

type ScrollAxis = "x" | "y";
export type ScrollMotion = "instant" | "animated";

const SCROLL_ANIMATION_MS = 180;
const SCROLL_EASING_POWER = 3;
const ANIMATION_FRAME_MIN_DELTA_MS = 1;
const ANIMATION_FRAME_MAX_DELTA_MS = 32;
const SCROLL_FLING_MIN_VELOCITY = 0.35;
const SCROLL_FLING_STOP_VELOCITY = 0.02;
const SCROLL_FLING_DECAY = 0.0045;
const VERTICAL_SCROLL_FLING_INITIAL_VELOCITY_FACTOR = 1.2;

export class ScrollAnimator {
  private frame: number | null = null;

  constructor(readonly axis: ScrollAxis) {}

  scrollTo(scroller: HTMLElement, target: number, motion: ScrollMotion = "instant", onComplete?: () => void): void {
    this.cancel();

    if (motion !== "animated") {
      this.setScrollPosition(scroller, target);
      onComplete?.();
      return;
    }

    this.scrollWithRaf(scroller, target, onComplete);
  }

  cancel(): void {
    if (this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }
  }

  private scrollWithRaf(scroller: HTMLElement, target: number, onComplete?: () => void): void {
    const start = this.scrollPosition(scroller);
    const delta = target - start;
    let lastFrameTime = performance.now();
    let animationTime = 0;

    const step = (time: number): void => {
      const elapsed = clamp(time - lastFrameTime, ANIMATION_FRAME_MIN_DELTA_MS, ANIMATION_FRAME_MAX_DELTA_MS);
      lastFrameTime = time;
      animationTime += elapsed;

      const progress = clamp(animationTime / SCROLL_ANIMATION_MS, 0, 1);
      const eased = 1 - Math.pow(1 - progress, SCROLL_EASING_POWER);
      this.setScrollPosition(scroller, start + delta * eased);

      if (progress >= 1) {
        this.frame = null;
        onComplete?.();
        return;
      }

      this.frame = window.requestAnimationFrame(step);
    };

    this.frame = window.requestAnimationFrame(step);
  }

  private scrollPosition(scroller: HTMLElement): number {
    return this.axis === "x" ? scroller.scrollLeft : scroller.scrollTop;
  }

  private setScrollPosition(scroller: HTMLElement, value: number): void {
    if (this.axis === "x") {
      scroller.scrollLeft = value;
    } else {
      scroller.scrollTop = value;
    }
  }
}

export class ScrollFlingAnimator {
  private frame: number | null = null;
  private velocity = 0;
  private lastFrameTime = 0;

  start(options: {
    axis: ScrollAxis;
    scroller: HTMLElement;
    initialVelocity: number;
    maxVelocity?: number;
    setScrollPosition: (scrollPosition: number) => void;
    canRun: () => boolean;
    onStop: () => void;
  }): void {
    this.cancel();

    const scaledInitialVelocity = options.initialVelocity *
      (options.axis === "y" ? VERTICAL_SCROLL_FLING_INITIAL_VELOCITY_FACTOR : 1);
    const initialVelocity = options.maxVelocity
      ? clamp(scaledInitialVelocity, -options.maxVelocity, options.maxVelocity)
      : scaledInitialVelocity;
    if (Math.abs(initialVelocity) < SCROLL_FLING_MIN_VELOCITY) {
      return;
    }

    this.velocity = initialVelocity;
    this.lastFrameTime = performance.now();

    const step = (time: number): void => {
      if (!options.canRun()) {
        this.cancel();
        return;
      }

      const elapsed = clamp(time - this.lastFrameTime, ANIMATION_FRAME_MIN_DELTA_MS, ANIMATION_FRAME_MAX_DELTA_MS);
      this.lastFrameTime = time;

      const previousPosition = options.axis === "x"
        ? options.scroller.scrollLeft
        : options.scroller.scrollTop;
      options.setScrollPosition(previousPosition + this.velocity * elapsed);
      const nextPosition = options.axis === "x"
        ? options.scroller.scrollLeft
        : options.scroller.scrollTop;

      if (nextPosition === previousPosition) {
        this.cancel();
        options.onStop();
        return;
      }

      this.velocity *= Math.exp(-SCROLL_FLING_DECAY * elapsed);

      if (Math.abs(this.velocity) < SCROLL_FLING_STOP_VELOCITY) {
        this.cancel();
        options.onStop();
        return;
      }

      this.frame = window.requestAnimationFrame(step);
    };

    this.frame = window.requestAnimationFrame(step);
  }

  cancel(): void {
    if (this.frame !== null) {
      window.cancelAnimationFrame(this.frame);
      this.frame = null;
    }

    this.velocity = 0;
  }
}
