import { h } from "../../jsx";
import { clamp } from "../../utils";
import { PointerDrag, type PointerDragTap } from "../common/pointerDrag";

export const SCROLL_PAGE_BAR_CLASS = "ehpeek-scroll-page-bar";
export const SCROLL_PAGE_BAR_TOP_CLASS = "ehpeek-scroll-page-bar-top";
export const SCROLL_PAGE_BAR_BOTTOM_CLASS = "ehpeek-scroll-page-bar-bottom";
export const SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR = "data-ehpeek-window-index";

const DRAG_PIXEL_STEP = 18;
const PAGE_BAR_BOTTOM_CLASS = "mt-0 mb-10px";
const PAGE_BAR_CELL_CLASS = "control-page p-0 cursor-pointer text-center align-middle select-none";
const PAGE_BAR_CLASS = "relative w-max mx-auto touch-pan-y";
const PAGE_BAR_LINK_CLASS = "flex control-page items-center justify-center box-border px-0 py-0 border border-current bg-transparent textsize-sm font-inherit no-underline hover:no-underline active:no-underline";
const PAGE_BAR_TABLE_CLASS = "border-separate border-spacing-4px touch:border-spacing-6px";
const PAGE_BAR_TOP_CLASS = "mt-2px mb-0";
let galleryPageBarWindowIndex: number | null = null;

type PageBarSlot =
  | {
      type: "page";
      pageIndex: number;
    };

export type ScrollPageBarOptions = {
  currentIndex: number;
  initialWindowIndex?: number;
  maxIndex: number | null;
  top: boolean;
  urlForIndex: (index: number) => string;
};

function scrollPageBarDom(top: boolean) {
  const body = <tbody /> as HTMLTableSectionElement;
  const table = <table className={PAGE_BAR_TABLE_CLASS}>{body}</table> as HTMLTableElement;
  const overlay = <div className="absolute inset-0 z-1 cursor-pointer bg-transparent" aria-hidden="true" /> as HTMLDivElement;
  const element = (
    <div className={`${SCROLL_PAGE_BAR_CLASS} ${PAGE_BAR_CLASS} ${top ? `${SCROLL_PAGE_BAR_TOP_CLASS} ${PAGE_BAR_TOP_CLASS}` : `${SCROLL_PAGE_BAR_BOTTOM_CLASS} ${PAGE_BAR_BOTTOM_CLASS}`}`}>
      {table}
      {overlay}
    </div>
  ) as HTMLDivElement;

  return {
    element,
    render(row: HTMLTableRowElement, windowIndex: number) {
      body.replaceChildren(row);
      element.setAttribute(SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR, String(windowIndex));
    },
    setDragging(dragging: boolean) {
      element.classList.toggle("ehpeek-scroll-page-bar-dragging", dragging);
    },
    linkAt(clientX: number, clientY: number): HTMLAnchorElement | null {
      overlay.style.pointerEvents = "none";
      const target = document.elementFromPoint(clientX, clientY);
      overlay.style.pointerEvents = "";
      const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[data-page-index]") : null;

      return link && element.contains(link) ? link : null;
    },
  };
}

function pageBarRowDom(options: {
  currentAfterWindow: boolean;
  currentBeforeWindow: boolean;
  currentIndex: number;
  maxIndex: number;
  slots: Array<PageBarSlot | null>;
  urlForIndex: (index: number) => string;
}): HTMLTableRowElement {
  const { currentAfterWindow, currentBeforeWindow, currentIndex, maxIndex, slots, urlForIndex } = options;

  return (
    <tr>
      {pageBarLinkCellDom("<<", 0, currentIndex === 0, urlForIndex)}
      {currentBeforeWindow ? pageBarLinkCellDom(String(currentIndex + 1), currentIndex, true, urlForIndex) : pageBarEmptyCellDom()}
      {pageBarLinkCellDom("<", Math.max(0, currentIndex - 1), currentIndex === 0, urlForIndex)}
      {slots.map((slot) =>
        slot ? pageBarLinkCellDom(String(slot.pageIndex + 1), slot.pageIndex, slot.pageIndex === currentIndex, urlForIndex) : pageBarEmptyCellDom(),
      )}
      {pageBarLinkCellDom(">", Math.min(maxIndex, currentIndex + 1), currentIndex === maxIndex, urlForIndex)}
      {currentAfterWindow ? pageBarLinkCellDom(String(currentIndex + 1), currentIndex, true, urlForIndex) : pageBarEmptyCellDom()}
      {pageBarLinkCellDom(">>", maxIndex, currentIndex === maxIndex, urlForIndex)}
    </tr>
  ) as HTMLTableRowElement;
}

function pageBarLinkCellDom(text: string, pageIndex: number, current: boolean, urlForIndex: (index: number) => string): HTMLTableCellElement {
  if (current) {
    return (
      <td className={`ptds ${PAGE_BAR_CELL_CLASS}`}>
        <span className={PAGE_BAR_LINK_CLASS}>{text}</span>
      </td>
    ) as HTMLTableCellElement;
  }

  return (
    <td className={PAGE_BAR_CELL_CLASS}>
      <a className={PAGE_BAR_LINK_CLASS} href={urlForIndex(pageIndex)} data-page-index={String(pageIndex)}>
        {text}
      </a>
    </td>
  ) as HTMLTableCellElement;
}

function pageBarEmptyCellDom(): HTMLTableCellElement {
  return (
    <td className={`ehpeek-scroll-page-bar-empty ${PAGE_BAR_CELL_CLASS} cursor-default`}>
      <span className={`${PAGE_BAR_LINK_CLASS} invisible`} />
    </td>
  ) as HTMLTableCellElement;
}

export class ScrollPageBar {
  readonly element: HTMLDivElement;
  private readonly dom: ReturnType<typeof scrollPageBarDom>;
  private readonly currentIndex: number;
  private readonly maxIndex: number;
  private readonly urlForIndex: (index: number) => string;
  private windowIndex: number;
  private dragStartWindowIndex = 0;

  constructor(options: ScrollPageBarOptions) {
    const maxIndex = Math.max(0, options.maxIndex ?? options.currentIndex);
    const currentIndex = clamp(options.currentIndex, 0, maxIndex);
    this.currentIndex = currentIndex;
    this.maxIndex = maxIndex;
    this.urlForIndex = options.urlForIndex;
    this.windowIndex = clamp(galleryPageBarWindowIndex ?? options.initialWindowIndex ?? currentIndex, 0, maxIndex);
    this.dom = scrollPageBarDom(options.top);
    this.element = this.dom.element;
    this.render();
    this.installDrag();
  }

  private render(): void {
    const slots = pageSlots(this.windowIndex, this.currentIndex, this.maxIndex);
    const firstSlotIndex = slots[0]?.pageIndex ?? this.currentIndex;
    const lastSlotIndex = slots[slots.length - 1]?.pageIndex ?? this.currentIndex;
    const currentBeforeWindow = this.currentIndex < firstSlotIndex;
    const currentAfterWindow = this.currentIndex > lastSlotIndex;
    const row = pageBarRowDom({
      currentAfterWindow,
      currentBeforeWindow,
      currentIndex: this.currentIndex,
      maxIndex: this.maxIndex,
      slots,
      urlForIndex: this.urlForIndex,
    });

    this.dom.render(row, this.windowIndex);
  }

  private installDrag(): void {
    new PointerDrag(this.element, {
      shouldStart: () => this.draggable(),
      onStart: () => {
        this.dragStartWindowIndex = this.windowIndex;
        this.dom.setDragging(true);
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
        this.dom.setDragging(false);
      },
      onTap: (info) => this.tapPageLink(info),
    });
  }

  private draggable(): boolean {
    return this.maxIndex + 1 > 7;
  }

  private tapPageLink(info: PointerDragTap): void {
    const link = this.dom.linkAt(info.clientX, info.clientY);

    if (!link) {
      return;
    }

    link.click();
  }
}

export function createScrollPageBar(options: ScrollPageBarOptions): HTMLDivElement {
  return new ScrollPageBar(options).element;
}

export function setScrollPageBarWindowIndex(index: number): void {
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
