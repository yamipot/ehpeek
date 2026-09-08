import { Show } from "solid-js";
import texts from "../../i18n";
import {
  GALLERY_COLUMNS_RATIO_MAX,
  GALLERY_COLUMNS_RATIO_MIN,
} from "../../state";
import { clamp } from "../../utils";
import { Icon } from "./Icon";

const KEYBOARD_STEP = 0.05;
const HANDLE_ACTION_CLASS =
  "pointer-events-auto inline-flex ui-hit-square-xs items-center justify-center p-0 ui-rounded-sm border-0 bg-[var(--color-site-elevated)] ehp-color-site-accent shadow-[0_1px_4px_var(--color-shadow-control)] cursor-pointer disabled:(opacity-40 cursor-default) enabled:active:scale-96";

export function GalleryColumnsResizeHandle(props: {
  onClose: () => void;
  onCommit: (ratio: number) => void;
  onInput: (ratio: number) => void;
  onReset: () => void;
  ratio: number;
  resetDisabled: boolean;
  visible: boolean;
}) {
  let handle!: HTMLButtonElement;
  let root!: HTMLDivElement;
  let draggingPointerId: number | null = null;
  const normalizedRatio = (ratio: number) =>
    clamp(ratio, GALLERY_COLUMNS_RATIO_MIN, GALLERY_COLUMNS_RATIO_MAX);
  const ratioAt = (clientX: number): number => {
    const bounds = root.parentElement?.getBoundingClientRect();
    if (!bounds) {
      return props.ratio;
    }
    return normalizedRatio((clientX - bounds.left) / Math.max(1, bounds.width));
  };
  const inputAt = (clientX: number): number => {
    const ratio = ratioAt(clientX);
    props.onInput(ratio);
    return ratio;
  };
  const applyAndCommit = (ratio: number): void => {
    const normalized = normalizedRatio(ratio);
    props.onInput(normalized);
    props.onCommit(normalized);
  };
  const onPointerEnd = (event: PointerEvent): void => {
    if (draggingPointerId !== event.pointerId) {
      return;
    }
    const ratio = inputAt(event.clientX);
    draggingPointerId = null;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    props.onCommit(ratio);
  };
  const onPointerCancel = (event: PointerEvent): void => {
    if (draggingPointerId !== event.pointerId) {
      return;
    }
    draggingPointerId = null;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
    props.onCommit(props.ratio);
  };

  return <Show when={props.visible}>
    <div
      ref={root}
      class="pointer-events-none absolute inset-y-0 z-ui flex -translate-x-1/2 flex-col items-center justify-center ui-gap-xs"
      style={{ left: `${props.ratio * 100}%` }}
    >
      <button
        ref={handle}
        type="button"
        class="pointer-events-auto flex h-[calc(var(--ui-control-size-xs)*8)] max-h-[70%] w-16px flex-none touch-none select-none items-center justify-center p-0 border-0 !bg-transparent ehp-color-site-accent cursor-ew-resize"
        aria-label={texts.gallery.resizeColumns}
        aria-orientation="horizontal"
        aria-valuemax={Math.round(GALLERY_COLUMNS_RATIO_MAX * 100)}
        aria-valuemin={Math.round(GALLERY_COLUMNS_RATIO_MIN * 100)}
        aria-valuenow={Math.round(props.ratio * 100)}
        role="slider"
        title={texts.gallery.resizeColumns}
        onKeyDown={(event) => {
          let ratio: number | null = null;
          if (event.key === "ArrowLeft") {
            ratio = props.ratio - KEYBOARD_STEP;
          } else if (event.key === "ArrowRight") {
            ratio = props.ratio + KEYBOARD_STEP;
          } else if (event.key === "Home") {
            ratio = GALLERY_COLUMNS_RATIO_MIN;
          } else if (event.key === "End") {
            ratio = GALLERY_COLUMNS_RATIO_MAX;
          }
          if (ratio !== null) {
            event.preventDefault();
            event.stopPropagation();
            applyAndCommit(ratio);
          }
        }}
        onPointerCancel={onPointerCancel}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          draggingPointerId = event.pointerId;
          handle.setPointerCapture(event.pointerId);
          inputAt(event.clientX);
        }}
        onPointerMove={(event) => {
          if (draggingPointerId === event.pointerId) {
            inputAt(event.clientX);
          }
        }}
        onPointerUp={onPointerEnd}
      >
        <span class="flex h-full w-full items-center justify-between">
          <span class="block h-full w-2px rounded-full bg-current opacity-70 shadow-[0_1px_4px_var(--color-shadow-control)]" />
          <span class="block h-full w-2px rounded-full bg-current opacity-70 shadow-[0_1px_4px_var(--color-shadow-control)]" />
          <span class="block h-full w-2px rounded-full bg-current opacity-70 shadow-[0_1px_4px_var(--color-shadow-control)]" />
        </span>
      </button>
      <div class="flex flex-col items-center ui-gap-xs">
        <button
          type="button"
          class={HANDLE_ACTION_CLASS}
          aria-label={texts.gallery.resetColumns}
          disabled={props.resetDisabled}
          title={texts.gallery.resetColumns}
          onClick={() => props.onReset()}
        >
          <Icon name="refresh" size="var(--ui-icon-size-sm)" />
        </button>
        <button
          type="button"
          class={HANDLE_ACTION_CLASS}
          aria-label={texts.common.actions.close}
          title={texts.common.actions.close}
          onClick={() => props.onClose()}
        >
          <Icon name="close" size="var(--ui-icon-size-sm)" />
        </button>
      </div>
    </div>
  </Show>;
}
