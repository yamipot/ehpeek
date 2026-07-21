import { createSignal } from "solid-js";
import type { ToolbarCallbacks } from "./Toolbar";
import { clamp } from "../../utils";

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
  let track!: HTMLDivElement;
  let thumb!: HTMLDivElement;
  const [dragging, setDragging] = createSignal(false);
  let dragOffset = 0;
  const position = () => props.totalPages <= 1
    ? 0
    : ((props.currentPage - 1) / (props.totalPages - 1)) * 100;
  const pageAt = (clientY: number): number => {
    const trackRect = track.getBoundingClientRect();
    const travel = Math.max(1, trackRect.height - thumb.offsetHeight);
    const ratio = clamp(
      (clientY - trackRect.top - dragOffset) / travel,
      0,
      1,
    );
    return Math.round(1 + ratio * (props.totalPages - 1));
  };
  const updatePage = (clientY: number): number => {
    const page = pageAt(clientY);
    props.callbacks.onProgressInput(page);
    return page;
  };

  return (
    <div
      ref={track}
      class={
        "fixed inset-y-0 right-0 z-2 w-lg coarse:w-xl touch-none select-none transition-opacity duration-160 ease-in-out " +
        (props.visible || dragging()
          ? "opacity-100"
          : "opacity-0 pointer-events-none")
      }
      onClick={(event) => event.stopPropagation()}
      onContextMenu={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
      onPointerDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        setDragging(true);
        track.setPointerCapture(event.pointerId);
        const thumbRect = thumb.getBoundingClientRect();
        dragOffset = event.target instanceof Node && thumb.contains(event.target)
          ? event.clientY - thumbRect.top
          : thumbRect.height / 2;
        props.callbacks.onProgressPointerDown(event);
        updatePage(event.clientY);
      }}
      onPointerMove={(event) => {
        if (dragging()) {
          updatePage(event.clientY);
        }
      }}
      onPointerUp={(event) => {
        if (!dragging()) {
          return;
        }
        setDragging(false);
        const page = updatePage(event.clientY);
        track.releasePointerCapture(event.pointerId);
        props.callbacks.onProgressCommit(page);
      }}
      onPointerCancel={(event) => {
        if (!dragging()) {
          return;
        }
        setDragging(false);
        track.releasePointerCapture(event.pointerId);
        props.callbacks.onProgressCommit(props.currentPage);
      }}
      onWheel={(event) => event.stopPropagation()}
    >
      <div class="absolute inset-y-0 right-2px w-3px bg-[var(--color-reader-border)]" />
      <div
        ref={thumb}
        class="absolute right-0 flex w-lg coarse:w-xl h-[120px] coarse:h-[200px] items-center justify-end cursor-grab active:cursor-grabbing"
        style={{
          top: `${position()}%`,
          transform: `translateY(-${position()}%)`,
        }}
      >
        <span
          class={`block h-full rounded-l-md bg-[var(--color-reader-scrollbar)] shadow-[0_2px_10px_var(--color-shadow-control)] transition-[width] duration-160 ${props.expanded || dragging() ? "w-18px coarse:w-24px" : "w-10px coarse:w-12px"}`}
        />
      </div>
    </div>
  );
}
