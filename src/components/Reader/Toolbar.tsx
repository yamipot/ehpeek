import { createEffect, createSignal, onCleanup, Show } from "solid-js";
import type { ReadDirection, RightTapAction, ViewMode } from "../../state";
import texts from "../../texts.json";
import { stopEvent } from "../../utils";
import { Icon } from "../Widgets/Icon";
import { ProgressBar } from "../Widgets/ProgressBar";
import { InteractionHelp } from "../InteractionHelp";

export type ReaderControls = {
  mode: ViewMode;
  readDirection: ReadDirection;
  rightTapAction: RightTapAction;
};

export type PageProgress = {
  pageNum: number;
  totalPages?: number;
  maxProgressPageNum: number;
  keepInputValue?: boolean;
};

const READER_BUTTON_CLASS = [
  "inline-flex min-w-48px h-48px items-center justify-center px-md py-0 rounded-md coarse:(min-w-64px h-64px px-lg rounded-lg)",
  "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer font-sans textsize-md font-700 leading-1 disabled:(opacity-40 cursor-default)",
].join(" ");
const READER_ICON_SIZE = "1.4em";
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const DOWNLOAD_OPTION_CLASS = [
  "flex w-full min-h-lg flex-col items-start justify-center gap-xs px-lg py-md rounded-md",
  "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer text-left",
  "hover:bg-[var(--color-badge)] disabled:(opacity-40 cursor-default)",
].join(" ");

export type ReaderDownloadInfo = {
  currentFileName: string;
  currentImageUrl: string;
  originalImageUrl: string | null;
  pageNum: number;
};

export type ToolbarCallbacks = {
  onCloseClick: () => void;
  onControlsChange: (controls: ReaderControls) => void;
  onFullscreenClick: () => void;
  onOpenOriginalPageClick: () => void;
  onProgressCommit: (value: number) => void;
  onProgressInput: (value: number) => void;
  onProgressPointerDown: (event: PointerEvent) => void;
};

export function Toolbar(props: {
  callbacks: ToolbarCallbacks;
  controls: ReaderControls;
  downloadInfo: ReaderDownloadInfo | null;
  fullscreenActive: boolean;
  open: boolean;
  progress: PageProgress;
}) {
  const [dialogDownloadInfo, setDialogDownloadInfo] = createSignal<ReaderDownloadInfo | null>(null);
  const [helpOpen, setHelpOpen] = createSignal(false);
  const [moreOpen, setMoreOpen] = createSignal(false);
  const [controlChange, setControlChange] = createSignal<string | null>(null);
  let controlChangeTimer: number | null = null;
  const fullscreenTime = createFullscreenTime(() => props.fullscreenActive);
  const showControlChange = (message: string) => {
    if (controlChangeTimer !== null) {
      window.clearTimeout(controlChangeTimer);
    }
    setControlChange(message);
    controlChangeTimer = window.setTimeout(() => {
      setControlChange(null);
      controlChangeTimer = null;
    }, 1_200);
  };

  onCleanup(() => {
    if (controlChangeTimer !== null) {
      window.clearTimeout(controlChangeTimer);
    }
  });

  createEffect(() => {
    if (!props.open) {
      setMoreOpen(false);
    }
  });

  createEffect(() => {
    if (dialogDownloadInfo()?.pageNum !== props.progress.pageNum) {
      setDialogDownloadInfo(null);
    }
  });

  createEffect(() => {
    if (!dialogDownloadInfo()) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setDialogDownloadInfo(null);
    };
    window.addEventListener("keydown", closeOnEscape, true);
    onCleanup(() => window.removeEventListener("keydown", closeOnEscape, true));
  });

  return (
    <div class="contents">
      <div
        class={
          "ehpeek-reader-toolbar fixed z-3 flex justify-end pointer-events-none " +
          "top-[calc(10px+env(safe-area-inset-top,0px))] right-10px " +
          "coarse:top-[calc(8px+env(safe-area-inset-top,0px))] coarse:right-8px"
        }
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <div class={`ehpeek-reader-toolbar-buttons flex flex-col items-end gap-md coarse:gap-lg pointer-events-auto${props.open ? "" : " !hidden"}`}>
          <div class="flex flex-row gap-md coarse:gap-lg">
          <button
            type="button"
            class={READER_BUTTON_CLASS}
            onClick={() => {
              const mode = props.controls.mode === "paged" ? "scroll" : "paged";
              props.callbacks.onControlsChange({ ...props.controls, mode });
              showControlChange(mode === "paged" ? texts.reader.pagedMode : texts.reader.scrollMode);
            }}
          >
            <Icon name={props.controls.mode === "paged" ? "arrows-horizontal" : "arrows-vertical"} size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            class={READER_BUTTON_CLASS}
            disabled={!props.downloadInfo}
            onClick={() => setDialogDownloadInfo(props.downloadInfo)}
          >
            <Icon name="download" size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            class={READER_BUTTON_CLASS}
            onClick={() => props.callbacks.onOpenOriginalPageClick()}
          >
            <Icon name="external-link" size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            class={READER_BUTTON_CLASS}
            onClick={() => props.callbacks.onFullscreenClick()}
          >
            <Icon name={props.fullscreenActive ? "fullscreen-exit" : "fullscreen"} size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            class={READER_BUTTON_CLASS}
            aria-label={texts.reader.more}
            title={texts.reader.more}
            aria-expanded={moreOpen()}
            onClick={() => setMoreOpen((open) => !open)}
          >
            {moreOpen() ? "▴" : "▾"}
          </button>
          <button type="button" class={READER_BUTTON_CLASS} onClick={() => props.callbacks.onCloseClick()}>
            <Icon name="close" size={READER_ICON_SIZE} />
          </button>
          </div>
          <Show when={moreOpen()}>
            <div class="flex flex-row gap-md coarse:gap-lg">
              <button
                type="button"
                class={READER_BUTTON_CLASS}
                onClick={() => {
                  const rightTapAction = props.controls.rightTapAction === "previous" ? "next" : "previous";
                  props.callbacks.onControlsChange({ ...props.controls, rightTapAction });
                  showControlChange(rightTapAction === "previous" ? texts.reader.rightTapPrevious : texts.reader.rightTapNext);
                }}
              >
                {props.controls.rightTapAction === "previous" ? "R-" : "R+"}
              </button>
              <button
                type="button"
                class={READER_BUTTON_CLASS}
                onClick={() => {
                  const readDirection = props.controls.readDirection === "rtl" ? "ltr" : "rtl";
                  props.callbacks.onControlsChange({ ...props.controls, readDirection });
                  showControlChange(readDirection === "rtl" ? texts.reader.directionRtl : texts.reader.directionLtr);
                }}
              >
                <Icon name={props.controls.readDirection === "rtl" ? "arrow-left" : "arrow-right"} size={READER_ICON_SIZE} />
              </button>
              <button
                type="button"
                class={READER_BUTTON_CLASS}
                aria-label={texts.help.title}
                title={texts.help.title}
                onClick={() => setHelpOpen(true)}
              >
                ?
              </button>
            </div>
          </Show>
        </div>
      </div>
      <div
        class={
          "ehpeek-reader-page-number fixed z-3 pointer-events-none " +
          (moreOpen()
            ? "top-[calc(130px+env(safe-area-inset-top,0px))] coarse:top-[calc(160px+env(safe-area-inset-top,0px))] landscape:top-[calc(122px+env(safe-area-inset-top,0px))] coarse-landscape:top-[calc(150px+env(safe-area-inset-top,0px))] "
            : "top-[calc(70px+env(safe-area-inset-top,0px))] coarse:top-[calc(80px+env(safe-area-inset-top,0px))] landscape:top-[calc(62px+env(safe-area-inset-top,0px))] coarse-landscape:top-[calc(74px+env(safe-area-inset-top,0px))] ") +
          "left-1/2 right-auto -translate-x-1/2 landscape:(left-auto right-10px translate-x-0) coarse-landscape:right-8px " +
          "min-w-64px landscape:min-w-0 max-w-none landscape:max-w-[calc(100vw-20px)] coarse-landscape:max-w-[calc(100vw-16px)] " +
          "py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text " +
          "font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap " +
          "text-center landscape:text-right"
        }
        hidden={props.controls.mode === "scroll" && !props.open && !props.fullscreenActive}
      >
        {pageNumberText(props.progress.pageNum, props.progress.totalPages)}
      </div>
      <Show when={props.fullscreenActive}>
        <div
          class={
            "ehpeek-reader-fullscreen-status fixed z-3 flex items-center gap-sm pointer-events-none " +
            "top-[calc(10px+env(safe-area-inset-top,0px))] left-[max(10px,env(safe-area-inset-left,0px))] " +
            "py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text " +
            "font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap"
          }
          role="status"
        >
          <span>{fullscreenTime()}</span>
        </div>
      </Show>
      <Show when={controlChange()} keyed>
        {(message) => (
          <div class="fixed z-overlay top-1/2 left-1/2 max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 pointer-events-none rounded-lg bg-[var(--color-badge)] ehp-color-text px-xl py-lg font-sans textsize-lg font-700 leading-[1.3] whitespace-pre-line text-center shadow-xl">
            {message}
          </div>
        )}
      </Show>
      <div
        class={
          "fixed z-2 flex items-center p-0 transition-[opacity,transform] duration-160 ease-in-out " +
          "right-[max(12px,env(safe-area-inset-right,0px))] bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-[max(12px,env(safe-area-inset-left,0px))] " +
          "[&[data-open=false]]:(opacity-0 translate-y-[calc(100%+16px)] pointer-events-none)"
        }
        data-open={String(props.open)}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <ProgressBar
          class="ehpeek-reader-progress textsize-lg"
          direction={props.controls.readDirection === "rtl" ? "rtl" : "ltr"}
          fillPercent={progressFillPercent(props.progress)}
          keepInputValue={props.progress.keepInputValue}
          max={Math.max(1, props.progress.maxProgressPageNum)}
          min={1}
          step={1}
          value={props.progress.pageNum}
          onPointerDown={props.callbacks.onProgressPointerDown}
          onInput={props.callbacks.onProgressInput}
          onCommit={props.callbacks.onProgressCommit}
        />
      </div>
      <Show when={dialogDownloadInfo()} keyed>
        {(downloadInfo) => (
        <div
          class="fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label={texts.reader.download}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) {
              setDialogDownloadInfo(null);
            }
          }}
          onPointerDown={stopEvent}
          onWheel={stopEvent}
        >
          <div class="ehpeek-reader-download-dialog-panel w-full max-w-480px p-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] shadow-xl">
            <div class="flex items-center justify-between gap-md mb-lg">
              <div class="font-sans textsize-md font-700">{`${texts.reader.download} · ${downloadInfo.pageNum}`}</div>
              <button
                type="button"
                class={READER_BUTTON_CLASS}
                title={texts.button.close}
                aria-label={texts.button.close}
                onClick={() => setDialogDownloadInfo(null)}
              >
                <Icon name="close" size={READER_ICON_SIZE} />
              </button>
            </div>
            <div class="grid gap-md font-sans textsize-md">
              <button
                type="button"
                class={DOWNLOAD_OPTION_CLASS}
                onClick={() => {
                  if (startImageDownload(downloadInfo.currentImageUrl, downloadInfo.currentFileName)) {
                    setDialogDownloadInfo(null);
                  }
                }}
              >
                <span class="textsize-md font-700">{texts.reader.downloadDisplayedImage}</span>
                <span class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap textsize-sm opacity-75">
                  {downloadInfo.currentFileName}
                </span>
              </button>
              <button
                type="button"
                class={DOWNLOAD_OPTION_CLASS}
                disabled={!downloadInfo.originalImageUrl}
                onClick={() => {
                  if (downloadInfo.originalImageUrl && startImageDownload(downloadInfo.originalImageUrl)) {
                    setDialogDownloadInfo(null);
                  }
                }}
              >
                <span class="textsize-md font-700">{texts.reader.downloadOriginalImage}</span>
                <span class="textsize-sm opacity-75">
                  {downloadInfo.originalImageUrl ? texts.reader.originalImageSource : texts.reader.originalImageUnavailable}
                </span>
              </button>
            </div>
          </div>
        </div>
        )}
      </Show>
      <Show when={helpOpen()}>
        <InteractionHelp variant="reader" onClose={() => setHelpOpen(false)} />
      </Show>
    </div>
  );
}

function startImageDownload(url: string, name?: string): boolean {
  try {
    GM_download({
      url,
      ...(name ? { name } : {}),
      onerror: (error) => {
        console.error("[ehpeek]", error);
        window.alert(texts.errors.downloadFailed);
      },
    });
    return true;
  } catch (error) {
    console.error("[ehpeek]", error);
    window.alert(texts.errors.downloadFailed);
    return false;
  }
}

function createFullscreenTime(enabled: () => boolean): () => string {
  const [time, setTime] = createSignal(TIME_FORMATTER.format(new Date()));

  createEffect(() => {
    if (!enabled()) {
      return;
    }

    const updateTime = () => setTime(TIME_FORMATTER.format(new Date()));
    updateTime();
    let interval: number | null = null;
    const timeout = window.setTimeout(() => {
      updateTime();
      interval = window.setInterval(updateTime, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    onCleanup(() => {
      window.clearTimeout(timeout);
      if (interval !== null) {
        window.clearInterval(interval);
      }
    });
  });

  return time;
}

function progressFillPercent(progress: PageProgress): number {
  const min = 1;
  const max = Math.max(1, progress.maxProgressPageNum);
  const value = Math.min(max, Math.max(min, progress.pageNum));
  return max > min ? ((value - min) / (max - min)) * 100 : 100;
}

function pageNumberText(pageNum: number, totalPages: number | undefined): string {
  if (totalPages && pageNum === totalPages + 1) {
    return texts.reader.endPage;
  }

  return totalPages ? `${pageNum} / ${totalPages}` : String(pageNum);
}
