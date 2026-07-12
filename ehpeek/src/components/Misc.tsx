import { applyProps, h, type Props } from "../jsx";
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

export function ProgressBar(props: Props<{
  max?: number;
  min: number;
  onPointerDown?: (event: PointerEvent) => void;
  onInput?: () => void;
  onCommit?: () => void;
  step: number;
}, HTMLInputElement, ReturnType<typeof createProgressBarOperator>>): HTMLInputElement {
  const element = (
    <input
      type="range"
      className={PROGRESS_BAR_CLASS_NAME}
      min={String(props.min)}
      max={props.max === undefined ? undefined : String(props.max)}
      step={String(props.step)}
      onPointerDown={props.onPointerDown}
      onInput={props.onInput}
      onChange={props.onCommit}
      onPointerUp={props.onCommit}
      onPointerCancel={props.onCommit}
    />
  ) as HTMLInputElement;
  const operator = createProgressBarOperator(element);

  return applyProps({ props, operator }, element);
}

function createProgressBarOperator(element: HTMLInputElement) {
  return {
    range: () => {
      return {
        min: Number(element.min || "1"),
        max: Number(element.max || "1"),
      };
    },
    value: () => Number(element.value || ""),
    setDirection: (direction: "ltr" | "rtl") => {
      const rtl = direction === "rtl";
      element.dir = direction;
      element.style.setProperty("--progress-bar-track-direction", rtl ? "to left" : "to right");
    },
    setFill: (fillPercent: number) => {
      element.style.setProperty("--progress-bar-fill", `${fillPercent}%`);
    },
    setMax: (max: number) => {
      element.max = String(Math.max(1, max));
    },
    setValue: (value: number) => {
      element.value = String(value);
    },
  };
}
