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

export class Toolbar {
  readonly elements: HTMLElement[];
  private toolbar!: HTMLElement;
  private modeButton!: HTMLButtonElement;
  private readDirectionButton!: HTMLButtonElement;
  private rightTapButton!: HTMLButtonElement;
  private pageNumberLabel!: HTMLElement;
  private progressInput!: HTMLInputElement;
  private disableReaderButton!: HTMLButtonElement;

  constructor(
    private readonly handlers: {
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
    const topbar = (
      <div className="ehpeek-topbar" onClick={stopEvent} onPointerDown={stopEvent} onWheel={stopEvent}>
        <div className="ehpeek-actions">
          <button
            type="button"
            className="ehpeek-button ehpeek-direction-button ehpeek-control-hidden"
            ref={(node: HTMLButtonElement) => (this.readDirectionButton = node)}
            onClick={handlers.onReadDirectionClick}
          />
          <button
            type="button"
            className="ehpeek-button ehpeek-direction-button ehpeek-control-hidden"
            ref={(node: HTMLButtonElement) => (this.rightTapButton = node)}
            onClick={handlers.onRightTapClick}
          />
          <button
            type="button"
            className="ehpeek-button ehpeek-control-hidden"
            ref={(node: HTMLButtonElement) => (this.modeButton = node)}
            onClick={handlers.onModeClick}
          />
          <button
            type="button"
            className="ehpeek-button ehpeek-disable-button ehpeek-control-hidden"
            title={texts.reader.disableReader}
            ref={(node: HTMLButtonElement) => (this.disableReaderButton = node)}
            onClick={handlers.onDisableReaderClick}
          >
            off
          </button>
          <button type="button" className="ehpeek-button" title={texts.reader.close} onClick={handlers.onCloseClick}>
            X
          </button>
        </div>
      </div>
    ) as HTMLElement;
    const pageNumber = <div className="ehpeek-pageno" ref={(node: HTMLElement) => (this.pageNumberLabel = node)} /> as HTMLElement;
    const progress = (
      <div
        className="ehpeek-progressbar ehpeek-toolbar-hidden"
        ref={(node: HTMLElement) => (this.toolbar = node)}
        onClick={stopEvent}
        onPointerDown={stopEvent}
        onWheel={stopEvent}
      >
        <input
          type="range"
          className="ehpeek-progress"
          min="1"
          step="1"
          ref={(node: HTMLInputElement) => (this.progressInput = node)}
          onPointerDown={handlers.onProgressPointerDown}
          onInput={handlers.onProgressInput}
          onChange={handlers.onProgressCommit}
          onPointerUp={handlers.onProgressCommit}
          onPointerCancel={handlers.onProgressCommit}
        />
      </div>
    ) as HTMLElement;

    this.elements = [topbar, pageNumber, progress];
  }

  setControls(controls: ReaderControls): void {
    this.setModeButton(controls.mode);
    this.setReadDirectionButton(controls.readDirection);
    this.setRightTapButton(controls.rightTapAction);
  }

  setProgress(progress: PageProgress): void {
    this.pageNumberLabel.textContent = this.pageNumberText(progress.pageNum, progress.totalPages);
    this.progressInput.max = String(Math.max(1, progress.maxProgressPageNum));

    if (!progress.keepInputValue) {
      this.progressInput.value = String(progress.pageNum);
    }

    this.setProgressFill(this.progressFillPercent(progress.pageNum));
  }

  progressValue(): number {
    return Number(this.progressInput.value || "");
  }

  toggle(): boolean {
    const hidden = this.toolbar.classList.toggle("ehpeek-toolbar-hidden");
    this.modeButton.classList.toggle("ehpeek-control-hidden", hidden);
    this.readDirectionButton.classList.toggle("ehpeek-control-hidden", hidden);
    this.rightTapButton.classList.toggle("ehpeek-control-hidden", hidden);
    this.disableReaderButton.classList.toggle("ehpeek-control-hidden", hidden);
    this.onToolbarOpenChange(!hidden);
    return hidden;
  }

  private setModeButton(mode: ViewMode): void {
    const paged = mode === "paged";
    this.modeButton.textContent = paged ? "⇔" : "⇕";
    this.modeButton.title = paged ? texts.reader.scrollMode : texts.reader.pagedMode;
  }

  private setReadDirectionButton(direction: ReadDirection): void {
    const rtl = direction === "rtl";
    this.readDirectionButton.textContent = rtl ? "RL" : "LR";
    this.readDirectionButton.title = rtl ? texts.reader.readLeftToRight : texts.reader.readRightToLeft;
  }

  private setRightTapButton(action: RightTapAction): void {
    const previous = action === "previous";
    this.rightTapButton.textContent = previous ? "R-" : "R+";
    this.rightTapButton.title = previous ? texts.reader.rightTapNext : texts.reader.rightTapPrevious;
  }

  private progressRange(): { min: number; max: number } {
    return {
      min: Number(this.progressInput.min || "1"),
      max: Number(this.progressInput.max || "1"),
    };
  }

  private setProgressFill(fillPercent: number): void {
    this.progressInput.style.setProperty("--ehpeek-progress-fill", `${fillPercent}%`);
  }

  private pageNumberText(pageNum: number, totalPages: number | undefined): string {
    if (totalPages && pageNum === totalPages + 1) {
      return texts.reader.endPage;
    }

    return totalPages ? `${pageNum} / ${totalPages}` : String(pageNum);
  }

  private progressFillPercent(pageNum: number): number {
    const { min, max } = this.progressRange();
    const value = Math.min(max, Math.max(min, pageNum));
    return max > min ? ((value - min) / (max - min)) * 100 : 100;
  }
}
