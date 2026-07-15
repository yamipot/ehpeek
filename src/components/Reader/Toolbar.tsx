import { Fragment, h } from "preact";
import type { ReadDirection, RightTapAction, ViewMode } from "../../state";
import texts from "../../texts.json";
import { stopEvent } from "../../utils";
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
  "control-reader-btn coarse:(w-68px h-60px px-16px rounded-8px text-18px)",
  "border color-button-reader cursor-pointer font-sans textsize-sm font-700 leading-1",
].join(" ");

export type ToolbarCallbacks = {
  onCloseClick: () => void;
  onDisableReaderClick: () => void;
  onModeClick: () => void;
  onOpenChange: (open: boolean) => void;
  onProgressCommit: (value: number) => void;
  onProgressInput: (value: number) => void;
  onProgressPointerDown: (event: PointerEvent) => void;
  onReadDirectionClick: () => void;
  onRightTapClick: () => void;
};

export type ToolbarState = {
  controls: ReaderControls;
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
  const open = props.state.open;
  const modeButton = modeButtonInfo(controls.mode);
  const readDirectionButton = readDirectionButtonInfo(controls.readDirection);
  const rightTapButton = rightTapButtonInfo(controls.rightTapAction);

  return (
    <>
      <div
        className={
          "fixed z-3 flex justify-end pointer-events-none " +
          "top-[calc(10px+env(safe-area-inset-top,0px))] right-10px " +
          "coarse:top-[calc(8px+env(safe-area-inset-top,0px))] coarse:right-8px"
        }
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <div className="flex flex-row gap-8px pointer-events-auto">
          <button
            type="button"
            className={"coarse:(w-68px px-16px text-16px) " + READER_BUTTON_CLASS}
            hidden={!open}
            title={readDirectionButton.title}
            onClick={props.callbacks.onReadDirectionClick}
          >
            {readDirectionButton.text}
          </button>
          <button
            type="button"
            className={"coarse:(w-68px px-16px text-16px) " + READER_BUTTON_CLASS}
            hidden={!open}
            title={rightTapButton.title}
            onClick={props.callbacks.onRightTapClick}
          >
            {rightTapButton.text}
          </button>
          <button type="button" className={READER_BUTTON_CLASS} hidden={!open} title={modeButton.title} onClick={props.callbacks.onModeClick}>
            {modeButton.text}
          </button>
          <button
            type="button"
            className={"coarse:(w-68px text-15px) uppercase " + READER_BUTTON_CLASS}
            hidden={!open}
            title={texts.reader.disableReader}
            onClick={props.callbacks.onDisableReaderClick}
          >
            off
          </button>
          <button type="button" className={READER_BUTTON_CLASS} title={texts.reader.close} onClick={props.callbacks.onCloseClick}>
            X
          </button>
        </div>
      </div>
      <div
        className={
          "fixed z-3 pointer-events-none " +
          "top-[calc(62px+env(safe-area-inset-top,0px))] left-1/2 right-auto -translate-x-1/2 " +
          "coarse:top-[calc(72px+env(safe-area-inset-top,0px))] " +
          "landscape:top-[calc(54px+env(safe-area-inset-top,0px))] landscape:(left-auto right-10px translate-x-0) " +
          "coarse-landscape:top-[calc(62px+env(safe-area-inset-top,0px))] coarse-landscape:right-8px " +
          "min-w-64px landscape:min-w-0 max-w-none landscape:max-w-[calc(100vw-20px)] coarse-landscape:max-w-[calc(100vw-16px)] " +
          "py-4px px-10px rounded-6px color-reader-badge color-reader-text " +
          "font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap " +
          "text-center landscape:text-right"
        }
      >
        {pageNumberText(progress.pageNum, progress.totalPages)}
      </div>
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
          className="text-xl coarse:text-3xl"
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
    </>
  );
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

function modeButtonInfo(mode: ViewMode): { text: string; title: string } {
  const paged = mode === "paged";
  return {
    text: paged ? "⇔" : "⇕",
    title: paged ? texts.reader.scrollMode : texts.reader.pagedMode,
  };
}

function readDirectionButtonInfo(direction: ReadDirection): { text: string; title: string } {
  const rtl = direction === "rtl";
  return {
    text: rtl ? "RL" : "LR",
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
