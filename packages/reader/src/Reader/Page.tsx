import { Show } from "solid-js";
import { useReaderContext } from "./Context";
import { useReaderTexts } from "../kit/i18n";
import { Icon } from "../kit/Widgets/Icon";

export interface ReaderPageViewProps {
  /** Page number; outside the content range this is a blank or the end screen. */
  pageNum: number;
}

export function ReaderPageView(props: ReaderPageViewProps) {
  const ctx = useReaderContext();
  const texts = useReaderTexts();
  const resource = () => ctx.loading.page(props.pageNum);
  const kind = () => props.pageNum < 1 ? "blank"
    : ctx.source.totalPages && props.pageNum === ctx.source.totalPages + 1 ? "end"
    : ctx.source.totalPages && props.pageNum > ctx.source.totalPages ? "blank" : "page";
  const state = () => kind() === "page" ? resource()?.status ?? "idle" : "ready";
  const text = () => kind() === "end" ? texts.reader.end : kind() === "blank" ? "" : String(props.pageNum);
  const image = () => resource()?.element;
  const stop = (event: Event) => { event.preventDefault(); event.stopPropagation(); };
  return <>
    <Show when={image()} keyed fallback={
      <div class="ehpeek-reader-placeholder" data-state={state()} data-kind={kind()}
        role={state() === "loading" ? "status" : undefined}
        aria-label={state() === "loading" ? `${texts.common.status.loading} ${text()}` : undefined}>
        <Show when={state() === "error"} fallback={
          <Show when={state() === "loading"} fallback={text()}>
            <span class="ehpeek-reader-placeholder-loading" aria-hidden="true">
              <span class="ehpeek-reader-placeholder-number">{text()}</span>
              <span class="ehpeek-reader-placeholder-spinner" />
            </span>
          </Show>
        }>
          <button type="button" class="ehpeek-reader-page-reload"
            aria-label={`${texts.reader.reloadPage} ${props.pageNum}`} title={texts.reader.reloadPage}
            onPointerDown={stop} onClick={event => { stop(event); if (!ctx.disabled()) ctx.loading.retry(props.pageNum); }}>
            <Icon name="refresh" size="var(--ui-icon-size-xl)" />
          </button>
          <div class="ehpeek-reader-page-error">{texts.common.status.failed}</div>
          <Show when={resource()?.error}><div class="ehpeek-reader-page-error-detail">{resource()?.error}</div></Show>
        </Show>
      </div>
    }>{element => element}</Show>
    <Show when={state() === "loading" && image()}>
      <span class="ehpeek-reader-page-loading" role="status" aria-label={texts.common.status.loading} />
    </Show>
  </>;
}
