import { createMemo, For, untrack } from "solid-js";
import { clamp } from "../../utils";
import { createPointerGestureElement } from "../PointerGesture";
import type { ManagedDomNode } from "../../eh";

const SCROLL_PAGE_BAR_CLASS = "ehpeek-scroll-page-bar";
const SCROLL_PAGE_BAR_TOP_CLASS = "ehpeek-scroll-page-bar-top";
const SCROLL_PAGE_BAR_BOTTOM_CLASS = "ehpeek-scroll-page-bar-bottom";

const DRAG_PIXEL_STEP = 18;
const PAGE_BAR_BOTTOM_CLASS = "mt-0 mb-10px";
const PAGE_BAR_CELL_CLASS = "!w-sm !h-sm coarse:!w-md coarse:!h-md !p-0 rounded-sm coarse:rounded-md cursor-pointer text-center align-middle select-none";
const PAGE_BAR_CLASS = "w-max mx-auto touch-pan-y [&[data-dragging=true]]:select-none";
const PAGE_BAR_LINK_CLASS = "flex !w-sm !h-sm coarse:!w-md coarse:!h-md items-center justify-center box-border !p-0 rounded-sm coarse:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline";
const PAGE_BAR_LINK_COLOR_CLASS = "!border-transparent !bg-transparent !text-[var(--color-site-text)] visited:!text-[var(--color-site-text)] hover:!bg-[var(--color-site-item-hover)] hover:!text-[var(--color-site-text)] active:!text-[var(--color-site-text)]";
const PAGE_BAR_CURRENT_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)]";
const PAGE_BAR_DISABLED_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)] opacity-40 cursor-default";
const PAGE_BAR_TABLE_CLASS = "border-separate border-spacing-4px coarse:border-spacing-6px";
const PAGE_BAR_TOP_CLASS = "mt-2px mb-0";

type PageBarItemState = "link" | "current" | "disabled";

type ScrollPageBarOptions = {
  currentIndex: number;
  maxIndex: number | null;
  onNavigate: (previewIndex: number, scrollToPageBar: "bottom" | "top") => void;
  onWindowIndexChange: (index: number) => void;
  top: boolean;
  urlForIndex: (index: number) => string;
  windowIndex: () => number | null;
};

export function GalleryPageDescription(props: { text: string }) {
  return <div class="w-full mb-xs text-center textsize-sm">{props.text}</div>;
}

export function ScrollPageBar(options: ScrollPageBarOptions & { element: ManagedDomNode<HTMLDivElement> }) {
  const maxIndex = createMemo(() => Math.max(0, options.maxIndex ?? options.currentIndex));
  const currentIndex = createMemo(() => clamp(options.currentIndex, 0, maxIndex()));
  const windowIndex = createMemo(() => clamp(options.windowIndex() ?? currentIndex(), 0, maxIndex()));
  let dragStartWindowIndex = untrack(windowIndex);
  const draggable = () => maxIndex() + 1 > 7;
  const slots = createMemo(() => pageSlots(windowIndex(), currentIndex(), maxIndex()));
  const firstSlotIndex = createMemo(() => slots()[0] ?? currentIndex());
  const lastSlotIndex = createMemo(() => slots()[slots().length - 1] ?? currentIndex());
  const currentBeforeWindow = () => currentIndex() < firstSlotIndex();
  const currentAfterWindow = () => currentIndex() > lastSlotIndex();
  const scrollTargetForIndex = (pageIndex: number): "bottom" | "top" =>
    pageIndex === currentIndex() - 1 || pageIndex === maxIndex() ? "bottom" : "top";
  const linkCell = (text: string, pageIndex: number, itemState: PageBarItemState = "link") => {
    if (itemState !== "link") {
      return (
        <td class={PAGE_BAR_CELL_CLASS}>
          <span
            class={`${PAGE_BAR_LINK_CLASS} ${itemState === "current" ? PAGE_BAR_CURRENT_COLOR_CLASS : PAGE_BAR_DISABLED_COLOR_CLASS}`}
            aria-current={itemState === "current" ? "page" : undefined}
            aria-disabled={itemState === "disabled" ? "true" : undefined}
          >
            {text}
          </span>
        </td>
      );
    }

    return (
      <td class={PAGE_BAR_CELL_CLASS}>
        <a
          class={`${PAGE_BAR_LINK_CLASS} ${PAGE_BAR_LINK_COLOR_CLASS}`}
          data-ehpeek-single-page-bypass=""
          href={options.urlForIndex(pageIndex)}
          draggable={false}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            options.onNavigate(
              pageIndex,
              scrollTargetForIndex(pageIndex),
            );
          }}
        >
          {text}
        </a>
      </td>
    );
  };
  const emptyCell = () => (
    <td class={`${PAGE_BAR_CELL_CLASS} cursor-default`}>
      <span class={`${PAGE_BAR_LINK_CLASS} ${PAGE_BAR_LINK_COLOR_CLASS} invisible`} />
    </td>
  );

  untrack(() => {
    options.element.transform({
      classes: {
        replace: `${SCROLL_PAGE_BAR_CLASS} ${PAGE_BAR_CLASS} ${options.top ? `${SCROLL_PAGE_BAR_TOP_CLASS} ${PAGE_BAR_TOP_CLASS}` : `${SCROLL_PAGE_BAR_BOTTOM_CLASS} ${PAGE_BAR_BOTTOM_CLASS}`}`,
      },
    });
  });

  createPointerGestureElement(
    () => options.element.Component(),
    () => ({
      shouldCaptureDrag: draggable,
      dragAxis: "x",
      onStart: () => {
        dragStartWindowIndex = windowIndex();
      },
      onMove: (info) => {
        if (Math.abs(info.dx) < Math.abs(info.dy)) {
          return;
        }

        const nextIndex = clamp(dragStartWindowIndex - acceleratedPageOffset(info.dx), 0, maxIndex());

        if (nextIndex === windowIndex()) {
          return;
        }

        options.onWindowIndexChange(nextIndex);
      },
    }),
  );

  return (
    <table class={PAGE_BAR_TABLE_CLASS}>
      <tbody>
        <tr>
          {linkCell("<<", 0, currentIndex() === 0 ? "disabled" : "link")}
          {currentBeforeWindow() ? linkCell(String(currentIndex() + 1), currentIndex(), "current") : emptyCell()}
          {linkCell("<", Math.max(0, currentIndex() - 1), currentIndex() === 0 ? "disabled" : "link")}
          <For each={slots()}>{(pageIndex) =>
            pageIndex !== null ? linkCell(String(pageIndex + 1), pageIndex, pageIndex === currentIndex() ? "current" : "link") : emptyCell()
          }</For>
          {linkCell(">", Math.min(maxIndex(), currentIndex() + 1), currentIndex() === maxIndex() ? "disabled" : "link")}
          {currentAfterWindow() ? linkCell(String(currentIndex() + 1), currentIndex(), "current") : emptyCell()}
          {linkCell(">>", maxIndex(), currentIndex() === maxIndex() ? "disabled" : "link")}
        </tr>
      </tbody>
    </table>
  );
}

function pageSlots(windowIndex: number, currentIndex: number, maxIndex: number): Array<number | null> {
  if (maxIndex + 1 <= 7) {
    return range(0, maxIndex);
  }

  const windowStart = clamp(windowIndex - 3, -1, maxIndex - 5);
  return range(windowStart, windowStart + 6).map((pageIndex) =>
    pageIndex >= 0 && pageIndex <= maxIndex ? pageIndex : null,
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
