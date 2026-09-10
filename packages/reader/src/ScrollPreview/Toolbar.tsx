import { Show, type JSX } from "solid-js";
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
  class?: string;
  style?: JSX.CSSProperties;
}

export function PreviewToolbar(props: PreviewToolbarProps) {
  const ctx = useScrollPreviewContext();
  const texts = useReaderTexts();
  const crossCount = () => ctx.refs.viewport()?.crossCount() ?? 1;
  const crossCountLimits = () => ctx.refs.viewport()?.crossCountLimits() ?? { min: 1, max: 1 };
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
  const range = () => {
    const pages = ctx.refs.viewport()?.visiblePages();
    return pages
      ? `${pages.first}–${pages.last} / ${ctx.previewCache.source.totalPages}`
      : `— / ${ctx.previewCache.source.totalPages}`;
  };

  return (
    <div
      class={`ehpeek-preview-toolbar${props.class ? ` ${props.class}` : ""}`}
      style={props.style}
      data-left-handed={ctx.leftHanded()}
    >
      <span class="ehpeek-preview-range">
        <Show when={ctx.loading.loadingCount() > 0}><span class="ehpeek-preview-loading" /></Show>
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
          disabled={crossCount() >= crossCountLimits().max}
          onClick={() => ctx.settings[1]("crossCount", clamp(
            crossCount() + 1, crossCountLimits().min, crossCountLimits().max,
          ))}
        >
          <Icon name="zoom-out" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.zoomIn}
          title={texts.common.actions.zoomIn}
          disabled={crossCount() <= crossCountLimits().min}
          onClick={() => ctx.settings[1]("crossCount", clamp(
            crossCount() - 1, crossCountLimits().min, crossCountLimits().max,
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
          onClick={() => ctx.locateHighlightedPage()}
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
