import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  untrack,
} from "solid-js";
import { Portal } from "solid-js/web";
import type { GalleryPreviewCache } from "../../App/GalleryPreviewCache";
import type { GalleryPreviewDom, GalleryPreviewItem } from "../../eh";
import texts from "../../texts.json";
import { clamp } from "../../utils";
import { ScrollFlingAnimator } from "../animation";
import { createPointerGestureElement } from "../PointerGesture";
import { Icon } from "../Widgets/Icon";
import { PriorityLoadQueue } from "../Widgets/PriorityLoadQueue";
import { VerticalPositionBar } from "../Widgets/VerticalPositionBar";

const GRID_GAP = 8;
const MAX_TILE_WIDTH = 220;
const MIN_TILE_HEIGHT = 170;
const MAX_TILE_HEIGHT = 290;
const OVERSCAN_ROWS = 4;
const PREVIEW_CONCURRENT_LOADS = 2;
const PREVIEW_LOAD_RADIUS = 2;
const DECODE_CACHE_BYTES = 64 * 1024 * 1024;
const DECODE_CACHE_ITEMS = 160;

type PreviewLayout = {
  columns: number;
  rowHeight: number;
  tileHeight: number;
  width: number;
};

type PreviewSlot = {
  item: GalleryPreviewItem | null;
  pageNum: number;
};

export type ScrollPreviewActions = {
  gotoPreview: (previewIndex: number) => void;
  gotoPage: (pageNum: number) => void;
};

export function ScrollPreview(props: {
  actionsRef: (actions: ScrollPreviewActions) => void;
  continuePageNum: number | null;
  onExitPreview: (previewIndex: number) => void;
  onLoadError: (error: unknown) => void;
  onOpenChange: (open: boolean) => void;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  previewCache: GalleryPreviewCache;
}) {
  const previewCache = untrack(() => props.previewCache);
  const [open, setOpen] = createSignal(false);
  const [portalMount, setPortalMount] = createSignal<HTMLElement>(document.body);
  const [targetPreviewIndex, setTargetPreviewIndex] = createSignal(
    untrack(() => previewCache.current().data.currentIndex),
  );
  const [highlightedPageNum, setHighlightedPageNum] = createSignal<number | null>(null);
  const [targetPageNum, setTargetPageNum] = createSignal<number | null>(null);
  const updateOpen = (next: boolean): void => {
    if (next) {
      setPortalMount(
        document.fullscreenElement instanceof HTMLElement
          ? document.fullscreenElement
          : document.body,
      );
    }
    setOpen(next);
    props.onOpenChange(next);
  };

  createEffect(() => {
    props.actionsRef({
      gotoPreview: (previewIndex) => {
        setHighlightedPageNum(null);
        setTargetPageNum(null);
        setTargetPreviewIndex(previewIndex);
        updateOpen(true);
      },
      gotoPage: (pageNum) => {
        setHighlightedPageNum(pageNum);
        setTargetPageNum(pageNum);
        setTargetPreviewIndex(previewCache.previewIndexForPage(pageNum));
        updateOpen(true);
      },
    });
  });
  onCleanup(() => props.onOpenChange(false));

  return (
    <>
      <div class="flex w-full justify-center my-sm">
        <button
          type="button"
          class="inline-flex min-h-md coarse:min-h-56px items-center justify-center gap-sm px-lg py-sm rounded-md border border-[var(--color-site-border)] bg-[var(--color-site-surface)] ehp-color-site-text font-sans textsize-md font-700 cursor-pointer hover:bg-[var(--color-site-item-hover)] active:scale-98"
          onClick={() => {
            setHighlightedPageNum(props.continuePageNum);
            setTargetPageNum(null);
            setTargetPreviewIndex(previewCache.current().data.currentIndex);
            updateOpen(true);
          }}
        >
          <Icon name="pages" size="1.2em" />
          {texts.gallery.scrollPreview}
        </button>
      </div>
      <Show when={open()}>
        <Portal mount={portalMount()}>
          <ScrollPreviewOverlay
            highlightedPageNum={highlightedPageNum()}
            onClose={(previewIndex) => {
              updateOpen(false);
              props.onExitPreview(previewIndex);
            }}
            onLoadError={props.onLoadError}
            onOpenPage={(pageUrl, pageNum) => {
              updateOpen(false);
              props.onOpenPage(pageUrl, pageNum);
            }}
            previewCache={previewCache}
            targetPageNum={targetPageNum()}
            targetPreviewIndex={targetPreviewIndex()}
          />
        </Portal>
      </Show>
    </>
  );
}

function ScrollPreviewOverlay(props: {
  highlightedPageNum: number | null;
  onClose: (previewIndex: number) => void;
  onLoadError: (error: unknown) => void;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  previewCache: GalleryPreviewCache;
  targetPageNum: number | null;
  targetPreviewIndex: number;
}) {
  const previewCache = untrack(() => props.previewCache);
  const onLoadError = untrack(() => props.onLoadError);
  const initialPreview = untrack(() => previewCache.current());
  const totalImages = initialPreview.data.totalImages;
  const maxPreviewIndex = initialPreview.data.maxIndex;
  const decodeCache = new PreviewDecodeCache(DECODE_CACHE_BYTES, DECODE_CACHE_ITEMS);
  const flingAnimator = new ScrollFlingAnimator();
  const previewLoadQueue = new PriorityLoadQueue<number, GalleryPreviewDom>(
    PREVIEW_CONCURRENT_LOADS,
  );
  const requestedPreviewIndexes = new Set<number>();
  const [failedPreviewIndexes, setFailedPreviewIndexes] = createSignal<Set<number>>(new Set());
  const [loadingCount, setLoadingCount] = createSignal(0);
  const [previewLoadReady, setPreviewLoadReady] = createSignal(false);
  const [scrollTop, setScrollTop] = createSignal(0);
  const [viewportHeight, setViewportHeight] = createSignal(1);
  const [layout, setLayout] = createSignal<PreviewLayout>({
    columns: 1,
    rowHeight: MIN_TILE_HEIGHT + GRID_GAP,
    tileHeight: MIN_TILE_HEIGHT,
    width: 1,
  });
  let scroller!: HTMLDivElement;
  let dragStartScrollTop: number | null = null;
  let scrollFrame: number | null = null;
  let loadToken = 0;
  let initialized = false;
  let disposed = false;

  const totalRows = createMemo(() => Math.ceil(totalImages / layout().columns));
  const totalHeight = createMemo(() =>
    Math.max(1, totalRows() * layout().rowHeight - GRID_GAP)
  );
  const visibleStartRow = createMemo(() =>
    clamp(
      Math.floor(scrollTop() / layout().rowHeight) - OVERSCAN_ROWS,
      0,
      Math.max(0, totalRows() - 1),
    )
  );
  const visibleEndRow = createMemo(() =>
    clamp(
      Math.ceil((scrollTop() + viewportHeight()) / layout().rowHeight) + OVERSCAN_ROWS,
      visibleStartRow(),
      Math.max(0, totalRows() - 1),
    )
  );
  const visibleStartPageNum = createMemo(() =>
    visibleStartRow() * layout().columns + 1
  );
  const visibleEndPageNum = createMemo(() =>
    Math.min(totalImages, (visibleEndRow() + 1) * layout().columns)
  );
  const screenStartPageNum = createMemo(() =>
    Math.floor(scrollTop() / layout().rowHeight) * layout().columns + 1
  );
  const screenEndPageNum = createMemo(() => {
    const bottom = Math.max(scrollTop(), scrollTop() + viewportHeight() - 1);
    const endRow = Math.floor(bottom / layout().rowHeight);
    return Math.min(totalImages, (endRow + 1) * layout().columns);
  });
  const visibleSlots = createMemo<PreviewSlot[]>(() => {
    previewCache.previewDataVersion();
    const slots: PreviewSlot[] = [];
    for (let pageNum = visibleStartPageNum(); pageNum <= visibleEndPageNum(); pageNum += 1) {
      slots.push({
        item: previewCache.previewItem(pageNum),
        pageNum,
      });
    }
    return slots;
  });
  const centeredPageNum = (): number => {
    const currentLayout = layout();
    const centerRow = Math.floor(
      (scrollTop() + viewportHeight() / 2) / currentLayout.rowHeight,
    );
    return clamp(
      centerRow * currentLayout.columns + Math.floor(currentLayout.columns / 2) + 1,
      1,
      totalImages,
    );
  };
  const centeredPreviewIndex = (): number =>
    previewCache.previewIndexForPage(centeredPageNum());
  const scrollPositionPage = (): number => {
    const maxScrollTop = Math.max(0, totalHeight() - viewportHeight());
    if (maxScrollTop === 0 || totalImages <= 1) {
      return 1;
    }
    return Math.round(
      1 + clamp(scrollTop() / maxScrollTop, 0, 1) * (totalImages - 1),
    );
  };
  const scrollToPositionPage = (pageNum: number): void => {
    flingAnimator.cancel();
    const maxScrollTop = Math.max(0, totalHeight() - scroller.clientHeight);
    const ratio = totalImages <= 1
      ? 0
      : (clamp(pageNum, 1, totalImages) - 1) / (totalImages - 1);
    scroller.scrollTop = ratio * maxScrollTop;
    setScrollTop(scroller.scrollTop);
  };
  createPointerGestureElement(
    () => scroller ?? null,
    () => ({
      dragAxis: "y",
      onStart: () => {
        flingAnimator.cancel();
        dragStartScrollTop = scroller.scrollTop;
      },
      onMove: (info) => {
        if (dragStartScrollTop === null) {
          return;
        }
        scroller.scrollTop = dragStartScrollTop - info.dy;
      },
      onEnd: (info) => {
        dragStartScrollTop = null;
        flingAnimator.start({
          axis: "y",
          scroller,
          initialVelocity: -info.velocityY,
          setScrollPosition: (position) => {
            scroller.scrollTop = position;
          },
          canRun: () => !disposed && scroller.isConnected,
          onStop: () => setScrollTop(scroller.scrollTop),
        });
      },
    }),
  );

  previewLoadQueue.updateCallbacks({
    loadTarget: (previewIndex) => previewCache.load(previewIndex),
    markLoading: (previewIndex) => {
      if (requestedPreviewIndexes.has(previewIndex)) {
        return null;
      }
      requestedPreviewIndexes.add(previewIndex);
      setFailedPreviewIndexes((current) => {
        if (!current.has(previewIndex)) {
          return current;
        }
        const next = new Set(current);
        next.delete(previewIndex);
        return next;
      });
      setLoadingCount((count) => count + 1);
      return ++loadToken;
    },
    onLoaded: () => {
      setLoadingCount((count) => Math.max(0, count - 1));
    },
    onError: (previewIndex, error) => {
      requestedPreviewIndexes.delete(previewIndex);
      setFailedPreviewIndexes((current) => new Set(current).add(previewIndex));
      setLoadingCount((count) => Math.max(0, count - 1));
      onLoadError(error);
    },
  });
  const syncPreviewLoadQueue = (centerIndex: number, retryIndex?: number): void => {
    const firstIndex = Math.max(0, centerIndex - PREVIEW_LOAD_RADIUS);
    const lastIndex = Math.min(maxPreviewIndex, centerIndex + PREVIEW_LOAD_RADIUS);
    const targets = [];
    for (let previewIndex = firstIndex; previewIndex <= lastIndex; previewIndex += 1) {
      targets.push({
        key: previewIndex,
        priority: previewIndex === retryIndex ? -1 : Math.abs(previewIndex - centerIndex),
        target: previewIndex,
      });
    }
    previewLoadQueue.sync(targets);
  };

  createEffect(() => {
    if (!previewLoadReady()) {
      return;
    }
    const centerIndex = previewCache.previewIndexForPage(centeredPageNum());
    syncPreviewLoadQueue(centerIndex);
  });

  const scrollToPage = (pageNum: number, currentLayout = untrack(layout)): void => {
    const row = Math.floor((clamp(pageNum, 1, totalImages) - 1) / currentLayout.columns);
    const centeredTop = row * currentLayout.rowHeight -
      (scroller.clientHeight - currentLayout.tileHeight) / 2;
    scroller.scrollTop = clamp(
      centeredTop,
      0,
      Math.max(0, totalHeight() - scroller.clientHeight),
    );
    setScrollTop(scroller.scrollTop);
  };
  const scrollToPreview = (previewIndex: number, currentLayout: PreviewLayout): void => {
    scrollToPage(previewIndex * initialPreview.data.pageSize + 1, currentLayout);
  };

  createEffect(() => {
    const previewIndex = props.targetPreviewIndex;
    const pageNum = props.targetPageNum;
    if (!initialized) {
      return;
    }
    if (scroller.isConnected) {
      if (pageNum === null) {
        scrollToPreview(previewIndex, untrack(layout));
      } else {
        scrollToPage(pageNum, untrack(layout));
      }
    }
  });

  const updateLayout = (): void => {
    setPreviewLoadReady(false);
    const width = Math.max(1, scroller.clientWidth);
    const height = Math.max(1, scroller.clientHeight);
    const previous = untrack(layout);
    const anchorPageIndex = Math.floor(untrack(scrollTop) / previous.rowHeight) * previous.columns;
    const columns = Math.max(1, Math.ceil((width + GRID_GAP) / (MAX_TILE_WIDTH + GRID_GAP)));
    const tileWidth = Math.max(1, (width - GRID_GAP * (columns - 1)) / columns);
    const tileHeight = Math.round(clamp(tileWidth * 1.42, MIN_TILE_HEIGHT, MAX_TILE_HEIGHT));
    const next = {
      columns,
      rowHeight: tileHeight + GRID_GAP,
      tileHeight,
      width,
    };
    setLayout(next);
    setViewportHeight(height);

    queueMicrotask(() => untrack(() => {
      if (!scroller.isConnected) {
        return;
      }
      if (initialized) {
        scroller.scrollTop = Math.floor(anchorPageIndex / next.columns) * next.rowHeight;
        setScrollTop(scroller.scrollTop);
      } else {
        initialized = true;
        if (props.targetPageNum === null) {
          scrollToPreview(props.targetPreviewIndex, next);
        } else {
          scrollToPage(props.targetPageNum, next);
        }
      }
      setPreviewLoadReady(true);
    }));
  };

  onMount(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(scroller);
    updateLayout();
    onCleanup(() => {
      disposed = true;
      flingAnimator.cancel();
      previewLoadQueue.dispose();
      resizeObserver.disconnect();
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
      decodeCache.dispose();
      if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
      }
    });
  });

  return (
    <section class="fixed inset-0 z-[1300] box-border flex w-full h-[100dvh] flex-col overflow-hidden bg-[var(--color-site-page)] ehp-color-site-text">
      <div class="flex flex-none items-center justify-between gap-md bg-[var(--color-site-elevated)] pt-[max(8px,env(safe-area-inset-top,0px))] pr-[max(8px,env(safe-area-inset-right,0px))] pb-sm pl-[max(8px,env(safe-area-inset-left,0px))] border-0 border-b ehp-color-site-border-subtle-b font-sans textsize-sm">
        <button
          type="button"
          class="inline-flex min-h-40px coarse:min-h-48px flex-none items-center justify-center px-md py-xs rounded-md border ehp-color-site-border bg-[var(--color-site-surface)] ehp-color-site-text font-sans textsize-sm font-700 cursor-pointer hover:bg-[var(--color-site-item-hover)] active:scale-96 disabled:(opacity-40 cursor-default)"
          disabled={props.highlightedPageNum === null}
          onClick={() => {
            if (props.highlightedPageNum !== null) {
              flingAnimator.cancel();
              scrollToPage(props.highlightedPageNum);
            }
          }}
        >
          {texts.button.current}
        </button>
        <span class="flex items-center gap-sm opacity-75">
          <Show when={loadingCount() > 0}>
            <span class="block w-16px h-16px box-border animate-spin rounded-full border-2px border-solid ehp-color-site-border border-t-[var(--color-site-accent)]" />
          </Show>
          {`${Math.min(totalImages, screenStartPageNum())}–${screenEndPageNum()} / ${totalImages}`}
        </span>
        <button
          type="button"
          class="inline-flex w-40px h-40px coarse:w-48px coarse:h-48px flex-none items-center justify-center p-0 rounded-md border ehp-color-site-border bg-[var(--color-site-surface)] ehp-color-site-text cursor-pointer hover:bg-[var(--color-site-item-hover)] active:scale-96"
          aria-label={texts.button.close}
          title={texts.button.close}
          onClick={() => props.onClose(centeredPreviewIndex())}
        >
          <Icon name="close" size="1.25em" />
        </button>
      </div>
      <div class="relative min-h-0 w-full flex-1">
        <div
          ref={scroller}
          class="absolute inset-0 box-border overflow-y-auto overflow-x-hidden overscroll-contain ehp-color-site-surface cursor-grab [touch-action:pan-x_pan-y] [&[data-dragging=true]]:(cursor-grabbing select-none) [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch]"
          onScroll={() => {
            if (scrollFrame !== null) {
              return;
            }
            scrollFrame = window.requestAnimationFrame(() => {
              scrollFrame = null;
              setScrollTop(scroller.scrollTop);
            });
          }}
          onWheel={() => flingAnimator.cancel()}
        >
          <div class="relative w-full" style={{ height: `${totalHeight()}px` }}>
            <div
              class="absolute left-0 right-0 grid gap-8px p-0"
              style={{
                "grid-template-columns": `repeat(${layout().columns}, minmax(0, 1fr))`,
                top: `${visibleStartRow() * layout().rowHeight}px`,
              }}
            >
              <For each={visibleSlots()}>{(slot) => (
                <PreviewTile
                  decodeCache={decodeCache}
                  failed={failedPreviewIndexes().has(previewCache.previewIndexForPage(slot.pageNum))}
                  height={layout().tileHeight}
                  highlighted={slot.pageNum === props.highlightedPageNum}
                  item={slot.item}
                  pageNum={slot.pageNum}
                  onOpenPage={props.onOpenPage}
                  onRetry={() => {
                    const retryIndex = previewCache.previewIndexForPage(slot.pageNum);
                    syncPreviewLoadQueue(
                      previewCache.previewIndexForPage(centeredPageNum()),
                      retryIndex,
                    );
                  }}
                />
              )}</For>
            </div>
          </div>
        </div>
        <VerticalPositionBar
          ariaLabel={texts.gallery.scrollPreview}
          currentValue={scrollPositionPage()}
          maxValue={totalImages}
          onInput={scrollToPositionPage}
          position="absolute"
          variant="site"
        />
      </div>
    </section>
  );
}

function PreviewTile(props: {
  decodeCache: PreviewDecodeCache;
  failed: boolean;
  height: number;
  highlighted: boolean;
  item: GalleryPreviewItem | null;
  pageNum: number;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  onRetry: () => void;
}) {
  let releaseDecodedImage: (() => void) | null = null;

  createEffect(() => {
    releaseDecodedImage?.();
    releaseDecodedImage = props.item?.thumbnail.url
      ? props.decodeCache.retain(props.item.thumbnail.url)
      : null;
  });
  onCleanup(() => releaseDecodedImage?.());

  return (
    <div
      class="relative flex min-w-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--color-site-page)]"
      style={{ height: `${props.height}px` }}
    >
      <Show
        when={props.item}
        keyed
        fallback={
          <button
            type="button"
            class="flex w-full h-full flex-col items-center justify-center gap-sm border-0 !bg-transparent ehp-color-site-text font-inherit textsize-sm cursor-default"
            classList={{ "cursor-pointer": props.failed }}
            disabled={!props.failed}
            onClick={() => props.onRetry()}
          >
            <Show when={props.failed}>
              <Icon name="refresh" size="1.5em" />
            </Show>
            <span>{props.pageNum}</span>
          </button>
        }
      >
        {(item) => (
          <>
            <Show
              when={item.thumbnail.kind === "background"}
              fallback={
                <img
                  class="pointer-events-none block max-w-full max-h-full object-contain select-none [-webkit-user-drag:none]"
                  src={item.thumbnail.url}
                  alt=""
                  width={item.thumbnail.width}
                  height={item.thumbnail.height}
                  decoding="async"
                  draggable={false}
                />
              }
            >
              <span
                class="pointer-events-none block flex-none max-w-full max-h-full"
                style={{
                  "background-image": `url(${JSON.stringify(item.thumbnail.url)})`,
                  "background-position": item.thumbnail.backgroundPosition,
                  "background-repeat": item.thumbnail.backgroundRepeat,
                  "background-size": item.thumbnail.backgroundSize,
                  height: `${item.thumbnail.height}px`,
                  width: `${item.thumbnail.width}px`,
                }}
                role="img"
                aria-label={`Page ${item.pageNum}`}
              />
            </Show>
            <a
              class="absolute inset-0 ehp-color-site-text no-underline hover:no-underline active:no-underline"
              href={item.pageUrl}
              draggable={false}
              aria-label={`Page ${item.pageNum}`}
              aria-current={props.highlighted ? "page" : undefined}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                props.onOpenPage(item.pageUrl, item.pageNum);
              }}
            />
            <Show when={props.highlighted}>
              <span
                class="pointer-events-none absolute inset-0 z-1 box-border rounded-sm border-6 coarse:border-8 border-solid border-[var(--color-danger)]"
                aria-hidden="true"
              />
            </Show>
          </>
        )}
      </Show>
    </div>
  );
}

type DecodeCacheEntry = {
  bytes: number;
  image: HTMLImageElement;
  pins: number;
};

class PreviewDecodeCache {
  private bytes = 0;
  private readonly entries = new Map<string, DecodeCacheEntry>();

  constructor(
    private readonly byteLimit: number,
    private readonly itemLimit: number,
  ) {}

  retain(url: string): () => void {
    const entry = this.ensure(url);
    entry.pins += 1;
    this.touch(url, entry);
    return () => {
      const current = this.entries.get(url);
      if (current !== entry) {
        return;
      }
      current.pins = Math.max(0, current.pins - 1);
      this.prune();
    };
  }

  dispose(): void {
    for (const entry of this.entries.values()) {
      entry.image.removeAttribute("src");
    }
    this.entries.clear();
    this.bytes = 0;
  }

  private ensure(url: string): DecodeCacheEntry {
    const cached = this.entries.get(url);
    if (cached) {
      return cached;
    }

    const image = new Image();
    const entry: DecodeCacheEntry = { bytes: 0, image, pins: 0 };
    image.decoding = "async";
    image.onload = () => {
      const bytes = Math.max(1, image.naturalWidth) * Math.max(1, image.naturalHeight) * 4;
      this.bytes += bytes - entry.bytes;
      entry.bytes = bytes;
      void image.decode().catch(() => undefined).finally(() => this.prune());
    };
    image.onerror = () => {
      if (entry.pins === 0) {
        this.evict(url, entry);
      }
    };
    image.src = url;
    this.entries.set(url, entry);
    this.prune();
    return entry;
  }

  private touch(url: string, entry: DecodeCacheEntry): void {
    this.entries.delete(url);
    this.entries.set(url, entry);
  }

  private prune(): void {
    while (this.entries.size > this.itemLimit || this.bytes > this.byteLimit) {
      const removable = Array.from(this.entries).find(([, entry]) => entry.pins === 0);
      if (!removable) {
        break;
      }
      this.evict(removable[0], removable[1]);
    }
  }

  private evict(url: string, entry: DecodeCacheEntry): void {
    if (this.entries.get(url) !== entry) {
      return;
    }
    this.entries.delete(url);
    this.bytes = Math.max(0, this.bytes - entry.bytes);
    entry.image.onload = null;
    entry.image.onerror = null;
    entry.image.removeAttribute("src");
  }
}
