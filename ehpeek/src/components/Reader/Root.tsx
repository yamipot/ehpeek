import { h } from "../../jsx";
import type { ReadDirection, ViewMode } from "../../state";
import readerCss from "./Reader.css";

const VIEWER_ID = "ehpeek-reader";
const STYLE_ID = "ehpeek-reader-style";

export class ReaderRoot {
  readonly element: HTMLElement;
  private previousBodyOverflow = "";
  private previousDocumentOverflow = "";

  constructor(children: HTMLElement[]) {
    this.element = <div id={VIEWER_ID}>{children}</div> as HTMLElement;
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
    this.element.classList.toggle("ehpeek-paged", mode === "paged");
  }

  setReadDirection(direction: ReadDirection): void {
    this.element.classList.toggle("ehpeek-read-rtl", direction === "rtl");
    this.element.classList.toggle("ehpeek-read-ltr", direction === "ltr");
  }

  setToolbarOpen(open: boolean): void {
    this.element.classList.toggle("ehpeek-toolbar-open", open);
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
