import { h } from "preact";
import { useRef, useState } from "preact/hooks";
import { clamp } from "../../utils";
import { usePointerGestureElement } from "../PointerGestureSurface";

export const SCROLL_PAGE_BAR_CLASS = "ehpeek-scroll-page-bar";
export const SCROLL_PAGE_BAR_TOP_CLASS = "ehpeek-scroll-page-bar-top";
export const SCROLL_PAGE_BAR_BOTTOM_CLASS = "ehpeek-scroll-page-bar-bottom";
export const SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR = "data-ehpeek-window-index";

const DRAG_PIXEL_STEP = 18;
const PAGE_BAR_BOTTOM_CLASS = "mt-0 mb-10px";
const PAGE_BAR_CELL_CLASS = "w-sm h-sm touch:w-md touch:h-md p-0 rounded-sm touch:rounded-md cursor-pointer text-center align-middle select-none";
const PAGE_BAR_CLASS = "w-max mx-auto touch-pan-y [&[data-dragging=true]]:select-none";
const PAGE_BAR_LINK_CLASS = "flex w-sm h-sm touch:w-md touch:h-md items-center justify-center box-border px-0 py-0 rounded-sm touch:rounded-md border border-current bg-transparent textsize-xs font-inherit no-underline hover:no-underline active:no-underline";
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

export function ScrollPageBar(options: ScrollPageBarOptions & { element: HTMLDivElement }) {
  const maxIndex = Math.max(0, options.maxIndex ?? options.currentIndex);
  const currentIndex = clamp(options.currentIndex, 0, maxIndex);
  const [windowIndex, setWindowIndex] = useState(() =>
    clamp(galleryPageBarWindowIndex ?? options.initialWindowIndex ?? currentIndex, 0, maxIndex),
  );
  const dragStartWindowIndex = useRef(windowIndex);
  const draggable = () => maxIndex + 1 > 7;
  const slots = pageSlots(windowIndex, currentIndex, maxIndex);
  const firstSlotIndex = slots[0]?.pageIndex ?? currentIndex;
  const lastSlotIndex = slots[slots.length - 1]?.pageIndex ?? currentIndex;
  const currentBeforeWindow = currentIndex < firstSlotIndex;
  const currentAfterWindow = currentIndex > lastSlotIndex;
  const linkCell = (text: string, pageIndex: number, current: boolean) => {
    if (current) {
      return (
        <td className={`ptds ${PAGE_BAR_CELL_CLASS}`}>
          <span className={PAGE_BAR_LINK_CLASS}>{text}</span>
        </td>
      );
    }

    return (
      <td className={PAGE_BAR_CELL_CLASS}>
        <a className={PAGE_BAR_LINK_CLASS} href={options.urlForIndex(pageIndex)} data-page-index={String(pageIndex)}>
          {text}
        </a>
      </td>
    );
  };
  const emptyCell = () => (
    <td className={`${PAGE_BAR_CELL_CLASS} cursor-default`}>
      <span className={`${PAGE_BAR_LINK_CLASS} invisible`} />
    </td>
  );

  options.element.className = `${SCROLL_PAGE_BAR_CLASS} ${PAGE_BAR_CLASS} ${options.top ? `${SCROLL_PAGE_BAR_TOP_CLASS} ${PAGE_BAR_TOP_CLASS}` : `${SCROLL_PAGE_BAR_BOTTOM_CLASS} ${PAGE_BAR_BOTTOM_CLASS}`}`;
  options.element.setAttribute(SCROLL_PAGE_BAR_WINDOW_INDEX_ATTR, String(windowIndex));

  usePointerGestureElement(options.element, {
    shouldCaptureDrag: draggable,
    dragAxis: "x",
    onStart: () => {
      dragStartWindowIndex.current = windowIndex;
    },
    onMove: (info) => {
      if (Math.abs(info.dx) < Math.abs(info.dy)) {
        return;
      }

      const nextIndex = clamp(dragStartWindowIndex.current - acceleratedPageOffset(info.dx), 0, maxIndex);

      if (nextIndex === windowIndex) {
        return;
      }

      galleryPageBarWindowIndex = nextIndex;
      setWindowIndex(nextIndex);
    },
  });

  return (
    <table className={PAGE_BAR_TABLE_CLASS}>
      <tbody>
        <tr>
          {linkCell("<<", 0, currentIndex === 0)}
          {currentBeforeWindow ? linkCell(String(currentIndex + 1), currentIndex, true) : emptyCell()}
          {linkCell("<", Math.max(0, currentIndex - 1), currentIndex === 0)}
          {slots.map((slot) => (slot ? linkCell(String(slot.pageIndex + 1), slot.pageIndex, slot.pageIndex === currentIndex) : emptyCell()))}
          {linkCell(">", Math.min(maxIndex, currentIndex + 1), currentIndex === maxIndex)}
          {currentAfterWindow ? linkCell(String(currentIndex + 1), currentIndex, true) : emptyCell()}
          {linkCell(">>", maxIndex, currentIndex === maxIndex)}
        </tr>
      </tbody>
    </table>
  );
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
