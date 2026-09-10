import { createEffect, createSignal, untrack } from "solid-js";
import { clamp } from "../helpers";
import { useUiPixelScale } from "../../UiPixelScale";
import "../../styles";

type PositionBarThickness = "narrow" | "normal";

export function PositionBar(props: {
  disabled?: boolean;
  ariaLabel: string;
  axis: "horizontal" | "vertical";
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
  trackClickEnabled?: boolean;
  trackVisible?: boolean;
  visible?: boolean;
  visibleValueCount?: number;
  visibleRatio?: number;
}) {
  const pixelScale = useUiPixelScale();
  const [dragging, setDragging] = createSignal(false);
  let track!: HTMLDivElement;
  let thumb!: HTMLDivElement;
  let dragOffset = 0;
  let capturedPointer: number | null = null;
  createEffect(() => {
    if (!props.disabled) return;
    setDragging(false);
    if (capturedPointer !== null && track.hasPointerCapture(capturedPointer))
      track.releasePointerCapture(capturedPointer);
    capturedPointer = null;
  });
  const axis = untrack(() => props.axis);
  const thickness = () => props.thickness ?? "normal";
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
  const draggable = () => !props.disabled && valueRange() > 0 && thumbRatio() < 1;
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
    return minValue() + ratio * valueRange();
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
    capturedPointer = event.pointerId;
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
    capturedPointer = null;
    props.onCommit?.(value);
  };
  const onPointerCancel = (event: PointerEvent): void => {
    if (!dragging()) {
      return;
    }
    setDragging(false);
    track.releasePointerCapture(event.pointerId);
    capturedPointer = null;
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
        class="ehpeek-position-bar"
        data-axis="horizontal"
        data-position={props.position ?? "absolute"}
        data-thickness={thickness()}
        data-draggable={draggable()}
        data-track-visible={props.trackVisible !== false}
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
          class="ehpeek-position-bar__track"
        />
        <div
          ref={thumb}
          class="ehpeek-position-bar__thumb"
          style={{
            left: `${visualPosition()}%`,
            transform: `translateX(-${visualPosition()}%)`,
            width: `clamp(var(--ui-control-size-md), ${thumbRatio() * 100}%, 100%)`,
          }}
        >
        <span
          class="ehpeek-position-bar__fill"
          style={{
            transform: `scaleY(${pixelScale()})`,
            "transform-origin": "bottom",
          }}
        />
        </div>
      </div>
  );

  const renderVertical = () => (
    <div
      ref={track}
      class="ehpeek-position-bar"
      data-axis="vertical"
      data-position={props.position ?? "absolute"}
      data-thickness={thickness()}
      data-expanded={expanded()}
      data-visible={visible()}
      data-draggable={draggable()}
      data-track-visible={props.trackVisible !== false}
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
        class="ehpeek-position-bar__track"
      />
      <div
        ref={thumb}
        class="ehpeek-position-bar__thumb"
        style={{
          height: `clamp(var(--ehpeek-position-bar-thumb-min), ${thumbRatio() * 100}%, 100%)`,
          top: `${visualPosition()}%`,
          transform: `translateY(-${visualPosition()}%)`,
        }}
      >
        <span
          class="ehpeek-position-bar__fill"
          style={{
            transform: `scaleX(${pixelScale()})`,
            "transform-origin": "right",
          }}
        />
      </div>
    </div>
  );
  return <>{horizontal ? renderHorizontal() : renderVertical()}</>;
}
