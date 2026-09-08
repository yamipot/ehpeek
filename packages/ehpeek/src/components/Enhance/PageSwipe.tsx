import { createSignal, type Accessor } from "solid-js";
import { createPointerGestureElement, type PointerDragEnd } from "../PointerGesture";
import { SwipeIndicator, type SwipeIndicatorState } from "../Widgets/SwipeIndicator";

const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;

export type PageSwipeDirection = "next" | "previous";

export function PageSwipe(props: {
  canNavigate: (direction: PageSwipeDirection) => boolean;
  onNavigate: (direction: PageSwipeDirection) => void;
  target: Accessor<HTMLElement | null>;
}) {
  const [indicator, setIndicator] = createSignal<SwipeIndicatorState>({
    blocked: false,
    direction: "left",
    progress: 0,
  });
  const directionFor = (dx: number): PageSwipeDirection => dx < 0 ? "next" : "previous";
  const reset = () => setIndicator((current) => ({ ...current, blocked: false, progress: 0 }));

  createPointerGestureElement(
    () => props.target(),
    () => ({
      onStart: reset,
      onMove: (info) => {
        const direction = directionFor(info.dx);
        setIndicator({
          blocked: !props.canNavigate(direction),
          direction: direction === "next" ? "left" : "right",
          progress: Math.min(1, Math.max(0, (Math.abs(info.dx) - SWIPE_INTENT_DISTANCE) /
            (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE))),
        });
      },
      onEnd: (info, event) => {
        navigate(info, event);
        reset();
      },
      dragAxis: "x",
      dragIntentRatio: HORIZONTAL_INTENT_RATIO,
      dragStartThreshold: SWIPE_INTENT_DISTANCE,
    }),
  );

  return <SwipeIndicator state={indicator()} />;

  function navigate(info: PointerDragEnd, event: Event): void {
    const absX = Math.abs(info.dx);
    const absY = Math.abs(info.dy);
    const direction = directionFor(info.dx);
    if (
      absX < SWIPE_MIN_DISTANCE ||
      absY > absX * SWIPE_MAX_VERTICAL_RATIO ||
      !props.canNavigate(direction)
    ) {
      return;
    }
    event.preventDefault();
    props.onNavigate(direction);
  }
}
