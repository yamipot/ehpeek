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
import { fullscreenUiScale } from "../../App/viewport";
import type { GalleryPreviewDom, GalleryPreviewItem } from "../../eh";
import type { ReadDirection } from "../../state";
import texts from "../../texts.json";
import { clamp } from "../../utils";
import { ScrollFlingAnimator } from "../animation";
import { createPointerGestureElement } from "../PointerGesture";
import {
  READER_FLOATING_ACTION_CLASS,
} from "../Reader/Toolbar";
import { Icon } from "../Widgets/Icon";
import { PositionBar } from "../Widgets/PositionBar";
import { PriorityLoadQueue } from "../Widgets/PriorityLoadQueue";

const GRID_GAP = 8;
const HORIZONTAL_FLING_VELOCITY_FACTOR = 1.6;
const MAX_TILE_WIDTH = 220;
const MAX_CROSS_COUNT = 12;
const OVERSCAN_ROWS = 4;
const PREVIEW_CONCURRENT_LOADS = 2;
const PREVIEW_LOAD_RADIUS = 2;
const DECODE_CACHE_BYTES = 64 * 1024 * 1024;
const DECODE_CACHE_ITEMS = 160;
const NEXT_SCROLL_PREVIEW_DIRECTION: Record<ReadDirection, ReadDirection> = {
  ltr: "rtl",
  rtl: "ttb",
  ttb: "ltr",
};

type PreviewLayout = {
  crossCount: number;
  gap: number;
  horizontal: boolean;
  mainStride: number;
  tileHeight: number;
  tileWidth: number;
  viewportHeight: number;
  viewportWidth: number;
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
  embeddedDirection: ReadDirection;
  fillEmbeddedContainer: () => boolean;
  onExitPreview: (previewIndex: number) => void;
  onLoadError: (error: unknown) => void;
  onOpenChange: (open: boolean) => void;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  onEmbeddedDirectionChange: (direction: ReadDirection) => void;
  onReadDirectionChange: (direction: ReadDirection) => void;
  previewCache: GalleryPreviewCache;
  readDirection: ReadDirection;
  replaceOriginalPreview: boolean;
}) {
  const previewCache = untrack(() => props.previewCache);
  const decodeCache = new PreviewDecodeCache(DECODE_CACHE_BYTES, DECODE_CACHE_ITEMS);
  const onExitPreview = untrack(() => props.onExitPreview);
  const onOpenPage = untrack(() => props.onOpenPage);
  const [open, setOpen] = createSignal(false);
  const [readDirection, setReadDirection] = createSignal(
    untrack(() => props.readDirection),
  );
  const [embeddedReadDirection, setEmbeddedReadDirection] =
    createSignal<ReadDirection>(untrack(() => props.embeddedDirection));
  const [portalMount, setPortalMount] = createSignal<HTMLElement>(document.body);
  const [crossCountOverride, setCrossCountOverride] = createSignal<number | null>(null);
  const [targetPreviewIndex, setTargetPreviewIndex] = createSignal(
    untrack(() => previewCache.current().data.currentIndex),
  );
  const [highlightedPageNum, setHighlightedPageNum] = createSignal<number | null>(null);
  const [targetPageNum, setTargetPageNum] = createSignal<number | null>(null);
  let historyEntry = false;
  let closeRequested = false;
  let pendingClose: (() => void) | null = null;
  const finishClose = (afterClose?: () => void): void => {
    historyEntry = false;
    closeRequested = false;
    pendingClose = null;
    setOpen(false);
    props.onOpenChange(false);
    afterClose?.();
  };
  const requestClose = (afterClose: () => void): void => {
    if (closeRequested) {
      return;
    }
    if (historyEntry) {
      closeRequested = true;
      pendingClose = afterClose;
      window.history.back();
      return;
    }
    finishClose(afterClose);
  };
  const openPreview = (): void => {
    if (!open()) {
      setPortalMount(
        document.fullscreenElement instanceof HTMLElement
          ? document.fullscreenElement
          : document.body,
      );
      const currentState = window.history.state;
      window.history.pushState({
        ...(currentState !== null && typeof currentState === "object" ? currentState : {}),
        ehpeekScrollPreview: true,
      }, "", window.location.href);
      historyEntry = true;
      setOpen(true);
      props.onOpenChange(true);
    }
  };
  const onPopState = (): void => {
    if (!open() || !historyEntry) {
      return;
    }
    finishClose(pendingClose ?? undefined);
  };

  createEffect(() => {
    props.actionsRef({
      gotoPreview: (previewIndex) => {
        setHighlightedPageNum(null);
        setTargetPageNum(null);
        setTargetPreviewIndex(previewIndex);
        openPreview();
      },
      gotoPage: (pageNum) => {
        setHighlightedPageNum(pageNum);
        setTargetPageNum(pageNum);
        setTargetPreviewIndex(previewCache.previewIndexForPage(pageNum));
        openPreview();
      },
    });
  });
  onMount(() => {
    window.addEventListener("popstate", onPopState);
    const onFullscreenChange = () => {
      const fullscreenElement = document.fullscreenElement;
      setPortalMount(
        fullscreenElement instanceof HTMLElement
          ? fullscreenElement
          : document.body,
      );
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    onCleanup(() => {
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    });
  });
  onCleanup(() => {
    decodeCache.dispose();
    if (open()) {
      props.onOpenChange(false);
    }
  });

  return (
    <>
      <Show when={props.replaceOriginalPreview}>
        <Show when={embeddedReadDirection()} keyed>{(direction) => (
          <ScrollPreviewPanel
            crossCountOverride={crossCountOverride()}
            decodeCache={decodeCache}
            embedded
            highlightedPageNum={props.continuePageNum}
            onDirectionChange={(next, pageNum) => {
              setTargetPageNum(pageNum);
              setEmbeddedReadDirection(next);
              props.onEmbeddedDirectionChange(next);
            }}
            onLoadError={props.onLoadError}
            onCrossCountOverrideChange={setCrossCountOverride}
            onOpenOverlay={(pageNum) => {
              setTargetPageNum(pageNum);
              setTargetPreviewIndex(previewCache.previewIndexForPage(pageNum));
              openPreview();
            }}
            onOpenPage={props.onOpenPage}
            previewCache={previewCache}
            readDirection={direction}
            targetPageNum={targetPageNum() ?? props.continuePageNum ?? 1}
            targetPreviewIndex={targetPreviewIndex()}
            fillContainer={props.fillEmbeddedContainer()}
          />
        )}</Show>
      </Show>
      <Show when={!props.replaceOriginalPreview}>
        <div class="flex w-full justify-center my-sm">
          <button
            type="button"
            class="inline-flex min-h-[var(--ui-control-size-xs)] items-center justify-center gap-sm px-md rounded-xl border-0 bg-[var(--color-site-surface)] ehp-color-site-text font-sans textsize-sm font-700 cursor-pointer transition-[background-color,transform] duration-120 hover:bg-[var(--color-site-item-hover)] active:scale-98"
            onClick={() => {
              const pageNum = props.continuePageNum ?? 1;
              setHighlightedPageNum(props.continuePageNum);
              setTargetPageNum(pageNum);
              setTargetPreviewIndex(previewCache.previewIndexForPage(pageNum));
              openPreview();
            }}
          >
            <Icon name="grid" size="var(--ui-icon-size-sm)" />
            {texts.gallery.scrollPreview}
          </button>
        </div>
      </Show>
      <Show when={open()}>
        <Portal mount={portalMount()}>
          <Show when={readDirection()} keyed>{(direction) => (
            <ScrollPreviewPanel
              crossCountOverride={crossCountOverride()}
              decodeCache={decodeCache}
              embedded={false}
              highlightedPageNum={highlightedPageNum()}
              onClose={(previewIndex) => {
                requestClose(() => onExitPreview(previewIndex));
              }}
              onDirectionChange={(next, pageNum) => {
                setTargetPageNum(pageNum);
                setReadDirection(next);
                props.onReadDirectionChange(next);
              }}
              onLoadError={props.onLoadError}
              onCrossCountOverrideChange={setCrossCountOverride}
              onOpenPage={(pageUrl, pageNum) => {
                requestClose(() => onOpenPage(pageUrl, pageNum));
              }}
              previewCache={previewCache}
              readDirection={direction}
              targetPageNum={targetPageNum()}
              targetPreviewIndex={targetPreviewIndex()}
              fillContainer={false}
            />
          )}</Show>
        </Portal>
      </Show>
    </>
  );
}

function ScrollPreviewPanel(props: {
  crossCountOverride: number | null;
  decodeCache: PreviewDecodeCache;
  embedded: boolean;
  highlightedPageNum: number | null;
  onClose?: (previewIndex: number) => void;
  onDirectionChange?: (direction: ReadDirection, pageNum: number) => void;
  onLoadError: (error: unknown) => void;
  onCrossCountOverrideChange: (crossCount: number) => void;
  onOpenOverlay?: (pageNum: number) => void;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  previewCache: GalleryPreviewCache;
  readDirection: ReadDirection;
  targetPageNum: number | null;
  targetPreviewIndex: number;
  fillContainer: boolean;
}) {
  const decodeCache = untrack(() => props.decodeCache);
  const previewCache = untrack(() => props.previewCache);
  const onClose = untrack(() => props.onClose);
  const onLoadError = untrack(() => props.onLoadError);
  const initialPreview = untrack(() => previewCache.current());
  const totalImages = initialPreview.data.totalImages;
  const maxPreviewIndex = initialPreview.data.maxIndex;
  const aspectPreviewIndex = previewCache.previewIndexForPage(
    untrack(() =>
      props.targetPageNum ??
        props.targetPreviewIndex * initialPreview.data.pageSize + 1
    ),
  );
  const [tileAspectRatio, setTileAspectRatio] = createSignal(
    initialPreview.data.dominantAspectRatio,
  );
  const initialTileAspectRatio = untrack(tileAspectRatio);
  const readDirection = untrack(() => props.readDirection);
  const horizontal = readDirection !== "ttb";
  const rightToLeft = readDirection === "rtl";
  const directionIcon = readDirection === "ttb"
    ? "arrow-down"
    : readDirection === "rtl"
      ? "arrow-left"
      : "arrow-right";
  const directionLabel = readDirection === "ttb"
    ? texts.gallery.scrollPreviewDirectionTtb
    : readDirection === "rtl"
      ? texts.gallery.scrollPreviewDirectionRtl
      : texts.gallery.scrollPreviewDirectionLtr;
  const flingAnimator = new ScrollFlingAnimator();
  const previewLoadQueue = new PriorityLoadQueue<number, GalleryPreviewDom>(
    PREVIEW_CONCURRENT_LOADS,
  );
  const requestedPreviewIndexes = new Set<number>();
  const [failedPreviewIndexes, setFailedPreviewIndexes] = createSignal<Set<number>>(new Set());
  const crossCountOverride = (): number | null =>
    props.embedded ? null : props.crossCountOverride;
  const [embeddedPanelHeight, setEmbeddedPanelHeight] = createSignal<number | null>(null);
  const [exitDragOffset, setExitDragOffset] = createSignal(0);
  const [loadingCount, setLoadingCount] = createSignal(0);
  const [previewLoadReady, setPreviewLoadReady] = createSignal(false);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [layout, setLayout] = createSignal<PreviewLayout>({
    crossCount: 1,
    gap: GRID_GAP,
    horizontal,
    mainStride: horizontal
      ? MAX_TILE_WIDTH + GRID_GAP
      : MAX_TILE_WIDTH * initialTileAspectRatio + GRID_GAP,
    tileHeight: MAX_TILE_WIDTH * initialTileAspectRatio,
    tileWidth: MAX_TILE_WIDTH,
    viewportHeight: 1,
    viewportWidth: 1,
  });
  let scroller!: HTMLDivElement;
  let overlay!: HTMLElement;
  let dragDirection: "exit" | "scroll" | null = null;
  let dragStartPosition: number | null = null;
  let pinchAnchorPageNum: number | null = null;
  let pinchStartCrossCount = 1;
  let pinchMinimumCrossCount = 1;
  let layoutFrame: number | null = null;
  let scrollFrame: number | null = null;
  let loadToken = 0;
  let initialized = false;
  let disposed = false;

  const totalGroups = createMemo(() => Math.ceil(totalImages / layout().crossCount));
  const totalMainSize = createMemo(() =>
    Math.max(1, totalGroups() * layout().mainStride - layout().gap)
  );
  const mainViewportSize = createMemo(() =>
    horizontal ? layout().viewportWidth : layout().viewportHeight
  );
  const mainCanvasSize = createMemo(() =>
    Math.max(totalMainSize(), mainViewportSize())
  );
  const visibleStartGroup = createMemo(() =>
    clamp(
      Math.floor(scrollOffset() / layout().mainStride) - OVERSCAN_ROWS,
      0,
      Math.max(0, totalGroups() - 1),
    )
  );
  const visibleEndGroup = createMemo(() =>
    clamp(
      Math.ceil((scrollOffset() + mainViewportSize()) / layout().mainStride) + OVERSCAN_ROWS,
      visibleStartGroup(),
      Math.max(0, totalGroups() - 1),
    )
  );
  const visibleStartPageNum = createMemo(() =>
    visibleStartGroup() * layout().crossCount + 1
  );
  const visibleEndPageNum = createMemo(() =>
    Math.min(totalImages, (visibleEndGroup() + 1) * layout().crossCount)
  );
  const screenStartPageNum = createMemo(() =>
    Math.floor(scrollOffset() / layout().mainStride) * layout().crossCount + 1
  );
  const screenEndPageNum = createMemo(() => {
    const end = Math.max(scrollOffset(), scrollOffset() + mainViewportSize() - 1);
    const endGroup = Math.floor(end / layout().mainStride);
    return Math.min(totalImages, (endGroup + 1) * layout().crossCount);
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
    const centerGroup = Math.floor(
      (scrollOffset() + mainViewportSize() / 2) / currentLayout.mainStride,
    );
    return clamp(
      centerGroup * currentLayout.crossCount + Math.floor(currentLayout.crossCount / 2) + 1,
      1,
      totalImages,
    );
  };
  const centeredPreviewIndex = (): number =>
    previewCache.previewIndexForPage(centeredPageNum());
  const preferredLayoutAnchorPageNum = (): number => {
    const targetPageNum = props.highlightedPageNum ?? props.targetPageNum;
    return targetPageNum !== null &&
        targetPageNum >= screenStartPageNum() &&
        targetPageNum <= screenEndPageNum()
      ? targetPageNum
      : centeredPageNum();
  };
  const scrollPositionPage = (): number => {
    const maxOffset = Math.max(0, totalMainSize() - mainViewportSize());
    if (maxOffset === 0 || totalImages <= 1) {
      return 1;
    }
    return Math.round(
      1 + clamp(scrollOffset() / maxOffset, 0, 1) * (totalImages - 1),
    );
  };
  const maxScrollOffset = (): number =>
    Math.max(0, totalMainSize() - mainViewportSize());
  const readScrollOffset = (): number => {
    if (!horizontal) {
      return scroller.scrollTop;
    }
    return rightToLeft
      ? maxScrollOffset() - scroller.scrollLeft
      : scroller.scrollLeft;
  };
  const updateScrollOffset = (value: number): void => {
    const next = clamp(value, 0, maxScrollOffset());
    if (horizontal) {
      scroller.scrollLeft = rightToLeft ? maxScrollOffset() - next : next;
    } else {
      scroller.scrollTop = next;
    }
    setScrollOffset(next);
  };
  const scrollToPositionPage = (pageNum: number): void => {
    flingAnimator.cancel();
    const ratio = totalImages <= 1
      ? 0
      : (clamp(pageNum, 1, totalImages) - 1) / (totalImages - 1);
    updateScrollOffset(ratio * maxScrollOffset());
  };
  const requestDirectionChange = (): void => {
    if (!window.confirm(texts.gallery.confirmScrollPreviewDirection)) {
      return;
    }
    props.onDirectionChange?.(
      NEXT_SCROLL_PREVIEW_DIRECTION[readDirection],
      centeredPageNum(),
    );
  };
  createPointerGestureElement(
    () => scroller ?? null,
    () => ({
      dragAxis: props.embedded
        ? horizontal
          ? "x"
          : "y"
        : "any",
      onStart: () => {
        flingAnimator.cancel();
        dragDirection = null;
        dragStartPosition = horizontal ? scroller.scrollLeft : scroller.scrollTop;
      },
      onMove: (info) => {
        if (dragDirection === null) {
          const mainDelta = horizontal ? Math.abs(info.dx) : Math.abs(info.dy);
          const exitDelta = horizontal ? Math.abs(info.dy) : Math.abs(info.dx);
          dragDirection = props.embedded || mainDelta >= exitDelta
            ? "scroll"
            : "exit";
        }
        if (dragDirection === "exit") {
          setExitDragOffset(horizontal ? info.dy : info.dx);
          return;
        }
        if (dragStartPosition === null) {
          return;
        }
        if (horizontal) {
          scroller.scrollLeft = dragStartPosition - info.dx;
        } else {
          scroller.scrollTop = dragStartPosition - info.dy;
        }
      },
      onEnd: (info) => {
        dragStartPosition = null;
        if (dragDirection === "exit") {
          const offset = exitDragOffset();
          const exitSize = horizontal ? overlay.clientHeight : overlay.clientWidth;
          const exitVelocity = horizontal ? info.velocityY : info.velocityX;
          const exit = Math.abs(offset) >= exitSize * 0.2 ||
            Math.abs(exitVelocity) >= 0.6;
          dragDirection = null;
          if (exit) {
            const direction = offset === 0
              ? Math.sign(exitVelocity) || 1
              : Math.sign(offset);
            const previewIndex = centeredPreviewIndex();
            const translation = horizontal
              ? `0, ${direction * 100}vh`
              : `${direction * 100}vw, 0`;
            void overlay.animate(
              [
                {
                  opacity: overlay.style.opacity,
                  transform: overlay.style.transform,
                },
                {
                  opacity: 0.7,
                  transform: `translate3d(${translation}, 0) scale(0.97)`,
                },
              ],
              {
                duration: 180,
                easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
                fill: "forwards",
              },
            ).finished.then(() => onClose?.(previewIndex));
            return;
          }
          void overlay.animate(
            [
              {
                opacity: overlay.style.opacity,
                transform: overlay.style.transform,
              },
              {
                opacity: 1,
                transform: "translate3d(0, 0, 0)",
              },
            ],
            { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
          ).finished.then(() => setExitDragOffset(0));
          return;
        }
        dragDirection = null;
        flingAnimator.start({
          axis: horizontal ? "x" : "y",
          scroller,
          initialVelocity: -(horizontal
            ? info.velocityX * HORIZONTAL_FLING_VELOCITY_FACTOR
            : info.velocityY),
          setScrollPosition: (position) => {
            if (horizontal) {
              scroller.scrollLeft = position;
            } else {
              scroller.scrollTop = position;
            }
          },
          canRun: () => !disposed && scroller.isConnected,
          onStop: () => setScrollOffset(readScrollOffset()),
        });
      },
      onPinchStart: () => {
        if (props.embedded) {
          return false;
        }
        flingAnimator.cancel();
        pinchAnchorPageNum = preferredLayoutAnchorPageNum();
        pinchStartCrossCount = layout().crossCount;
        const currentLayout = layout();
        const aspectRatio = tileAspectRatio();
        const crossSize = currentLayout.horizontal
          ? currentLayout.viewportHeight
          : currentLayout.viewportWidth;
        const maximumTileCrossSize = currentLayout.horizontal
          ? Math.min(
            currentLayout.viewportHeight / 2,
            currentLayout.viewportWidth / 2 * aspectRatio,
          )
          : Math.min(
            currentLayout.viewportWidth / 2,
            currentLayout.viewportHeight / 2 / aspectRatio,
          );
        pinchMinimumCrossCount = Math.min(
          pinchStartCrossCount,
          Math.max(
            1,
            Math.ceil(
              (crossSize + currentLayout.gap) /
                (maximumTileCrossSize + currentLayout.gap),
            ),
          ),
        );
        return true;
      },
      onPinchMove: (info) => {
        if (props.embedded) {
          return;
        }
        props.onCrossCountOverrideChange(
          clamp(
            Math.round(pinchStartCrossCount / info.scale),
            pinchMinimumCrossCount,
            MAX_CROSS_COUNT,
          ),
        );
      },
      onPinchEnd: () => {
        pinchAnchorPageNum = null;
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
    onLoaded: (previewIndex, loaded) => {
      if (previewIndex === aspectPreviewIndex) {
        setTileAspectRatio(loaded.data.dominantAspectRatio);
      }
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
    const group = Math.floor(
      (clamp(pageNum, 1, totalImages) - 1) / currentLayout.crossCount,
    );
    const tileMainSize = currentLayout.horizontal
      ? currentLayout.tileWidth
      : currentLayout.tileHeight;
    updateScrollOffset(
      group * currentLayout.mainStride -
        (mainViewportSize() - tileMainSize) / 2,
    );
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
    const scale = props.embedded ? 1 : fullscreenUiScale();
    const gap = GRID_GAP * scale;
    const maxTileWidth = MAX_TILE_WIDTH * scale;
    const aspectRatio = tileAspectRatio();
    const anchorPageNum = initialized
      ? pinchAnchorPageNum ?? preferredLayoutAnchorPageNum()
      : null;
    const itemsPerRow = Math.max(
      1,
      Math.ceil((width + gap) / (maxTileWidth + gap)),
    );
    const itemWidth = Math.max(
      1,
      (width - gap * (itemsPerRow - 1)) / itemsPerRow,
    );
    const itemHeight = Math.max(1, Math.round(itemWidth * aspectRatio));
    const panelChromeHeight = Math.max(0, overlay.clientHeight - height);
    const targetContentHeight = Math.max(
      itemHeight,
      window.innerHeight * 0.55 - panelChromeHeight,
    );
    const embeddedRows = Math.max(
      1,
      Math.ceil(
        (targetContentHeight + gap) / (itemHeight + gap),
      ),
    );
    const availableRows = props.embedded
      ? props.fillContainer
        ? Math.max(1, Math.floor((height + gap) / (itemHeight + gap)))
        : embeddedRows
      : Math.max(1, Math.ceil((height + gap) / (itemHeight + gap)));
    const automaticCrossCount = horizontal
      ? Math.min(availableRows, Math.ceil(totalImages / itemsPerRow))
      : Math.min(itemsPerRow, totalImages);
    const crossCount = clamp(
      crossCountOverride() ?? automaticCrossCount,
      1,
      totalImages,
    );
    if (
      props.embedded &&
      !props.fillContainer &&
      horizontal &&
      crossCountOverride() === null
    ) {
      const contentHeight =
        crossCount * itemHeight + gap * (crossCount - 1);
      const panelHeight = Math.round(panelChromeHeight + contentHeight);
      setEmbeddedPanelHeight((current) =>
        current === panelHeight ? current : panelHeight);
    }
    const availableTileHeight = Math.max(
      1,
      (height - gap * (crossCount - 1)) / crossCount,
    );
    const crossCountOverridden = crossCountOverride() !== null;
    const overriddenTileWidth = Math.min(
      Math.max(1, (width - gap * (crossCount - 1)) / crossCount),
      width / 2,
      height / 2 / aspectRatio,
    );
    const tileHeight = horizontal
      ? crossCountOverridden
        ? Math.min(availableTileHeight, height / 2, width / 2 * aspectRatio)
        : Math.min(itemHeight, availableTileHeight)
      : Math.max(
        1,
        Math.round(
          (crossCountOverridden
            ? overriddenTileWidth
            : Math.max(1, (width - gap * (crossCount - 1)) / crossCount)) *
              aspectRatio,
        ),
      );
    const tileWidth = horizontal
      ? crossCountOverridden
        ? tileHeight / aspectRatio
        : clamp(tileHeight / aspectRatio, 1, maxTileWidth)
      : crossCountOverridden
        ? overriddenTileWidth
        : Math.max(1, (width - gap * (crossCount - 1)) / crossCount);
    const next = {
      crossCount,
      gap,
      horizontal,
      mainStride: (horizontal ? tileWidth : tileHeight) + gap,
      tileHeight,
      tileWidth,
      viewportHeight: height,
      viewportWidth: width,
    };
    setLayout(next);

    if (layoutFrame !== null) {
      window.cancelAnimationFrame(layoutFrame);
    }
    layoutFrame = window.requestAnimationFrame(() => untrack(() => {
      layoutFrame = null;
      if (!scroller.isConnected) {
        return;
      }
      if (initialized) {
        scrollToPage(anchorPageNum ?? centeredPageNum(), next);
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

  createEffect(() => {
    crossCountOverride();
    tileAspectRatio();
    if (initialized) {
      untrack(updateLayout);
    }
  });

  onMount(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    if (!props.embedded) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }
    const resizeObserver = new ResizeObserver(updateLayout);
    resizeObserver.observe(scroller);
    updateLayout();
    onCleanup(() => {
      disposed = true;
      flingAnimator.cancel();
      previewLoadQueue.dispose();
      resizeObserver.disconnect();
      if (!props.embedded) {
        document.body.style.overflow = previousBodyOverflow;
        document.documentElement.style.overflow = previousHtmlOverflow;
      }
      if (layoutFrame !== null) {
        window.cancelAnimationFrame(layoutFrame);
      }
      if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
      }
    });
  });

  return (
    <div
      classList={{
        "contents": props.embedded,
        "fixed inset-0 z-[1300]": !props.embedded,
      }}
    >
      <section
        ref={overlay}
        class="ehpeek-scroll-preview box-border flex flex-col overflow-hidden text-[var(--color-text)] font-sans textsize-md leading-[1.4]"
        classList={{
          "absolute inset-0 bg-[var(--color-background)]": !props.embedded,
          "border ehp-color-site-border rounded-sm bg-[var(--color-site-elevated)]":
            props.embedded,
          "relative h-[55dvh]":
            props.embedded && !props.fillContainer,
          "relative h-full": props.embedded && props.fillContainer,
          "w-full": !props.embedded || props.fillContainer,
          "[width:calc(100%-(var(--touch-gallery-gutter)*2))] landscape:[width:min(calc(100%-(var(--touch-gallery-gutter)*2)),90dvh)] mx-auto":
            props.embedded && !props.fillContainer,
        }}
        style={{
          height: props.embedded &&
              !props.fillContainer &&
              horizontal &&
              embeddedPanelHeight() !== null
            ? `${embeddedPanelHeight()}px`
            : undefined,
          opacity: props.embedded
            ? "1"
            : `${1 - Math.min(0.15, Math.abs(exitDragOffset()) / Math.max(1, horizontal ? window.innerHeight : window.innerWidth) * 0.15)}`,
          transform: props.embedded
            ? "none"
            : `translate3d(${horizontal ? 0 : exitDragOffset()}px, ${horizontal ? exitDragOffset() : 0}px, 0) scale(${1 - Math.min(0.03, Math.abs(exitDragOffset()) / Math.max(1, horizontal ? window.innerHeight : window.innerWidth) * 0.03)})`,
        }}
      >
        <Show
          when={props.embedded}
          fallback={
          <div class="flex min-h-[var(--ui-control-size-md)] flex-none items-center justify-between gap-md bg-[var(--color-elevated)] pt-[max(8px,env(safe-area-inset-top,0px))] pr-[max(8px,env(safe-area-inset-right,0px))] pb-sm pl-[max(8px,env(safe-area-inset-left,0px))] border-0 border-b border-[var(--color-border)] textsize-sm">
            <span class="flex items-center gap-sm opacity-75">
              <Show when={loadingCount() > 0}>
                <span class="block w-[var(--ui-icon-size-sm)] h-[var(--ui-icon-size-sm)] box-border animate-spin rounded-full border-2px border-solid ehp-color-spinner" />
              </Show>
              {`${Math.min(totalImages, screenStartPageNum())}–${screenEndPageNum()} / ${totalImages}`}
            </span>
            <div class="flex flex-none gap-sm">
              <button
                type="button"
                class={READER_FLOATING_ACTION_CLASS}
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
              <button
                type="button"
                class={READER_FLOATING_ACTION_CLASS}
                aria-label={directionLabel}
                title={directionLabel}
                onClick={requestDirectionChange}
              >
                <Icon
                  name={directionIcon}
                  size="var(--ui-icon-size-md)"
                />
              </button>
              <button
                type="button"
                class={READER_FLOATING_ACTION_CLASS}
                aria-label={texts.button.close}
                title={texts.button.close}
                onClick={() => onClose?.(centeredPreviewIndex())}
              >
                <span aria-hidden="true">X</span>
              </button>
            </div>
          </div>
        }
        >
        <div class="flex min-h-[var(--ui-control-size-xs)] flex-none items-center justify-center gap-xs py-xs border-0 border-b ehp-color-site-border-subtle-b bg-[var(--color-site-elevated)] textsize-xs">
          <span class="inline-flex min-h-[var(--ui-control-size-xs)] items-center gap-xs px-sm rounded-xs bg-[var(--color-site-surface)] opacity-75">
            <Show when={loadingCount() > 0}>
              <span class="block w-[var(--ui-icon-size-sm)] h-[var(--ui-icon-size-sm)] box-border animate-spin rounded-full border-2px border-solid ehp-color-spinner" />
            </Show>
            {`${Math.min(totalImages, screenStartPageNum())}–${screenEndPageNum()} / ${totalImages}`}
          </span>
          <button
            type="button"
            class="inline-flex w-[var(--ui-control-size-xs)] h-[var(--ui-control-size-xs)] items-center justify-center p-0 rounded-xs border-0 bg-[var(--color-site-surface)] ehp-color-site-text cursor-pointer active:scale-96"
            aria-label={directionLabel}
            title={directionLabel}
            onClick={requestDirectionChange}
          >
            <Icon name={directionIcon} size="var(--ui-icon-size-sm)" />
          </button>
          <button
            type="button"
            class="inline-flex w-[var(--ui-control-size-xs)] h-[var(--ui-control-size-xs)] items-center justify-center p-0 rounded-xs border-0 bg-[var(--color-site-surface)] ehp-color-site-text cursor-pointer active:scale-96"
            aria-label={texts.gallery.openScrollPreview}
            title={texts.gallery.openScrollPreview}
            onClick={() => props.onOpenOverlay?.(centeredPageNum())}
          >
            <Icon name="fullscreen" size="var(--ui-icon-size-sm)" />
          </button>
        </div>
        </Show>
        <div class="relative min-h-0 w-full flex-1">
        <div
          ref={scroller}
          class="absolute box-border bg-[var(--color-surface)] cursor-grab [&[data-dragging=true]]:(cursor-grabbing select-none) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]"
          classList={{
            "inset-0": !props.embedded,
            "top-0 right-xs left-xs": props.embedded,
            "bottom-[calc(var(--ui-control-size-xs)/2)]":
              props.embedded && horizontal,
            "bottom-xs": props.embedded && !horizontal,
            "overflow-x-auto overflow-y-hidden": horizontal,
            "overflow-y-auto overflow-x-hidden": !horizontal,
            "overscroll-auto": props.embedded,
            "[touch-action:pan-x]": props.embedded && !horizontal,
            "[touch-action:pan-y]": props.embedded && horizontal,
            "overscroll-contain [touch-action:none]": !props.embedded,
          }}
          onScroll={() => {
            if (scrollFrame !== null) {
              return;
            }
            scrollFrame = window.requestAnimationFrame(() => {
              scrollFrame = null;
              setScrollOffset(untrack(readScrollOffset));
            });
          }}
          onWheel={() => flingAnimator.cancel()}
        >
          <div
            class="relative"
            style={{
              height: horizontal ? "100%" : `${totalMainSize()}px`,
              width: horizontal ? `${mainCanvasSize()}px` : "100%",
            }}
          >
            <For each={visibleSlots()}>{(slot) => {
              const itemIndex = () => slot.pageNum - 1;
              const group = () => Math.floor(itemIndex() / layout().crossCount);
              const crossIndex = () => itemIndex() % layout().crossCount;
              const left = () => {
                if (!horizontal) {
                  return crossIndex() * (layout().tileWidth + layout().gap);
                }
                return rightToLeft
                  ? mainCanvasSize() - layout().tileWidth - group() * layout().mainStride
                  : group() * layout().mainStride;
              };
              const top = () => horizontal
                ? crossIndex() * (layout().tileHeight + layout().gap)
                : group() * layout().mainStride;
              return (
                <div
                  class="absolute"
                  style={{
                    height: `${layout().tileHeight}px`,
                    left: `${left()}px`,
                    top: `${top()}px`,
                    width: `${layout().tileWidth}px`,
                  }}
                >
                <PreviewTile
                  alignment={rightToLeft ? "right" : horizontal ? "left" : "center"}
                  allowUpscale={!props.embedded && crossCountOverride() !== null}
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
                  width={layout().tileWidth}
                />
                </div>
              );
            }}</For>
          </div>
        </div>
        <Show when={!horizontal}>
          <PositionBar
            ariaLabel={texts.gallery.scrollPreview}
            axis="vertical"
            currentValue={scrollPositionPage()}
            expanded
            maxValue={totalImages}
            onInput={scrollToPositionPage}
            position="absolute"
            trackVisible={false}
            variant={props.embedded ? "site" : "reader"}
            visibleValueCount={screenEndPageNum() - screenStartPageNum() + 1}
          />
        </Show>
        <Show when={horizontal}>
          <PositionBar
            ariaLabel={texts.gallery.scrollPreview}
            axis="horizontal"
            currentValue={scrollPositionPage()}
            maxValue={totalImages}
            onInput={scrollToPositionPage}
            reversed={rightToLeft}
            trackVisible={false}
            variant={props.embedded ? "site" : "reader"}
            visibleValueCount={screenEndPageNum() - screenStartPageNum() + 1}
          />
        </Show>
        </div>
      </section>
    </div>
  );
}

function PreviewTile(props: {
  alignment: "center" | "left" | "right";
  allowUpscale: boolean;
  decodeCache: PreviewDecodeCache;
  failed: boolean;
  height: number;
  highlighted: boolean;
  item: GalleryPreviewItem | null;
  pageNum: number;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  onRetry: () => void;
  width: number;
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
      class="relative flex w-full min-w-0 items-start overflow-hidden rounded-sm bg-[var(--color-background)]"
      classList={{
        "justify-center": props.alignment === "center",
        "justify-start": props.alignment === "left",
        "justify-end": props.alignment === "right",
      }}
      style={{ height: `${props.height}px` }}
    >
      <Show
        when={props.item}
        keyed
        fallback={
          <button
            type="button"
            class="flex w-full h-full flex-col items-center justify-center gap-sm border-0 !bg-transparent text-[var(--color-text)] font-inherit textsize-sm cursor-default"
            classList={{ "cursor-pointer": props.failed }}
            disabled={!props.failed}
            onClick={() => props.onRetry()}
          >
            <Show when={props.failed}>
              <Icon name="refresh" size="var(--ui-icon-size-lg)" />
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
                  class="pointer-events-none block object-contain select-none [-webkit-user-drag:none]"
                  classList={{
                    "h-full w-full": props.allowUpscale,
                    "max-h-full max-w-full": !props.allowUpscale,
                  }}
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
                class="pointer-events-none block flex-none"
                style={{
                  "background-image": `url(${JSON.stringify(item.thumbnail.url)})`,
                  "background-position": item.thumbnail.backgroundPosition,
                  "background-repeat": item.thumbnail.backgroundRepeat,
                  "background-size": item.thumbnail.backgroundSize,
                  height: `${item.thumbnail.height}px`,
                  transform: `scale(${Math.min(
                    props.allowUpscale ? Number.POSITIVE_INFINITY : 1,
                    props.width / item.thumbnail.width,
                    props.height / item.thumbnail.height,
                  )})`,
                  "transform-origin": props.alignment === "right"
                    ? "right top"
                    : props.alignment === "left"
                      ? "left top"
                      : "center top",
                  width: `${item.thumbnail.width}px`,
                }}
                role="img"
                aria-label={`Page ${item.pageNum}`}
              />
            </Show>
            <a
              class="absolute inset-0 text-[var(--color-text)] no-underline hover:no-underline active:no-underline"
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
