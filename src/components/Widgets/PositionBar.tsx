import { createSignal, untrack } from "solid-js";
import { clamp } from "../../utils";

type PositionBarVariant = "reader" | "site";

const VERTICAL_CLASS = {
  reader: {
    collapsedFill: "w-20px large:w-24px",
    collapsedInteraction: "w-20px large:w-40px",
    expandedFill: "w-36px large:w-48px",
    expandedInteraction: "w-36px large:w-64px",
    fill: "bg-[var(--color-reader-scrollbar,var(--color-muted))]",
    track: "bg-[var(--color-reader-border,var(--color-border))]",
    trackSize: "right-4px w-6px",
  },
  site: {
    collapsedFill: "w-10px large:w-14px",
    collapsedInteraction: "w-14px large:w-24px",
    expandedFill: "w-[calc(var(--ui-control-size-sm)/2)]",
    expandedInteraction: "w-[calc(var(--ui-control-size-sm)/2)]",
    fill: "bg-[var(--color-site-text)] opacity-55",
    track: "bg-transparent",
    trackSize: "right-2px w-3px",
  },
} satisfies Record<PositionBarVariant, Record<string, string>>;

const HORIZONTAL_CLASS = {
  reader: {
    fill: "bg-[var(--color-reader-scrollbar,var(--color-muted))]",
    interaction: "h-20px large:h-24px",
    track: "bg-[var(--color-reader-border,var(--color-border))]",
    trackSize: "bottom-4px h-6px",
  },
  site: {
    fill: "bg-[var(--color-site-text)] opacity-55",
    interaction: "h-[calc(var(--ui-control-size-xs)/2)]",
    track: "bg-transparent",
    trackSize: "bottom-2px h-3px",
  },
} satisfies Record<PositionBarVariant, Record<string, string>>;

const COMPACT_READER_VERTICAL_FILL = {
  collapsed: "w-10px large:w-12px",
  expanded: "w-18px large:w-24px",
};

export function PositionBar(props: {
  ariaLabel: string;
  axis: "horizontal" | "vertical";
  class?: string;
  compactVertical?: boolean;
  currentValue: number;
  expanded?: boolean;
  maxValue: number;
  minValue?: number;
  onCommit?: (value: number) => void;
  onInput: (value: number) => void;
  onPointerDown?: (event: PointerEvent) => void;
  position?: "absolute" | "fixed";
  reversed?: boolean;
  trackVisible?: boolean;
  variant: PositionBarVariant;
  visible?: boolean;
  visibleValueCount?: number;
}) {
  const [dragging, setDragging] = createSignal(false);
  let track!: HTMLDivElement;
  let thumb!: HTMLDivElement;
  let dragOffset = 0;
  const axis = untrack(() => props.axis);
  const variant = untrack(() => props.variant);
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

  const horizontalClasses = HORIZONTAL_CLASS[variant];
  const renderHorizontal = () => (
      <div
        ref={track}
        class={`ehpeek-position-bar ${props.class ?? ""} ${props.position === "fixed" ? "fixed" : "absolute"} inset-x-0 bottom-0 z-2 ${horizontalClasses.interaction} touch-none select-none`}
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
          class={`absolute inset-x-0 ${horizontalClasses.trackSize} ${
            props.trackVisible === false ? "bg-transparent" : horizontalClasses.track
          }`}
        />
        <div
          ref={thumb}
          class={`ehpeek-position-bar-thumb absolute bottom-0 flex ${horizontalClasses.interaction} items-end cursor-grab active:cursor-grabbing`}
          style={{
            left: `${visualPosition()}%`,
            transform: `translateX(-${visualPosition()}%)`,
            width: `clamp(var(--ui-control-size-md), ${visibleRatio() * 100}%, calc(var(--ui-control-size-xl) * 4))`,
          }}
        >
          <span
            class={`block w-full h-full rounded-t-md ${horizontalClasses.fill} shadow-[0_2px_10px_var(--color-shadow-control)]`}
          />
        </div>
      </div>
  );

  const verticalClasses = VERTICAL_CLASS[variant];
  const interactionSize = () => expanded()
    ? verticalClasses.expandedInteraction
    : verticalClasses.collapsedInteraction;
  const fillSize = () => expanded()
    ? variant === "reader" && props.compactVertical
      ? COMPACT_READER_VERTICAL_FILL.expanded
      : verticalClasses.expandedFill
    : variant === "reader" && props.compactVertical
      ? COMPACT_READER_VERTICAL_FILL.collapsed
      : verticalClasses.collapsedFill;
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
        class={`absolute inset-y-0 ${verticalClasses.trackSize} ${
          props.trackVisible === false ? "bg-transparent" : verticalClasses.track
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
          class={`block h-full rounded-l-md ${verticalClasses.fill} ${fillSize()} shadow-[0_2px_10px_var(--color-shadow-control)] transition-[width,opacity] duration-160`}
        />
      </div>
    </div>
  );
  return <>{horizontal ? renderHorizontal() : renderVertical()}</>;
}
