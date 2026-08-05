import { createSignal, untrack } from "solid-js";
import { clamp } from "../../utils";

type PositionBarThickness = "narrow" | "normal";

const VERTICAL_FILL = {
  narrow: {
    collapsed: "w-10px large:w-12px",
    expanded: "w-18px large:w-24px",
  },
  normal: {
    collapsed: "w-20px large:w-24px",
    expanded: "w-36px large:w-48px",
  },
} satisfies Record<PositionBarThickness, Record<string, string>>;

const HORIZONTAL_FILL = {
  narrow: "h-10px large:h-12px",
  normal: "h-20px large:h-24px",
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
  position?: "absolute" | "fixed";
  reversed?: boolean;
  thickness?: PositionBarThickness;
  trackVisible?: boolean;
  visible?: boolean;
  visibleValueCount?: number;
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
  const visibleRatio = () =>
    clamp((props.visibleValueCount ?? 1) / Math.max(1, valueRange() + 1), 0, 1);
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
    setDragging(true);
    track.setPointerCapture(event.pointerId);
    const thumbRect = thumb.getBoundingClientRect();
    dragOffset = event.target instanceof Node && thumb.contains(event.target)
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
        class={`ehpeek-position-bar ${props.class ?? ""} ${props.position === "fixed" ? "fixed" : "absolute"} inset-x-0 bottom-0 z-2 h-20px large:h-24px touch-none select-none`}
        aria-label={props.ariaLabel}
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
          class="ehpeek-position-bar-thumb absolute bottom-0 flex h-20px large:h-24px items-end cursor-grab active:cursor-grabbing"
          style={{
            left: `${visualPosition()}%`,
            transform: `translateX(-${visualPosition()}%)`,
            width: `clamp(var(--ui-control-size-md), ${visibleRatio() * 100}%, calc(var(--ui-control-size-xl) * 4))`,
          }}
        >
          <span
            class={`block w-full ${HORIZONTAL_FILL[thickness]} rounded-t-md ${POSITION_BAR_FILL} shadow-[0_2px_10px_var(--color-shadow-control)]`}
          />
        </div>
      </div>
  );

  const interactionSize = () => expanded()
    ? "w-36px large:w-64px"
    : "w-20px large:w-40px";
  const fillSize = () => expanded()
    ? VERTICAL_FILL[thickness].expanded
    : VERTICAL_FILL[thickness].collapsed;
  const renderVertical = () => (
    <div
      ref={track}
      class={`ehpeek-position-bar ${props.class ?? ""} ${props.position === "fixed" ? "fixed" : "absolute"} inset-y-0 right-0 z-2 ${interactionSize()} touch-none select-none transition-[width,opacity] duration-160 ease-in-out [--ehpeek-position-bar-thumb-min:calc(var(--ui-control-size-md)*1.5)] [--ehpeek-position-bar-thumb-max:calc(var(--ui-control-size-xl)*4)] ${
        visible() ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      aria-label={props.ariaLabel}
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
        class={`ehpeek-position-bar-thumb absolute right-0 flex ${interactionSize()} items-center justify-end cursor-grab active:cursor-grabbing transition-[width,height] duration-160`}
        style={{
          height: `clamp(var(--ehpeek-position-bar-thumb-min), ${visibleRatio() * 100}%, var(--ehpeek-position-bar-thumb-max))`,
          top: `${visualPosition()}%`,
          transform: `translateY(-${visualPosition()}%)`,
        }}
      >
        <span
          class={`block h-full rounded-l-md ${POSITION_BAR_FILL} ${fillSize()} shadow-[0_2px_10px_var(--color-shadow-control)] transition-[width,opacity] duration-160`}
        />
      </div>
    </div>
  );
  return <>{horizontal ? renderHorizontal() : renderVertical()}</>;
}
