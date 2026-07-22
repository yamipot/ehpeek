import { createEffect, Show, type JSX } from "solid-js";
import texts from "../../texts.json";
import { READER_BUTTON_CLASS } from "./Toolbar";

const MIN_SCALE_PERCENT = 10;
const MAX_SCALE_PERCENT = 500;

export type ViewportCanvasCallbacks = {
  onApply: () => void;
  onApplyAll: () => void;
  onClose: () => void;
  onFit: () => void;
  onOneToOne: () => void;
  onScaleChange: (scale: number) => void;
};

export function ViewportCanvas(props: {
  adjusting: boolean;
  callbacks: ViewportCanvasCallbacks;
  children: JSX.Element;
  scaleMode: "custom" | "fit" | "one-to-one";
  scalePercent: number | null;
}) {
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
    if (!props.adjusting) {
      pointers.clear();
      pinchStart = null;
    }
  });

  return (
    <div class="fixed inset-0 z-1">
      {props.children}
      <Show when={props.adjusting}>
        <div
          ref={interactionLayer}
          class="absolute inset-0 z-2 touch-none select-none"
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
          class="fixed bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-1/2 z-3 flex w-[min(680px,calc(100vw-24px))] -translate-x-1/2 flex-col items-center gap-sm rounded-lg border border-[var(--color-reader-border)] bg-[var(--color-control)] p-sm shadow-xl landscape:w-[min(600px,calc(100vw-24px))]"
          role="toolbar"
          aria-label={texts.reader.adjustScrollViewport}
        >
          <div class="grid w-full grid-cols-[48px_minmax(64px,1fr)_64px_64px] items-center justify-center gap-sm coarse:grid-cols-[48px_minmax(40px,1fr)_80px_80px]">
            <span class="flex w-full flex-col items-center justify-center text-center font-mono textsize-sm font-600 leading-[1.05]">
              <Show when={props.scaleMode !== "custom"}>
                <span>{props.scaleMode === "fit" ? texts.reader.fit : "1:1"}</span>
              </Show>
              <span>{props.scalePercent === null ? "—" : `${Math.round(props.scalePercent)}%`}</span>
            </span>
            <input
              type="range"
              class="w-full min-w-0 accent-[var(--color-reader-accent)]"
              aria-label={texts.reader.resizeScrollViewport}
              min={MIN_SCALE_PERCENT}
              max={MAX_SCALE_PERCENT}
              step={1}
              value={sliderPercent()}
              onInput={(event) => props.callbacks.onScaleChange(event.currentTarget.valueAsNumber / 100)}
            />
            <button type="button" class={`${READER_BUTTON_CLASS} w-full`} onClick={() => props.callbacks.onFit()}>
              {texts.reader.fit}
            </button>
            <button type="button" class={`${READER_BUTTON_CLASS} w-full`} onClick={() => props.callbacks.onOneToOne()}>
              1:1
            </button>
          </div>
          <div class="grid w-fit max-w-full grid-cols-[auto_96px_96px] items-stretch justify-center gap-sm coarse:w-full coarse:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <button type="button" class={`${READER_BUTTON_CLASS} w-full whitespace-normal leading-[1.1]`} onClick={() => props.callbacks.onApplyAll()}>
              {texts.reader.applyGlobally}
            </button>
            <button type="button" class={`${READER_BUTTON_CLASS} w-full`} onClick={() => props.callbacks.onApply()}>
              {texts.button.apply}
            </button>
            <button type="button" class={`${READER_BUTTON_CLASS} w-full`} onClick={() => props.callbacks.onClose()}>
              {texts.button.close}
            </button>
          </div>
        </div>
      </Show>
    </div>
  );
}
