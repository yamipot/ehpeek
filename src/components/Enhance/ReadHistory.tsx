import { createEffect, createMemo, createSignal, onCleanup, onMount, untrack } from "solid-js";
import { Portal } from "solid-js/web";
import * as eh from "../../eh";
import { readHistoryUrl } from "../../eh/url";
import {
  clearReadHistory,
  exportReadHistory,
  importReadHistory,
  loadReadHistoryRecords,
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
  const [transferStatus, setTransferStatus] = createSignal("");
  let historyFileInput!: HTMLInputElement;
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
    setTransferStatus("");
    window.history.replaceState(window.history.state, "", readHistoryUrl());
  };
  const importHistoryFile = async (file: File): Promise<void> => {
    try {
      const count = importReadHistory(await file.text());
      setItems(loadReadHistoryRecords().map((record) => ({
        currentPage: record.pageNum,
        galleryId: record.galleryId,
        info: record.gallery,
        token: record.token,
        totalPages: record.totalPages,
        updatedAt: record.updatedAt,
      })));
      setPageIndex(0);
      setTransferStatus(
        texts.history.imported.replace("{count}", String(count)),
      );
      window.history.replaceState(window.history.state, "", readHistoryUrl());
    } catch {
      setTransferStatus(texts.history.importFailed);
    }
  };
  const exportHistoryFile = () => {
    const url = URL.createObjectURL(new Blob(
      [exportReadHistory()],
      { type: "application/json" },
    ));
    const link = document.createElement("a");
    link.href = url;
    link.download =
      `ehpeek-history-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setTransferStatus(texts.history.exported);
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
        <>
          <span class="text-center textsize-md font-600 ehp-color-site-text">
            {visibleRange()}
            <span class="block">
              {texts.history.limit.replace("{limit}", String(READ_HISTORY_LIMIT))}
            </span>
          </span>
          <div class="flex flex-wrap items-center justify-center gap-sm">
            <input
              ref={historyFileInput}
              class="hidden"
              type="file"
              accept="application/json,.json"
              onChange={(event: Event) => {
                const input = event.currentTarget as HTMLInputElement;
                const file = input.files?.[0];
                input.value = "";
                if (file) {
                  void importHistoryFile(file);
                }
              }}
            />
            <button
              type="button"
              class="min-h-[max(32px,var(--ui-control-size-xs))] ui-px-sm rounded-sm border-0 bg-transparent ehp-color-site-text textsize-md font-600 cursor-pointer [touch-action:manipulation] hover:bg-[var(--color-site-item-hover)]"
              onClick={() => historyFileInput.click()}
            >
              {texts.button.importHistory}
            </button>
            <button
              type="button"
              class="min-h-[max(32px,var(--ui-control-size-xs))] ui-px-sm rounded-sm border-0 bg-transparent ehp-color-site-text textsize-md font-600 cursor-pointer [touch-action:manipulation] hover:bg-[var(--color-site-item-hover)]"
              onClick={exportHistoryFile}
            >
              {texts.button.exportHistory}
            </button>
            {items().length > 0 && (
              <button
                type="button"
                class="min-h-[max(32px,var(--ui-control-size-xs))] ui-px-sm rounded-sm border-0 bg-transparent ehp-color-site-text textsize-md font-600 cursor-pointer [touch-action:manipulation] hover:bg-[var(--color-site-item-hover)]"
                onClick={clearHistory}
              >
                {texts.button.clearHistory}
              </button>
            )}
          </div>
          {transferStatus() && (
            <span class="textsize-sm ehp-color-site-text opacity-75">
              {transferStatus()}
            </span>
          )}
        </>
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
      {navigation(true)}
      {items().length === 0 && (
        <div class="p-xl text-center textsize-md ehp-color-site-text opacity-72">
          {texts.history.empty}
        </div>
      )}
      {pageCount() > 1 && (
        <Portal mount={props.source.elems.navigationBottomMount.Component()}>
          {navigation(false)}
        </Portal>
      )}
    </div>
  );
}
