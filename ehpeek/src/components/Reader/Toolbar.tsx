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

const READER_BUTTON_CLASS = [
  "control-reader-btn coarse:(w-68px h-60px px-16px rounded-8px text-18px)",
  "border color-button-reader cursor-pointer font-sans textsize-sm font-700 leading-1",
].join(" ");
const TOOLBAR_HIDDEN_CLASS = "opacity-0 translate-y-[calc(100%+16px)] pointer-events-none";
const TOOLBAR_HIDDEN_CLASSES = TOOLBAR_HIDDEN_CLASS.split(" ");

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
    <div
      className={
        // Base.
        "ehpeek-topbar fixed z-3 flex justify-end pointer-events-none " +
        // Position.
        "top-[calc(10px+env(safe-area-inset-top,0px))] right-10px " +
        "coarse:top-[calc(8px+env(safe-area-inset-top,0px))] coarse:right-8px"
      }
      onClick={stopEvent} onPointerDown={stopEvent} onWheel={stopEvent}
    >
      <div className="ehpeek-actions flex flex-row gap-8px pointer-events-auto">
        <button
          type="button"
          className={
            "ehpeek-button ehpeek-direction-button coarse:(w-68px px-16px text-16px) " +
            READER_BUTTON_CLASS
          }
          hidden
          ref={(node: HTMLButtonElement) => {
            readDirectionButton = node;
          }}
          onClick={handlers.onReadDirectionClick}
        />
        <button
          type="button"
          className={
            "ehpeek-button ehpeek-direction-button coarse:(w-68px px-16px text-16px) " +
            READER_BUTTON_CLASS
          }
          hidden
          ref={(node: HTMLButtonElement) => {
            rightTapButton = node;
          }}
          onClick={handlers.onRightTapClick}
        />
        <button
          type="button"
          className={"ehpeek-button " + READER_BUTTON_CLASS}
          hidden
          ref={(node: HTMLButtonElement) => {
            modeButton = node;
          }}
          onClick={handlers.onModeClick}
        />
        <button
          type="button"
          className={
            "ehpeek-button ehpeek-disable-button coarse:(w-68px text-15px) uppercase " +
            READER_BUTTON_CLASS
          }
          hidden
          title={texts.reader.disableReader}
          ref={(node: HTMLButtonElement) => {
            disableReaderButton = node;
          }}
          onClick={handlers.onDisableReaderClick}
        >
          off
        </button>
        <button type="button" className={"ehpeek-button " + READER_BUTTON_CLASS} title={texts.reader.close} onClick={handlers.onCloseClick}>
          X
        </button>
      </div>
    </div>
  ) as HTMLElement;
  const pageNumber = (
    <div
      className={
        // Base.
        "ehpeek-pageno fixed z-3 pointer-events-none " +
        // Position.
        "top-[calc(62px+env(safe-area-inset-top,0px))] left-1/2 right-auto -translate-x-1/2 " +
        "coarse:top-[calc(72px+env(safe-area-inset-top,0px))] " +
        "landscape:top-[calc(54px+env(safe-area-inset-top,0px))] landscape:(left-auto right-10px translate-x-0) " +
        "coarse-landscape:top-[calc(62px+env(safe-area-inset-top,0px))] coarse-landscape:right-8px " +
        // Box.
        "min-w-64px landscape:min-w-0 max-w-none landscape:max-w-[calc(100vw-20px)] coarse-landscape:max-w-[calc(100vw-16px)] " +
        "py-4px px-10px " +
        "rounded-6px color-reader-badge color-reader-text " +
        // Text.
        "font-sans textsize-sm font-600 leading-[1.4] whitespace-nowrap " +
        "text-center landscape:text-right"
      }
      ref={(node: HTMLElement) => {
        pageNumberLabel = node;
      }}
    />
  ) as HTMLElement;
  const progress = (
    <div
      className={
        // Base.
        "ehpeek-progressbar fixed z-2 flex items-center p-0 transition-[opacity,transform] duration-160 ease-in-out " +
        // Position.
        "right-[max(12px,env(safe-area-inset-right,0px))] bottom-[calc(12px+env(safe-area-inset-bottom,0px))] left-[max(12px,env(safe-area-inset-left,0px))] " +
        // Initial visibility.
        TOOLBAR_HIDDEN_CLASS
      }
      ref={(node: HTMLElement) => {
        toolbar = node;
      }}
      onClick={stopEvent}
      onPointerDown={stopEvent}
      onWheel={stopEvent}
    >
      <input
        type="range"
        className={
          // Base.
          "ehpeek-progress w-full control-range coarse:(h-72px px-19px) m-0 color-progress-reader " +
          // Interaction.
          "cursor-grab active:cursor-grabbing touch-none select-none [-webkit-appearance:none] [appearance:none] " +
          // Progress fill.
          "[--ehpeek-progress-fill:0%] [--ehpeek-progress-track-direction:to_right] " +
          // Thumb size.
          "[--ehpeek-progress-thumb-size:30px] [--ehpeek-progress-thumb-offset:-11px] " +
          "coarse:([--ehpeek-progress-thumb-size:43px] [--ehpeek-progress-thumb-offset:-17px])"
        }
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
    modeButton.hidden = hidden;
    readDirectionButton.hidden = hidden;
    rightTapButton.hidden = hidden;
    disableReaderButton.hidden = hidden;
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
      progressInput.dir = rtl ? "rtl" : "ltr";
      progressInput.style.setProperty("--ehpeek-progress-track-direction", rtl ? "to left" : "to right");
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
      const hidden = !toolbar.classList.contains(TOOLBAR_HIDDEN_CLASSES[0]);
      toolbar.classList.toggle(TOOLBAR_HIDDEN_CLASSES[0], hidden);
      toolbar.classList.toggle(TOOLBAR_HIDDEN_CLASSES[1], hidden);
      toolbar.classList.toggle(TOOLBAR_HIDDEN_CLASSES[2], hidden);
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
