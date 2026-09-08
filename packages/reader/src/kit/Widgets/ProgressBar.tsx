import { createEffect } from "solid-js";
import "../../styles";

export function ProgressBar(props: {
  class?: string;
  direction?: "ltr" | "rtl";
  fillPercent?: number;
  keepInputValue?: boolean;
  max?: number;
  min: number;
  onCommit?: (value: number) => void;
  onInput?: (value: number) => void;
  onPointerDown?: (event: PointerEvent) => void;
  step: number;
  value?: number;
}) {
  let input!: HTMLInputElement;

  createEffect(() => {
    const direction = props.direction ?? "ltr";
    input.min = String(props.min);
    input.max = String(Math.max(1, props.max ?? props.min));
    input.step = String(props.step);
    input.dir = direction;
    input.style.setProperty("--progress-bar-track-direction", direction === "rtl" ? "to left" : "to right");
    input.style.setProperty("--progress-bar-fill", `${Math.min(100, Math.max(0, props.fillPercent ?? 0))}%`);

    if (!props.keepInputValue && props.value !== undefined) {
      input.value = String(props.value);
    }
  });

  const currentValue = (event: Event): number => Number((event.currentTarget as HTMLInputElement).value || "");

  return (
    <input
      ref={(element) => {
        input = element;
        element.min = String(props.min);
        element.max = String(Math.max(1, props.max ?? props.min));
        element.step = String(props.step);
        element.value = String(props.value ?? props.min);
      }}
      type="range"
      class={`ehpeek-progress-bar${props.class ? ` ${props.class}` : ""}`}
      min={String(props.min)}
      max={String(Math.max(1, props.max ?? props.min))}
      step={String(props.step)}
      dir={props.direction ?? "ltr"}
      onPointerDown={(event: PointerEvent) => {
        props.onPointerDown?.(event);
      }}
      onInput={(event: Event) => {
        props.onInput?.(currentValue(event));
      }}
      onChange={(event: Event) => {
        props.onCommit?.(currentValue(event));
      }}
      onPointerUp={(event: PointerEvent) => {
        props.onCommit?.(currentValue(event));
      }}
      onPointerCancel={(event: PointerEvent) => {
        props.onCommit?.(currentValue(event));
      }}
    />
  );
}
