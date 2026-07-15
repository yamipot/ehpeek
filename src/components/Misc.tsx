import { h } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";
import { registerGlobalStyle } from "../utils";

const PROGRESS_BAR_CLASS = "ehpeek-progress-bar";
const PROGRESS_BAR_CLASS_NAME = [
  PROGRESS_BAR_CLASS,
  "w-full h-[2.4em] px-[0.6em] py-0 m-0",
  "cursor-grab active:cursor-grabbing touch-none select-none",
  "[-webkit-appearance:none] [appearance:none]",
  "[--progress-bar-fill:0%] [--progress-bar-track-direction:to_right]",
  "[accent-color:var(--ehp-color-foreground)]",
].join(" ");

registerGlobalStyle(PROGRESS_BAR_CLASS, `
.${PROGRESS_BAR_CLASS}::-webkit-slider-runnable-track {
  height: 0.4em;
  border-radius: 9999px;
  background: linear-gradient(
    var(--progress-bar-track-direction),
    var(--ehp-color-accent) 0 var(--progress-bar-fill),
    var(--ehp-color-track) var(--progress-bar-fill) 100%
  );
}

.${PROGRESS_BAR_CLASS}::-webkit-slider-thumb {
  width: 1.4em;
  height: 1.4em;
  margin-top: -0.5em;
  border: 2px solid var(--ehp-color-border);
  border-radius: 9999px;
  background: var(--ehp-color-foreground);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
  -webkit-appearance: none;
  appearance: none;
}

.${PROGRESS_BAR_CLASS}::-moz-range-track {
  height: 0.4em;
  border-radius: 9999px;
  background: var(--ehp-color-track);
}

.${PROGRESS_BAR_CLASS}::-moz-range-progress {
  height: 0.4em;
  border-radius: 9999px;
  background: var(--ehp-color-accent);
}

.${PROGRESS_BAR_CLASS}::-moz-range-thumb {
  width: 1.4em;
  height: 1.4em;
  border: 2px solid var(--ehp-color-border);
  border-radius: 9999px;
  background: var(--ehp-color-foreground);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.4);
}`);

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
