import type { ToolbarCallbacks } from "./Toolbar";
import { PositionBar } from "../kit/Widgets/PositionBar";

export function ReaderScrollBar(props: {
  disabled?: boolean;
  callbacks: Pick<
    ToolbarCallbacks,
    "onProgressCommit" | "onProgressInput" | "onProgressPointerDown"
  >;
  currentPage: number;
  narrow: boolean;
  expanded: boolean;
  totalPages: number;
  visible: boolean;
}) {
  return (
    <PositionBar
      disabled={props.disabled}
      ariaLabel="Reader position"
      axis="vertical"
      currentValue={props.currentPage}
      expanded={props.expanded}
      maxValue={props.totalPages}
      onCommit={props.callbacks.onProgressCommit}
      onInput={props.callbacks.onProgressInput}
      onPointerDown={props.callbacks.onProgressPointerDown}
      position="fixed"
      thickness={props.narrow ? "narrow" : "normal"}
      trackClickEnabled={false}
      trackVisible={false}
      visible={props.visible}
      visibleValueCount={1}
    />
  );
}
