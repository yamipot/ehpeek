import { Show } from "solid-js";
import { useReaderTexts } from "../kit/i18n";
import type { ReadDirection } from "../kit/interfaces";
import { IconButton } from "../kit/Widgets/Button";
import { Icon } from "../kit/Widgets/Icon";
import { useScrollPreview } from "./Context";

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
  zoomIn(): void;
  zoomOut(): void;
}

export function PreviewToolbar(props: PreviewToolbarProps) {
  const preview = useScrollPreview();
  const texts = useReaderTexts();
  const direction = () => preview.settings[0].direction;
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
    preview.settings[1]("direction", NEXT_DIRECTION[direction()]);
  };
  const range = () => props.visiblePages
    ? `${props.visiblePages.first}–${props.visiblePages.last} / ${preview.previewCache.source.totalPages}`
    : `— / ${preview.previewCache.source.totalPages}`;

  return (
    <div class="ehpeek-preview-toolbar" data-left-handed={preview.leftHanded()}>
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
          onClick={() => props.zoomOut()}
        >
          <Icon name="zoom-out" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.zoomIn}
          title={texts.common.actions.zoomIn}
          disabled={props.crossCount <= props.crossCountLimits.min}
          onClick={() => props.zoomIn()}
        >
          <Icon name="zoom-in" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.current}
          title={texts.common.actions.current}
          disabled={preview.progress.current() === null}
          onClick={() => props.locateHighlightedPage()}
        >
          <Icon name="locate" size="var(--ui-icon-size-md)" />
        </IconButton>
        <Show when={preview.resize}>
          <IconButton
            variant="subtle"
            size="md"
            aria-label={texts.gallery.openScrollPreview}
            title={texts.gallery.openScrollPreview}
            onClick={() => preview.resize?.()}
          >
            <Icon name="fullscreen" size="var(--ui-icon-size-md)" />
          </IconButton>
        </Show>
        <Show when={preview.close}>
          <IconButton
            variant="subtle"
            size="md"
            aria-label={texts.common.actions.close}
            title={texts.common.actions.close}
            onClick={() => preview.close?.()}
          >
            <Icon name="close" size="var(--ui-icon-size-md)" />
          </IconButton>
        </Show>
      </div>
    </div>
  );
}
