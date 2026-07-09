import { h } from "../jsx";
import { clamp } from "../utils";
import { PointerDrag } from "./common/pointerDrag";

export const BETTER_PAGE_BAR_CLASS = "ehpeek-better-page-bar";
export const BETTER_PAGE_BAR_TOP_CLASS = "ehpeek-better-page-bar-top";
export const BETTER_PAGE_BAR_BOTTOM_CLASS = "ehpeek-better-page-bar-bottom";
export const BETTER_PAGE_BAR_WINDOW_INDEX_ATTR = "data-ehpeek-window-index";

const DRAG_PIXEL_STEP = 18;
let galleryPageBarWindowIndex: number | null = null;

type PageBarSlot =
  | {
      type: "page";
      pageIndex: number;
    };

export type BetterPageBarOptions = {
  currentIndex: number;
  initialWindowIndex?: number;
  maxIndex: number | null;
  top: boolean;
  urlForIndex: (index: number) => string;
};

export class BetterPageBar {
  readonly element: HTMLTableElement;
  private readonly currentIndex: number;
  private readonly maxIndex: number;
  private readonly urlForIndex: (index: number) => string;
  private windowIndex: number;
  private dragStartWindowIndex = 0;

  constructor(options: BetterPageBarOptions) {
    const maxIndex = Math.max(0, options.maxIndex ?? options.currentIndex);
    const currentIndex = clamp(options.currentIndex, 0, maxIndex);
    this.currentIndex = currentIndex;
    this.maxIndex = maxIndex;
    this.urlForIndex = options.urlForIndex;
    this.windowIndex = clamp(galleryPageBarWindowIndex ?? options.initialWindowIndex ?? currentIndex, 0, maxIndex);

    this.element = (
      <table className={`${BETTER_PAGE_BAR_CLASS} ${options.top ? BETTER_PAGE_BAR_TOP_CLASS : BETTER_PAGE_BAR_BOTTOM_CLASS}`}>
        <tbody />
      </table>
    ) as HTMLTableElement;
    this.render();
    this.installDrag();
  }

  private render(): void {
    const body = this.element.tBodies[0] ?? this.element.createTBody();
    const slots = pageSlots(this.windowIndex, this.currentIndex, this.maxIndex);
    const firstSlotIndex = slots[0]?.pageIndex ?? this.currentIndex;
    const lastSlotIndex = slots[slots.length - 1]?.pageIndex ?? this.currentIndex;
    const currentBeforeWindow = this.currentIndex < firstSlotIndex;
    const currentAfterWindow = this.currentIndex > lastSlotIndex;
    const row = (
      <tr>
        {this.linkCell("<<", 0, this.currentIndex === 0)}
        {currentBeforeWindow ? this.linkCell(String(this.currentIndex + 1), this.currentIndex, true) : this.emptyCell()}
        {this.linkCell("<", Math.max(0, this.currentIndex - 1), this.currentIndex === 0)}
        {slots.map((slot) =>
          slot ? this.linkCell(String(slot.pageIndex + 1), slot.pageIndex, slot.pageIndex === this.currentIndex) : this.emptyCell(),
        )}
        {this.linkCell(">", Math.min(this.maxIndex, this.currentIndex + 1), this.currentIndex === this.maxIndex)}
        {currentAfterWindow ? this.linkCell(String(this.currentIndex + 1), this.currentIndex, true) : this.emptyCell()}
        {this.linkCell(">>", this.maxIndex, this.currentIndex === this.maxIndex)}
      </tr>
    ) as HTMLTableRowElement;

    body.replaceChildren(row);
    this.element.setAttribute(BETTER_PAGE_BAR_WINDOW_INDEX_ATTR, String(this.windowIndex));
  }

  private linkCell(text: string, pageIndex: number, current: boolean): HTMLTableCellElement {
    if (current) {
      return (
        <td className="ptds">
          <span>{text}</span>
        </td>
      ) as HTMLTableCellElement;
    }

    return (
      <td>
        <a href={this.urlForIndex(pageIndex)} data-page-index={String(pageIndex)}>
          {text}
        </a>
      </td>
    ) as HTMLTableCellElement;
  }

  private emptyCell(): HTMLTableCellElement {
    return (
      <td className="ehpeek-better-page-bar-empty">
        <span />
      </td>
    ) as HTMLTableCellElement;
  }

  private installDrag(): void {
    new PointerDrag(this.element, {
      shouldStart: () => this.draggable(),
      onStart: () => {
        this.dragStartWindowIndex = this.windowIndex;
        this.element.classList.add("ehpeek-better-page-bar-dragging");
      },
      onMove: (info) => {
        if (Math.abs(info.dx) < Math.abs(info.dy)) {
          return;
        }

        const nextIndex = clamp(this.dragStartWindowIndex - acceleratedPageOffset(info.dx), 0, this.maxIndex);

        if (nextIndex === this.windowIndex) {
          return;
        }

        this.windowIndex = nextIndex;
        galleryPageBarWindowIndex = nextIndex;
        this.render();
      },
      onEnd: () => {
        this.element.classList.remove("ehpeek-better-page-bar-dragging");
      },
    });
  }

  private draggable(): boolean {
    return this.maxIndex + 1 > 7;
  }
}

export function createBetterPageBar(options: BetterPageBarOptions): HTMLTableElement {
  return new BetterPageBar(options).element;
}

export function setBetterPageBarWindowIndex(index: number): void {
  galleryPageBarWindowIndex = Math.max(0, Math.round(index));
}

function pageSlots(windowIndex: number, currentIndex: number, maxIndex: number): Array<PageBarSlot | null> {
  if (maxIndex + 1 <= 7) {
    return range(0, maxIndex).map((pageIndex) => ({ type: "page", pageIndex }));
  }

  const windowStart = clamp(windowIndex - 3, -1, maxIndex - 5);
  return range(windowStart, windowStart + 6).map((pageIndex) =>
    pageIndex >= 0 && pageIndex <= maxIndex ? { type: "page", pageIndex } : null,
  );
}

function range(start: number, end: number): number[] {
  const output: number[] = [];

  for (let index = start; index <= end; index += 1) {
    output.push(index);
  }

  return output;
}

function acceleratedPageOffset(dx: number): number {
  const distance = Math.abs(dx);
  const direction = dx > 0 ? 1 : -1;
  const pages = Math.floor((distance / DRAG_PIXEL_STEP) ** 1.35);

  return direction * pages;
}
