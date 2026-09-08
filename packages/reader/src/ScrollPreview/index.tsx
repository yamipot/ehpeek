import {
  createEffect,
  createMemo,
  mergeProps,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  untrack,
  type Accessor,
  type Setter,
} from "solid-js";
import { createReadProgressPublisher, type ReadProgressPort } from "../features/ReadProgressSyncer";
import type { PreviewCache } from "../features/PreviewCache";
import { lockPageScroll } from "../features/Viewport";

import { OverlayPortal, useOverlayHost } from "../kit/Widgets/OverlayHost";
import type { PreviewItem, ReadDirection } from "../kit/interfaces";
import { useReaderTexts } from "../kit/i18n";
import { clamp } from "../kit/helpers";
import { ScrollFlingAnimator } from "../kit/animation";
import { createPointerGestureElement } from "../kit/PointerGesture";
import { IconButton } from "../kit/Widgets/Button";
import { Icon } from "../kit/Widgets/Icon";
import { LauncherButton } from "../kit/Widgets/LauncherButton";
import { PositionBar } from "../kit/Widgets/PositionBar";
import { PriorityLoadQueue } from "../features/PriorityLoadQueue";

const GRID_GAP = 8;
const HORIZONTAL_FLING_VELOCITY_FACTOR = 1.6;
const MAX_LAYOUT_ASPECT_RATIO = 3;
const MAX_TILE_WIDTH = 220;
const MAX_CROSS_COUNT = 12;
const OVERSCAN_ROWS = 4;
const SCROLL_PIXEL_EPSILON = 1;
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
  estimatedGroupSize: number;
  gap: number;
  groupOffsets: number[];
  groupSizes: number[];
  horizontal: boolean;
  itemScaleLimit: number;
  tileCrossSize: number;
  totalMainSize: number;
  viewportHeight: number;
  viewportWidth: number;
};

type PreviewSlot = {
  item: PreviewItem | null;
  pageNum: number;
};

function layoutAspectRatio(aspectRatio: number): number {
  return clamp(
    aspectRatio,
    1 / MAX_LAYOUT_ASPECT_RATIO,
    MAX_LAYOUT_ASPECT_RATIO,
  );
}

function layoutThumbnailSize(item: PreviewItem): {
  height: number;
  width: number;
} {
  const aspectRatio = layoutAspectRatio(item.aspectRatio);
  return {
    height: Math.max(
      item.thumbnail.height,
      item.thumbnail.width * aspectRatio,
    ),
    width: Math.max(
      item.thumbnail.width,
      item.thumbnail.height / aspectRatio,
    ),
  };
}

function medianSize(sizes: number[], estimatedSize: number): number {
  const sorted = [...sizes].sort((left, right) => left - right);
  const middle = (sorted.length - 1) / 2;
  const lower = sorted[Math.floor(middle)] ?? estimatedSize;
  const upper = sorted[Math.ceil(middle)] ?? lower;
  return (lower + upper) / 2;
}

function buildGroupGeometry(options: {
  crossCount: number;
  estimatedAspectRatio: number;
  gap: number;
  horizontal: boolean;
  item: (pageNum: number) => PreviewItem | null;
  itemScaleLimit: number;
  tileCrossSize: number;
  totalImages: number;
}): Pick<PreviewLayout, "estimatedGroupSize" | "groupOffsets" | "groupSizes" | "totalMainSize"> {
  const estimatedGroupSize = options.horizontal
    ? options.tileCrossSize / options.estimatedAspectRatio
    : options.tileCrossSize * options.estimatedAspectRatio;
  const totalGroups = Math.ceil(options.totalImages / options.crossCount);
  const groupOffsets: number[] = [];
  const groupSizes: number[] = [];
  let offset = 0;

  for (let group = 0; group < totalGroups; group += 1) {
    const itemMainSizes: number[] = [];
    const startPageNum = group * options.crossCount + 1;
    const endPageNum = Math.min(
      options.totalImages,
      startPageNum + options.crossCount - 1,
    );
    for (let pageNum = startPageNum; pageNum <= endPageNum; pageNum += 1) {
      const item = options.item(pageNum);
      if (item === null) {
        continue;
      }
      const aspectRatio = layoutAspectRatio(item.aspectRatio);
      const thumbnailSize = layoutThumbnailSize(item);
      const thumbnailCrossSize = options.horizontal
        ? thumbnailSize.height
        : thumbnailSize.width;
      const itemCrossSize = thumbnailCrossSize * options.itemScaleLimit;
      itemMainSizes.push(options.horizontal
        ? itemCrossSize / aspectRatio
        : itemCrossSize * aspectRatio);
    }
    const groupSize = itemMainSizes.length === 0
      ? estimatedGroupSize
      : Math.max(...itemMainSizes);
    groupOffsets.push(offset);
    groupSizes.push(groupSize);
    offset += groupSize + options.gap;
  }

  return {
    estimatedGroupSize,
    groupOffsets,
    groupSizes,
    totalMainSize: Math.max(1, offset - options.gap),
  };
}

function groupAtOffset(layout: PreviewLayout, offset: number): number {
  const lastGroup = layout.groupOffsets.length - 1;
  if (lastGroup <= 0 || offset <= 0) {
    return 0;
  }

  let low = 0;
  let high = lastGroup;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (groupOffsetAt(layout, middle) <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

function groupOffsetAt(layout: PreviewLayout, group: number): number {
  const offset = layout.groupOffsets[group];
  if (offset === undefined) {
    throw new RangeError(`Invalid preview group: ${group}`);
  }
  return offset;
}

function groupSizeAt(layout: PreviewLayout, group: number): number {
  const size = layout.groupSizes[group];
  if (size === undefined) {
    throw new RangeError(`Invalid preview group: ${group}`);
  }
  return size;
}

function logicalGroupOffset(layout: PreviewLayout, offset: number): number {
  const group = groupAtOffset(layout, offset);
  const stride = groupSizeAt(layout, group) + layout.gap;
  return group + clamp((offset - groupOffsetAt(layout, group)) / stride, 0, 1);
}

function physicalGroupOffset(layout: PreviewLayout, logicalOffset: number): number {
  const lastGroup = layout.groupOffsets.length - 1;
  const group = clamp(Math.floor(logicalOffset), 0, lastGroup);
  const fraction = clamp(logicalOffset - group, 0, 1);
  return groupOffsetAt(layout, group) +
    fraction * (groupSizeAt(layout, group) + layout.gap);
}

function createPreviewLoading(options: {
  centeredPageNum: Accessor<number>;
  maxPreviewIndex: number;
  onLoadError: (error: unknown) => void;
  previewCache: PreviewCache;
  ready: Accessor<boolean>;
}) {
  const queue = new PriorityLoadQueue<number, void>(
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
    onLoaded: () => {
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
      sync(options.previewCache.batchForPage(options.centeredPageNum()));
    }
  });
  onCleanup(() => queue.dispose());

  return {
    failedIndexes,
    loadingCount,
    retry(pageNum: number): void {
      const retryIndex = options.previewCache.batchForPage(pageNum);
      sync(
        options.previewCache.batchForPage(options.centeredPageNum()),
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
  const texts = useReaderTexts();
  return (
    <div class={`flex min-h-[var(--ui-control-size-md)] flex-none items-center justify-between ui-gap-md bg-[var(--color-site-elevated)] safe-pt-sm safe-pr-sm ui-pb-sm safe-pl-sm border-0 border-b border-[var(--color-site-border)] text-[var(--color-site-text)] textsize-sm${props.state.leftHanded() ? " flex-row-reverse" : ""}`}>
      <span class="flex items-center ui-gap-sm opacity-75">
        <Show when={props.state.loading()}>
          <span class="block w-[var(--ui-icon-size-sm)] h-[var(--ui-icon-size-sm)] box-border animate-spin rounded-full border-2px border-solid ehp-color-spinner" />
        </Show>
        {props.state.rangeText()}
      </span>
      <div class={`flex flex-none ui-gap-sm${props.state.leftHanded() ? " flex-row-reverse" : ""}`}>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={props.state.directionLabel}
          title={props.state.directionLabel}
          onClick={() => props.state.onDirectionChange()}
        >
          <Icon name={props.state.directionIcon} size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.zoomOut}
          title={texts.common.actions.zoomOut}
          disabled={props.state.zoomOutDisabled()}
          onClick={() => props.state.onZoomOut()}
        >
          <Icon name="zoom-out" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.zoomIn}
          title={texts.common.actions.zoomIn}
          disabled={props.state.zoomInDisabled()}
          onClick={() => props.state.onZoomIn()}
        >
          <Icon name="zoom-in" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.current}
          title={texts.common.actions.current}
          disabled={props.currentDisabled}
          onClick={() => props.onCurrent()}
        >
          <Icon name="locate" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="subtle"
          size="md"
          aria-label={texts.common.actions.close}
          title={texts.common.actions.close}
          onClick={() => props.onClose()}
        >
          <Icon name="close" size="var(--ui-icon-size-md)" />
        </IconButton>
      </div>
    </div>
  );
}

function EmbeddedPreviewToolbar(props: {
  currentDisabled: boolean;
  onCurrent: () => void;
  onOpenOverlay: () => void;
  state: PreviewToolbarState;
}) {
  const texts = useReaderTexts();
  return (
    <div
      class={`flex min-h-[var(--ui-control-size-sm)] flex-none flex-wrap items-center justify-between ui-gap-sm ui-px-sm ui-py-xs border-0 border-b ehp-color-site-border-subtle-b bg-[var(--color-site-elevated)] textsize-sm${props.state.leftHanded() ? " flex-row-reverse" : ""}`}
    >
      <span
        class="inline-flex min-h-[var(--ui-control-size-sm)] flex-none items-center ui-gap-xs ui-px-sm ui-rounded-sm bg-[var(--color-site-surface)] opacity-75"
      >
        <Show when={props.state.loading()}>
          <span class="block w-[var(--ui-icon-size-sm)] h-[var(--ui-icon-size-sm)] box-border animate-spin rounded-full border-2px border-solid ehp-color-spinner" />
        </Show>
        {props.state.rangeText()}
      </span>
      <div
        class={`flex min-w-0 max-w-full flex-wrap items-center ui-gap-xs ${
          props.state.leftHanded()
            ? "mr-auto flex-row-reverse"
            : "ml-auto"
        }`}
      >
        <IconButton
          variant="surface"
          size="sm"
          aria-label={props.state.directionLabel}
          title={props.state.directionLabel}
          onClick={() => props.state.onDirectionChange()}
        >
          <Icon name={props.state.directionIcon} size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="surface"
          size="sm"
          aria-label={texts.common.actions.zoomOut}
          title={texts.common.actions.zoomOut}
          disabled={props.state.zoomOutDisabled()}
          onClick={() => props.state.onZoomOut()}
        >
          <Icon name="zoom-out" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="surface"
          size="sm"
          aria-label={texts.common.actions.zoomIn}
          title={texts.common.actions.zoomIn}
          disabled={props.state.zoomInDisabled()}
          onClick={() => props.state.onZoomIn()}
        >
          <Icon name="zoom-in" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="surface"
          size="sm"
          aria-label={texts.common.actions.current}
          title={texts.common.actions.current}
          disabled={props.currentDisabled}
          onClick={() => props.onCurrent()}
        >
          <Icon name="locate" size="var(--ui-icon-size-md)" />
        </IconButton>
        <IconButton
          variant="surface"
          size="sm"
          aria-label={texts.gallery.openScrollPreview}
          title={texts.gallery.openScrollPreview}
          onClick={() => props.onOpenOverlay()}
        >
          <Icon name="fullscreen" size="var(--ui-icon-size-md)" />
        </IconButton>
      </div>
    </div>
  );
}

type PreviewViewportState = {
  canvasHeight: Accessor<string>;
  canvasWidth: Accessor<string>;
  decodeCache: PreviewDecodeCache;
  failedIndexes: Accessor<Set<number>>;
  highlightedPageNum: Accessor<number | null>;
  horizontal: boolean;
  layout: Accessor<PreviewLayout>;
  onPositionCommit: () => void;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  onPositionInput: (value: number) => void;
  onPositionPointerDown: () => void;
  onRetry: (pageNum: number) => void;
  onScroll: () => void;
  onScroller: (element: HTMLDivElement) => void;
  onWheel: () => void;
  pixelScale: Accessor<number>;
  positionBarVisible: Accessor<boolean>;
  positionBarVisibleRatio: Accessor<number>;
  positionValue: Accessor<number>;
  previewCache: PreviewCache;
  rightToLeft: boolean;
  screenEndPageNum: Accessor<number>;
  screenStartPageNum: Accessor<number>;
  scrollerClassList: Record<string, boolean>;
  slots: Accessor<PreviewSlot[]>;
  thickness: "narrow" | "normal";
};

function PreviewViewport(props: { state: PreviewViewportState }) {
  const texts = useReaderTexts();
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
            const groupSize = () => groupSizeAt(state.layout(), group());
            const groupOffset = () => groupOffsetAt(state.layout(), group());
            const left = () => {
              if (!state.horizontal) {
                return crossIndex() *
                  (state.layout().tileCrossSize + state.layout().gap);
              }
              return state.rightToLeft
                ? Number.parseFloat(state.canvasWidth()) -
                  groupSize() - groupOffset()
                : groupOffset();
            };
            const top = () => state.horizontal
              ? crossIndex() * (state.layout().tileCrossSize + state.layout().gap)
              : groupOffset();
            const height = () => state.horizontal
              ? state.layout().tileCrossSize
              : groupSize();
            const width = () => state.horizontal
              ? groupSize()
              : state.layout().tileCrossSize;
            return (
              <div
                class="absolute"
                style={{
                  height: `${height()}px`,
                  left: `${left()}px`,
                  top: `${top()}px`,
                  width: `${width()}px`,
                }}
              >
                <PreviewTile
                  decodeCache={state.decodeCache}
                  failed={state.failedIndexes().has(
                    state.previewCache.batchForPage(slot.pageNum),
                  )}
                  height={height()}
                  highlighted={slot.pageNum === state.highlightedPageNum()}
                  item={slot.item}
                  maximumScale={state.layout().itemScaleLimit}
                  pageNum={slot.pageNum}
                  onOpenPage={state.onOpenPage}
                  onRetry={() => state.onRetry(slot.pageNum)}
                  width={width()}
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
          currentValue={state.positionValue()}
          expanded={!state.horizontal}
          maxValue={1}
          minValue={0}
          onCommit={state.onPositionCommit}
          onInput={state.onPositionInput}
          onPointerDown={state.onPositionPointerDown}
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

export type ScrollPreviewOpenState = {
  mode: "overlay" | "embedded";
  pageNum: number;
};

export type ScrollPreviewProps = {
  openState: ScrollPreviewOpenState | null;
  progressRef: (progress: ReadProgressPort | null) => void;
  onClose: (pageNum: number) => void;
  onOpenOverlay: (pageNum: number) => void;
  onSelectPage: (pageUrl: string, pageNum: number) => void;
  initialProgress?: number | null;
  embeddedDirection: ReadDirection;
  fillEmbeddedContainer: Accessor<boolean>;
  leftHandedControls: Accessor<boolean>;
  onLoadError: (error: unknown) => void;
  onEmbeddedDirectionChange: (direction: ReadDirection) => void;
  onReadDirectionChange: (direction: ReadDirection) => void;
  previewCache: PreviewCache;
  readDirection: ReadDirection;
  replaceOriginalPreview: boolean;
};

type ScrollPreviewSession = {
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
  const previewCache = untrack(() => props.previewCache);
  const decodeCache = new PreviewDecodeCache(DECODE_CACHE_BYTES, DECODE_CACHE_ITEMS);
  const publisher = createReadProgressPublisher();
  const open = () => props.openState?.mode === "overlay";
  const [readDirection, setReadDirection] = createSignal(
    untrack(() => props.readDirection),
  );
  const [embeddedReadDirection, setEmbeddedReadDirection] =
    createSignal<ReadDirection>(untrack(() => props.embeddedDirection));
  const [crossCountOverride, setCrossCountOverride] = createSignal<number | null>(null);
  const [embeddedCrossCountOverride, setEmbeddedCrossCountOverride] =
    createSignal<number | null>(null);
  const [targetPreviewIndex, setTargetPreviewIndex] = createSignal(
    untrack(() => previewCache.batchForPage(previewCache.source.initialPageNum)),
  );
  const [highlightedPageNum, setHighlightedPageNum] = createSignal<number | null>(
    untrack(() => props.initialProgress ?? null),
  );
  const [targetPageNum, setTargetPageNum] = createSignal<number | null>(null);
  createEffect(() => setEmbeddedReadDirection(props.embeddedDirection));
  createEffect(() => {
    const view = props.openState;
    setTargetPageNum(view?.pageNum ?? null);
    if (view) setTargetPreviewIndex(previewCache.batchForPage(view.pageNum));
  });

  untrack(() => props.progressRef)({
    current: highlightedPageNum,
    subscribe: publisher.subscribe,
    setProgress: setHighlightedPageNum,
  });
  onCleanup(() => {
    props.progressRef(null);
    decodeCache.dispose();
  });

  const selectionSource = mergeProps(props, {
    onSelectPage: (url: string, page: number) => {
      setHighlightedPageNum(page);
      publisher.publish(page);
      props.onSelectPage(url, page);
    },
  });

  const session: ScrollPreviewSession = {
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
      <EmbeddedScrollPreview session={session} source={selectionSource} />
      <ScrollPreviewLauncher session={session} source={selectionSource} />
      <ScrollPreviewOverlay session={session} source={selectionSource} />
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
          fillEmbeddedContainer={source.fillEmbeddedContainer}
          highlightedPageNum={session.highlightedPageNum}
          leftHandedControls={source.leftHandedControls}
          onClose={source.onClose}
          onDirectionChange={(next, pageNum) => {
            session.setTargetPageNum(pageNum);
            session.setEmbeddedReadDirection(next);
            source.onEmbeddedDirectionChange(next);
          }}
          onLoadError={source.onLoadError}
          onCrossCountOverrideChange={session.setEmbeddedCrossCountOverride}
          onOpenOverlay={source.onOpenOverlay}
          onOpenPage={source.onSelectPage}
          pixelScale={1}
          previewCache={source.previewCache}
          readDirection={direction}
          targetPageNum={
            session.targetPageNum() ?? session.highlightedPageNum() ?? 1
          }
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
  const texts = useReaderTexts();
  const session = untrack(() => props.session);
  const source = untrack(() => props.source);
  return (
    <Show when={!source.replaceOriginalPreview}>
      <div class="flex w-full justify-center ui-my-sm">
        <LauncherButton
          icon="grid"
          label={texts.gallery.scrollPreview}
          onClick={() => source.onOpenOverlay(session.highlightedPageNum() ?? 1)}
        />
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
            fillEmbeddedContainer={() => false}
            highlightedPageNum={session.highlightedPageNum}
            leftHandedControls={source.leftHandedControls}
            onClose={source.onClose}
            onDirectionChange={(next, pageNum) => {
              session.setTargetPageNum(pageNum);
              session.setReadDirection(next);
              source.onReadDirectionChange(next);
            }}
            onLoadError={source.onLoadError}
            onCrossCountOverrideChange={session.setCrossCountOverride}
            onOpenPage={source.onSelectPage}
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
  fillEmbeddedContainer: Accessor<boolean>;
  highlightedPageNum: Accessor<number | null>;
  leftHandedControls: Accessor<boolean>;
  onClose?: (previewIndex: number) => void;
  onDirectionChange?: (direction: ReadDirection, pageNum: number) => void;
  onLoadError: (error: unknown) => void;
  onCrossCountOverrideChange: (crossCount: number) => void;
  onOpenOverlay?: (pageNum: number) => void;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  pixelScale: number;
  previewCache: PreviewCache;
  readDirection: ReadDirection;
  targetPageNum: number | null;
  targetPreviewIndex: number;
}) {
  const texts = useReaderTexts();
  const decodeCache = untrack(() => props.decodeCache);
  const embedded = untrack(() => props.embedded);
  const previewCache = untrack(() => props.previewCache);
  const onClose = untrack(() => props.onClose);
  const onLoadError = untrack(() => props.onLoadError);
  const initialPreview = previewCache.source;
  const totalImages = initialPreview.totalPages;
  const maxPreviewIndex = previewCache.maxBatch;
  const estimatedAspectRatio = layoutAspectRatio(
    initialPreview.aspectRatio,
  );
  const embeddedReferenceTileWidth = medianSize(
    initialPreview.initialPreviewItems.map((item) =>
      layoutThumbnailSize(item).width
    ),
    MAX_TILE_WIDTH,
  );
  const pixelScale = () => props.pixelScale;
  const initialPixelScale = untrack(pixelScale);
  const readDirection = untrack(() => props.readDirection);
  const horizontal = readDirection !== "ttb";
  const referenceThumbnailCrossSize = medianSize(
    initialPreview.initialPreviewItems.map((item) => {
      const size = layoutThumbnailSize(item);
      return horizontal ? size.height : size.width;
    }),
    horizontal ? MAX_TILE_WIDTH * estimatedAspectRatio : MAX_TILE_WIDTH,
  );
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
  const initialTileCrossSize = horizontal
    ? MAX_TILE_WIDTH * estimatedAspectRatio * initialPixelScale
    : MAX_TILE_WIDTH * initialPixelScale;
  const initialGap = GRID_GAP * initialPixelScale;
  const initialGeometry = buildGroupGeometry({
    crossCount: 1,
    estimatedAspectRatio,
    gap: initialGap,
    horizontal,
    item: () => null,
    itemScaleLimit: 1,
    tileCrossSize: initialTileCrossSize,
    totalImages,
  });
  const [layout, setLayout] = createSignal<PreviewLayout>({
    crossCount: 1,
    gap: initialGap,
    horizontal,
    itemScaleLimit: 1,
    tileCrossSize: initialTileCrossSize,
    viewportHeight: 1,
    viewportWidth: 1,
    ...initialGeometry,
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
  let layoutHeight = 0;
  let layoutWidth = 0;
  let layoutDirty = false;
  let pointerActive = false;
  let positionBarActive = false;
  let preserveResizeAnchor = false;
  let version = untrack(previewCache.version);
  let initialized = false;
  let disposed = false;

  const totalGroups = createMemo(() => layout().groupSizes.length);
  const totalMainSize = createMemo(() => layout().totalMainSize);
  const mainViewportSize = createMemo(() =>
    horizontal ? layout().viewportWidth : layout().viewportHeight
  );
  const mainCanvasSize = createMemo(() =>
    Math.max(totalMainSize(), mainViewportSize())
  );
  const visibleStartGroup = createMemo(() =>
    clamp(
      groupAtOffset(layout(), scrollOffset()) - OVERSCAN_ROWS,
      0,
      Math.max(0, totalGroups() - 1),
    )
  );
  const visibleEndGroup = createMemo(() =>
    clamp(
      groupAtOffset(layout(), scrollOffset() + mainViewportSize()) + OVERSCAN_ROWS,
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
      groupAtOffset(layout(), scrollOffset()) * layout().crossCount + 1,
      1,
      totalImages,
    )
  );
  const screenEndPageNum = createMemo(() => {
    const end = Math.max(scrollOffset(), scrollOffset() + mainViewportSize() - 1);
    const endGroup = groupAtOffset(layout(), end);
    return clamp(
      (endGroup + 1) * layout().crossCount,
      screenStartPageNum(),
      totalImages,
    );
  });
  const visibleSlots = createMemo<PreviewSlot[]>(() => {
    previewCache.version();
    const slots: PreviewSlot[] = [];
    for (let pageNum = visibleStartPageNum(); pageNum <= visibleEndPageNum(); pageNum += 1) {
      slots.push({
        item: previewCache.item(pageNum),
        pageNum,
      });
    }
    return slots;
  });
  const centeredPageNum = (): number => {
    const currentLayout = layout();
    const centerGroup = groupAtOffset(
      currentLayout,
      scrollOffset() + mainViewportSize() / 2,
    );
    return clamp(
      centerGroup * currentLayout.crossCount + Math.floor(currentLayout.crossCount / 2) + 1,
      1,
      totalImages,
    );
  };
  const loading = createPreviewLoading({
    centeredPageNum,
    maxPreviewIndex,
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
  const maximumCrossCount = (): number =>
    horizontal ? Math.min(MAX_CROSS_COUNT, totalImages) : MAX_CROSS_COUNT;
  const minimumCrossCountForViewport = (
    viewportWidth: number,
    viewportHeight: number,
    gap: number,
  ): number => {
    const aspectRatio = estimatedAspectRatio;
    const crossSize = horizontal ? viewportHeight : viewportWidth;
    const maximumTileCrossSize = horizontal
      ? Math.min(
        viewportHeight,
        viewportWidth * aspectRatio,
      )
      : Math.min(
        viewportWidth,
        viewportHeight / aspectRatio,
      );
    return Math.max(
      1,
      Math.ceil(
        (crossSize + gap) / (maximumTileCrossSize + gap),
      ),
    );
  };
  const minimumCrossCount = (currentLayout: PreviewLayout): number =>
    minimumCrossCountForViewport(
      currentLayout.viewportWidth,
      currentLayout.viewportHeight,
      currentLayout.gap,
    );
  const resizeCrossCount = (delta: number): void => {
    flingAnimator.cancel();
    resizeAnchorPageNum = preferredLayoutAnchorPageNum();
    const currentLayout = layout();
    props.onCrossCountOverrideChange(
      clamp(
        currentLayout.crossCount + delta,
        minimumCrossCount(currentLayout),
        maximumCrossCount(),
      ),
    );
    queueMicrotask(() => {
      resizeAnchorPageNum = null;
    });
  };
  const maxScrollOffset = (): number =>
    Math.max(0, totalMainSize() - mainViewportSize());
  const maxLogicalScrollOffset = (): number =>
    logicalGroupOffset(layout(), maxScrollOffset());
  const scrollPositionValue = (): number => {
    const maxLogicalOffset = maxLogicalScrollOffset();
    return maxLogicalOffset === 0
      ? 0
      : clamp(
        logicalGroupOffset(layout(), scrollOffset()) / maxLogicalOffset,
        0,
        1,
      );
  };
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
  const scrollToPositionValue = (value: number): void => {
    flingAnimator.cancel();
    const ratio = clamp(value, 0, 1);
    if (ratio === 1) {
      updateScrollOffset(maxScrollOffset());
      return;
    }
    updateScrollOffset(
      physicalGroupOffset(layout(), ratio * maxLogicalScrollOffset()),
    );
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
        pointerActive = true;
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
        pointerActive = false;
        applyPendingLayout();
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
            const pageNum = centeredPageNum();
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
            ).finished.then(() => onClose?.(pageNum));
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
        applyPendingLayout();
      },
    }),
  );

  const scrollToPage = (pageNum: number, currentLayout = untrack(layout)): void => {
    const group = Math.floor(
      (clamp(pageNum, 1, totalImages) - 1) / currentLayout.crossCount,
    );
    updateScrollOffset(
      groupOffsetAt(currentLayout, group) -
        (mainViewportSize() - groupSizeAt(currentLayout, group)) / 2,
    );
  };
  const scrollToPreview = (previewIndex: number, currentLayout: PreviewLayout): void => {
    scrollToPage(previewCache.pageForBatch(previewIndex), currentLayout);
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

  const updateLayout = (
    fitEmbeddedPanel = true,
    preserveViewportAnchor = false,
  ): void => {
    preserveResizeAnchor = preserveViewportAnchor;
    setPreviewLoadReady(false);
    layoutDirty = false;
    if (fitEmbeddedPanel && embedded) {
      overlay.style.removeProperty("height");
    }
    const previousLayout = untrack(layout);
    const preservedAnchorPageNum = initialized && preserveViewportAnchor
      ? centeredPageNum()
      : null;
    const preservedAnchorViewportRatio = preservedAnchorPageNum === null
      ? null
      : (() => {
        const group = Math.floor(
          (preservedAnchorPageNum - 1) / previousLayout.crossCount,
        );
        const center = groupOffsetAt(previousLayout, group) +
          groupSizeAt(previousLayout, group) / 2;
        return (center - scrollOffset()) / mainViewportSize();
      })();
    const width = Math.max(1, scroller.clientWidth);
    const height = Math.max(1, scroller.clientHeight);
    const scale = pixelScale();
    const gap = GRID_GAP * scale;
    const aspectRatio = estimatedAspectRatio;
    const baseMaxTileWidth = MAX_TILE_WIDTH * scale;
    const maxTileWidth = embedded
      ? embeddedReferenceTileWidth * scale
      : baseMaxTileWidth;
    const anchorPageNum = initialized
      ? resizeAnchorPageNum ?? preferredLayoutAnchorPageNum()
      : null;
    const itemsPerRow = Math.max(
      1,
      embedded
        ? Math.round((width + gap) / (maxTileWidth + gap))
        : Math.ceil((width + gap) / (maxTileWidth + gap)),
    );
    const itemWidth = Math.max(
      1,
      (width - gap * (itemsPerRow - 1)) / itemsPerRow,
    );
    const itemHeight = Math.max(1, Math.round(itemWidth * aspectRatio));
    const availableRows = embedded
      ? Math.max(1, Math.floor((height + gap) / (itemHeight + gap)))
      : Math.max(1, Math.ceil((height + gap) / (itemHeight + gap)));
    const fittedCrossCount = horizontal
      ? Math.min(availableRows, Math.ceil(totalImages / itemsPerRow))
      : Math.min(itemsPerRow, maximumCrossCount());
    const automaticCrossCount = embedded
      ? Math.max(
        fittedCrossCount,
        minimumCrossCountForViewport(width, height, gap),
      )
      : fittedCrossCount;
    const crossCount = clamp(
      crossCountOverride() ?? automaticCrossCount,
      1,
      maximumCrossCount(),
    );
    const availableTileHeight = Math.max(
      1,
      (height - gap * (crossCount - 1)) / crossCount,
    );
    const crossCountOverridden = crossCountOverride() !== null;
    const overriddenTileWidth = Math.min(
      Math.max(1, (width - gap * (crossCount - 1)) / crossCount),
      width,
      height / aspectRatio,
    );
    const tileHeight = horizontal
      ? crossCountOverridden
        ? Math.min(availableTileHeight, height, width * aspectRatio)
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
    const tileCrossSize = horizontal ? tileHeight : tileWidth;
    const itemScaleLimit = tileCrossSize / referenceThumbnailCrossSize;
    const geometry = buildGroupGeometry({
      crossCount,
      estimatedAspectRatio,
      gap,
      horizontal,
      item: (pageNum) => untrack(() => previewCache.item(pageNum)),
      itemScaleLimit,
      tileCrossSize,
      totalImages,
    });
    const fitEmbeddedHeight = embedded && !props.fillEmbeddedContainer();
    let viewportHeight = height;
    if (fitEmbeddedPanel && fitEmbeddedHeight && horizontal) {
      viewportHeight = crossCount * tileCrossSize + (crossCount - 1) * gap;
      overlay.style.height =
        `${Math.ceil(overlay.clientHeight - height + viewportHeight)}px`;
    } else if (fitEmbeddedPanel && fitEmbeddedHeight) {
      const fittedScrollerHeight = geometry.totalMainSize;
      viewportHeight = Math.min(height, fittedScrollerHeight);
      if (viewportHeight < height) {
        overlay.style.height =
          `${Math.ceil(overlay.clientHeight - height + viewportHeight)}px`;
      } else {
        overlay.style.removeProperty("height");
      }
    } else if (fitEmbeddedPanel && embedded) {
      overlay.style.removeProperty("height");
    }
    const next = {
      crossCount,
      gap,
      horizontal,
      itemScaleLimit,
      tileCrossSize,
      viewportHeight,
      viewportWidth: width,
      ...geometry,
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
        if (
          preservedAnchorPageNum !== null &&
          preservedAnchorViewportRatio !== null
        ) {
          const group = Math.floor(
            (preservedAnchorPageNum - 1) / next.crossCount,
          );
          const center = groupOffsetAt(next, group) + groupSizeAt(next, group) / 2;
          updateScrollOffset(
            center - preservedAnchorViewportRatio *
              (horizontal ? next.viewportWidth : next.viewportHeight),
          );
        } else {
          scrollToPage(anchorPageNum ?? centeredPageNum(), next);
        }
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
      preserveResizeAnchor = false;
    }));
  };

  // Apply each loaded Preview batch before it paints. Active gestures defer the
  // reflow until release so anchor compensation never fights the pointer.
  const applyPendingLayout = (): void => {
    if (
      !layoutDirty ||
      !initialized ||
      pointerActive ||
      positionBarActive
    ) {
      return;
    }
    untrack(() => updateLayout(crossCountOverride() === null, true));
  };

  const markLayoutDirty = (): void => {
    layoutDirty = true;
    applyPendingLayout();
  };

  createEffect(() => {
    const nextVersion = previewCache.version();
    if (nextVersion === version) {
      return;
    }
    version = nextVersion;
    if (initialized) {
      untrack(markLayoutDirty);
    }
  });

  createEffect(() => {
    crossCountOverride();
    if (initialized) {
      untrack(() => updateLayout(false));
    }
  });

  createEffect(() => {
    props.fillEmbeddedContainer();
    pixelScale();
    if (initialized) {
      untrack(() => updateLayout(true));
    }
  });

  onMount(() => {
    const unlockScroll = embedded ? () => {} : lockPageScroll();
    if (!embedded) {
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
      const height = scroller.clientHeight;
      if (
        Math.abs(width - layoutWidth) <= 1 &&
        Math.abs(height - layoutHeight) <= 1
      ) {
        return;
      }
      layoutHeight = height;
      layoutWidth = width;
      updateLayout(true, preserveResizeAnchor);
    }));
    resizeObserver.observe(scroller);
    layoutHeight = scroller.clientHeight;
    layoutWidth = scroller.clientWidth;
    updateLayout(true);
    onCleanup(() => {
      disposed = true;
      flingAnimator.cancel();
      resizeObserver.disconnect();
      unlockScroll();
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
      layout().crossCount >= maximumCrossCount(),
    onDirectionChange: requestDirectionChange,
    onZoomIn: () => resizeCrossCount(-1),
    onZoomOut: () => resizeCrossCount(1),
  };
  const scrollToHighlightedPage = (): void => {
    const highlightedPageNum = props.highlightedPageNum();
    if (highlightedPageNum !== null) {
      flingAnimator.cancel();
      scrollToPage(highlightedPageNum);
    }
  };
  // Logical groups keep the thumb stable when differently sized groups enter view.
  const positionBarVisibleRatio = (): number => {
    return clamp(
      mainViewportSize() /
        (layout().estimatedGroupSize + layout().gap) /
        totalGroups(),
      0,
      1,
    );
  };
  const viewportState: PreviewViewportState = {
    canvasHeight: () => horizontal ? "100%" : `${totalMainSize()}px`,
    canvasWidth: () => horizontal ? `${mainCanvasSize()}px` : "100%",
    decodeCache,
    failedIndexes: loading.failedIndexes,
    highlightedPageNum: untrack(() => props.highlightedPageNum),
    horizontal,
    layout,
    onOpenPage: untrack(() => props.onOpenPage),
    onPositionCommit: () => {
      positionBarActive = false;
      applyPendingLayout();
    },
    onPositionInput: scrollToPositionValue,
    onPositionPointerDown: () => {
      positionBarActive = true;
    },
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
      positionBarVisibleRatio() < 1,
    positionBarVisibleRatio,
    positionValue: scrollPositionValue,
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
        "fixed inset-0 z-[1300] [touch-action:none]": !embedded,
      }}
    >
      <section
        ref={overlay}
        class="box-border flex flex-col overflow-hidden text-[var(--color-text)] font-sans textsize-md leading-[1.4]"
        classList={{
          "absolute inset-0 bg-[var(--color-site-surface)] text-[var(--color-site-text)]":
            !embedded,
          "border ehp-color-site-border ui-rounded-sm bg-[var(--color-site-elevated)]":
            embedded,
          "relative h-[var(--scroll-preview-height)] max-h-[100svh]": embedded,
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
              onClose={() => onClose?.(centeredPageNum())}
              onCurrent={scrollToHighlightedPage}
              state={toolbarState}
            />
          }
        >
          <EmbeddedPreviewToolbar
            currentDisabled={props.highlightedPageNum() === null}
            onCurrent={scrollToHighlightedPage}
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
  decodeCache: PreviewDecodeCache;
  failed: boolean;
  height: number;
  highlighted: boolean;
  item: PreviewItem | null;
  maximumScale: number;
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
      class="relative flex w-full min-w-0 items-center justify-center overflow-hidden rounded-sm bg-[var(--color-background)]"
      style={{ height: `${props.height}px` }}
    >
      <Show
        when={props.item}
        keyed
        fallback={
          <button
            type="button"
            class="flex w-full h-full flex-col items-center justify-center ui-gap-sm border-0 !bg-transparent text-[var(--color-text)] font-inherit textsize-sm cursor-default"
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
        {(item) => {
          const imageScale = () => Math.min(
            props.maximumScale,
            props.height / item.thumbnail.height,
            props.width / item.thumbnail.width,
          );
          return (
            <>
            <Show
              when={item.thumbnail.kind === "background"}
              fallback={
                <img
                  class="pointer-events-none block flex-none select-none [-webkit-user-drag:none]"
                  src={item.thumbnail.url}
                  alt=""
                  width={item.thumbnail.width}
                  height={item.thumbnail.height}
                  style={{
                    height: `${item.thumbnail.height * imageScale()}px`,
                    width: `${item.thumbnail.width * imageScale()}px`,
                  }}
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
                  transform: `scale(${imageScale()})`,
                  "transform-origin": "center",
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
          );
        }}
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
