import { h } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import { registerGlobalStyle } from "../utils";
import progressBarCss from "./Misc.css";

const PROGRESS_BAR_CLASS = "ehpeek-progress-bar";
const PROGRESS_BAR_CLASS_NAME = [
  PROGRESS_BAR_CLASS,
  "w-full h-[2.4em] px-[0.6em] py-0 m-0",
  "bg-transparent",
  "cursor-grab active:cursor-grabbing touch-none select-none",
  "[-webkit-appearance:none] [appearance:none]",
  "[--progress-bar-fill:0%] [--progress-bar-track-direction:to_right]",
    "[accent-color:var(--color-text)]",
].join(" ");

registerGlobalStyle(PROGRESS_BAR_CLASS, progressBarCss);

export function ProgressBar(props: {
  className?: string;
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
  const input = useRef<HTMLInputElement>(null);

  useLayoutEffect(() => {
    const element = input.current;

    if (!element) {
      return;
    }

    const max = Math.max(1, props.max ?? props.min);
    const direction = props.direction ?? "ltr";
    element.min = String(props.min);
    element.max = String(max);
    element.step = String(props.step);
    element.dir = direction;
    element.style.setProperty("--progress-bar-track-direction", direction === "rtl" ? "to left" : "to right");
    element.style.setProperty("--progress-bar-fill", `${Math.min(100, Math.max(0, props.fillPercent ?? 0))}%`);

    if (!props.keepInputValue && props.value !== undefined) {
      element.value = String(props.value);
    }
  }, [props.direction, props.fillPercent, props.keepInputValue, props.max, props.min, props.step, props.value]);

  const currentValue = (event: Event): number => Number((event.currentTarget as HTMLInputElement).value || "");

  return (
    <input
      ref={input}
      type="range"
      className={`${PROGRESS_BAR_CLASS_NAME}${props.className ? ` ${props.className}` : ""}`}
      min={String(props.min)}
      max={props.max === undefined ? undefined : String(props.max)}
      step={String(props.step)}
      defaultValue={String(props.value ?? props.min)}
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
