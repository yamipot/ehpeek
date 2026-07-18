import { createEffect, onCleanup, type Accessor } from "solid-js";
import { PointerGesture, type PointerGestureCallbacks } from "./pointerGesture";

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

    gesture = new PointerGesture(element, pointerGestureCallbackProxy(callbacks));

    onCleanup(() => {
      gesture?.dispose();
      gesture = null;
    });
  });

  return () => gesture?.isDragging() ?? false;
}

function pointerGestureCallbackProxy(callbacks: Accessor<PointerGestureCallbacks>): PointerGestureCallbacks {
  return {
    get dragAxis() {
      return callbacks().dragAxis;
    },
    get dragIntentRatio() {
      return callbacks().dragIntentRatio;
    },
    get dragStartThreshold() {
      return callbacks().dragStartThreshold;
    },
    shouldCaptureDrag: (event) => callbacks().shouldCaptureDrag?.(event) ?? true,
    shouldObserveTap: (event) => callbacks().shouldObserveTap?.(event) ?? false,
    onStart: (info, event) => callbacks().onStart?.(info, event),
    onMove: (info, event) => callbacks().onMove?.(info, event),
    onEnd: (info, event) => callbacks().onEnd?.(info, event),
    onTap: (info, event) => callbacks().onTap?.(info, event),
    onPinchStart: (info, event) => callbacks().onPinchStart?.(info, event) ?? false,
    onPinchMove: (info, event) => callbacks().onPinchMove?.(info, event),
    onPinchEnd: () => callbacks().onPinchEnd?.(),
    get tapMoveThreshold() {
      return callbacks().tapMoveThreshold;
    },
  };
}
