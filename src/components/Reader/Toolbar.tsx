import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import {
  state,
  type NavigationMode,
  type PageLayout,
  type ReadDirection,
  type RightTapAction,
} from "../../state";
import texts from "../../texts.json";
import { stopEvent } from "../../utils";
import { Dialog } from "../Widgets/Dialog";
import { Icon } from "../Widgets/Icon";
import { ProgressBar } from "../Widgets/ProgressBar";
import { InteractionHelp } from "../InteractionHelp";

export type ReaderControls = {
  navigationMode: NavigationMode;
  direction: ReadDirection;
  firstPageSeparate: boolean;
  pageLayout: PageLayout;
  rightTapAction: RightTapAction;
};

export type PageProgress = {
  pageNum: number;
  totalPages?: number;
  maxProgressPageNum: number;
  keepInputValue?: boolean;
};

export const READER_BUTTON_CLASS = [
  "inline-flex ui-hit-min-w-md ui-hit-h-md items-center justify-center ui-px-md py-0 ui-rounded-md",
  "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer font-sans textsize-md font-700 leading-1 disabled:(opacity-40 cursor-default)",
].join(" ");
const READER_TOOLBAR_BUTTON_CLASS =
  `${READER_BUTTON_CLASS} !w-[var(--ui-control-size-lg)] !min-w-0 !ui-px-sm flex-none`;
export const READER_FLOATING_ACTION_CLASS = [
  READER_BUTTON_CLASS,
  "!min-w-[var(--ui-control-size-lg)] !h-[var(--ui-control-size-lg)] opacity-85 hover:opacity-100 focus-visible:opacity-100 transition-opacity duration-160",
].join(" ");
const READER_FLOATING_ICON_ACTION_CLASS = `${READER_FLOATING_ACTION_CLASS} !w-[calc(var(--ui-control-size-lg)*2)] px-0`;
const READER_ICON_SIZE = "var(--ui-icon-size-md)";
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

const DOWNLOAD_OPTION_CLASS = [
  "flex w-full ui-hit-min-h-lg flex-col items-start justify-center ui-gap-xs ui-px-lg ui-py-md ui-rounded-md",
  "border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer text-left",
  "hover:bg-[var(--color-badge)] disabled:(opacity-40 cursor-default)",
].join(" ");

export type ReaderDownloadInfo = {
  currentFileName: string;
  currentImageUrl: string;
  imageHeight: number | null;
  imageWidth: number | null;
  originalFileName: string;
  originalImageUrl: string | null;
  pageNum: number;
};

export type ToolbarCallbacks = {
  onCloseClick: () => void;
  onControlsChange: (controls: ReaderControls) => void;
  onFullscreenClick: () => void;
  onOpenOriginalPageClick: () => void;
  onOpenScrollPreviewClick: () => void;
  onProgressCommit: (value: number) => void;
  onProgressInput: (value: number) => void;
  onProgressPointerDown: (event: PointerEvent) => void;
  onViewportAdjustClick: () => void;
};

export function Toolbar(props: {
  callbacks: ToolbarCallbacks;
  controls: ReaderControls;
  downloadInfos: ReaderDownloadInfo[];
  fullscreenActive: boolean;
  open: boolean;
  progress: PageProgress;
}) {
  const leftHandedControls = state.app.leftHandedControls.value;
  const [downloadDialogPageNum, setDownloadDialogPageNum] = createSignal<number | null>(null);
  const [helpOpen, setHelpOpen] = createSignal(false);
  const [moreOpen, setMoreOpen] = createSignal(false);
  const [controlChange, setControlChange] = createSignal<string | null>(null);
  const [fullscreenToolbarTop, setFullscreenToolbarTop] = createSignal<string>();
  let pageNumber!: HTMLDivElement;
  let fullscreenStatus: HTMLDivElement | undefined;
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

  onMount(() => {
    const updateFullscreenToolbarTop = () => {
      if (!props.fullscreenActive) {
        setFullscreenToolbarTop(undefined);
        return;
      }
      const statusBottom = fullscreenStatus?.getBoundingClientRect().bottom ?? 0;
      const pageNumberBottom = pageNumber.getBoundingClientRect().bottom;
      setFullscreenToolbarTop(`${Math.ceil(Math.max(statusBottom, pageNumberBottom) + 8)}px`);
    };
    const observer = new ResizeObserver(updateFullscreenToolbarTop);
    observer.observe(pageNumber);
    window.addEventListener("resize", updateFullscreenToolbarTop);
    createEffect(() => {
      if (props.fullscreenActive) {
        queueMicrotask(updateFullscreenToolbarTop);
      } else {
        updateFullscreenToolbarTop();
      }
    });
    onCleanup(() => {
      observer.disconnect();
      window.removeEventListener("resize", updateFullscreenToolbarTop);
    });
  });

  createEffect(() => {
    if (!props.open) {
      setMoreOpen(false);
    }
  });

  createEffect(() => {
    const pageNum = downloadDialogPageNum();
    if (pageNum !== null && pageNum !== props.progress.pageNum) {
      setDownloadDialogPageNum(null);
    }
  });

  createEffect(() => {
    if (downloadDialogPageNum() === null) {
      return;
    }

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      setDownloadDialogPageNum(null);
    };
    window.addEventListener("keydown", closeOnEscape, true);
    onCleanup(() => window.removeEventListener("keydown", closeOnEscape, true));
  });

  return (
    <div class="contents">
      <div
        class={
          "fixed z-2 flex justify-end transition-[opacity,transform] duration-160 ease-in-out " +
          (leftHandedControls
            ? "safe-left-md "
            : "safe-right-md ") +
          "bottom-[calc(var(--ui-control-size-lg)*2+var(--ui-font-size-lg)*2.4+env(safe-area-inset-bottom,0px))] " +
          "[&[data-open=false]]:(opacity-0 translate-y-[calc(100%+16px)] pointer-events-none)"
        }
        data-open={String(props.open)}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <div class="flex flex-col ui-gap-sm">
          <button
            type="button"
            class={READER_FLOATING_ICON_ACTION_CLASS}
            aria-label={texts.gallery.scrollPreview}
            title={texts.gallery.scrollPreview}
            onClick={() => props.callbacks.onOpenScrollPreviewClick()}
          >
            <Icon name="grid" size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            class={READER_FLOATING_ICON_ACTION_CLASS}
            aria-label={props.fullscreenActive ? texts.reader.exitFullscreen : texts.reader.fullscreen}
            title={props.fullscreenActive ? texts.reader.exitFullscreen : texts.reader.fullscreen}
            onClick={() => props.callbacks.onFullscreenClick()}
          >
            <Icon name={props.fullscreenActive ? "fullscreen-exit" : "fullscreen"} size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            class={READER_FLOATING_ICON_ACTION_CLASS}
            disabled={props.downloadInfos.length === 0}
            aria-label={texts.reader.download}
            title={texts.reader.download}
            onClick={() => setDownloadDialogPageNum(props.progress.pageNum)}
          >
            <Icon name="download" size={READER_ICON_SIZE} />
          </button>
        </div>
      </div>
      <div
        class={
          "ehpeek-reader-toolbar fixed z-3 flex justify-end pointer-events-none " +
          "top-[calc(10px+env(safe-area-inset-top,0px))] " +
          (leftHandedControls
            ? "safe-left-sm "
            : "safe-right-sm ")
        }
        style={{ top: fullscreenToolbarTop() }}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <div class={`flex flex-col ${leftHandedControls ? "items-start" : "items-end"} ui-gap-md pointer-events-auto${props.open ? "" : " !hidden"}`}>
          <div class={`flex flex-row ui-gap-md${leftHandedControls ? " flex-row-reverse" : ""}`}>
          <button
            type="button"
            class={READER_TOOLBAR_BUTTON_CLASS}
            onClick={() => props.callbacks.onOpenOriginalPageClick()}
          >
            <Icon name="external-link" size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            class={READER_TOOLBAR_BUTTON_CLASS}
            aria-label={texts.reader.readingOptions}
            title={texts.reader.readingOptions}
            aria-expanded={moreOpen()}
            onClick={() => setMoreOpen((open) => !open)}
          >
            <Icon name="book-open" size={READER_ICON_SIZE} />
          </button>
          <button
            type="button"
            class={READER_TOOLBAR_BUTTON_CLASS}
            aria-label={texts.help.title}
            title={texts.help.title}
            onClick={() => setHelpOpen(true)}
          >
            ?
          </button>
          <button
            type="button"
            class={READER_TOOLBAR_BUTTON_CLASS}
            aria-label={texts.button.close}
            title={texts.button.close}
            onClick={() => props.callbacks.onCloseClick()}
          >
            <Icon name="close" size={READER_ICON_SIZE} />
          </button>
          </div>
          <Show when={moreOpen()}>
            <div class={`flex w-[calc(var(--ui-control-size-lg)*4+var(--ui-space-md)*4)] flex-row flex-wrap ui-gap-md${leftHandedControls ? " flex-row-reverse" : ""}`}>
              <button
                type="button"
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={props.controls.navigationMode === "scroll" ? texts.reader.scrollMode : texts.reader.pagedMode}
                title={props.controls.navigationMode === "scroll" ? texts.reader.scrollMode : texts.reader.pagedMode}
                onClick={() => {
                  const navigationMode: NavigationMode = props.controls.navigationMode === "scroll" ? "paged" : "scroll";
                  props.callbacks.onControlsChange({ ...props.controls, navigationMode });
                  showControlChange(navigationMode === "paged" ? texts.reader.pagedMode : texts.reader.scrollMode);
                }}
              >
                <Icon
                  name={props.controls.navigationMode === "paged" ? "page" : "scroll-continuous"}
                  size={READER_ICON_SIZE}
                />
              </button>
              <button
                type="button"
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={props.controls.direction === "rtl"
                  ? texts.reader.directionRtl
                  : props.controls.direction === "ltr"
                    ? texts.reader.directionLtr
                    : texts.reader.directionTtb}
                onClick={() => {
                  const direction: ReadDirection = props.controls.direction === "rtl"
                    ? "ltr"
                    : props.controls.direction === "ltr"
                      ? "ttb"
                      : "rtl";
                  props.callbacks.onControlsChange({ ...props.controls, direction });
                  showControlChange(
                    direction === "rtl"
                      ? texts.reader.directionRtl
                      : direction === "ltr"
                        ? texts.reader.directionLtr
                        : texts.reader.directionTtb,
                  );
                }}
              >
                <Icon
                  name={props.controls.direction === "rtl"
                    ? "arrow-left"
                    : props.controls.direction === "ltr"
                      ? "arrow-right"
                      : "arrow-down"}
                  size={READER_ICON_SIZE}
                />
              </button>
              <button
                type="button"
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={props.controls.pageLayout === "double" ? texts.reader.doublePageMode : texts.reader.singlePageMode}
                disabled={props.controls.navigationMode !== "paged"}
                onClick={() => {
                  const pageLayout: PageLayout = props.controls.pageLayout === "single" ? "double" : "single";
                  props.callbacks.onControlsChange({ ...props.controls, pageLayout });
                  showControlChange(pageLayout === "double" ? texts.reader.doublePageMode : texts.reader.singlePageMode);
                }}
              >
                {props.controls.pageLayout === "double" ? "2P" : "1P"}
              </button>
              <button
                type="button"
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-pressed={props.controls.firstPageSeparate}
                aria-label={props.controls.firstPageSeparate
                  ? texts.reader.pairSecondAndThirdPages
                  : texts.reader.pairFirstAndSecondPages}
                title={props.controls.firstPageSeparate
                  ? texts.reader.pairSecondAndThirdPages
                  : texts.reader.pairFirstAndSecondPages}
                disabled={
                  props.controls.navigationMode !== "paged" ||
                  props.controls.pageLayout !== "double"
                }
                onClick={() => {
                  const firstPageSeparate = !props.controls.firstPageSeparate;
                  props.callbacks.onControlsChange({
                    ...props.controls,
                    firstPageSeparate,
                  });
                  showControlChange(
                    firstPageSeparate
                      ? texts.reader.pairSecondAndThirdPages
                      : texts.reader.pairFirstAndSecondPages,
                  );
                }}
              >
                {props.controls.firstPageSeparate ? "2+3" : "1+2"}
              </button>
              <button
                type="button"
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={props.controls.rightTapAction === "previous" ? texts.reader.rightTapPrevious : texts.reader.rightTapNext}
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
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={texts.reader.adjustScrollViewport}
                title={texts.reader.adjustScrollViewport}
                disabled={props.controls.navigationMode !== "scroll"}
                onClick={() => props.callbacks.onViewportAdjustClick()}
              >
                <Icon name="viewport" size={READER_ICON_SIZE} />
              </button>
            </div>
          </Show>
        </div>
      </div>
      <div
        ref={pageNumber}
        class={
          "ehpeek-reader-page-number fixed z-3 pointer-events-none " +
          "top-[calc(10px+env(safe-area-inset-top,0px))] " +
          (leftHandedControls
            ? "safe-right-sm left-auto "
            : "safe-left-sm right-auto ") +
          "min-w-0 max-w-[calc(100vw-20px)] " +
          "ui-py-xs ui-px-md ui-rounded-md bg-[var(--color-badge)] ehp-color-text " +
          "font-sans textsize-md font-600 leading-[1.4] whitespace-nowrap " +
          (leftHandedControls ? "text-right" : "text-left")
        }
        hidden={props.controls.navigationMode === "scroll" && !props.open && !props.fullscreenActive}
      >
        {pageNumberText(
          props.progress.pageNum,
          props.progress.totalPages,
          props.controls.navigationMode,
          props.controls.pageLayout,
          props.controls.firstPageSeparate,
        )}
      </div>
      <Show when={props.fullscreenActive}>
        <div
          ref={fullscreenStatus}
          class={
            "ehpeek-reader-fullscreen-status fixed z-3 flex items-center ui-gap-sm pointer-events-none " +
            "top-[calc(10px+env(safe-area-inset-top,0px))] " +
            (leftHandedControls
              ? "safe-right-sm "
              : "safe-left-sm ") +
            "ui-py-xs ui-px-md ui-rounded-md bg-[var(--color-badge)] ehp-color-text " +
            "font-sans textsize-md font-600 leading-[1.4] whitespace-nowrap"
          }
          role="status"
        >
          <span>{fullscreenTime()}</span>
        </div>
      </Show>
      <Show when={controlChange()} keyed>
        {(message) => (
          <div class="fixed z-overlay top-1/2 left-1/2 w-max max-w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 pointer-events-none ui-rounded-lg bg-[var(--color-badge)] ehp-color-text ui-px-xl ui-py-lg font-sans textsize-lg font-700 leading-[1.3] whitespace-pre-line text-center shadow-xl">
            {message}
          </div>
        )}
      </Show>
      <div
        class={
          "fixed z-2 flex items-center p-0 transition-[opacity,transform] duration-160 ease-in-out " +
          "safe-right-md bottom-[calc(12px+env(safe-area-inset-bottom,0px))] safe-left-md " +
          "[&[data-open=false]]:(opacity-0 translate-y-[calc(100%+16px)] pointer-events-none)"
        }
        data-open={String(props.open)}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <ProgressBar
          class="textsize-lg"
          direction={props.controls.direction === "rtl" ? "rtl" : "ltr"}
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
      <Show when={downloadDialogPageNum() !== null && props.downloadInfos.length > 0}>
        <Dialog
          bodyClass="ui-pt-lg ui-px-lg"
          label={texts.reader.download}
          onClose={() => setDownloadDialogPageNum(null)}
          title={`${texts.reader.download} · ${props.downloadInfos.map((info) => info.pageNum).join(", ")}`}
          variant="reader"
          width="lg"
        >
          <div class="grid ui-gap-md font-sans textsize-md">
            <For each={props.downloadInfos}>
              {(downloadInfo) => (
                <div class="grid ui-gap-md">
                  <button
                    type="button"
                    class={DOWNLOAD_OPTION_CLASS}
                    onClick={() => {
                      if (startImageDownload(downloadInfo.currentImageUrl, downloadInfo.currentFileName)) {
                        setDownloadDialogPageNum(null);
                      }
                    }}
                  >
                    <span class="textsize-md font-700">
                      {`${texts.reader.downloadDisplayedImage} · ${downloadInfo.pageNum}`}
                    </span>
                    <span class="max-w-full overflow-hidden text-ellipsis whitespace-nowrap textsize-sm opacity-75">
                      {downloadInfo.currentFileName}
                    </span>
                  </button>
                  <button
                    type="button"
                    class={DOWNLOAD_OPTION_CLASS}
                    disabled={!downloadInfo.originalImageUrl}
                    onClick={() => {
                      if (downloadInfo.originalImageUrl) {
                        if (startImageDownload(
                          downloadInfo.originalImageUrl,
                          downloadInfo.originalFileName,
                        )) {
                          setDownloadDialogPageNum(null);
                        }
                      }
                    }}
                  >
                    <span class="textsize-md font-700">
                      {`${texts.reader.downloadOriginalImage} · ${downloadInfo.pageNum}`}
                    </span>
                    <span class="textsize-sm opacity-75">
                      {downloadInfo.originalImageUrl ? texts.reader.originalImageSource : texts.reader.originalImageUnavailable}
                    </span>
                  </button>
                </div>
              )}
            </For>
            <details class="textsize-sm opacity-75">
              <summary class="cursor-pointer font-700">
                {texts.reader.downloadHelpLabel}
              </summary>
              <p class="m-0 ui-mt-sm leading-[1.4]">
                {texts.reader.downloadHelp}
              </p>
              <div class="ui-mt-md flex flex-wrap items-center ui-gap-x-md ui-gap-y-sm">
                <span class="font-700">{texts.reader.openImage}:</span>
                <For each={props.downloadInfos}>
                  {(downloadInfo) => (
                    <>
                      <a
                        class="text-[var(--color-accent)] hover:underline"
                        href={downloadInfo.currentImageUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {`${texts.reader.displayedImageShort} ${downloadInfo.pageNum}`}
                      </a>
                      <Show when={downloadInfo.originalImageUrl}>
                        {(originalImageUrl) => (
                          <a
                            class="text-[var(--color-accent)] hover:underline"
                            href={originalImageUrl()}
                            rel="noopener noreferrer"
                            target="_blank"
                          >
                            {`${texts.reader.originalImageShort} ${downloadInfo.pageNum}`}
                          </a>
                        )}
                      </Show>
                    </>
                  )}
                </For>
              </div>
            </details>
          </div>
        </Dialog>
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

function pageNumberText(
  pageNum: number,
  totalPages: number | undefined,
  navigationMode: NavigationMode,
  pageLayout: PageLayout,
  firstPageSeparate: boolean,
): string {
  if (totalPages && pageNum === totalPages + 1) {
    return texts.reader.endPage;
  }

  const doublePage = navigationMode === "paged" &&
    pageLayout === "double" &&
    !(firstPageSeparate && pageNum === 1);
  if (!totalPages) {
    return doublePage ? `${pageNum}–${pageNum + 1}` : String(pageNum);
  }

  const doublePageEnd = Math.min(totalPages, pageNum + 1);
  return doublePage && doublePageEnd > pageNum
    ? `${pageNum}–${doublePageEnd} / ${totalPages}`
    : `${pageNum} / ${totalPages}`;
}
