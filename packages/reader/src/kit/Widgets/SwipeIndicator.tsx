import { createMemo } from "solid-js";
import { Icon, type IconName } from "./Icon";
import "../../styles";

type SwipeDirection = "left" | "right";

export type SwipeIndicatorState = {
  blocked?: boolean;
  direction: SwipeDirection;
  progress: number;
};

const HIDE_PROGRESS = 0.001;

export function SwipeIndicator(props: { state: SwipeIndicatorState }) {
  const progress = createMemo(() => Math.min(1, Math.max(0, props.state.progress)));
  const hidden = createMemo(() => progress() <= HIDE_PROGRESS);
  const pull = createMemo(() => Math.round(48 * progress()));
  const offset = createMemo(() => props.state.direction === "left" ? 42 - pull() : pull() - 42);
  const iconName = createMemo<IconName>(() =>
    props.state.blocked ? "close" : props.state.direction === "left" ? "chevron-left" : "chevron-right"
  );

  return (
    <div
      class="ehpeek-swipe-indicator"
      aria-hidden={hidden() ? "true" : "false"}
      style={{
        display: hidden() ? "none" : "flex",
        left: props.state.direction === "right" ? "6px" : "",
        opacity: hidden() ? "0" : String(0.35 + progress() * 0.65),
        right: props.state.direction === "left" ? "6px" : "",
        transform: `translate(${offset()}px, -50%)`,
      }}
    >
      <Icon name={iconName()} size={36} />
    </div>
  );
}
