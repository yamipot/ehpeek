import { clamp } from "../utils";

type ScrollAnimationMode = "none" | "native" | "raf";
export type ScrollAxis = "x" | "y";
export type ScrollMotion = "instant" | "animated";

const SCROLL_ANIMATION_MODE: ScrollAnimationMode = "raf";
const SCROLL_ANIMATION_MS = 180;
const SCROLL_EASING_POWER = 3;
const ANIMATION_FRAME_MIN_DELTA_MS = 1;
const ANIMATION_FRAME_MAX_DELTA_MS = 32;
const SCROLL_FLING_MIN_VELOCITY = 0.35;
const SCROLL_FLING_STOP_VELOCITY = 0.02;
const SCROLL_FLING_DECAY = 0.0045;

export class ScrollAnimator {
  private frame: number | null = null;

  constructor(readonly axis: ScrollAxis) {}

  scrollTo(scroller: HTMLElement, target: number, motion: ScrollMotion = "instant", onComplete?: () => void): void {
    this.cancel();

    if (motion !== "animated" || SCROLL_ANIMATION_MODE === "none") {
      this.setScrollPosition(scroller, target);
      onComplete?.();
      return;
    }

    if (SCROLL_ANIMATION_MODE === "native") {
      scroller.scrollTo(this.axis === "x" ? { left: target, behavior: "smooth" } : { top: target, behavior: "smooth" });
      window.setTimeout(() => onComplete?.(), SCROLL_ANIMATION_MS);
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
  private velocityY = 0;
  private lastFrameTime = 0;

  start(options: {
    scroller: HTMLElement;
    initialVelocityY: number;
    setScrollTop: (scrollTop: number) => void;
    canRun: () => boolean;
    onStop: () => void;
  }): void {
    this.cancel();

    if (Math.abs(options.initialVelocityY) < SCROLL_FLING_MIN_VELOCITY) {
      return;
    }

    this.velocityY = options.initialVelocityY;
    this.lastFrameTime = performance.now();

    const step = (time: number): void => {
      if (!options.canRun()) {
        this.cancel();
        return;
      }

      const elapsed = clamp(time - this.lastFrameTime, ANIMATION_FRAME_MIN_DELTA_MS, ANIMATION_FRAME_MAX_DELTA_MS);
      this.lastFrameTime = time;

      const previousScrollTop = options.scroller.scrollTop;
      options.setScrollTop(previousScrollTop + this.velocityY * elapsed);

      if (options.scroller.scrollTop === previousScrollTop) {
        this.cancel();
        options.onStop();
        return;
      }

      this.velocityY *= Math.exp(-SCROLL_FLING_DECAY * elapsed);

      if (Math.abs(this.velocityY) < SCROLL_FLING_STOP_VELOCITY) {
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

    this.velocityY = 0;
  }
}
