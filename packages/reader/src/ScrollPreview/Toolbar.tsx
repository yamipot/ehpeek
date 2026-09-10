import { Show } from "solid-js";
import { clamp } from "../kit/helpers";
import { useReaderTexts } from "../kit/i18n";
import type { ReadDirection } from "../kit/interfaces";
import { IconButton } from "../kit/Widgets/Button";
import { Icon } from "../kit/Widgets/Icon";
import { useScrollPreviewContext } from "./Context";

const NEXT_DIRECTION: Record<ReadDirection, ReadDirection> = {
  ltr: "rtl",
  rtl: "ttb",
  ttb: "ltr",
};

export interface PreviewToolbarProps {
  /** Actual fitted row/column count, which may differ from the requested count. */
  crossCount: number;
  /** Allowed row/column counts for the current viewport. */
  crossCountLimits: { min: number; max: number };
  /** Inclusive page range currently visible; null before initial layout. */
  visiblePages: { first: number; last: number } | null;
  /** Derived from metadata requests relevant to this viewport. */
  loading: boolean;
  /** Reveal the current reading-progress page without changing it. */
  locateHighlightedPage(): void;
}

export function PreviewToolbar(props: PreviewToolbarProps) {
  const ctx = useScrollPreviewContext();
  const texts = useReaderTexts();
  const direction = () => ctx.settings[0].direction;
  const directionIcon = () => direction() === "ttb"
    ? "arrow-down" as const
    : direction() === "rtl"
      ? "arrow-left" as const
      : "arrow-right" as const;
  const directionLabel = () => direction() === "ttb"
    ? texts.gallery.scrollPreviewDirectionTtb
    : direction() === "rtl"
      ? texts.gallery.scrollPreviewDirectionRtl
      : texts.gallery.scrollPreviewDirectionLtr;
  const changeDirection = (): void => {
    if (!window.confirm(texts.gallery.confirmScrollPreviewDirection)) return;
    ctx.settings[1]("direction", NEXT_DIRECTION[direction()]);
  };
  const range = () => props.visiblePages
    ? `${props.visiblePages.first}–${props.visiblePages.last} / ${ctx.previewCache.source.totalPages}`
    : `— / ${ctx.previewCache.source.totalPages}`;

  return (
    <div class="ehpeek-preview-toolbar" data-left-handed={ctx.leftHanded()}>
      <span class="ehpeek-preview-range">
        <Show when={props.loading}><span class="ehpeek-preview-loading" /></Show>
        {range()}
      </span>
      <div class="ehpeek-preview-toolbar-actions">
        <IconButton
          variant="subtle"
          size="md"
          aria-label={directionLabel()}
          title={directionLabel()}
          onClick={changeDirection}
        >
          <Icon name={directionIcon()} size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.zoomOut}
          title={texts.common.actions.zoomOut}
          disabled={props.crossCount >= props.crossCountLimits.max}
          onClick={() => ctx.settings[1]("crossCount", clamp(
            props.crossCount + 1, props.crossCountLimits.min, props.crossCountLimits.max,
          ))}
        >
          <Icon name="zoom-out" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.zoomIn}
          title={texts.common.actions.zoomIn}
          disabled={props.crossCount <= props.crossCountLimits.min}
          onClick={() => ctx.settings[1]("crossCount", clamp(
            props.crossCount - 1, props.crossCountLimits.min, props.crossCountLimits.max,
          ))}
        >
          <Icon name="zoom-in" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.current}
          title={texts.common.actions.current}
          disabled={ctx.progress.current() === null}
          onClick={() => props.locateHighlightedPage()}
        >
          <Icon name="locate" size="var(--ui-icon-size-md)" />
        </IconButton>
        <Show when={ctx.resize}>
          <IconButton
            variant="subtle"
            size="md"
            aria-label={texts.gallery.openScrollPreview}
            title={texts.gallery.openScrollPreview}
            onClick={() => ctx.resize?.()}
          >
            <Icon name="fullscreen" size="var(--ui-icon-size-md)" />
          </IconButton>
        </Show>
        <Show when={ctx.close}>
          <IconButton
            variant="subtle"
            size="md"
            aria-label={texts.common.actions.close}
            title={texts.common.actions.close}
            onClick={() => ctx.close?.()}
          >
            <Icon name="close" size="var(--ui-icon-size-md)" />
          </IconButton>
        </Show>
      </div>
    </div>
  );
}
