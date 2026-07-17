import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";
import type { ReadDirection, RightTapAction, ViewMode } from "../../state";
import texts from "../../texts.json";
import { stopEvent } from "../../utils";
import { Icon, type IconName } from "../Icon";
import { ProgressBar } from "../Misc";

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
  "inline-flex min-w-48px h-48px items-center justify-center px-md py-0 rounded-md coarse:(min-w-64px h-64px px-lg rounded-lg text-18px)",
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

export type ReaderDownloadDialog = {
  currentFileName: string;
  currentImageUrl: string;
  originalImageUrl: string | null;
  pageNum: number;
};

export type ToolbarCallbacks = {
  onCloseClick: () => void;
  onDownloadClick: () => void;
  onDownloadCurrentClick: () => void;
  onDownloadDialogClose: () => void;
  onDownloadOriginalClick: () => void;
  onFullscreenClick: () => void;
  onModeClick: () => void;
  onOpenOriginalPageClick: () => void;
  onOpenChange: (open: boolean) => void;
  onProgressCommit: (value: number) => void;
  onProgressInput: (value: number) => void;
  onProgressPointerDown: (event: PointerEvent) => void;
  onReadDirectionClick: () => void;
  onRightTapClick: () => void;
};

export type ToolbarState = {
  controls: ReaderControls;
  downloadAvailable: boolean;
  downloadDialog: ReaderDownloadDialog | null;
  fullscreenActive: boolean;
  fullscreenHint: boolean;
  open: boolean;
  progress: PageProgress;
};

export function initialToolbarState(): ToolbarState {
  return {
    controls: {
      mode: "scroll",
      readDirection: "rtl",
      rightTapAction: "previous",
    },
    downloadAvailable: false,
    downloadDialog: null,
    fullscreenActive: false,
    fullscreenHint: false,
    open: false,
    progress: {
      pageNum: 1,
      maxProgressPageNum: 1,
    },
  };
}

export function Toolbar(props: { callbacks: ToolbarCallbacks; state: ToolbarState }) {
  const controls = props.state.controls;
  const progress = props.state.progress;
  const downloadDialog = props.state.downloadDialog;
  const open = props.state.open;
  const modeButton = modeButtonInfo(controls.mode);
  const readDirectionButton = readDirectionButtonInfo(controls.readDirection);
  const rightTapButton = rightTapButtonInfo(controls.rightTapAction);
  const fullscreenTime = useFullscreenTime(props.state.fullscreenActive);

  return (
    <>
      <div
        className={
          "ehpeek-reader-toolbar fixed z-3 flex justify-end pointer-events-none " +
          "top-[calc(10px+env(safe-area-inset-top,0px))] right-10px " +
          "coarse:top-[calc(8px+env(safe-area-inset-top,0px))] coarse:right-8px"
        }
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <div className={`ehpeek-reader-toolbar-buttons flex flex-row gap-md coarse:gap-lg pointer-events-auto${open ? "" : " !hidden"}`}>
          <button
            type="button"
            className={READER_BUTTON_CLASS}
            title={rightTapButton.title}
            onClick={props.callbacks.onRightTapClick}
          >
            {rightTapButton.text}
          </button>
          <button
            type="button"
            className={READER_BUTTON_CLASS}
            title={readDirectionButton.title}
            onClick={props.callbacks.onReadDirectionClick}
          >
            <Icon name={readDirectionButton.icon} size={READER_ICON_SIZE} />
          </button>
          <button type="button" className={READER_BUTTON_CLASS} title={modeButton.title} onClick={props.callbacks.onModeClick}>
            <Icon name={modeButton.icon} size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            className={READER_BUTTON_CLASS}
            disabled={!props.state.downloadAvailable}
            title={texts.reader.download}
            onClick={props.callbacks.onDownloadClick}
          >
            <Icon name="download" size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            className={READER_BUTTON_CLASS}
            title={texts.reader.openOriginalPage}
            onClick={props.callbacks.onOpenOriginalPageClick}
          >
            <Icon name="external-link" size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            className={READER_BUTTON_CLASS}
            title={props.state.fullscreenActive ? texts.reader.exitFullscreen : texts.reader.enterFullscreen}
            onClick={props.callbacks.onFullscreenClick}
          >
            <Icon name={props.state.fullscreenActive ? "fullscreen-exit" : "fullscreen"} size={READER_ICON_SIZE} />
          </button>
          <button type="button" className={READER_BUTTON_CLASS} title={texts.reader.close} onClick={props.callbacks.onCloseClick}>
            <Icon name="close" size={READER_ICON_SIZE} />
          </button>
        </div>
      </div>
      <div
        className={
          "ehpeek-reader-page-number fixed z-3 pointer-events-none " +
          "top-[calc(70px+env(safe-area-inset-top,0px))] left-1/2 right-auto -translate-x-1/2 " +
          "coarse:top-[calc(80px+env(safe-area-inset-top,0px))] " +
          "landscape:top-[calc(62px+env(safe-area-inset-top,0px))] landscape:(left-auto right-10px translate-x-0) " +
          "coarse-landscape:top-[calc(74px+env(safe-area-inset-top,0px))] coarse-landscape:right-8px " +
          "min-w-64px landscape:min-w-0 max-w-none landscape:max-w-[calc(100vw-20px)] coarse-landscape:max-w-[calc(100vw-16px)] " +
          "py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text " +
          "font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap " +
          "text-center landscape:text-right"
        }
        hidden={controls.mode === "scroll" && !open && !props.state.fullscreenActive}
      >
        {pageNumberText(progress.pageNum, progress.totalPages)}
      </div>
      {props.state.fullscreenActive ? (
        <div
          className={
            "ehpeek-reader-fullscreen-status fixed z-3 flex items-center gap-sm pointer-events-none " +
            "top-[calc(10px+env(safe-area-inset-top,0px))] left-[max(10px,env(safe-area-inset-left,0px))] " +
            "py-xs px-md rounded-md bg-[var(--color-badge)] ehp-color-text " +
            "font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap"
          }
          role="status"
        >
          <span>{fullscreenTime}</span>
        </div>
      ) : null}
      <div
        className={
          "fixed z-2 flex items-center p-0 transition-[opacity,transform] duration-160 ease-in-out " +
          "right-[max(12px,env(safe-area-inset-right,0px))] bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-[max(12px,env(safe-area-inset-left,0px))] " +
          "[&[data-open=false]]:(opacity-0 translate-y-[calc(100%+16px)] pointer-events-none)"
        }
        data-open={String(open)}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <ProgressBar
          className="ehpeek-reader-progress text-xl coarse:text-3xl"
          direction={controls.readDirection === "rtl" ? "rtl" : "ltr"}
          fillPercent={progressFillPercent(progress)}
          keepInputValue={progress.keepInputValue}
          max={Math.max(1, progress.maxProgressPageNum)}
          min={1}
          step={1}
          value={progress.pageNum}
          onPointerDown={props.callbacks.onProgressPointerDown}
          onInput={props.callbacks.onProgressInput}
          onCommit={props.callbacks.onProgressCommit}
        />
      </div>
      {props.state.fullscreenHint ? (
        <div
          className={
            "fixed z-3 left-1/2 -translate-x-1/2 w-[min(88vw,520px)] " +
            "bottom-[calc(76px+env(safe-area-inset-bottom,0px))] coarse:bottom-[calc(96px+env(safe-area-inset-bottom,0px))] " +
            "px-lg py-md rounded-md bg-[var(--color-badge)] ehp-color-text shadow-lg pointer-events-none " +
            "font-sans textsize-md font-600 leading-[1.4] text-center"
          }
          role="status"
          aria-live="polite"
        >
          {texts.reader.fullscreenHint}
        </div>
      ) : null}
      {downloadDialog ? (
        <div
          className="fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65 pointer-events-auto"
          role="dialog"
          aria-modal="true"
          aria-label={texts.reader.download}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            if (event.target === event.currentTarget) {
              props.callbacks.onDownloadDialogClose();
            }
          }}
          onPointerDown={stopEvent}
          onWheel={stopEvent}
        >
          <div className="ehpeek-reader-download-dialog-panel w-full max-w-420px p-lg rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)] shadow-xl">
            <div className="flex items-center justify-between gap-md mb-lg">
              <div className="font-sans textsize-lg font-700">{`${texts.reader.download} · ${downloadDialog.pageNum}`}</div>
              <button
                type="button"
                className={READER_BUTTON_CLASS}
                title={texts.reader.close}
                aria-label={texts.reader.close}
                onClick={props.callbacks.onDownloadDialogClose}
              >
                <Icon name="close" size={READER_ICON_SIZE} />
              </button>
            </div>
            <div className="grid gap-md font-sans textsize-md">
              <button type="button" className={DOWNLOAD_OPTION_CLASS} onClick={props.callbacks.onDownloadCurrentClick}>
                <span className="font-700">{texts.reader.downloadDisplayedImage}</span>
                <span className="max-w-full overflow-hidden text-ellipsis whitespace-nowrap textsize-sm opacity-75">
                  {downloadDialog.currentFileName}
                </span>
              </button>
              <button
                type="button"
                className={DOWNLOAD_OPTION_CLASS}
                disabled={!downloadDialog.originalImageUrl}
                onClick={props.callbacks.onDownloadOriginalClick}
              >
                <span className="font-700">{texts.reader.downloadOriginalImage}</span>
                <span className="textsize-sm opacity-75">
                  {downloadDialog.originalImageUrl ? texts.reader.originalImageSource : texts.reader.originalImageUnavailable}
                </span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function useFullscreenTime(enabled: boolean): string {
  const [time, setTime] = useState(() => TIME_FORMATTER.format(new Date()));

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const updateTime = () => setTime(TIME_FORMATTER.format(new Date()));
    updateTime();
    let interval: number | null = null;
    const timeout = window.setTimeout(() => {
      updateTime();
      interval = window.setInterval(updateTime, 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      window.clearTimeout(timeout);
      if (interval !== null) {
        window.clearInterval(interval);
      }
    };
  }, [enabled]);

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

function modeButtonInfo(mode: ViewMode): { icon: IconName; title: string } {
  const paged = mode === "paged";
  return {
    icon: paged ? "arrows-horizontal" : "arrows-vertical",
    title: paged ? texts.reader.scrollMode : texts.reader.pagedMode,
  };
}

function readDirectionButtonInfo(direction: ReadDirection): { icon: IconName; title: string } {
  const rtl = direction === "rtl";
  return {
    icon: rtl ? "arrow-left" : "arrow-right",
    title: rtl ? texts.reader.readLeftToRight : texts.reader.readRightToLeft,
  };
}

function rightTapButtonInfo(action: RightTapAction): { text: string; title: string } {
  const previous = action === "previous";
  return {
    text: previous ? "R-" : "R+",
    title: previous ? texts.reader.rightTapNext : texts.reader.rightTapPrevious,
  };
}
