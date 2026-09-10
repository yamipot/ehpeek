import { batch, createEffect, createSignal, on, onCleanup, untrack, type Accessor } from "solid-js";
import { clamp } from "../kit/helpers";
import { ScrollFlingAnimator } from "../kit/animation";
import { createPointerGestureElement, type PointerGestureCallbacks } from "../kit/PointerGesture";
import type { ScrollPreviewContext } from "./Context";
import { MAX_PREVIEW_CROSS_COUNT, previewCrossCountLimits, previewZoomAnchor, type PreviewLayout } from "./layout";

const HORIZONTAL_FLING_VELOCITY_FACTOR = 1.6;

export interface PreviewGestures {
  /** Metadata reflow waits until the user's drag or pinch finishes. */
  active: Accessor<boolean>;
  /** Keep the same page centered throughout a pinch, even after it leaves the visible range. */
  resizeAnchor: Accessor<number | null>;
  /** Stop an earlier flick before another control changes the viewport. */
  cancelMotion(): void;
}

/** Owns pointer gestures and their motion for one Preview, including drag-to-close. */
export function createPreviewGestures(options: {
  /** Only the thumbnail area captures scrolling and pinch gestures. */
  scroller: Accessor<HTMLDivElement | null>;
  /** Drag-to-close moves the whole Preview, including its controls. */
  panel: Accessor<HTMLElement>;
  preview: ScrollPreviewContext;
  layout: Accessor<PreviewLayout | null>;
  scrollOffset: Accessor<number>;
}): PreviewGestures {
  const { preview } = options;
  const horizontal = () => preview.settings[0].direction !== "ttb";
  const enabled = () => preview.visible() && !preview.disabled();
  const [active, setActive] = createSignal(false);
  const [resizeAnchor, setResizeAnchor] = createSignal<number | null>(null);

  // Scrolling stays in physical DOM coordinates; the viewport handles RTL projection.
  const fling = new ScrollFlingAnimator();
  let dragDirection: "dismiss" | "scroll" | null = null;
  let dragStartPosition = 0;
  const cancelMotion = (): void => fling.cancel();

  // Dismissal owns both the drag feedback and the animation that accepts or rejects it.
  let dismissOffset = 0;
  let dismissAnimation: Animation | null = null;
  const resetDismiss = (): void => {
    dismissAnimation?.cancel();
    dismissAnimation = null;
    dismissOffset = 0;
    const panel = options.panel();
    panel.style.removeProperty("opacity");
    panel.style.removeProperty("transform");
  };
  const dismissSize = (): number => Math.max(
    1, horizontal() ? options.panel().clientHeight : options.panel().clientWidth,
  );
  const dragDismiss = (offset: number): void => {
    dismissAnimation?.cancel();
    dismissAnimation = null;
    dismissOffset = offset;
    const ratio = Math.abs(offset) / dismissSize();
    const panel = options.panel();
    panel.style.opacity = `${1 - Math.min(0.15, ratio * 0.15)}`;
    panel.style.transform = `translate3d(${horizontal() ? 0 : offset}px, ${horizontal() ? offset : 0}px, 0) scale(${1 - Math.min(0.03, ratio * 0.03)})`;
  };
  const finishDismiss = (velocity: number): void => {
    const shouldClose = Math.abs(dismissOffset) >= dismissSize() * 0.2 || Math.abs(velocity) >= 0.6;
    const direction = Math.sign(dismissOffset) || Math.sign(velocity) || 1;
    const panel = options.panel();
    const endTransform = shouldClose
      ? horizontal()
        ? `translate3d(0, ${direction * 100}%, 0) scale(0.97)`
        : `translate3d(${direction * 100}%, 0, 0) scale(0.97)`
      : "translate3d(0, 0, 0) scale(1)";
    dismissAnimation?.cancel();
    const animation = panel.animate([
      { opacity: panel.style.opacity, transform: panel.style.transform },
      { opacity: shouldClose ? 0.7 : 1, transform: endTransform },
    ], { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" });
    dismissAnimation = animation;
    void animation.finished.then(() => {
      if (dismissAnimation !== animation || !untrack(enabled)) return;
      if (shouldClose) preview.close?.();
      else resetDismiss();
    }).catch(() => undefined);
  };

  // A pinch uses the count and page from its start, rather than rebasing after each reflow.
  let pinchStartCrossCount = 1;
  let pinchMinimumCrossCount = 1;
  const pointer: PointerGestureCallbacks = {
    get dragAxis() { return preview.close ? "any" : horizontal() ? "x" : "y"; },
    onStart() {
      cancelMotion();
      resetDismiss();
      setActive(true);
      dragDirection = null;
      const scroller = options.scroller()!;
      dragStartPosition = horizontal() ? scroller.scrollLeft : scroller.scrollTop;
    },
    onMove(info) {
      if (dragDirection === null) {
        const mainDelta = horizontal() ? Math.abs(info.dx) : Math.abs(info.dy);
        const crossDelta = horizontal() ? Math.abs(info.dy) : Math.abs(info.dx);
        dragDirection = preview.close && crossDelta > mainDelta ? "dismiss" : "scroll";
      }
      if (dragDirection === "dismiss") {
        dragDismiss(horizontal() ? info.dy : info.dx);
        return;
      }
      const scroller = options.scroller()!;
      if (horizontal()) scroller.scrollLeft = dragStartPosition - info.dx;
      else scroller.scrollTop = dragStartPosition - info.dy;
    },
    onEnd(info, event) {
      const dismiss = dragDirection === "dismiss";
      dragDirection = null;
      setActive(false);
      if (event.type === "pointercancel") {
        resetDismiss();
        return;
      }
      if (dismiss) {
        finishDismiss(horizontal() ? info.velocityY : info.velocityX);
        return;
      }
      const scroller = options.scroller()!;
      const axis = horizontal() ? "x" : "y";
      fling.start({
        axis,
        scroller,
        initialVelocity: -(horizontal()
          ? info.velocityX * HORIZONTAL_FLING_VELOCITY_FACTOR
          : info.velocityY),
        setScrollPosition(position) {
          if (axis === "x") scroller.scrollLeft = position;
          else scroller.scrollTop = position;
        },
        canRun: () => enabled() && scroller.isConnected,
        onStop() {},
      });
    },
    onPinchStart() {
      const layout = options.layout();
      if (!layout) return false;
      cancelMotion();
      resetDismiss();
      dragDirection = null;
      pinchStartCrossCount = layout.crossCount;
      pinchMinimumCrossCount = Math.min(layout.crossCount, previewCrossCountLimits(
        layout, preview.previewCache.source.aspectRatio, preview.previewCache.source.totalPages,
      ).min);
      batch(() => {
        setActive(true);
        setResizeAnchor(previewZoomAnchor(
          layout, options.scrollOffset(), preview.previewCache.source.totalPages, preview.progress.current(),
        ));
      });
      return true;
    },
    onPinchMove(info) {
      preview.settings[1]("crossCount", clamp(
        Math.round(pinchStartCrossCount / info.scale), pinchMinimumCrossCount, MAX_PREVIEW_CROSS_COUNT,
      ));
    },
    onPinchEnd() {
      batch(() => { setResizeAnchor(null); setActive(false); });
    },
  };

  createPointerGestureElement(
    () => enabled() ? options.scroller() : null,
    () => pointer,
  );
  createEffect(on(() => preview.settings[0].crossCount, cancelMotion));
  createEffect(() => {
    // A direction change replaces the scroller; no motion may outlive its target.
    const scroller = options.scroller();
    if (!scroller || !enabled()) return;
    const stopOnWheel = (): void => cancelMotion();
    scroller.addEventListener("wheel", stopOnWheel, { passive: true });
    onCleanup(() => {
      scroller.removeEventListener("wheel", stopOnWheel);
      cancelMotion();
      resetDismiss();
      batch(() => { setActive(false); setResizeAnchor(null); });
    });
  });

  return { active, resizeAnchor, cancelMotion };
}
