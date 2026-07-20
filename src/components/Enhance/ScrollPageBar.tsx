import { createEffect, createMemo, createSignal, For, Show, untrack } from "solid-js";
import { clamp } from "../../utils";
import { createPointerGestureElement } from "../PointerGesture";

const DRAG_PIXEL_STEP = 18;
const PAGE_BAR_CELL_CLASS = "!w-sm !h-sm coarse:!w-md coarse:!h-md !p-0 rounded-sm coarse:rounded-md cursor-pointer text-center align-middle select-none";
const PAGE_BAR_LINK_CLASS = "flex !w-sm !h-sm coarse:!w-md coarse:!h-md items-center justify-center box-border !p-0 rounded-sm coarse:rounded-md !border textsize-sm font-inherit no-underline hover:no-underline active:no-underline";
const PAGE_BAR_LINK_COLOR_CLASS = "!border-transparent !bg-transparent !text-[var(--color-site-text)] visited:!text-[var(--color-site-text)] hover:!bg-[var(--color-site-item-hover)] hover:!text-[var(--color-site-text)] active:!text-[var(--color-site-text)]";
const PAGE_BAR_CURRENT_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)]";
const PAGE_BAR_DISABLED_COLOR_CLASS = "!border-transparent !bg-[color-mix(in_srgb,var(--color-site-page)_82%,black)] !text-[var(--color-site-text)] opacity-40 cursor-default";
const PAGE_BAR_TABLE_CLASS = "border-separate border-spacing-4px coarse:border-spacing-6px";

type PageBarItemState = "link" | "current" | "disabled";

export function GalleryPageDescription(props: { text: string }) {
  return <div class="w-full mb-xs text-center textsize-sm">{props.text}</div>;
}

export function ScrollPageBar(props: {
  currentIndex: number;
  maxIndex: number;
  urlForIndex: (index: number) => string;
  onNavigate: (previewIndex: number, scrollToPageBar: "bottom" | "top") => void;
}) {
  const maxIndex = createMemo(() => Math.max(0, props.maxIndex));
  const currentIndex = createMemo(() => clamp(props.currentIndex, 0, maxIndex()));
  const [visibleCenterIndex, setVisibleCenterIndex] = createSignal(untrack(currentIndex));
  let gestureHost!: HTMLDivElement;
  let dragStartVisibleCenterIndex = untrack(visibleCenterIndex);
  const draggable = () => maxIndex() + 1 > 7;
  const slots = createMemo(() => pageSlots(visibleCenterIndex(), maxIndex()));
  const firstSlotIndex = createMemo(() => slots()[0] ?? currentIndex());
  const lastSlotIndex = createMemo(() => slots()[slots().length - 1] ?? currentIndex());
  const currentBeforeWindow = () => currentIndex() < firstSlotIndex();
  const currentAfterWindow = () => currentIndex() > lastSlotIndex();
  const scrollTargetForIndex = (pageIndex: number): "bottom" | "top" =>
    pageIndex === currentIndex() - 1 || pageIndex === maxIndex() ? "bottom" : "top";

  createEffect(() => {
    setVisibleCenterIndex(currentIndex());
  });
  const linkCell = (
    text: string | (() => string),
    pageIndex: number | (() => number),
    itemState: () => PageBarItemState = () => "link",
  ) => {
    const resolvedText = (): string => typeof text === "function" ? text() : text;
    const resolvedPageIndex = (): number => typeof pageIndex === "function" ? pageIndex() : pageIndex;

    return <td class={PAGE_BAR_CELL_CLASS}>
      <Show
        when={itemState() === "link"}
        fallback={
          <span
            class={`${PAGE_BAR_LINK_CLASS} ${itemState() === "current" ? PAGE_BAR_CURRENT_COLOR_CLASS : PAGE_BAR_DISABLED_COLOR_CLASS}`}
            aria-current={itemState() === "current" ? "page" : undefined}
            aria-disabled={itemState() === "disabled" ? "true" : undefined}
          >
            {resolvedText()}
          </span>
        }
      >
        <a
          class={`${PAGE_BAR_LINK_CLASS} ${PAGE_BAR_LINK_COLOR_CLASS}`}
          data-ehpeek-single-page-bypass=""
          href={props.urlForIndex(resolvedPageIndex())}
          draggable={false}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            props.onNavigate(
              resolvedPageIndex(),
              scrollTargetForIndex(resolvedPageIndex()),
            );
          }}
        >
          {resolvedText()}
        </a>
      </Show>
    </td>;
  };
  const emptyCell = () => (
    <td class={`${PAGE_BAR_CELL_CLASS} cursor-default`}>
      <span class={`${PAGE_BAR_LINK_CLASS} ${PAGE_BAR_LINK_COLOR_CLASS} invisible`} />
    </td>
  );

  createPointerGestureElement(
    () => gestureHost,
    () => ({
      shouldCaptureDrag: draggable,
      dragAxis: "x",
      onStart: () => {
        dragStartVisibleCenterIndex = visibleCenterIndex();
      },
      onMove: (info) => {
        if (Math.abs(info.dx) < Math.abs(info.dy)) {
          return;
        }

        const nextIndex = clamp(
          dragStartVisibleCenterIndex - acceleratedPageOffset(info.dx),
          0,
          maxIndex(),
        );

        if (nextIndex === visibleCenterIndex()) {
          return;
        }

        setVisibleCenterIndex(nextIndex);
      },
    }),
  );

  return (
    <div ref={gestureHost}>
      <table class={PAGE_BAR_TABLE_CLASS}>
        <tbody>
          <tr>
          {linkCell("<<", 0, () => currentIndex() === 0 ? "disabled" : "link")}
          <Show when={currentBeforeWindow()} fallback={emptyCell()}>
            {linkCell(() => String(currentIndex() + 1), currentIndex, () => "current")}
          </Show>
          {linkCell("<", () => Math.max(0, currentIndex() - 1), () => currentIndex() === 0 ? "disabled" : "link")}
          <For each={slots()}>{(pageIndex) => {
            const itemState = createMemo<PageBarItemState>(() =>
              pageIndex === currentIndex() ? "current" : "link",
            );
            return pageIndex !== null
              ? <td class={PAGE_BAR_CELL_CLASS}>
                <Show
                  when={itemState() === "link"}
                  fallback={
                    <span
                      class={`${PAGE_BAR_LINK_CLASS} ${PAGE_BAR_CURRENT_COLOR_CLASS}`}
                      aria-current="page"
                    >
                      {pageIndex + 1}
                    </span>
                  }
                >
                  <a
                    class={`${PAGE_BAR_LINK_CLASS} ${PAGE_BAR_LINK_COLOR_CLASS}`}
                    data-ehpeek-single-page-bypass=""
                      href={props.urlForIndex(pageIndex)}
                    draggable={false}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                        props.onNavigate(pageIndex, scrollTargetForIndex(pageIndex));
                    }}
                  >
                    {pageIndex + 1}
                  </a>
                </Show>
              </td>
              : emptyCell();
          }}</For>
          {linkCell(">", () => Math.min(maxIndex(), currentIndex() + 1), () => currentIndex() === maxIndex() ? "disabled" : "link")}
          <Show when={currentAfterWindow()} fallback={emptyCell()}>
            {linkCell(() => String(currentIndex() + 1), currentIndex, () => "current")}
          </Show>
          {linkCell(">>", maxIndex, () => currentIndex() === maxIndex() ? "disabled" : "link")}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function pageSlots(visibleCenterIndex: number, maxIndex: number): Array<number | null> {
  if (maxIndex + 1 <= 7) {
    return range(0, maxIndex);
  }

  const visibleStartIndex = clamp(visibleCenterIndex - 3, -1, maxIndex - 5);
  return range(visibleStartIndex, visibleStartIndex + 6).map((pageIndex) =>
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
