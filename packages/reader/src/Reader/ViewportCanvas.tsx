import type { ReaderSession } from "./session";
import type { ReaderSettingsState, ReadDirection } from "../kit/interfaces";
import { normalizeReaderScrollSizeScale } from "../features/ReaderSettings";
import { clamp } from "../kit/helpers";
import { createEffect, Show, type JSX } from "solid-js";
import { useReaderTexts } from "../kit/i18n";
import { Button } from "../kit/Widgets/Button";

const MIN_SCALE_PERCENT = 10;
const MAX_SCALE_PERCENT = 500;

export type ViewportCanvasCallbacks = {
  onApply: () => void;
  onApplyAll: () => void;
  onClose: () => void;
  onFill: () => void;
  onFit: () => void;
  onOneToOne: () => void;
  onScaleChange: (scale: number) => void;
};

export function ViewportCanvas(props: {
  disabled?: boolean;
  adjusting: boolean;
  callbacks: ViewportCanvasCallbacks;
  children: JSX.Element;
  scaleMode: "custom" | "fill" | "fit" | "one-to-one";
  scalePercent: number | null;
}) {
  const texts = useReaderTexts();
  const pointers = new Map<number, { x: number; y: number }>();
  let pinchStart: { distance: number; scale: number } | null = null;
  let interactionLayer!: HTMLDivElement;
  const sliderPercent = () => Math.min(
    MAX_SCALE_PERCENT,
    Math.max(MIN_SCALE_PERCENT, props.scalePercent ?? 100),
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
    if (!props.adjusting || props.disabled) {
      for (const id of pointers.keys()) {
        if (interactionLayer.hasPointerCapture(id)) interactionLayer.releasePointerCapture(id);
      }
      pointers.clear();
      pinchStart = null;
    }
  });

  return (
    <div class="ehpeek-reader-canvas">
      {props.children}
      <Show when={props.adjusting}>
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
            props.callbacks.onScaleChange(clampScale(
              (props.scalePercent ?? 100) / 100 * Math.exp(-deltaPixels * 0.0015),
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
              scale: (props.scalePercent ?? 100) / 100,
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
            props.callbacks.onScaleChange(clampScale(pinchStart.scale * distance / pinchStart.distance));
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
              <Show when={props.scaleMode !== "custom"}>
                <span>{props.scaleMode === "fit"
                  ? texts.reader.fit
                  : props.scaleMode === "fill"
                    ? texts.reader.fill
                    : "1:1"}</span>
              </Show>
              <span>{props.scalePercent === null ? "—" : `${Math.round(props.scalePercent)}%`}</span>
            </span>
            <input
              type="range"
              class="ehpeek-reader-scale-input"
              aria-label={texts.reader.resizeScrollViewport}
              min={MIN_SCALE_PERCENT}
              max={MAX_SCALE_PERCENT}
              step={1}
              value={sliderPercent()}
              onInput={(event) => props.callbacks.onScaleChange(event.currentTarget.valueAsNumber / 100)}
            />
          </div>
          <div class="ehpeek-reader-scale-presets">
            <Button onClick={() => props.callbacks.onFit()}>
              {texts.reader.fit}
            </Button>
            <Button onClick={() => props.callbacks.onFill()}>
              {texts.reader.fill}
            </Button>
            <Button onClick={() => props.callbacks.onOneToOne()}>
              1:1
            </Button>
          </div>
          <div class="ehpeek-reader-scale-actions">
            <Button class="ehpeek-reader-scale-apply-all" onClick={() => props.callbacks.onApplyAll()}>
              {texts.reader.applyGlobally}
            </Button>
            <Button onClick={() => props.callbacks.onApply()}>
              {texts.common.actions.apply}
            </Button>
            <Button onClick={() => props.callbacks.onClose()}>
              {texts.common.actions.close}
            </Button>
          </div>
        </div>
      </Show>
    </div>
  );
}

// The temporary adjustment snapshot and pinch scale belong to the same scale transaction.
// Reader gestures and this canvas use it without maintaining separate adjustment state.
export class ScrollScaleAdjustment {
  private adjustmentStartSizeScale;
  private pinchStartScale: number | null = null;

  constructor(
    private readonly scale: ReaderSession["state"]["scrollViewport"],
    private readonly direction: () => ReadDirection,
    private readonly settings: ReaderSettingsState,
  ) {
    this.adjustmentStartSizeScale = scale.sizeScale();
  }

  private readonly updateImageScale = (scale: number | null): void => {
    if (scale === null) {
      this.scale.setSizeScale(null);
      return;
    }
    const fitScale = this.scale.fitScale();
    if (fitScale) {
      // UI percentages are absolute image scale; the viewport stores a fit-relative factor.
      this.scale.setSizeScale(normalizeReaderScrollSizeScale(scale / fitScale));
    }
  };

  startPinch(): boolean {
    const scalePercent = this.scale.scalePercent();
    if (scalePercent === null) return false;
    this.pinchStartScale = scalePercent / 100;
    return true;
  }

  movePinch(scale: number): void {
    if (this.pinchStartScale !== null) {
      this.updateImageScale(clamp(this.pinchStartScale * scale, 0.1, 5));
    }
  }

  endPinch(): void { this.pinchStartScale = null; }
  pinching(): boolean { return this.pinchStartScale !== null; }

  readonly open = (): void => {
    this.adjustmentStartSizeScale = this.scale.sizeScale();
    this.scale.setAdjusting(true);
  };

  readonly callbacks: ViewportCanvasCallbacks = {
    onApply: () => this.scale.setAdjusting(false),
    onApplyAll: () => {
      this.settings.set(
        this.direction() === "ttb" ? "scrollTtbScale" : "scrollHorizontalScale",
        this.scale.sizeScale(),
      );
      this.scale.setAdjusting(false);
    },
    onClose: () => {
      this.scale.setSizeScale(this.adjustmentStartSizeScale);
      this.scale.setAdjusting(false);
    },
    onFill: () => this.scale.setSizeScale("fill"),
    onFit: () => this.updateImageScale(null),
    onOneToOne: () => this.scale.setSizeScale("one-to-one"),
    onScaleChange: this.updateImageScale,
  };
}
