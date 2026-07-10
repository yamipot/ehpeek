import { h } from "../../jsx";
import type { ReadDirection, RightTapAction, ViewMode } from "../../state";
import texts from "../../texts.json";
import { stopEvent } from "../../utils";

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

const READER_BUTTON_CLASS = "w-46px h-40px px-10px py-0 border rounded-6px color-button-reader cursor-pointer font-sans textsize-sm font-700 leading-1";

function toolbarDom(handlers: {
  onReadDirectionClick: () => void;
  onRightTapClick: () => void;
  onModeClick: () => void;
  onCloseClick: () => void;
  onDisableReaderClick: () => void;
  onProgressPointerDown: (event: PointerEvent) => void;
  onProgressInput: () => void;
  onProgressCommit: () => void;
}) {
  let toolbar!: HTMLElement;
  let modeButton!: HTMLButtonElement;
  let readDirectionButton!: HTMLButtonElement;
  let rightTapButton!: HTMLButtonElement;
  let pageNumberLabel!: HTMLElement;
  let progressInput!: HTMLInputElement;
  let disableReaderButton!: HTMLButtonElement;

  const topbar = (
    <div className="ehpeek-topbar fixed top-[calc(10px+env(safe-area-inset-top,0px))] right-10px z-3 flex justify-end pointer-events-none" onClick={stopEvent} onPointerDown={stopEvent} onWheel={stopEvent}>
      <div className="ehpeek-actions flex flex-row gap-8px pointer-events-auto">
        <button
          type="button"
          className={`ehpeek-button ehpeek-direction-button ehpeek-control-hidden ${READER_BUTTON_CLASS}`}
          ref={(node: HTMLButtonElement) => {
            readDirectionButton = node;
          }}
          onClick={handlers.onReadDirectionClick}
        />
        <button
          type="button"
          className={`ehpeek-button ehpeek-direction-button ehpeek-control-hidden ${READER_BUTTON_CLASS}`}
          ref={(node: HTMLButtonElement) => {
            rightTapButton = node;
          }}
          onClick={handlers.onRightTapClick}
        />
        <button
          type="button"
          className={`ehpeek-button ehpeek-control-hidden ${READER_BUTTON_CLASS}`}
          ref={(node: HTMLButtonElement) => {
            modeButton = node;
          }}
          onClick={handlers.onModeClick}
        />
        <button
          type="button"
          className={`ehpeek-button ehpeek-disable-button ehpeek-control-hidden ${READER_BUTTON_CLASS} uppercase`}
          title={texts.reader.disableReader}
          ref={(node: HTMLButtonElement) => {
            disableReaderButton = node;
          }}
          onClick={handlers.onDisableReaderClick}
        >
          off
        </button>
        <button type="button" className={`ehpeek-button ${READER_BUTTON_CLASS}`} title={texts.reader.close} onClick={handlers.onCloseClick}>
          X
        </button>
      </div>
    </div>
  ) as HTMLElement;
  const pageNumber = (
    <div
      className="ehpeek-pageno fixed top-[calc(62px+env(safe-area-inset-top,0px))] left-1/2 z-3 min-w-64px py-4px px-10px rounded-6px color-reader-badge color-reader-text font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap text-center -translate-x-1/2 pointer-events-none"
      ref={(node: HTMLElement) => {
        pageNumberLabel = node;
      }}
    />
  ) as HTMLElement;
  const progress = (
    <div
      className="ehpeek-progressbar ehpeek-toolbar-hidden fixed right-[max(12px,env(safe-area-inset-right,0px))] bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-[max(12px,env(safe-area-inset-left,0px))] z-2 flex items-center p-0 transition-[opacity,transform] duration-160 ease-in-out"
      ref={(node: HTMLElement) => {
        toolbar = node;
      }}
      onClick={stopEvent}
      onPointerDown={stopEvent}
      onWheel={stopEvent}
    >
      <input
        type="range"
        className="ehpeek-progress w-full h-48px m-0 px-12px py-0 color-progress-reader cursor-grab touch-none select-none [-webkit-appearance:none] [appearance:none]"
        min="1"
        step="1"
        ref={(node: HTMLInputElement) => {
          progressInput = node;
        }}
        onPointerDown={handlers.onProgressPointerDown}
        onInput={handlers.onProgressInput}
        onChange={handlers.onProgressCommit}
        onPointerUp={handlers.onProgressCommit}
        onPointerCancel={handlers.onProgressCommit}
      />
    </div>
  ) as HTMLElement;

  const setControlHidden = (hidden: boolean) => {
    modeButton.classList.toggle("ehpeek-control-hidden", hidden);
    readDirectionButton.classList.toggle("ehpeek-control-hidden", hidden);
    rightTapButton.classList.toggle("ehpeek-control-hidden", hidden);
    disableReaderButton.classList.toggle("ehpeek-control-hidden", hidden);
  };

  return {
    elements: [topbar, pageNumber, progress],
    progressRange() {
      return {
        min: Number(progressInput.min || "1"),
        max: Number(progressInput.max || "1"),
      };
    },
    progressValue() {
      return Number(progressInput.value || "");
    },
    setModeButton(mode: ViewMode) {
      const paged = mode === "paged";
      modeButton.textContent = paged ? "⇔" : "⇕";
      modeButton.title = paged ? texts.reader.scrollMode : texts.reader.pagedMode;
    },
    setReadDirectionButton(direction: ReadDirection) {
      const rtl = direction === "rtl";
      readDirectionButton.textContent = rtl ? "RL" : "LR";
      readDirectionButton.title = rtl ? texts.reader.readLeftToRight : texts.reader.readRightToLeft;
    },
    setRightTapButton(action: RightTapAction) {
      const previous = action === "previous";
      rightTapButton.textContent = previous ? "R-" : "R+";
      rightTapButton.title = previous ? texts.reader.rightTapNext : texts.reader.rightTapPrevious;
    },
    setPageNumber(text: string) {
      pageNumberLabel.textContent = text;
    },
    setProgressMax(max: number) {
      progressInput.max = String(Math.max(1, max));
    },
    setProgressValue(value: number) {
      progressInput.value = String(value);
    },
    setProgressFill(fillPercent: number) {
      progressInput.style.setProperty("--ehpeek-progress-fill", `${fillPercent}%`);
    },
    toggleToolbar(): boolean {
      const hidden = toolbar.classList.toggle("ehpeek-toolbar-hidden");
      setControlHidden(hidden);
      return !hidden;
    },
  };
}

export class Toolbar {
  readonly elements: HTMLElement[];
  private readonly dom: ReturnType<typeof toolbarDom>;

  constructor(
    handlers: {
      onReadDirectionClick: () => void;
      onRightTapClick: () => void;
      onModeClick: () => void;
      onCloseClick: () => void;
      onDisableReaderClick: () => void;
      onProgressPointerDown: (event: PointerEvent) => void;
      onProgressInput: () => void;
      onProgressCommit: () => void;
    },
    private readonly onToolbarOpenChange: (open: boolean) => void,
  ) {
    this.dom = toolbarDom(handlers);
    this.elements = this.dom.elements;
  }

  setControls(controls: ReaderControls): void {
    this.dom.setModeButton(controls.mode);
    this.dom.setReadDirectionButton(controls.readDirection);
    this.dom.setRightTapButton(controls.rightTapAction);
  }

  setProgress(progress: PageProgress): void {
    this.dom.setPageNumber(this.pageNumberText(progress.pageNum, progress.totalPages));
    this.dom.setProgressMax(progress.maxProgressPageNum);

    if (!progress.keepInputValue) {
      this.dom.setProgressValue(progress.pageNum);
    }

    this.setProgressFill(this.progressFillPercent(progress.pageNum));
  }

  progressValue(): number {
    return this.dom.progressValue();
  }

  toggle(): boolean {
    const open = this.dom.toggleToolbar();
    this.onToolbarOpenChange(open);
    return !open;
  }

  private setProgressFill(fillPercent: number): void {
    this.dom.setProgressFill(fillPercent);
  }

  private pageNumberText(pageNum: number, totalPages: number | undefined): string {
    if (totalPages && pageNum === totalPages + 1) {
      return texts.reader.endPage;
    }

    return totalPages ? `${pageNum} / ${totalPages}` : String(pageNum);
  }

  private progressFillPercent(pageNum: number): number {
    const { min, max } = this.dom.progressRange();
    const value = Math.min(max, Math.max(min, pageNum));
    return max > min ? ((value - min) / (max - min)) * 100 : 100;
  }
}
