import type { ToolbarCallbacks } from "./Toolbar";
import { PositionBar } from "../Widgets/PositionBar";

export function ReaderScrollBar(props: {
  callbacks: Pick<
    ToolbarCallbacks,
    "onProgressCommit" | "onProgressInput" | "onProgressPointerDown"
  >;
  currentPage: number;
  narrow: boolean;
  expanded: boolean;
  pixelScale: number;
  totalPages: number;
  visible: boolean;
}) {
  return (
    <PositionBar
      ariaLabel="Reader position"
      axis="vertical"
      currentValue={props.currentPage}
      expanded={props.expanded}
      maxValue={props.totalPages}
      onCommit={props.callbacks.onProgressCommit}
      onInput={props.callbacks.onProgressInput}
      onPointerDown={props.callbacks.onProgressPointerDown}
      pixelScale={props.pixelScale}
      position="fixed"
      thickness={props.narrow ? "narrow" : "normal"}
      trackClickEnabled={false}
      trackVisible={false}
      visible={props.visible}
      visibleValueCount={1}
    />
  );
}
