import { createEffect, createSignal, on, Show, untrack, type Accessor } from "solid-js";
import { containFitScale } from "./layout";
import { normalizeReaderScrollSizeScale } from "../features/ReaderSettings";
import { useReaderContext } from "./Context";
import { useReaderTexts } from "../kit/i18n";
import { Button } from "../kit/Widgets/Button";
import type { ReadDirection, ReaderScrollSizeScale, ReaderSettingsState } from "../kit/interfaces";
import type { ReaderViewportSize } from "./Viewport";

export interface ReaderScrollScale {
  /** Shared reference dimensions keep viewport sizing and UI percentages on the same basis. */
  referenceImageSize: Accessor<{ width: number; height: number } | null>;
  /** Fit-relative layout scale; null is fit, unlike the absolute image scale used by the controls. */
  value: Accessor<ReaderScrollSizeScale>;
  /** Absolute image scale as a percentage; null until the reference image has dimensions. */
  percent: Accessor<number | null>;
  adjusting: Accessor<boolean>;
  /** Begin adjustment with a snapshot that can be restored on cancellation. */
  open(): void;
  /** Change absolute image scale: 1 means one image pixel per CSS pixel. */
  resize(imageScale: number): void;
  /** Select a sizing rule instead of an explicit image scale. */
  selectPreset(preset: "fit" | "fill" | "one-to-one"): void;
  /** Keep this axis's temporary scale and close the adjustment controls. */
  apply(): void;
  /** Also update this axis's persisted default through the existing settings notifications. */
  applyGlobally(): void;
  /** Restore the adjustment snapshot and close the controls. */
  cancel(): void;
}

/**
 * Retains each axis's temporary scale and owns adjustment rollback for one Reader mount.
 * Gestures, layout and adjustment controls use the same scale without sharing pinch snapshots.
 */
export function createReaderScrollScale(options: {
  settings: ReaderSettingsState;
  direction: Accessor<ReadDirection>;
  /** Read-only measured geometry; scale adjustment cannot resize the container. */
  viewportSize: Accessor<ReaderViewportSize | null>;
  /** Dimensions of the initial reference page in image pixels; retain the first available size. */
  referenceImageSize: Accessor<{ width: number; height: number } | null>;
}): ReaderScrollScale {
  const [ttb, setTtb] = createSignal(untrack(options.settings.scrollTtbScale.value));
  const [horizontal, setHorizontal] = createSignal(untrack(options.settings.scrollHorizontalScale.value));
  const [adjusting, setAdjusting] = createSignal(false);
  const value = () => options.direction() === "ttb" ? ttb() : horizontal();
  const setValue = (next: ReaderScrollSizeScale) => options.direction() === "ttb" ? setTtb(next) : setHorizontal(next);
  let adjustmentStart = untrack(value);
  createEffect(on(options.settings.scrollTtbScale.value, setTtb));
  createEffect(on(options.settings.scrollHorizontalScale.value, setHorizontal));
  const fitScale = () => {
    const image = options.referenceImageSize(), viewport = options.viewportSize();
    return image && viewport ? containFitScale(image.width, image.height, viewport.width, viewport.height) : null;
  };
  return {
    referenceImageSize: options.referenceImageSize,
    value,
    adjusting,
    percent() {
      if (value() === "one-to-one") return 100;
      const image = options.referenceImageSize(), viewport = options.viewportSize();
      if (value() === "fill") return image && viewport
        ? (options.direction() === "ttb" ? viewport.width / image.width : viewport.height / image.height) * 100
        : null;
      const fit = fitScale(), current = value();
      return fit ? (typeof current === "number" ? current : 1) * fit * 100 : null;
    },
    open() { adjustmentStart = value(); setAdjusting(true); },
    resize(imageScale) {
      const fit = fitScale();
      if (fit) setValue(normalizeReaderScrollSizeScale(imageScale / fit));
    },
    selectPreset(preset) { setValue(preset === "fit" ? null : preset); },
    apply() { setAdjusting(false); },
    applyGlobally() {
      const setting = options.direction() === "ttb" ? options.settings.scrollTtbScale : options.settings.scrollHorizontalScale;
      setting.set(value());
      setAdjusting(false);
    },
    cancel() { setValue(adjustmentStart); setAdjusting(false); },
  };
}

const MIN_SCALE_PERCENT = 10;
const MAX_SCALE_PERCENT = 500;

export function ReaderScrollScaleControls() {
  const ctx = useReaderContext();
  const scale = ctx.scrollScale;
  const scaleMode = () => scale.value() === null ? "fit" : typeof scale.value() === "number" ? "custom" : scale.value();
  const percentLabel = () => {
    const percent = scale.percent();
    return percent === null ? "—" : `${Math.round(percent)}%`;
  };
  const texts = useReaderTexts();
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStart: { distance: number; scale: number } | null = null;
  let interactionLayer!: HTMLDivElement;
  const sliderPercent = () => Math.min(
    MAX_SCALE_PERCENT,
    Math.max(MIN_SCALE_PERCENT, scale.percent() ?? 100),
  );
  const clampScale = (scale: number) => Math.min(
    MAX_SCALE_PERCENT / 100,
    Math.max(MIN_SCALE_PERCENT / 100, scale),
  );
  const stopInteraction = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
  };
  const endPointer = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    if (pointers.size < 2) {
      pinchStart = null;
    }
  };

  createEffect(() => {
    if (!scale.adjusting() || ctx.disabled()) {
      for (const id of pointers.keys()) {
        if (interactionLayer.hasPointerCapture(id)) interactionLayer.releasePointerCapture(id);
      }
      pointers.clear();
      pinchStart = null;
    }
  });

  return (
    <>
      <Show when={scale.adjusting()}>
        <div
          ref={interactionLayer}
          class="ehpeek-reader-scale-gesture"
          onClick={stopInteraction}
          onWheel={(event: WheelEvent) => {
            stopInteraction(event);
            const deltaPixels = event.deltaY * (
              event.deltaMode === WheelEvent.DOM_DELTA_LINE
                ? 16
                : event.deltaMode === WheelEvent.DOM_DELTA_PAGE
                  ? interactionLayer.clientHeight
                  : 1
            );
            scale.resize(clampScale(
              (scale.percent() ?? 100) / 100 * Math.exp(-deltaPixels * 0.0015),
            ));
          }}
          onPointerDown={(event: PointerEvent) => {
            stopInteraction(event);
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            interactionLayer.setPointerCapture(event.pointerId);
            if (pointers.size !== 2) {
              return;
            }
            const [first, second] = Array.from(pointers.values());
            if (!first || !second) {
              return;
            }
            pinchStart = {
              distance: Math.max(1, Math.hypot(second.x - first.x, second.y - first.y)),
              scale: (scale.percent() ?? 100) / 100,
            };
          }}
          onPointerMove={(event: PointerEvent) => {
            if (!pointers.has(event.pointerId)) {
              return;
            }
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
            if (!pinchStart || pointers.size < 2) {
              return;
            }
            const [first, second] = Array.from(pointers.values());
            if (!first || !second) {
              return;
            }
            const distance = Math.hypot(second.x - first.x, second.y - first.y);
            scale.resize(clampScale(pinchStart.scale * distance / pinchStart.distance));
          }}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
        />
        <div
          class="ehpeek-reader-scale-toolbar"
          role="toolbar"
          aria-label={texts.reader.adjustScrollViewport}
        >
          <div class="ehpeek-reader-scale-slider-row">
            <span class="ehpeek-reader-scale-label">
              <Show when={scaleMode() !== "custom"}>
                <span>{scaleMode() === "fit"
                  ? texts.reader.fit
                  : scaleMode() === "fill"
                    ? texts.reader.fill
                    : "1:1"}</span>
              </Show>
              <span>{percentLabel()}</span>
            </span>
            <input
              type="range"
              class="ehpeek-reader-scale-input"
              aria-label={texts.reader.resizeScrollViewport}
              min={MIN_SCALE_PERCENT}
              max={MAX_SCALE_PERCENT}
              step={1}
              value={sliderPercent()}
              onInput={(event) => scale.resize(event.currentTarget.valueAsNumber / 100)}
            />
          </div>
          <div class="ehpeek-reader-scale-presets">
            <Button onClick={() => scale.selectPreset("fit")}>
              {texts.reader.fit}
            </Button>
            <Button onClick={() => scale.selectPreset("fill")}>
              {texts.reader.fill}
            </Button>
            <Button onClick={() => scale.selectPreset("one-to-one")}>
              1:1
            </Button>
          </div>
          <div class="ehpeek-reader-scale-actions">
            <Button class="ehpeek-reader-scale-apply-all" onClick={() => scale.applyGlobally()}>
              {texts.reader.applyGlobally}
            </Button>
            <Button onClick={() => scale.apply()}>
              {texts.common.actions.apply}
            </Button>
            <Button onClick={() => scale.cancel()}>
              {texts.common.actions.close}
            </Button>
          </div>
        </div>
      </Show>
    </>
  );
}
