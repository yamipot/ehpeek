import type { ToolbarCallbacks } from "./Toolbar";
import { PositionBar } from "../Widgets/PositionBar";

export function ReaderScrollBar(props: {
  callbacks: Pick<
    ToolbarCallbacks,
    "onProgressCommit" | "onProgressInput" | "onProgressPointerDown"
  >;
  currentPage: number;
  expanded: boolean;
  totalPages: number;
  visible: boolean;
}) {
  return (
    <PositionBar
      ariaLabel="Reader position"
      axis="vertical"
      class="ehpeek-reader-scrollbar"
      currentValue={props.currentPage}
      expanded={props.expanded}
      maxValue={props.totalPages}
      onCommit={props.callbacks.onProgressCommit}
      onInput={props.callbacks.onProgressInput}
      onPointerDown={props.callbacks.onProgressPointerDown}
      position="fixed"
      visible={props.visible}
      visibleValueCount={1}
    />
  );
}
