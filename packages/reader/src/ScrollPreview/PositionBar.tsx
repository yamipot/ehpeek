import { createEffect, onCleanup, Show, untrack, type Accessor } from "solid-js";
import { clamp } from "../kit/helpers";
import { useReaderTexts } from "../kit/i18n";
import { PositionBar } from "../kit/Widgets/PositionBar";
import {
  logicalGroupOffset,
  physicalGroupOffset,
  type PreviewLayout,
} from "./layout";
import { useScrollPreviewContext } from "./Context";

const SCROLL_PIXEL_EPSILON = 1;

export interface PreviewPositionBarProps {
  layout: Accessor<PreviewLayout>;
  scrollOffset: Accessor<number>;
  rightToLeft: boolean;
  scrollTo(offset: number): void;
  setInteracting(active: boolean): void;
}

export function PreviewPositionBar(props: PreviewPositionBarProps) {
  const ctx = useScrollPreviewContext();
  const texts = useReaderTexts();
  const horizontal = untrack(() => ctx.settings[0].direction !== "ttb");
  createEffect(() => {
    if (ctx.disabled() || !ctx.visible()) props.setInteracting(false);
  });
  onCleanup(() => props.setInteracting(false));
  const mainViewportSize = () => horizontal
    ? props.layout().viewportWidth
    : props.layout().viewportHeight;
  const totalGroups = () => props.layout().groupSizes.length;
  const maxScrollOffset = () => Math.max(
    0,
    props.layout().totalMainSize - mainViewportSize(),
  );
  const maxLogicalScrollOffset = () =>
    logicalGroupOffset(props.layout(), maxScrollOffset());
  const value = () => {
    const maximum = maxLogicalScrollOffset();
    return maximum === 0
      ? 0
      : clamp(logicalGroupOffset(props.layout(), props.scrollOffset()) / maximum, 0, 1);
  };
  const visibleRatio = () => clamp(
    mainViewportSize() /
      (props.layout().estimatedGroupSize + props.layout().gap) /
      totalGroups(),
    0,
    1,
  );
  const scrollToValue = (nextValue: number): void => {
    const ratio = clamp(nextValue, 0, 1);
    props.scrollTo(ratio === 1
      ? maxScrollOffset()
      : physicalGroupOffset(props.layout(), ratio * maxLogicalScrollOffset()));
  };

  return (
    <Show when={totalGroups() > 0 &&
      maxScrollOffset() > SCROLL_PIXEL_EPSILON && visibleRatio() < 1}>
      <PositionBar
        disabled={ctx.disabled()}
        ariaLabel={texts.gallery.scrollPreview}
        axis={horizontal ? "horizontal" : "vertical"}
        currentValue={value()}
        expanded={!horizontal}
        maxValue={1}
        minValue={0}
        onCommit={() => props.setInteracting(false)}
        onInput={scrollToValue}
        onPointerDown={() => props.setInteracting(true)}
        position={horizontal ? undefined : "absolute"}
        reversed={horizontal && props.rightToLeft}
        thickness={horizontal ? "normal" : "narrow"}
        trackClickEnabled={false}
        trackVisible={false}
        visibleRatio={visibleRatio()}
      />
    </Show>
  );
}
