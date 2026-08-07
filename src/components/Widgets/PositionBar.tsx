import { createSignal, untrack } from "solid-js";
import { clamp } from "../../utils";

type PositionBarThickness = "narrow" | "normal";

const VERTICAL_FILL = {
  narrow: {
    collapsed: "w-[calc(10px*var(--ui-scale-factor))]",
    expanded: "w-[calc(18px*var(--ui-scale-factor))]",
  },
  normal: {
    collapsed: "w-[calc(20px*var(--ui-scale-factor))]",
    expanded: "w-[calc(36px*var(--ui-scale-factor))]",
  },
} satisfies Record<PositionBarThickness, Record<string, string>>;

const HORIZONTAL_FILL = {
  narrow: "h-[calc(10px*var(--ui-scale-factor))]",
  normal: "h-[calc(20px*var(--ui-scale-factor))]",
} satisfies Record<PositionBarThickness, string>;

const POSITION_BAR_FILL = "bg-[var(--color-reader-scrollbar,var(--color-muted))]";
const POSITION_BAR_TRACK = "bg-[var(--color-reader-border,var(--color-border))]";

export function PositionBar(props: {
  ariaLabel: string;
  axis: "horizontal" | "vertical";
  class?: string;
  currentValue: number;
  expanded?: boolean;
  maxValue: number;
  minValue?: number;
  onCommit?: (value: number) => void;
  onInput: (value: number) => void;
  onPointerDown?: (event: PointerEvent) => void;
  pixelScale?: number;
  position?: "absolute" | "fixed";
  reversed?: boolean;
  thickness?: PositionBarThickness;
  trackClickEnabled?: boolean;
  trackVisible?: boolean;
  visible?: boolean;
  visibleValueCount?: number;
  visibleRatio?: number;
}) {
  const [dragging, setDragging] = createSignal(false);
  let track!: HTMLDivElement;
  let thumb!: HTMLDivElement;
  let dragOffset = 0;
  const axis = untrack(() => props.axis);
  const thickness = untrack(() => props.thickness ?? "normal");
  const horizontal = axis === "horizontal";
  const minValue = () => props.minValue ?? 1;
  const valueRange = () => Math.max(0, props.maxValue - minValue());
  const expanded = () => Boolean(props.expanded) || dragging();
  const visible = () => props.visible !== false || dragging();
  const logicalPosition = () => valueRange() === 0
    ? 0
    : ((props.currentValue - minValue()) / valueRange()) * 100;
  const visualPosition = () =>
    horizontal && props.reversed ? 100 - logicalPosition() : logicalPosition();
  const thumbRatio = () => clamp(
    props.visibleRatio ??
      (props.visibleValueCount ?? 1) / Math.max(1, valueRange() + 1),
    0,
    1,
  );
  const draggable = () => valueRange() > 0 && thumbRatio() < 1;
  const coordinate = (event: PointerEvent): number =>
    horizontal ? event.clientX : event.clientY;
  const valueAt = (pointerCoordinate: number): number => {
    const trackRect = track.getBoundingClientRect();
    const trackStart = horizontal ? trackRect.left : trackRect.top;
    const trackLength = horizontal ? trackRect.width : trackRect.height;
    const thumbLength = horizontal ? thumb.offsetWidth : thumb.offsetHeight;
    const visualRatio = clamp(
      (pointerCoordinate - trackStart - dragOffset) /
        Math.max(1, trackLength - thumbLength),
      0,
      1,
    );
    const ratio = horizontal && props.reversed ? 1 - visualRatio : visualRatio;
    return Math.round(minValue() + ratio * valueRange());
  };
  const inputAt = (event: PointerEvent): number => {
    const value = valueAt(coordinate(event));
    props.onInput(value);
    return value;
  };
  const onPointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    event.stopPropagation();
    if (!draggable()) {
      return;
    }
    const thumbPressed = event.target instanceof Node && thumb.contains(event.target);
    if (!thumbPressed && props.trackClickEnabled === false) {
      return;
    }
    setDragging(true);
    track.setPointerCapture(event.pointerId);
    const thumbRect = thumb.getBoundingClientRect();
    dragOffset = thumbPressed
      ? coordinate(event) - (horizontal ? thumbRect.left : thumbRect.top)
      : (horizontal ? thumbRect.width : thumbRect.height) / 2;
    props.onPointerDown?.(event);
    inputAt(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (dragging()) {
      inputAt(event);
    }
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (!dragging()) {
      return;
    }
    setDragging(false);
    const value = inputAt(event);
    track.releasePointerCapture(event.pointerId);
    props.onCommit?.(value);
  };
  const onPointerCancel = (event: PointerEvent): void => {
    if (!dragging()) {
      return;
    }
    setDragging(false);
    track.releasePointerCapture(event.pointerId);
    props.onCommit?.(props.currentValue);
  };
  const stopClick = (event: MouseEvent): void => event.stopPropagation();
  const stopContextMenu = (event: MouseEvent): void => {
    event.preventDefault();
    event.stopPropagation();
  };
  const stopWheel = (event: WheelEvent): void => event.stopPropagation();

  const renderHorizontal = () => (
      <div
        ref={track}
        class={`ehpeek-position-bar ${props.class ?? ""} ${props.position === "fixed" ? "fixed" : "absolute"} inset-x-0 bottom-0 z-2 h-[calc(20px*var(--ui-scale-factor))] touch-none select-none`}
        aria-label={props.ariaLabel}
        aria-disabled={!draggable()}
        aria-orientation="horizontal"
        aria-valuemax={props.maxValue}
        aria-valuemin={minValue()}
        aria-valuenow={props.currentValue}
        role="scrollbar"
        onClick={stopClick}
        onContextMenu={stopContextMenu}
        onPointerCancel={onPointerCancel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onWheel={stopWheel}
      >
        <div
          class={`absolute inset-x-0 bottom-4px h-6px ${
            props.trackVisible === false ? "bg-transparent" : POSITION_BAR_TRACK
          }`}
        />
        <div
          ref={thumb}
          class={`ehpeek-position-bar-thumb absolute bottom-0 flex h-[calc(20px*var(--ui-scale-factor))] items-end ${draggable() ? "cursor-grab active:cursor-grabbing" : "cursor-default"}`}
          style={{
            left: `${visualPosition()}%`,
            transform: `translateX(-${visualPosition()}%)`,
            width: `clamp(var(--ui-control-size-md), ${thumbRatio() * 100}%, 100%)`,
          }}
        >
        <span
          class={`block w-full ${HORIZONTAL_FILL[thickness]} rounded-t-md ${POSITION_BAR_FILL} shadow-[0_2px_10px_var(--color-shadow-control)]`}
          style={{
            transform: `scaleY(${props.pixelScale ?? 1})`,
            "transform-origin": "bottom",
          }}
        />
        </div>
      </div>
  );

  const interactionSize = () => expanded()
    ? "w-[calc(36px*var(--ui-scale-factor))]"
    : "w-[calc(20px*var(--ui-scale-factor))]";
  const fillSize = () => expanded()
    ? VERTICAL_FILL[thickness].expanded
    : VERTICAL_FILL[thickness].collapsed;
  const renderVertical = () => (
    <div
      ref={track}
      class={`ehpeek-position-bar ${props.class ?? ""} ${props.position === "fixed" ? "fixed" : "absolute"} inset-y-0 right-0 z-2 ${interactionSize()} touch-none select-none transition-[width,opacity] duration-160 ease-in-out [--ehpeek-position-bar-thumb-min:calc(var(--ui-control-size-md)*1.5)] ${
        visible() ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-label={props.ariaLabel}
      aria-disabled={!draggable()}
      aria-orientation="vertical"
      aria-valuemax={props.maxValue}
      aria-valuemin={minValue()}
      aria-valuenow={props.currentValue}
      role="scrollbar"
      onClick={stopClick}
      onContextMenu={stopContextMenu}
      onPointerCancel={onPointerCancel}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={stopWheel}
    >
      <div
        class={`absolute inset-y-0 right-4px w-6px ${
          props.trackVisible === false ? "bg-transparent" : POSITION_BAR_TRACK
        }`}
      />
      <div
        ref={thumb}
        class={`ehpeek-position-bar-thumb absolute right-0 flex ${interactionSize()} items-center justify-end ${draggable() ? "cursor-grab active:cursor-grabbing" : "cursor-default"} transition-[width,height] duration-160`}
        style={{
          height: `clamp(var(--ehpeek-position-bar-thumb-min), ${thumbRatio() * 100}%, 100%)`,
          top: `${visualPosition()}%`,
          transform: `translateY(-${visualPosition()}%)`,
        }}
      >
        <span
          class={`block h-full rounded-l-md ${POSITION_BAR_FILL} ${fillSize()} shadow-[0_2px_10px_var(--color-shadow-control)] transition-[width,opacity] duration-160`}
          style={{
            transform: `scaleX(${props.pixelScale ?? 1})`,
            "transform-origin": "right",
          }}
        />
      </div>
    </div>
  );
  return <>{horizontal ? renderHorizontal() : renderVertical()}</>;
}
