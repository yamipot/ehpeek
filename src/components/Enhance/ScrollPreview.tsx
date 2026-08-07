import {
  createEffect,
  createMemo,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  untrack,
  type Accessor,
  type Setter,
} from "solid-js";
import type { GalleryPreviewCache } from "../../App/GalleryPreviewCache";
import type { GalleryCoordinator } from "../../App/GalleryCoordinator";
import { OverlayPortal, useOverlayHost } from "../../App/OverlayHost";
import type { GalleryPreviewDom, GalleryPreviewItem } from "../../eh";
import type { ReadDirection } from "../../state";
import texts from "../../texts.json";
import { clamp } from "../../utils";
import { ScrollFlingAnimator } from "../animation";
import { createPointerGestureElement } from "../PointerGesture";
import { Icon } from "../Widgets/Icon";
import { PositionBar } from "../Widgets/PositionBar";
import { PriorityLoadQueue } from "../Widgets/PriorityLoadQueue";

const GRID_GAP = 8;
const HORIZONTAL_FLING_VELOCITY_FACTOR = 1.6;
const MAX_TILE_WIDTH = 220;
const REFERENCE_PORTRAIT_ASPECT_RATIO = 7 / 5;
const MAX_CROSS_COUNT = 12;
const OVERSCAN_ROWS = 4;
const SCROLL_PIXEL_EPSILON = 1;
const PREVIEW_CONCURRENT_LOADS = 2;
const PREVIEW_LOAD_RADIUS = 2;
const OVERLAY_PREVIEW_ACTION_CLASS = [
  "inline-flex h-[var(--ui-control-size-md)] items-center justify-center py-0 rounded-md border-0 bg-transparent text-[var(--color-site-text)] cursor-pointer font-sans textsize-sm font-700 leading-1",
  "opacity-90 hover:(opacity-100 bg-[var(--color-site-page)]) focus-visible:opacity-100 disabled:(opacity-40 cursor-default) transition-[opacity,background-color] duration-160",
].join(" ");
const OVERLAY_PREVIEW_ICON_ACTION_CLASS =
  `${OVERLAY_PREVIEW_ACTION_CLASS} w-[var(--ui-control-size-md)] px-0`;
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

function createPreviewLoading(options: {
  aspectPreviewIndex: number;
  centeredPageNum: Accessor<number>;
  maxPreviewIndex: number;
  onAspectRatio: (aspectRatio: number) => void;
  onLoadError: (error: unknown) => void;
  previewCache: GalleryPreviewCache;
  ready: Accessor<boolean>;
}) {
  const queue = new PriorityLoadQueue<number, GalleryPreviewDom>(
    PREVIEW_CONCURRENT_LOADS,
  );
  const requestedIndexes = new Set<number>();
  const [failedIndexes, setFailedIndexes] = createSignal<Set<number>>(new Set());
  const [loadingCount, setLoadingCount] = createSignal(0);
  let loadToken = 0;

  const sync = (centerIndex: number, retryIndex?: number): void => {
    const firstIndex = Math.max(0, centerIndex - PREVIEW_LOAD_RADIUS);
    const lastIndex = Math.min(options.maxPreviewIndex, centerIndex + PREVIEW_LOAD_RADIUS);
    const targets = [];
    for (let previewIndex = firstIndex; previewIndex <= lastIndex; previewIndex += 1) {
      targets.push({
        key: previewIndex,
        priority: previewIndex === retryIndex ? -1 : Math.abs(previewIndex - centerIndex),
        target: previewIndex,
      });
    }
    queue.sync(targets);
  };

  queue.updateCallbacks({
    loadTarget: (previewIndex) => options.previewCache.load(previewIndex),
    markLoading: (previewIndex) => {
      if (requestedIndexes.has(previewIndex)) {
        return null;
      }
      requestedIndexes.add(previewIndex);
      setFailedIndexes((current) => {
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
      if (previewIndex === options.aspectPreviewIndex) {
        options.onAspectRatio(loaded.data.dominantAspectRatio);
      }
      setLoadingCount((count) => Math.max(0, count - 1));
    },
    onError: (previewIndex, error) => {
      requestedIndexes.delete(previewIndex);
      setFailedIndexes((current) => new Set(current).add(previewIndex));
      setLoadingCount((count) => Math.max(0, count - 1));
      options.onLoadError(error);
    },
  });

  createEffect(() => {
    if (options.ready()) {
      sync(options.previewCache.previewIndexForPage(options.centeredPageNum()));
    }
  });
  onCleanup(() => queue.dispose());

  return {
    failedIndexes,
    loadingCount,
    retry(pageNum: number): void {
      const retryIndex = options.previewCache.previewIndexForPage(pageNum);
      sync(
        options.previewCache.previewIndexForPage(options.centeredPageNum()),
        retryIndex,
      );
    },
  };
}

type PreviewToolbarState = {
  directionIcon: "arrow-down" | "arrow-left" | "arrow-right";
  directionLabel: string;
  leftHanded: Accessor<boolean>;
  loading: Accessor<boolean>;
  rangeText: Accessor<string>;
  zoomInDisabled: Accessor<boolean>;
  zoomOutDisabled: Accessor<boolean>;
  onDirectionChange: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

function OverlayPreviewToolbar(props: {
  onClose: () => void;
  onCurrent: () => void;
  currentDisabled: boolean;
  state: PreviewToolbarState;
}) {
  return (
    <div class={`flex min-h-[var(--ui-control-size-md)] flex-none items-center justify-between gap-md bg-[var(--color-site-elevated)] safe-pt-sm safe-pr-sm pb-sm safe-pl-sm border-0 border-b border-[var(--color-site-border)] text-[var(--color-site-text)] textsize-sm${props.state.leftHanded() ? " flex-row-reverse" : ""}`}>
      <span class="flex items-center gap-sm opacity-75">
        <Show when={props.state.loading()}>
          <span class="block w-[var(--ui-icon-size-sm)] h-[var(--ui-icon-size-sm)] box-border animate-spin rounded-full border-2px border-solid ehp-color-spinner" />
        </Show>
        {props.state.rangeText()}
      </span>
      <div class={`flex flex-none gap-sm${props.state.leftHanded() ? " flex-row-reverse" : ""}`}>
        <button
          type="button"
          class={OVERLAY_PREVIEW_ICON_ACTION_CLASS}
          aria-label={props.state.directionLabel}
          title={props.state.directionLabel}
          onClick={() => props.state.onDirectionChange()}
        >
          <Icon name={props.state.directionIcon} size="var(--ui-icon-size-md)" />
        </button>
        <button
          type="button"
          class={OVERLAY_PREVIEW_ICON_ACTION_CLASS}
          aria-label={texts.reader.zoomOut}
          title={texts.reader.zoomOut}
          disabled={props.state.zoomOutDisabled()}
          onClick={() => props.state.onZoomOut()}
        >
          <Icon name="zoom-out" size="var(--ui-icon-size-md)" />
        </button>
        <button
          type="button"
          class={OVERLAY_PREVIEW_ICON_ACTION_CLASS}
          aria-label={texts.reader.zoomIn}
          title={texts.reader.zoomIn}
          disabled={props.state.zoomInDisabled()}
          onClick={() => props.state.onZoomIn()}
        >
          <Icon name="zoom-in" size="var(--ui-icon-size-md)" />
        </button>
        <button
          type="button"
          class={OVERLAY_PREVIEW_ICON_ACTION_CLASS}
          aria-label={texts.button.current}
          title={texts.button.current}
          disabled={props.currentDisabled}
          onClick={() => props.onCurrent()}
        >
          <Icon name="locate" size="var(--ui-icon-size-md)" />
        </button>
        <button
          type="button"
          class={OVERLAY_PREVIEW_ICON_ACTION_CLASS}
          aria-label={texts.button.close}
          title={texts.button.close}
          onClick={() => props.onClose()}
        >
          <Icon name="close" size="var(--ui-icon-size-md)" />
        </button>
      </div>
    </div>
  );
}

const EMBEDDED_PREVIEW_ACTION_CLASS =
  "inline-flex w-[var(--ui-control-size-xs)] h-[var(--ui-control-size-xs)] items-center justify-center p-0 rounded-xs border-0 bg-[var(--color-site-surface)] ehp-color-site-text cursor-pointer active:scale-96";

function EmbeddedPreviewToolbar(props: {
  onOpenOverlay: () => void;
  state: PreviewToolbarState;
}) {
  return (
    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] min-h-[var(--ui-control-size-xs)] flex-none items-center gap-xs px-xs py-xs border-0 border-b ehp-color-site-border-subtle-b bg-[var(--color-site-elevated)] textsize-xs">
      <span class="col-start-2 inline-flex min-h-[var(--ui-control-size-xs)] items-center gap-xs px-sm rounded-xs bg-[var(--color-site-surface)] opacity-75">
        <Show when={props.state.loading()}>
          <span class="block w-[var(--ui-icon-size-sm)] h-[var(--ui-icon-size-sm)] box-border animate-spin rounded-full border-2px border-solid ehp-color-spinner" />
        </Show>
        {props.state.rangeText()}
      </span>
      <div
        class={`flex flex-none items-center gap-xs ${
          props.state.leftHanded()
            ? "col-start-1 row-start-1 justify-self-start flex-row-reverse"
            : "col-start-3 justify-self-end"
        }`}
      >
        <button
          type="button"
          class={EMBEDDED_PREVIEW_ACTION_CLASS}
          aria-label={props.state.directionLabel}
          title={props.state.directionLabel}
          onClick={() => props.state.onDirectionChange()}
        >
          <Icon name={props.state.directionIcon} size="var(--ui-icon-size-sm)" />
        </button>
        <button
          type="button"
          class={EMBEDDED_PREVIEW_ACTION_CLASS}
          aria-label={texts.reader.zoomOut}
          title={texts.reader.zoomOut}
          disabled={props.state.zoomOutDisabled()}
          onClick={() => props.state.onZoomOut()}
        >
          <Icon name="zoom-out" size="var(--ui-icon-size-sm)" />
        </button>
        <button
          type="button"
          class={EMBEDDED_PREVIEW_ACTION_CLASS}
          aria-label={texts.reader.zoomIn}
          title={texts.reader.zoomIn}
          disabled={props.state.zoomInDisabled()}
          onClick={() => props.state.onZoomIn()}
        >
          <Icon name="zoom-in" size="var(--ui-icon-size-sm)" />
        </button>
        <button
          type="button"
          class={EMBEDDED_PREVIEW_ACTION_CLASS}
          aria-label={texts.gallery.openScrollPreview}
          title={texts.gallery.openScrollPreview}
          onClick={() => props.onOpenOverlay()}
        >
          <Icon name="fullscreen" size="var(--ui-icon-size-sm)" />
        </button>
      </div>
    </div>
  );
}

type PreviewViewportState = {
  allowUpscale: Accessor<boolean>;
  canvasHeight: Accessor<string>;
  canvasWidth: Accessor<string>;
  decodeCache: PreviewDecodeCache;
  failedIndexes: Accessor<Set<number>>;
  highlightedPageNum: Accessor<number | null>;
  horizontal: boolean;
  layout: Accessor<PreviewLayout>;
  maxPageNum: number;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  onPositionInput: (pageNum: number) => void;
  onRetry: (pageNum: number) => void;
  onScroll: () => void;
  onScroller: (element: HTMLDivElement) => void;
  onWheel: () => void;
  pixelScale: Accessor<number>;
  positionBarVisible: Accessor<boolean>;
  positionBarVisibleRatio: Accessor<number>;
  positionPage: Accessor<number>;
  previewCache: GalleryPreviewCache;
  rightToLeft: boolean;
  screenEndPageNum: Accessor<number>;
  screenStartPageNum: Accessor<number>;
  scrollerClassList: Record<string, boolean>;
  slots: Accessor<PreviewSlot[]>;
  thickness: "narrow" | "normal";
};

function PreviewViewport(props: { state: PreviewViewportState }) {
  const state = untrack(() => props.state);
  return (
    <div class="relative min-h-0 w-full flex-1">
      <div
        ref={state.onScroller}
        class="absolute box-border bg-[var(--color-surface)] cursor-grab [&[data-dragging=true]]:(cursor-grabbing select-none) [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [-webkit-overflow-scrolling:touch]"
        classList={state.scrollerClassList}
        onScroll={state.onScroll}
        onWheel={state.onWheel}
      >
        <div
          class="relative"
          style={{
            height: state.canvasHeight(),
            width: state.canvasWidth(),
          }}
        >
          <For each={state.slots()}>{(slot) => {
            const itemIndex = () => slot.pageNum - 1;
            const group = () => Math.floor(itemIndex() / state.layout().crossCount);
            const crossIndex = () => itemIndex() % state.layout().crossCount;
            const left = () => {
              if (!state.horizontal) {
                return crossIndex() *
                  (state.layout().tileWidth + state.layout().gap);
              }
              return state.rightToLeft
                ? Number.parseFloat(state.canvasWidth()) -
                  state.layout().tileWidth - group() * state.layout().mainStride
                : group() * state.layout().mainStride;
            };
            const top = () => state.horizontal
              ? crossIndex() * (state.layout().tileHeight + state.layout().gap)
              : group() * state.layout().mainStride;
            return (
              <div
                class="absolute"
                style={{
                  height: `${state.layout().tileHeight}px`,
                  left: `${left()}px`,
                  top: `${top()}px`,
                  width: `${state.layout().tileWidth}px`,
                }}
              >
                <PreviewTile
                  alignment={state.rightToLeft
                    ? "right"
                    : state.horizontal
                      ? "left"
                      : "center"}
                  allowUpscale={state.allowUpscale()}
                  decodeCache={state.decodeCache}
                  failed={state.failedIndexes().has(
                    state.previewCache.previewIndexForPage(slot.pageNum),
                  )}
                  height={state.layout().tileHeight}
                  highlighted={slot.pageNum === state.highlightedPageNum()}
                  item={slot.item}
                  pageNum={slot.pageNum}
                  onOpenPage={state.onOpenPage}
                  onRetry={() => state.onRetry(slot.pageNum)}
                  width={state.layout().tileWidth}
                />
              </div>
            );
          }}</For>
        </div>
      </div>
      <Show when={state.positionBarVisible()}>
        <PositionBar
          ariaLabel={texts.gallery.scrollPreview}
          axis={state.horizontal ? "horizontal" : "vertical"}
          currentValue={state.positionPage()}
          expanded={!state.horizontal}
          maxValue={state.maxPageNum}
          onInput={state.onPositionInput}
          pixelScale={state.pixelScale()}
          position={state.horizontal ? undefined : "absolute"}
          reversed={state.horizontal && state.rightToLeft}
          thickness={state.thickness}
          trackClickEnabled={false}
          trackVisible={false}
          visibleRatio={state.positionBarVisibleRatio()}
        />
      </Show>
    </div>
  );
}

export type ScrollPreviewActions = {
  close: () => void;
  gotoPreview: (previewIndex: number) => void;
  gotoPage: (pageNum: number) => void;
};

export type ScrollPreviewProps = {
  coordinator: GalleryCoordinator;
  embeddedDirection: ReadDirection;
  leftHandedControls: Accessor<boolean>;
  onLoadError: (error: unknown) => void;
  onEmbeddedDirectionChange: (direction: ReadDirection) => void;
  onReadDirectionChange: (direction: ReadDirection) => void;
  previewCache: GalleryPreviewCache;
  readDirection: ReadDirection;
  replaceOriginalPreview: boolean;
};

type ScrollPreviewSession = {
  continuePageNum: Accessor<number | null>;
  crossCountOverride: Accessor<number | null>;
  decodeCache: PreviewDecodeCache;
  embeddedCrossCountOverride: Accessor<number | null>;
  embeddedReadDirection: Accessor<ReadDirection>;
  highlightedPageNum: Accessor<number | null>;
  open: Accessor<boolean>;
  readDirection: Accessor<ReadDirection>;
  setCrossCountOverride: Setter<number | null>;
  setEmbeddedCrossCountOverride: Setter<number | null>;
  setEmbeddedReadDirection: Setter<ReadDirection>;
  setReadDirection: Setter<ReadDirection>;
  setTargetPageNum: Setter<number | null>;
  targetPageNum: Accessor<number | null>;
  targetPreviewIndex: Accessor<number>;
};

export function ScrollPreview(props: ScrollPreviewProps) {
  const coordinator = untrack(() => props.coordinator);
  const previewCache = untrack(() => props.previewCache);
  const decodeCache = new PreviewDecodeCache(DECODE_CACHE_BYTES, DECODE_CACHE_ITEMS);
  const [open, setOpen] = createSignal(false);
  const [readDirection, setReadDirection] = createSignal(
    untrack(() => props.readDirection),
  );
  const [embeddedReadDirection, setEmbeddedReadDirection] =
    createSignal<ReadDirection>(untrack(() => props.embeddedDirection));
  const [crossCountOverride, setCrossCountOverride] = createSignal<number | null>(null);
  const [embeddedCrossCountOverride, setEmbeddedCrossCountOverride] =
    createSignal<number | null>(null);
  const [targetPreviewIndex, setTargetPreviewIndex] = createSignal(
    untrack(() => previewCache.current().data.currentIndex),
  );
  const [highlightedPageNum, setHighlightedPageNum] = createSignal<number | null>(null);
  const continuePageNum = () => coordinator.progress().hasHistory
    ? coordinator.progress().currentPage
    : null;
  const [targetPageNum, setTargetPageNum] = createSignal<number | null>(null);
  const openPreview = (): void => {
    if (!open()) {
      setOpen(true);
    }
  };

  coordinator.attachPreview({
    close: () => setOpen(false),
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
  onCleanup(() => {
    decodeCache.dispose();
  });

  const session: ScrollPreviewSession = {
    continuePageNum,
    crossCountOverride,
    decodeCache,
    embeddedCrossCountOverride,
    embeddedReadDirection,
    highlightedPageNum,
    open,
    readDirection,
    setCrossCountOverride,
    setEmbeddedCrossCountOverride,
    setEmbeddedReadDirection,
    setReadDirection,
    setTargetPageNum,
    targetPageNum,
    targetPreviewIndex,
  };

  return (
    <>
      <EmbeddedScrollPreview session={session} source={props} />
      <ScrollPreviewLauncher session={session} source={props} />
      <ScrollPreviewOverlay session={session} source={props} />
    </>
  );
}

function EmbeddedScrollPreview(props: {
  session: ScrollPreviewSession;
  source: ScrollPreviewProps;
}) {
  const session = untrack(() => props.session);
  const source = untrack(() => props.source);
  return (
    <Show when={source.replaceOriginalPreview}>
      <Show when={session.embeddedReadDirection()} keyed>{(direction) => (
        <ScrollPreviewPanel
          crossCountOverride={session.embeddedCrossCountOverride()}
          decodeCache={session.decodeCache}
          embedded
          highlightedPageNum={session.continuePageNum}
          leftHandedControls={source.leftHandedControls}
          onDirectionChange={(next, pageNum) => {
            session.setTargetPageNum(pageNum);
            session.setEmbeddedReadDirection(next);
            source.onEmbeddedDirectionChange(next);
          }}
          onLoadError={source.onLoadError}
          onCrossCountOverrideChange={session.setEmbeddedCrossCountOverride}
          onOpenOverlay={source.coordinator.openPreviewPage}
          onOpenPage={source.coordinator.openGalleryPage}
          pixelScale={1}
          previewCache={source.previewCache}
          readDirection={direction}
          targetPageNum={session.targetPageNum() ?? session.continuePageNum() ?? 1}
          targetPreviewIndex={session.targetPreviewIndex()}
        />
      )}</Show>
    </Show>
  );
}

function ScrollPreviewLauncher(props: {
  session: ScrollPreviewSession;
  source: ScrollPreviewProps;
}) {
  const session = untrack(() => props.session);
  const source = untrack(() => props.source);
  return (
    <Show when={!source.replaceOriginalPreview}>
      <div class="flex w-full justify-center my-sm">
        <button
          type="button"
          class="inline-flex min-h-[var(--ui-control-size-xs)] items-center justify-center gap-sm px-md rounded-xl border-0 bg-[var(--color-site-surface)] ehp-color-site-text font-sans textsize-sm font-700 cursor-pointer transition-[background-color,transform] duration-120 hover:bg-[var(--color-site-item-hover)] active:scale-98"
          onClick={() => source.coordinator.openPreviewPage(session.continuePageNum() ?? 1)}
        >
          <Icon name="grid" size="var(--ui-icon-size-sm)" />
          {texts.gallery.scrollPreview}
        </button>
      </div>
    </Show>
  );
}

function ScrollPreviewOverlay(props: {
  session: ScrollPreviewSession;
  source: ScrollPreviewProps;
}) {
  const session = untrack(() => props.session);
  const source = untrack(() => props.source);
  const overlayHost = useOverlayHost();
  return (
    <Show when={session.open()}>
      <OverlayPortal>
        <Show when={session.readDirection()} keyed>{(direction) => (
          <ScrollPreviewPanel
            crossCountOverride={session.crossCountOverride()}
            decodeCache={session.decodeCache}
            embedded={false}
            highlightedPageNum={session.highlightedPageNum}
            leftHandedControls={source.leftHandedControls}
            onClose={source.coordinator.requestClosePreview}
            onDirectionChange={(next, pageNum) => {
              session.setTargetPageNum(pageNum);
              session.setReadDirection(next);
              source.onReadDirectionChange(next);
            }}
            onLoadError={source.onLoadError}
            onCrossCountOverrideChange={session.setCrossCountOverride}
            onOpenPage={source.coordinator.selectPreviewPage}
            pixelScale={overlayHost.fullscreenPixelScale()}
            previewCache={source.previewCache}
            readDirection={direction}
            targetPageNum={session.targetPageNum()}
            targetPreviewIndex={session.targetPreviewIndex()}
          />
        )}</Show>
      </OverlayPortal>
    </Show>
  );
}

function ScrollPreviewPanel(props: {
  crossCountOverride: number | null;
  decodeCache: PreviewDecodeCache;
  embedded: boolean;
  highlightedPageNum: Accessor<number | null>;
  leftHandedControls: Accessor<boolean>;
  onClose?: (previewIndex: number) => void;
  onDirectionChange?: (direction: ReadDirection, pageNum: number) => void;
  onLoadError: (error: unknown) => void;
  onCrossCountOverrideChange: (crossCount: number) => void;
  onOpenOverlay?: (pageNum: number) => void;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  pixelScale: number;
  previewCache: GalleryPreviewCache;
  readDirection: ReadDirection;
  targetPageNum: number | null;
  targetPreviewIndex: number;
}) {
  const decodeCache = untrack(() => props.decodeCache);
  const embedded = untrack(() => props.embedded);
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
  const pixelScale = () => props.pixelScale;
  const initialPixelScale = untrack(pixelScale);
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
  const crossCountOverride = (): number | null => props.crossCountOverride;
  const [exitDragOffset, setExitDragOffset] = createSignal(0);
  const [previewLoadReady, setPreviewLoadReady] = createSignal(false);
  const [positionBarReady, setPositionBarReady] = createSignal(false);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [layout, setLayout] = createSignal<PreviewLayout>({
    crossCount: 1,
    gap: GRID_GAP * initialPixelScale,
    horizontal,
    mainStride: horizontal
      ? (MAX_TILE_WIDTH + GRID_GAP) * initialPixelScale
      : (MAX_TILE_WIDTH * initialTileAspectRatio + GRID_GAP) * initialPixelScale,
    tileHeight: MAX_TILE_WIDTH * initialTileAspectRatio * initialPixelScale,
    tileWidth: MAX_TILE_WIDTH * initialPixelScale,
    viewportHeight: 1,
    viewportWidth: 1,
  });
  let scroller!: HTMLDivElement;
  let overlay!: HTMLElement;
  let dragDirection: "exit" | "scroll" | null = null;
  let dragStartPosition: number | null = null;
  let resizeAnchorPageNum: number | null = null;
  let pinchStartCrossCount = 1;
  let pinchMinimumCrossCount = 1;
  let layoutFrame: number | null = null;
  let scrollFrame: number | null = null;
  let layoutWidth = 0;
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
    clamp(
      Math.floor(scrollOffset() / layout().mainStride) * layout().crossCount + 1,
      1,
      totalImages,
    )
  );
  const screenEndPageNum = createMemo(() => {
    const end = Math.max(scrollOffset(), scrollOffset() + mainViewportSize() - 1);
    const endGroup = Math.floor(end / layout().mainStride);
    return clamp(
      (endGroup + 1) * layout().crossCount,
      screenStartPageNum(),
      totalImages,
    );
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
  const loading = createPreviewLoading({
    aspectPreviewIndex,
    centeredPageNum,
    maxPreviewIndex,
    onAspectRatio: setTileAspectRatio,
    onLoadError,
    previewCache,
    ready: previewLoadReady,
  });
  const preferredLayoutAnchorPageNum = (): number => {
    const targetPageNum = props.highlightedPageNum() ?? props.targetPageNum;
    return targetPageNum !== null &&
        targetPageNum >= screenStartPageNum() &&
        targetPageNum <= screenEndPageNum()
      ? targetPageNum
      : centeredPageNum();
  };
  const minimumCrossCount = (currentLayout: PreviewLayout): number => {
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
    return Math.max(
      1,
      Math.ceil(
        (crossSize + currentLayout.gap) /
          (maximumTileCrossSize + currentLayout.gap),
      ),
    );
  };
  const resizeCrossCount = (delta: number): void => {
    flingAnimator.cancel();
    resizeAnchorPageNum = preferredLayoutAnchorPageNum();
    const currentLayout = layout();
    props.onCrossCountOverrideChange(
      clamp(
        currentLayout.crossCount + delta,
        minimumCrossCount(currentLayout),
        Math.min(MAX_CROSS_COUNT, totalImages),
      ),
    );
    queueMicrotask(() => {
      resizeAnchorPageNum = null;
    });
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
    const value = !horizontal
      ? scroller.scrollTop
      : rightToLeft
      ? maxScrollOffset() - scroller.scrollLeft
      : scroller.scrollLeft;
    return clamp(value, 0, maxScrollOffset());
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
      dragAxis: embedded
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
          dragDirection = embedded || mainDelta >= exitDelta
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
        if (embedded) {
          return false;
        }
        flingAnimator.cancel();
        resizeAnchorPageNum = preferredLayoutAnchorPageNum();
        pinchStartCrossCount = layout().crossCount;
        const currentLayout = layout();
        pinchMinimumCrossCount = Math.min(
          pinchStartCrossCount,
          minimumCrossCount(currentLayout),
        );
        return true;
      },
      onPinchMove: (info) => {
        if (embedded) {
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
        resizeAnchorPageNum = null;
      },
    }),
  );

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

  const updateLayout = (resetEmbeddedHeight = false): void => {
    setPreviewLoadReady(false);
    if (resetEmbeddedHeight && embedded) {
      overlay.style.removeProperty("height");
    }
    const width = Math.max(1, scroller.clientWidth);
    const height = Math.max(1, scroller.clientHeight);
    const scale = pixelScale();
    const gap = GRID_GAP * scale;
    const aspectRatio = tileAspectRatio();
    const baseMaxTileWidth = MAX_TILE_WIDTH * scale;
    const referenceItemsPerRow = Math.max(
      1,
      Math.ceil((width + gap) / (baseMaxTileWidth + gap)),
    );
    const referenceItemWidth = Math.max(
      1,
      (width - gap * (referenceItemsPerRow - 1)) / referenceItemsPerRow,
    );
    const maxTileWidth = embedded
      ? referenceItemWidth *
        Math.sqrt(REFERENCE_PORTRAIT_ASPECT_RATIO / aspectRatio)
      : baseMaxTileWidth;
    const anchorPageNum = initialized
      ? resizeAnchorPageNum ?? preferredLayoutAnchorPageNum()
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
    const availableRows = embedded
      ? Math.max(1, Math.floor((height + gap) / (itemHeight + gap)))
      : Math.max(1, Math.ceil((height + gap) / (itemHeight + gap)));
    const automaticCrossCount = horizontal
      ? Math.min(availableRows, Math.ceil(totalImages / itemsPerRow))
      : Math.min(itemsPerRow, totalImages);
    const crossCount = clamp(
      crossCountOverride() ?? automaticCrossCount,
      1,
      totalImages,
    );
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
    if (embedded && horizontal) {
      const fittedScrollerHeight =
        crossCount * tileHeight + (crossCount - 1) * gap;
      overlay.style.height =
        `${Math.ceil(overlay.clientHeight - height + fittedScrollerHeight)}px`;
    } else if (embedded) {
      overlay.style.removeProperty("height");
    }
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
      setPositionBarReady(true);
    }));
  };

  createEffect(() => {
    crossCountOverride();
    pixelScale();
    tileAspectRatio();
    if (initialized) {
      untrack(() => updateLayout(true));
    }
  });

  onMount(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    if (!embedded) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      void overlay.animate(
        [
          {
            opacity: 0.72,
            transform: horizontal
              ? "translate3d(0, -32px, 0) scale(0.99)"
              : "translate3d(32px, 0, 0) scale(0.99)",
          },
          { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
        ],
        {
          duration: 120,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        },
      ).finished.catch(() => undefined);
    }
    const resizeObserver = new ResizeObserver(() => untrack(() => {
      const width = scroller.clientWidth;
      if (Math.abs(width - layoutWidth) <= 1) {
        return;
      }
      layoutWidth = width;
      updateLayout(true);
    }));
    resizeObserver.observe(scroller);
    layoutWidth = scroller.clientWidth;
    updateLayout(true);
    onCleanup(() => {
      disposed = true;
      flingAnimator.cancel();
      resizeObserver.disconnect();
      if (!embedded) {
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

  const toolbarState: PreviewToolbarState = {
    directionIcon,
    directionLabel,
    leftHanded: untrack(() => props.leftHandedControls),
    loading: () => loading.loadingCount() > 0,
    rangeText: () =>
      `${screenStartPageNum()}–${screenEndPageNum()} / ${totalImages}`,
    zoomInDisabled: () =>
      layout().crossCount <= minimumCrossCount(layout()),
    zoomOutDisabled: () =>
      layout().crossCount >= Math.min(MAX_CROSS_COUNT, totalImages),
    onDirectionChange: requestDirectionChange,
    onZoomIn: () => resizeCrossCount(-1),
    onZoomOut: () => resizeCrossCount(1),
  };
  const positionBarVisibleRatio = (): number =>
    clamp(mainViewportSize() / mainCanvasSize(), 0, 1);
  const viewportState: PreviewViewportState = {
    allowUpscale: () => embedded || crossCountOverride() !== null,
    canvasHeight: () => horizontal ? "100%" : `${totalMainSize()}px`,
    canvasWidth: () => horizontal ? `${mainCanvasSize()}px` : "100%",
    decodeCache,
    failedIndexes: loading.failedIndexes,
    highlightedPageNum: untrack(() => props.highlightedPageNum),
    horizontal,
    layout,
    maxPageNum: totalImages,
    onOpenPage: untrack(() => props.onOpenPage),
    onPositionInput: scrollToPositionPage,
    onRetry: loading.retry,
    onScroll: () => {
      if (scrollFrame !== null) {
        return;
      }
      scrollFrame = window.requestAnimationFrame(() => {
        scrollFrame = null;
        setScrollOffset(untrack(readScrollOffset));
      });
    },
    onScroller: (element) => {
      scroller = element;
    },
    onWheel: () => flingAnimator.cancel(),
    pixelScale,
    positionBarVisible: () =>
      positionBarReady() &&
      maxScrollOffset() > SCROLL_PIXEL_EPSILON &&
      positionBarVisibleRatio() < 1 &&
      (screenStartPageNum() > 1 || screenEndPageNum() < totalImages),
    positionBarVisibleRatio,
    positionPage: scrollPositionPage,
    previewCache,
    rightToLeft,
    screenEndPageNum,
    screenStartPageNum,
    scrollerClassList: {
      "inset-0": !embedded,
      "top-0 right-xs left-xs": embedded,
      "bottom-[calc(var(--ui-control-size-xs)/2)]": embedded && horizontal,
      "bottom-xs": embedded && !horizontal,
      "overflow-x-auto overflow-y-hidden": horizontal,
      "overflow-y-auto overflow-x-hidden": !horizontal,
      "overscroll-auto": embedded,
      "[touch-action:pan-x]": embedded && !horizontal,
      "[touch-action:pan-y]": embedded && horizontal,
      "overscroll-contain [touch-action:none]": !embedded,
    },
    slots: visibleSlots,
    thickness: embedded || !horizontal ? "narrow" : "normal",
  };

  return (
    <div
      classList={{
        "contents": embedded,
        "fixed inset-0 z-[1300]": !embedded,
      }}
    >
      <section
        ref={overlay}
        class="box-border flex flex-col overflow-hidden text-[var(--color-text)] font-sans textsize-md leading-[1.4]"
        classList={{
          "absolute inset-0 bg-[var(--color-site-surface)] text-[var(--color-site-text)]":
            !embedded,
          "border ehp-color-site-border rounded-sm bg-[var(--color-site-elevated)]":
            embedded,
          "relative h-[var(--scroll-preview-height)]": embedded,
          "w-full": true,
        }}
        style={{
          opacity: embedded
            ? "1"
            : `${1 - Math.min(0.15, Math.abs(exitDragOffset()) / Math.max(1, horizontal ? window.innerHeight : window.innerWidth) * 0.15)}`,
          transform: embedded
            ? "none"
            : `translate3d(${horizontal ? 0 : exitDragOffset()}px, ${horizontal ? exitDragOffset() : 0}px, 0) scale(${1 - Math.min(0.03, Math.abs(exitDragOffset()) / Math.max(1, horizontal ? window.innerHeight : window.innerWidth) * 0.03)})`,
        }}
      >
        <Show
          when={embedded}
          fallback={
            <OverlayPreviewToolbar
              currentDisabled={props.highlightedPageNum() === null}
              onClose={() => onClose?.(centeredPreviewIndex())}
              onCurrent={() => {
                const highlightedPageNum = props.highlightedPageNum();
                if (highlightedPageNum !== null) {
                  flingAnimator.cancel();
                  scrollToPage(highlightedPageNum);
                }
              }}
              state={toolbarState}
            />
          }
        >
          <EmbeddedPreviewToolbar
            onOpenOverlay={() => props.onOpenOverlay?.(centeredPageNum())}
            state={toolbarState}
          />
        </Show>
        <PreviewViewport state={viewportState} />
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
                class="pointer-events-none absolute inset-0 z-1 box-border rounded-sm border-6 border-solid border-[var(--color-danger)]"
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
