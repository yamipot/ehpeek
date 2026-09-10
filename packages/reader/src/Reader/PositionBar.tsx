import { createEffect, createSignal, on, onCleanup } from "solid-js";
import { PositionBar } from "../kit/Widgets/PositionBar";
import { useReaderContext } from "./Context";

export interface ReaderPositionBarProps {
  /** Observed main-axis DOM offset in CSS pixels. */
  scrollOffset: number;
  viewportLength: number;
  narrow: boolean;
}

export function ReaderPositionBar(props: ReaderPositionBarProps) {
  const ctx = useReaderContext();
  const [visible, setVisible] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  let previous: number | null = null;
  let distance = 0;
  let gestureTimer: number | undefined;
  let hideTimer: number | undefined;
  const cancelTimers = () => {
    window.clearTimeout(gestureTimer);
    window.clearTimeout(hideTimer);
  };
  createEffect(on(() => props.scrollOffset, offset => {
    if (previous === null) { previous = offset; return; }
    distance += Math.abs(offset - previous);
    previous = offset;
    if (distance >= 48) setVisible(true);
    if (distance >= props.viewportLength * 2) setExpanded(true);
    cancelTimers();
    gestureTimer = window.setTimeout(() => { distance = 0; }, 160);
    hideTimer = window.setTimeout(() => {
      distance = 0;
      setExpanded(false);
      setVisible(false);
    }, 900);
  }));
  createEffect(() => {
    if (!ctx.disabled()) return;
    cancelTimers();
    distance = 0;
    setExpanded(false);
    setVisible(false);
  });
  onCleanup(cancelTimers);
  return <PositionBar
    disabled={ctx.disabled()} ariaLabel="Reader position" axis="vertical"
    currentValue={ctx.position.page()} expanded={expanded()} maxValue={ctx.source.totalPages ?? 1}
    onCommit={ctx.position.commitSeek} onInput={ctx.position.seek}
    onPointerDown={event => { event.stopPropagation(); ctx.position.beginSeek(); }}
    position="fixed" thickness={props.narrow ? "narrow" : "normal"} trackClickEnabled={false}
    trackVisible={false} visible={visible()} visibleValueCount={1}
  />;
}
