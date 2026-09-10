import { createEffect, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { NavigationMode, PageLayout, ReadDirection, ReaderCustomization } from "../kit/interfaces";
import { useReaderTexts, type ReaderTexts } from "../kit/i18n";
import { stopEvent } from "../kit/helpers";
import { Button } from "../kit/Widgets/Button";
import { Dialog } from "../kit/Widgets/Dialog";
import { Icon } from "../kit/Widgets/Icon";
import { ProgressBar } from "../kit/Widgets/ProgressBar";
import { InteractionHelp } from "../kit/Widgets/InteractionHelp";

import { getReaderControls, useReaderContext } from "./Context";
import { imageFileExtension } from "./images";

export type PageProgress = {
  pageNum: number;
  totalPages?: number;
  maxProgressPageNum: number;
  keepInputValue?: boolean;
};

const READER_TOOLBAR_BUTTON_CLASS = "ehpeek-reader-toolbar-button";
const READER_FLOATING_ICON_ACTION_CLASS = "ehpeek-reader-floating-button";
const READER_ICON_SIZE = "var(--ui-icon-size-md)";
const TIME_FORMATTER = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
});

export type ReaderDownloadInfo = {
  currentFileName: string;
  currentImageUrl: string;
  imageHeight: number | null;
  imageWidth: number | null;
  originalFileName: string;
  originalImageUrl: string | null;
  pageNum: number;
};

export interface ReaderToolbarProps {
  /** Tool visibility; menus and dialogs retain their own local state. */
  open: boolean;
  fullscreenActive: boolean;
  onToggleFullscreen(): void;
}

export function ReaderToolbar(props: ReaderToolbarProps) {
  const ctx = useReaderContext();
  const controls = () => getReaderControls(ctx);
  const settings = () => ctx.settings[`${ctx.orientation()}Controls`];
  const progress = (): PageProgress => ({
    pageNum: ctx.position.page(),
    totalPages: ctx.source.totalPages,
    maxProgressPageNum: ctx.source.totalPages || Number.MAX_SAFE_INTEGER,
    keepInputValue: ctx.position.seeking(),
  });
  const downloadInfos = (): ReaderDownloadInfo[] => ctx.position.contentPages().flatMap(pageNum => {
    const resource = ctx.loading.page(pageNum);
    const image = resource?.image;
    if (!image) return [];
    const fileName = image.fileName ?? `page-${pageNum}.${imageFileExtension(image.imageUrl) || "webp"}`;
    return [{
      currentFileName: fileName,
      currentImageUrl: image.imageUrl,
      imageWidth: resource.element?.naturalWidth || image.width || null,
      imageHeight: resource.element?.naturalHeight || image.height || null,
      originalFileName: image.originalFileName ?? fileName,
      originalImageUrl: image.originalImageUrl ?? null,
      pageNum,
    }];
  });
  const openOriginal = () => {
    const page = ctx.loading.page(ctx.position.page())?.page;
    if (page) ctx.customization.onOpenOriginalPage?.(page.url, ctx.position.page());
  };
  const texts = useReaderTexts();
  const leftHandedControls = () => ctx.settings.leftHandedControls.value();
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

  return (
    <div class="ehpeek-reader-tools" data-left-handed={leftHandedControls()}>
      <div
        class="ehpeek-reader-floating-toolbar"
        data-open={String(props.open)}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <div class="ehpeek-reader-floating-actions">
          <Button
            class={READER_FLOATING_ICON_ACTION_CLASS}
            aria-label={texts.gallery.scrollPreview}
            title={texts.gallery.scrollPreview}
            onClick={() => ctx.openPreview()}
          >
            <Icon name="grid" size={READER_ICON_SIZE} />
          </Button>
          <Button
            class={READER_FLOATING_ICON_ACTION_CLASS}
            aria-label={props.fullscreenActive ? texts.reader.exitFullscreen : texts.reader.fullscreen}
            title={props.fullscreenActive ? texts.reader.exitFullscreen : texts.reader.fullscreen}
            onClick={() => props.onToggleFullscreen()}
          >
            <Icon name={props.fullscreenActive ? "fullscreen-exit" : "fullscreen"} size={READER_ICON_SIZE} />
          </Button>
          <ReaderDownload
            disabled={ctx.disabled()}
            downloadInfos={downloadInfos()}
            pageNum={progress().pageNum}
            customization={ctx.customization}
          />
        </div>
      </div>
      <div
        class="ehpeek-reader-toolbar"
        style={{ top: fullscreenToolbarTop() }}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <div
          class="ehpeek-reader-toolbar-controls"
          hidden={!props.open}
        >
          <div class="ehpeek-reader-toolbar-row">
            <Button
              class={READER_TOOLBAR_BUTTON_CLASS}
              disabled={!ctx.customization?.onOpenOriginalPage}
              onClick={() => openOriginal()}
            >
              <Icon name="external-link" size={READER_ICON_SIZE} />
            </Button>
            <Button
              class={READER_TOOLBAR_BUTTON_CLASS}
              aria-label={texts.reader.readingOptions}
              title={texts.reader.readingOptions}
              aria-expanded={moreOpen()}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <Icon name="book-open" size={READER_ICON_SIZE} />
            </Button>
            <Button
              class={READER_TOOLBAR_BUTTON_CLASS}
              aria-label={texts.help.title}
              title={texts.help.title}
              onClick={() => setHelpOpen(true)}
            >
              ?
            </Button>
            <Button
              class={READER_TOOLBAR_BUTTON_CLASS}
              aria-label={texts.common.actions.close}
              title={texts.common.actions.close}
              onClick={() => ctx.close()}
            >
              <Icon name="close" size={READER_ICON_SIZE} />
            </Button>
          </div>
          <Show when={moreOpen()}>
            <div class="ehpeek-reader-toolbar-more">
              <Button
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={controls().navigationMode === "scroll" ? texts.reader.scrollMode : texts.reader.pagedMode}
                title={controls().navigationMode === "scroll" ? texts.reader.scrollMode : texts.reader.pagedMode}
                onClick={() => {
                  const navigationMode: NavigationMode = controls().navigationMode === "scroll" ? "paged" : "scroll";
                  settings().navigationMode.set(navigationMode);
                  showControlChange(navigationMode === "paged" ? texts.reader.pagedMode : texts.reader.scrollMode);
                }}
              >
                <Icon
                  name={controls().navigationMode === "paged" ? "page" : "scroll-continuous"}
                  size={READER_ICON_SIZE}
                />
              </Button>
              <Button
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={controls().direction === "rtl"
                  ? texts.reader.directionRtl
                  : controls().direction === "ltr"
                    ? texts.reader.directionLtr
                    : texts.reader.directionTtb}
                onClick={() => {
                  const direction: ReadDirection = controls().direction === "rtl"
                    ? "ltr"
                    : controls().direction === "ltr"
                      ? "ttb"
                      : "rtl";
                  (controls().navigationMode === "scroll" ? settings().scrollDirection : settings().pagedDirection).set(direction);
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
                  name={controls().direction === "rtl"
                    ? "arrow-left"
                    : controls().direction === "ltr"
                      ? "arrow-right"
                      : "arrow-down"}
                  size={READER_ICON_SIZE}
                />
              </Button>
              <Button
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={controls().pageLayout === "double" ? texts.reader.doublePageMode : texts.reader.singlePageMode}
                disabled={controls().navigationMode !== "paged"}
                onClick={() => {
                  const pageLayout: PageLayout = controls().pageLayout === "single" ? "double" : "single";
                  settings().pageLayout.set(pageLayout);
                  showControlChange(pageLayout === "double" ? texts.reader.doublePageMode : texts.reader.singlePageMode);
                }}
              >
                {controls().pageLayout === "double" ? "2P" : "1P"}
              </Button>
              <Button
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-pressed={controls().firstPageSeparate}
                aria-label={controls().firstPageSeparate
                  ? texts.reader.pairSecondAndThirdPages
                  : texts.reader.pairFirstAndSecondPages}
                title={controls().firstPageSeparate
                  ? texts.reader.pairSecondAndThirdPages
                  : texts.reader.pairFirstAndSecondPages}
                disabled={
                  controls().navigationMode !== "paged" ||
                  controls().pageLayout !== "double"
                }
                onClick={() => {
                  const firstPageSeparate = !controls().firstPageSeparate;
                  ctx.firstPageSeparate[1](firstPageSeparate);
                  showControlChange(
                    firstPageSeparate
                      ? texts.reader.pairSecondAndThirdPages
                      : texts.reader.pairFirstAndSecondPages,
                  );
                }}
              >
                {controls().firstPageSeparate ? "2+3" : "1+2"}
              </Button>
              <Button
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={controls().rightTapAction === "previous" ? texts.reader.rightTapPrevious : texts.reader.rightTapNext}
                onClick={() => {
                  const rightTapAction = controls().rightTapAction === "previous" ? "next" : "previous";
                  settings().rightTapAction.set(rightTapAction);
                  showControlChange(rightTapAction === "previous" ? texts.reader.rightTapPrevious : texts.reader.rightTapNext);
                }}
              >
                {controls().rightTapAction === "previous" ? "R-" : "R+"}
              </Button>
              <Button
                class={READER_TOOLBAR_BUTTON_CLASS}
                aria-label={texts.reader.adjustScrollViewport}
                title={texts.reader.adjustScrollViewport}
                disabled={controls().navigationMode !== "scroll"}
                onClick={() => ctx.scrollScale.open()}
              >
                <Icon name="viewport" size={READER_ICON_SIZE} />
              </Button>
            </div>
          </Show>
        </div>
      </div>
      <div
        ref={pageNumber}
        class="ehpeek-reader-page-number"
        hidden={controls().navigationMode === "scroll" && !props.open && !props.fullscreenActive}
      >
        {pageNumberText(texts,
          progress().pageNum,
          progress().totalPages,
          controls().navigationMode,
          controls().pageLayout,
          controls().firstPageSeparate,
        )}
      </div>
      <Show when={props.fullscreenActive}>
        <div
          ref={fullscreenStatus}
          class="ehpeek-reader-fullscreen-status"
          role="status"
        >
          <span>{fullscreenTime()}</span>
        </div>
      </Show>
      <Show when={controlChange()} keyed>
        {(message) => (
          <div class="ehpeek-reader-control-notice">
            {message}
          </div>
        )}
      </Show>
      <div
        class="ehpeek-reader-progress"
        data-open={String(props.open)}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <ProgressBar
          class="ehpeek-reader-progress-input"
          direction={controls().direction === "rtl" ? "rtl" : "ltr"}
          fillPercent={progressFillPercent(progress())}
          keepInputValue={progress().keepInputValue}
          max={Math.max(1, progress().maxProgressPageNum)}
          min={1}
          step={1}
          value={progress().pageNum}
          onPointerDown={(event) => { event.stopPropagation(); ctx.position.beginSeek(); }}
          onInput={ctx.position.seek}
          onCommit={ctx.position.commitSeek}
        />
      </div>
      <Show when={!ctx.disabled() && helpOpen()}>
        <InteractionHelp variant="reader" onClose={() => setHelpOpen(false)} />
      </Show>
    </div>
  );
}

function ReaderDownload(props: {
  disabled?: boolean;
  downloadInfos: ReaderDownloadInfo[];
  pageNum: number;
  customization?: ReaderCustomization;
}) {
  const texts = useReaderTexts();
  const startImageDownload = (url: string, name: string) => props.customization?.download?.(url, name) ?? false;
  const [downloadDialogPageNum, setDownloadDialogPageNum] = createSignal<number | null>(null);
  createEffect(() => {
    const pageNum = downloadDialogPageNum();
    if (pageNum !== null && pageNum !== props.pageNum) {
      setDownloadDialogPageNum(null);
    }
  });

  return (
    <>
      <Button
        class={READER_FLOATING_ICON_ACTION_CLASS}
        disabled={props.downloadInfos.length === 0}
        aria-label={texts.reader.download}
        title={texts.reader.download}
        onClick={() => setDownloadDialogPageNum(props.pageNum)}
      >
        <Icon name="download" size={READER_ICON_SIZE} />
      </Button>
      <Show when={!props.disabled && downloadDialogPageNum() !== null && props.downloadInfos.length > 0}>
        <Dialog
          bodyClass="ehpeek-reader-download-body"
          label={texts.reader.download}
          onClose={() => setDownloadDialogPageNum(null)}
          title={`${texts.reader.download} · ${props.downloadInfos.map((info) => info.pageNum).join(", ")}`}
          variant="reader"
          width="lg"
        >
          <div class="ehpeek-reader-download-options">
            <For each={props.downloadInfos}>
              {(downloadInfo) => (
                <div class="ehpeek-reader-download-page">
                  <Button
                    variant="option"
                    disabled={!props.customization?.download}
                    onClick={() => {
                      if (startImageDownload(downloadInfo.currentImageUrl, downloadInfo.currentFileName)) {
                        setDownloadDialogPageNum(null);
                      }
                    }}
                  >
                    <span class="ehpeek-reader-download-title">
                      {`${texts.reader.downloadDisplayedImage} · ${downloadInfo.pageNum}`}
                    </span>
                    <span class="ehpeek-reader-download-filename">
                      {downloadInfo.currentFileName}
                    </span>
                  </Button>
                  <Button
                    variant="option"
                    disabled={!downloadInfo.originalImageUrl || !props.customization?.download}
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
                    <span class="ehpeek-reader-download-title">
                      {`${texts.reader.downloadOriginalImage} · ${downloadInfo.pageNum}`}
                    </span>
                    <span class="ehpeek-reader-download-detail">
                      {downloadInfo.originalImageUrl ? texts.reader.originalImageSource : texts.reader.originalImageUnavailable}
                    </span>
                  </Button>
                </div>
              )}
            </For>
            <details class="ehpeek-reader-download-detail">
              <summary class="ehpeek-reader-download-summary">
                {texts.reader.downloadHelpLabel}
              </summary>
              <p class="ehpeek-reader-download-help">
                {props.customization?.downloadHelp?.()}
              </p>
              <div class="ehpeek-reader-download-links">
                <strong>{texts.reader.openImage}:</strong>
                <For each={props.downloadInfos}>
                  {(downloadInfo) => (
                    <>
                      <a
                        class="ehpeek-reader-download-link"
                        href={downloadInfo.currentImageUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        {`${texts.reader.displayedImageShort} ${downloadInfo.pageNum}`}
                      </a>
                      <Show when={downloadInfo.originalImageUrl}>
                        {(originalImageUrl) => (
                          <a
                            class="ehpeek-reader-download-link"
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
    </>
  );
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
  texts: ReaderTexts,
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
