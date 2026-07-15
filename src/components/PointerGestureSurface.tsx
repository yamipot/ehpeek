import { useLayoutEffect, useRef } from "preact/hooks";
import { PointerGesture, type PointerGestureCallbacks } from "./pointerGesture";

export type PointerGestureSurfaceHandle = {
  gesture: () => PointerGesture | null;
};

export function usePointerGestureElement<E extends HTMLElement>(
  target: E | null,
  callbacks: PointerGestureCallbacks,
  handleRef?: (handle: PointerGestureSurfaceHandle | null) => void,
): void {
  const callbacksRef = useRef(callbacks);
  const handleRefRef = useRef(handleRef);
  const gestureRef = useRef<PointerGesture | null>(null);
  callbacksRef.current = callbacks;
  handleRefRef.current = handleRef;

  useLayoutEffect(() => {
    if (!target) {
      handleRefRef.current?.(null);
      return;
    }

    const gesture = new PointerGesture(target, pointerGestureCallbackProxy(callbacksRef));
    gestureRef.current = gesture;
    handleRefRef.current?.({
      gesture: () => gestureRef.current,
    });

    return () => {
      handleRefRef.current?.(null);
      gesture.dispose();
      gestureRef.current = null;
    };
  }, [target]);
}

function pointerGestureCallbackProxy(callbacksRef: { current: PointerGestureCallbacks }): PointerGestureCallbacks {
  return {
    get dragAxis() {
      return callbacksRef.current.dragAxis;
    },
    get dragIntentRatio() {
      return callbacksRef.current.dragIntentRatio;
    },
    get dragStartThreshold() {
      return callbacksRef.current.dragStartThreshold;
    },
    shouldCaptureDrag: (event) => callbacksRef.current.shouldCaptureDrag?.(event) ?? true,
    shouldObserveTap: (event) => callbacksRef.current.shouldObserveTap?.(event) ?? false,
    onStart: (info, event) => callbacksRef.current.onStart?.(info, event),
    onMove: (info, event) => callbacksRef.current.onMove?.(info, event),
    onEnd: (info, event) => callbacksRef.current.onEnd?.(info, event),
    onTap: (info, event) => callbacksRef.current.onTap?.(info, event),
    onPinchStart: (info, event) => callbacksRef.current.onPinchStart?.(info, event) ?? false,
    onPinchMove: (info, event) => callbacksRef.current.onPinchMove?.(info, event),
    onPinchEnd: () => callbacksRef.current.onPinchEnd?.(),
    get tapMoveThreshold() {
      return callbacksRef.current.tapMoveThreshold;
    },
  };
}
