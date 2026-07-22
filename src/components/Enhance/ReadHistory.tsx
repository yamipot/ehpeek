import { createEffect, createMemo, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { Portal } from "solid-js/web";
import * as eh from "../../eh";
import { readHistoryUrl } from "../../eh/url";
import {
  clearReadHistory,
  READ_HISTORY_LIMIT,
  removeReadHistory,
} from "../../state/readHistory";
import texts from "../../texts.json";
import { PageSwipe } from "./PageSwipe";
import { ScrollPageBar } from "./ScrollPageBar";

export function ReadHistoryPage(props: {
  initialPageIndex: number;
  items: eh.ReadHistoryPageItem[];
  pageSize: number;
  source: eh.ReadHistoryPageDom;
}) {
  const [items, setItems] = createSignal(untrack(() => props.items));
  const pageCount = createMemo(() => Math.max(1, Math.ceil(items().length / props.pageSize)));
  const [pageIndex, setPageIndex] = createSignal(
    Math.min(props.initialPageIndex, untrack(pageCount) - 1),
  );
  const pageItems = createMemo(() => {
    const start = pageIndex() * props.pageSize;
    return items().slice(start, start + props.pageSize);
  });
  const visibleRange = createMemo(() => {
    if (items().length === 0) {
      return "0 / 0";
    }
    const start = pageIndex() * props.pageSize + 1;
    const end = Math.min(start + props.pageSize - 1, items().length);
    return texts.history.range
      .replace("{start}", String(start))
      .replace("{end}", String(end))
      .replace("{total}", String(items().length));
  });
  const navigate = (
    nextPageIndex: number,
    scrollToPageBar: "bottom" | "top" = "top",
    updateUrl = true,
  ) => {
    const nextIndex = Math.max(0, Math.min(nextPageIndex, pageCount() - 1));
    if (nextIndex === pageIndex()) {
      return;
    }
    setPageIndex(nextIndex);
    if (updateUrl) {
      window.history.pushState(window.history.state, "", readHistoryUrl(nextIndex));
    }
    props.source.handle.scrollReadHistoryPage(scrollToPageBar);
  };
  const clearHistory = () => {
    if (!window.confirm(texts.history.clearConfirm)) {
      return;
    }
    clearReadHistory();
    setItems([]);
    setPageIndex(0);
    window.history.replaceState(window.history.state, "", readHistoryUrl());
  };
  const removeHistoryItem = (item: eh.ReadHistoryPageItem) => {
    if (!window.confirm(texts.history.removeConfirm)) {
      return;
    }
    removeReadHistory(item.galleryId, item.token);
    const nextItems = items().filter((candidate) =>
      candidate.galleryId !== item.galleryId || candidate.token !== item.token,
    );
    const nextPageCount = Math.max(1, Math.ceil(nextItems.length / props.pageSize));
    const nextPageIndex = Math.min(pageIndex(), nextPageCount - 1);
    setItems(nextItems);
    setPageIndex(nextPageIndex);
    window.history.replaceState(
      window.history.state,
      "",
      readHistoryUrl(nextPageIndex),
    );
  };

  createEffect(() => {
    props.source.handle.updateReadHistoryItems(pageItems());
  });

  onMount(() => {
    const syncFromHistory = () => {
      const page = eh.extractPageType();
      if (page.type === "readHistory") {
        navigate(page.pageIndex, "top", false);
      }
    };
    window.addEventListener("popstate", syncFromHistory);
    const stopRemoval = props.source.handle.listenForReadHistoryRemoval(removeHistoryItem);
    onCleanup(() => {
      stopRemoval();
      window.removeEventListener("popstate", syncFromHistory);
    });
  });

  const navigation = (showHeader: boolean) => (
    <nav class="flex flex-col items-center gap-sm border-0 border-y border-solid ehp-color-site-border-subtle-b p-md">
      {showHeader && (
        <div class="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-sm">
          <span />
          <span class="text-center textsize-md font-600 ehp-color-site-text">
            {visibleRange()}
            <span class="block">
              {texts.history.limit.replace("{limit}", String(READ_HISTORY_LIMIT))}
            </span>
          </span>
          {items().length > 0 && (
            <button
              type="button"
              class="min-h-xs justify-self-end px-sm coarse:min-h-sm coarse:px-md rounded-sm border-0 bg-transparent ehp-color-site-text textsize-md font-600 cursor-pointer [touch-action:manipulation] hover:bg-[var(--color-site-item-hover)]"
              onClick={clearHistory}
            >
              {texts.button.clearHistory}
            </button>
          )}
        </div>
      )}
      {pageCount() > 1 && (
        <ScrollPageBar
          currentIndex={pageIndex()}
          maxIndex={pageCount() - 1}
          onNavigate={navigate}
          urlForIndex={readHistoryUrl}
        />
      )}
    </nav>
  );

  return (
    <div>
      <PageSwipe
        canNavigate={(direction) => direction === "next"
          ? pageIndex() + 1 < pageCount()
          : pageIndex() > 0}
        onNavigate={(direction) => navigate(
          direction === "next" ? pageIndex() + 1 : pageIndex() - 1,
        )}
        target={() => props.source.elems.resultList.Component()}
      />
      {items().length === 0 && (
        <div class="p-xl text-center textsize-md ehp-color-site-text opacity-72">
          {texts.history.empty}
        </div>
      )}
      {items().length > 0 && navigation(true)}
      {pageCount() > 1 && (
        <Portal mount={props.source.elems.navigationBottomMount.Component()}>
          {navigation(false)}
        </Portal>
      )}
    </div>
  );
}

export function ReadButton(props: {
  currentPage: number;
  hasHistory: boolean;
  totalPages: number | null;
  onClick: () => void;
  variant: "gallery" | "touchGallery";
}) {
  const buttonClassName = () =>
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-md font-700"
      : "ehpeek-continue-reading flex box-border w-full max-w-full min-h-sm items-center gap-sm py-sm px-xs border-0 bg-transparent text-[var(--color-site-accent)] hover:bg-[var(--color-site-accent-hover)] shadow-none cursor-pointer text-left font-sans textsize-sm font-700 leading-[1.2]";
  const detailClassName = () =>
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading-page block mt-2px ehp-color-site-accent textsize-md font-600 opacity-78 normal-case"
      : "ehpeek-continue-reading-page inline-block ml-auto opacity-72 textsize-xs font-600 whitespace-nowrap";

  return (
    <button
      type="button"
      class={buttonClassName()}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.hasHistory
        ? texts.reader.continueReading
        : texts.reader.startReading}
      <span class={detailClassName()}>
        {props.totalPages
          ? `${props.currentPage}/${props.totalPages}`
          : String(props.currentPage)}
      </span>
    </button>
  );
}
