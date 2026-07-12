import { DomData, h } from "../../jsx";
import type { ReadDirection, ViewMode } from "../../state";
import readerCss from "./Reader.css";

const VIEWER_ID = "ehpeek-reader";
const STYLE_ID = "ehpeek-reader-style";
const DEFAULT_READ_DIRECTION: ReadDirection = "rtl";
const DEFAULT_TOOLBAR_OPEN = false;
const DEFAULT_VIEW_MODE: ViewMode = "scroll";

export class ReaderRoot {
  readonly element: HTMLElement;
  private readonly readDirection = new DomData<ReadDirection>();
  private readonly toolbarOpen = new DomData<boolean>();
  private readonly viewMode = new DomData<ViewMode>();
  private previousBodyOverflow = "";
  private previousDocumentOverflow = "";

  constructor(children: HTMLElement[]) {
    this.element = (
      <div
        id={VIEWER_ID}
        className="fixed inset-0 z-[2147483647] bg-[#070707] color-reader-text font-sans text-13px leading-[1.4]"
        data-read-direction={this.readDirection.bind(DEFAULT_READ_DIRECTION)}
        data-toolbar-open={this.toolbarOpen.bind(DEFAULT_TOOLBAR_OPEN)}
        data-view-mode={this.viewMode.bind(DEFAULT_VIEW_MODE)}
      >
        {children}
      </div>
    ) as HTMLElement;
  }

  mount(focusTarget?: HTMLElement): void {
    document.getElementById(VIEWER_ID)?.remove();
    ensureReaderStyle();
    this.lockPageScroll();
    document.body.append(this.element);
    focusTarget?.focus({ preventScroll: true });
  }

  remove(): void {
    this.element.remove();
    this.unlockPageScroll();
  }

  setMode(mode: ViewMode): void {
    this.viewMode.value = mode;
  }

  setReadDirection(direction: ReadDirection): void {
    this.readDirection.value = direction;
  }

  setToolbarOpen(open: boolean): void {
    this.toolbarOpen.value = open;
  }

  private lockPageScroll(): void {
    this.previousDocumentOverflow = document.documentElement.style.overflow;
    this.previousBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  }

  private unlockPageScroll(): void {
    document.documentElement.style.overflow = this.previousDocumentOverflow;
    document.body.style.overflow = this.previousBodyOverflow;
  }
}

function ensureReaderStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = readerCss;
  document.head.append(style);
}
