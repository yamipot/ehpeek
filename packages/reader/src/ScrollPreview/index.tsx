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
import { bindInteractionGate } from "../features/InteractionGate";

import { useUiPixelScale } from "../UiPixelScale";
import { OverlayPortal } from "../kit/Widgets/OverlayHost";
import type { PreviewItem, ReadDirection } from "../kit/interfaces";
import { useReaderTexts } from "../kit/i18n";
import { clamp } from "../kit/helpers";
import { ScrollFlingAnimator } from "../kit/animation";
import { createPointerGestureElement, type PointerGestureCallbacks } from "../kit/PointerGesture";
import { IconButton } from "../kit/Widgets/Button";
import { Icon } from "../kit/Widgets/Icon";
import { LauncherButton } from "../kit/Widgets/LauncherButton";
import { PositionBar } from "../kit/Widgets/PositionBar";
import { PreviewDecodeCache } from "../ScrollPreview2/DecodeCache";
import { createPreviewLoading } from "../ScrollPreview2/loading";
import {
  buildGroupGeometry, calculatePreviewLayout, minimumPreviewCrossCount, groupAtOffset, groupOffsetAt, groupSizeAt,
  layoutAspectRatio, layoutThumbnailSize, logicalGroupOffset,
  medianSize, physicalGroupOffset, type PreviewLayout,
} from "./layout";

const GRID_GAP = 8;
const HORIZONTAL_FLING_VELOCITY_FACTOR = 1.6;
const MAX_TILE_WIDTH = 220;
const MAX_CROSS_COUNT = 12;
const OVERSCAN_ROWS = 4;
const SCROLL_PIXEL_EPSILON = 1;
const DECODE_CACHE_BYTES = 64 * 1024 * 1024;
const DECODE_CACHE_ITEMS = 160;
const NEXT_SCROLL_PREVIEW_DIRECTION: Record<ReadDirection, ReadDirection> = {
  ltr: "rtl",
  rtl: "ttb",
  ttb: "ltr",
};
type PreviewSlot = {
  item: PreviewItem | null;
  pageNum: number;
};

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
    <div class="ehpeek-preview-toolbar" data-left-handed={props.state.leftHanded()}>
      <span class="ehpeek-preview-range">
        <Show when={props.state.loading()}>
          <span class="ehpeek-preview-loading" />
        </Show>
        {props.state.rangeText()}
      </span>
      <div class="ehpeek-preview-toolbar-actions">
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
      class="ehpeek-preview-toolbar ehpeek-preview-toolbar--embedded" data-left-handed={props.state.leftHanded()}
    >
      <span
        class="ehpeek-preview-range"
      >
        <Show when={props.state.loading()}>
          <span class="ehpeek-preview-loading" />
        </Show>
        {props.state.rangeText()}
      </span>
      <div
        class="ehpeek-preview-toolbar-actions"
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

function PreviewGrid(props: {
  layout: Accessor<PreviewLayout>;
  scrollOffset: Accessor<number>;
  previewCache: PreviewCache;
  decodeCache: PreviewDecodeCache;
  highlightedPageNum: Accessor<number | null>;
  failedBatches: Accessor<Set<number>>;
  rightToLeft: boolean;
  onOpenPage: (url: string, pageNum: number) => void;
  onRetry: (pageNum: number) => void;
}) {
  const { layout, scrollOffset, previewCache } = untrack(() => props);
  const totalImages = previewCache.source.totalPages;
  const horizontal = untrack(() => layout().horizontal);
  const totalGroups = () => layout().groupSizes.length;
  const mainViewportSize = () => horizontal ? layout().viewportWidth : layout().viewportHeight;
  const canvasWidth = () => horizontal
    ? `${Math.max(layout().totalMainSize, mainViewportSize())}px` : "100%";
  const canvasHeight = () => horizontal ? "100%" : `${layout().totalMainSize}px`;
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
  return (
    <div
      class="ehpeek-preview-canvas"
      style={{
        height: canvasHeight(),
        width: canvasWidth(),
      }}
    >
      <For each={visibleSlots()}>{(slot) => {
        const itemIndex = () => slot.pageNum - 1;
        const group = () => Math.floor(itemIndex() / props.layout().crossCount);
        const crossIndex = () => itemIndex() % props.layout().crossCount;
        const groupSize = () => groupSizeAt(props.layout(), group());
        const groupOffset = () => groupOffsetAt(props.layout(), group());
        const left = () => {
          if (!horizontal) {
            return crossIndex() *
              (props.layout().tileCrossSize + props.layout().gap);
          }
          return props.rightToLeft
            ? Number.parseFloat(canvasWidth()) -
            groupSize() - groupOffset()
            : groupOffset();
        };
        const top = () => horizontal
          ? crossIndex() * (props.layout().tileCrossSize + props.layout().gap)
          : groupOffset();
        const height = () => horizontal
          ? props.layout().tileCrossSize
          : groupSize();
        const width = () => horizontal
          ? groupSize()
          : props.layout().tileCrossSize;
        return (
          <div
            class="ehpeek-preview-slot"
            style={{
              height: `${height()}px`,
              left: `${left()}px`,
              top: `${top()}px`,
              width: `${width()}px`,
            }}
          >
            <PreviewTile
              decodeCache={props.decodeCache}
              failed={props.failedBatches().has(
                props.previewCache.batchForPage(slot.pageNum),
              )}
              height={height()}
              highlighted={slot.pageNum === props.highlightedPageNum()}
              item={slot.item}
              maximumScale={props.layout().itemScaleLimit}
              pageNum={slot.pageNum}
              onOpenPage={props.onOpenPage}
              onRetry={() => props.onRetry(slot.pageNum)}
              width={width()}
            />
          </div>
        );
      }}</For>
    </div>
  );
}

function PreviewPositionBar(props: {
  disabled: boolean;
  layout: Accessor<PreviewLayout>;
  scrollOffset: Accessor<number>;
  ready: boolean;
  embedded: boolean;
  rightToLeft: boolean;
  onScrollTo: (offset: number) => void;
  onInteractionChange: (active: boolean) => void;
}) {
  const texts = useReaderTexts();
  const { layout, scrollOffset } = untrack(() => props);
  const horizontal = untrack(() => layout().horizontal);
  const mainViewportSize = () => horizontal ? layout().viewportWidth : layout().viewportHeight;
  const totalGroups = () => layout().groupSizes.length;
  const maxScrollOffset = () => Math.max(0, layout().totalMainSize - mainViewportSize());
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
  const scrollToPositionValue = (value: number): void => {
    const ratio = clamp(value, 0, 1);
    if (ratio === 1) {
      props.onScrollTo(maxScrollOffset());
      return;
    }
    props.onScrollTo(
      physicalGroupOffset(layout(), ratio * maxLogicalScrollOffset()),
    );
  };

  return (
    <Show when={props.ready && maxScrollOffset() > SCROLL_PIXEL_EPSILON && positionBarVisibleRatio() < 1}>
      <PositionBar
        disabled={props.disabled}
        ariaLabel={texts.gallery.scrollPreview}
        axis={horizontal ? "horizontal" : "vertical"}
        currentValue={scrollPositionValue()}
        expanded={!horizontal}
        maxValue={1}
        minValue={0}
        onCommit={() => props.onInteractionChange(false)}
        onInput={scrollToPositionValue}
        onPointerDown={() => props.onInteractionChange(true)}
        position={horizontal ? undefined : "absolute"}
        reversed={horizontal && props.rightToLeft}
        thickness={props.embedded || !horizontal ? "narrow" : "normal"}
        trackClickEnabled={false}
        trackVisible={false}
        visibleRatio={positionBarVisibleRatio()}
      />
    </Show>
  );
}

export type ScrollPreviewOpenState = {
  mode: "overlay" | "embedded";
  pageNum: number;
};

export type ScrollPreviewProps = {
  disabled?: boolean;
  embeddedDisabled?: boolean;
  onReturnPageChange: (pageNum: number) => void;
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
  setTargetPageNum: Setter<number | null>;
  targetPageNum: Accessor<number | null>;
  targetBatchIndex: Accessor<number>;
};

export function ScrollPreview(props: ScrollPreviewProps) {
  const previewCache = untrack(() => props.previewCache);
  const decodeCache = new PreviewDecodeCache(DECODE_CACHE_BYTES, DECODE_CACHE_ITEMS);
  const publisher = createReadProgressPublisher();
  const open = () => props.openState?.mode === "overlay";
  const [crossCountOverride, setCrossCountOverride] = createSignal<number | null>(null);
  const [embeddedCrossCountOverride, setEmbeddedCrossCountOverride] =
    createSignal<number | null>(null);
  const [targetBatchIndex, setTargetBatchIndex] = createSignal(
    untrack(() => previewCache.batchForPage(previewCache.source.initialPageNum)),
  );
  const [highlightedPageNum, setHighlightedPageNum] = createSignal<number | null>(
    untrack(() => props.initialProgress ?? null),
  );
  const [targetPageNum, setTargetPageNum] = createSignal<number | null>(null);
  createEffect(() => {
    const view = props.openState;
    setTargetPageNum(view?.pageNum ?? null);
    if (view) setTargetBatchIndex(previewCache.batchForPage(view.pageNum));
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
    embeddedReadDirection: () => props.embeddedDirection,
    highlightedPageNum,
    open,
    readDirection: () => props.readDirection,
    setCrossCountOverride,
    setEmbeddedCrossCountOverride,
    setTargetPageNum,
    targetPageNum,
    targetBatchIndex,
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
          disabled={source.disabled || source.embeddedDisabled}
          onReturnPageChange={(page) => {
            if (source.openState?.mode === "embedded") source.onReturnPageChange(page);
          }}
          crossCountOverride={session.embeddedCrossCountOverride()}
          decodeCache={session.decodeCache}
          embedded
          fillEmbeddedContainer={source.fillEmbeddedContainer}
          highlightedPageNum={session.highlightedPageNum}
          leftHandedControls={source.leftHandedControls}
          onClose={source.onClose}
          onDirectionChange={(next, pageNum) => {
            session.setTargetPageNum(pageNum);
            source.onEmbeddedDirectionChange(next);
          }}
          onLoadError={source.onLoadError}
          onCrossCountOverrideChange={session.setEmbeddedCrossCountOverride}
          onOpenOverlay={source.onOpenOverlay}
          onOpenPage={source.onSelectPage}
          previewCache={source.previewCache}
          readDirection={direction}
          targetPageNum={
            session.targetPageNum() ?? session.highlightedPageNum() ?? 1
          }
          targetBatchIndex={session.targetBatchIndex()}
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
      <div
        ref={(element) => bindInteractionGate(() => element, () => Boolean(source.disabled || source.embeddedDisabled))}
        class="ehpeek-preview-launcher"
      >
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
  return (
    <Show when={session.open()}>
      <OverlayPortal>
        <Show when={session.readDirection()} keyed>{(direction) => (
          <ScrollPreviewPanel
            disabled={source.disabled}
            onReturnPageChange={source.onReturnPageChange}
            crossCountOverride={session.crossCountOverride()}
            decodeCache={session.decodeCache}
            embedded={false}
            fillEmbeddedContainer={() => false}
            highlightedPageNum={session.highlightedPageNum}
            leftHandedControls={source.leftHandedControls}
            onClose={source.onClose}
            onDirectionChange={(next, pageNum) => {
              session.setTargetPageNum(pageNum);
              source.onReadDirectionChange(next);
            }}
            onLoadError={source.onLoadError}
            onCrossCountOverrideChange={session.setCrossCountOverride}
            onOpenPage={source.onSelectPage}
            previewCache={source.previewCache}
            readDirection={direction}
            targetPageNum={session.targetPageNum()}
            targetBatchIndex={session.targetBatchIndex()}
          />
        )}</Show>
      </OverlayPortal>
    </Show>
  );
}

type ScrollPreviewPanelProps = {
  disabled?: boolean;
  onReturnPageChange: (pageNum: number) => void;
  crossCountOverride: number | null;
  decodeCache: PreviewDecodeCache;
  embedded: boolean;
  fillEmbeddedContainer: Accessor<boolean>;
  highlightedPageNum: Accessor<number | null>;
  leftHandedControls: Accessor<boolean>;
  onClose?: (pageNum: number) => void;
  onDirectionChange?: (direction: ReadDirection, pageNum: number) => void;
  onLoadError: (error: unknown) => void;
  onCrossCountOverrideChange: (crossCount: number) => void;
  onOpenOverlay?: (pageNum: number) => void;
  onOpenPage: (pageUrl: string, pageNum: number) => void;
  previewCache: PreviewCache;
  readDirection: ReadDirection;
  targetPageNum: number | null;
  targetBatchIndex: number;
};

function ScrollPreviewPanel(props: ScrollPreviewPanelProps) {
  const embedded = untrack(() => props.embedded);
  const horizontal = untrack(() => props.readDirection !== "ttb");
  const disabled = () => props.disabled ?? false;
  const onClose = untrack(() => props.onClose);
  let overlay!: HTMLElement;
  let disposed = false;
  let exitAnimation: Animation | null = null;
  const [exitDragOffset, setExitDragOffset] = createSignal(0);
  untrack(() => bindInteractionGate(() => overlay, disabled));

  const finishExitDrag = (exitVelocity: number, pageNum: number): void => {
    const offset = exitDragOffset();
    const exitSize = horizontal ? overlay.clientHeight : overlay.clientWidth;
    const exit = Math.abs(offset) >= exitSize * 0.2 ||
      Math.abs(exitVelocity) >= 0.6;
    if (exit) {
      const direction = offset === 0
        ? Math.sign(exitVelocity) || 1
        : Math.sign(offset);
      const translation = horizontal
        ? `0, ${direction * 100}vh`
        : `${direction * 100}vw, 0`;
      void (exitAnimation = overlay.animate(
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
      )).finished.then(() => {
        if (!disposed && !untrack(disabled)) onClose?.(pageNum);
      }).catch(() => { });
      return;
    }
    void (exitAnimation = overlay.animate(
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
    )).finished.then(() => setExitDragOffset(0)).catch(() => { });
    return;

  };
  const fitContentHeight = (height: number | null, previousViewportHeight: number): void => {
    if (height === null) overlay.style.removeProperty("height");
    else overlay.style.height = `${Math.ceil(overlay.clientHeight - previousViewportHeight + height)}px`;
  };
  createEffect(() => {
    if (!props.disabled) return;
    exitAnimation?.cancel();
    exitAnimation = null;
    setExitDragOffset(0);
  });
  // Child mount effects measure the viewport before this panel's onMount runs.
  // Lock first so those measurements already exclude the document scrollbar.
  const unlockScroll = embedded ? () => { } : lockPageScroll();
  onCleanup(unlockScroll);
  onMount(() => {
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
    onCleanup(() => {
      disposed = true;
      exitAnimation?.cancel();
    });
  });
  return (
    <div class="ehpeek-preview-host" data-embedded={embedded}>
      <section ref={overlay} class="ehpeek-preview-panel" data-embedded={embedded}
        style={{
          opacity: embedded
            ? "1"
            : `${1 - Math.min(0.15, Math.abs(exitDragOffset()) / Math.max(1, horizontal ? window.innerHeight : window.innerWidth) * 0.15)}`,
          transform: embedded
            ? "none"
            : `translate3d(${horizontal ? 0 : exitDragOffset()}px, ${horizontal ? exitDragOffset() : 0}px, 0) scale(${1 - Math.min(0.03, Math.abs(exitDragOffset()) / Math.max(1, horizontal ? window.innerHeight : window.innerWidth) * 0.03)})`,
        }}
      >
        <PreviewViewport {...props}
          fitContentHeight={fitContentHeight}
          onExitDrag={setExitDragOffset}
          onExitDragEnd={finishExitDrag}
        />
      </section>
    </div>
  );
}

/** Drag/fling/pinch state ends with the scroller; geometry remains owned by the viewport. */
class PreviewGestures {
  private readonly fling = new ScrollFlingAnimator();
  private dragDirection: "exit" | "scroll" | null = null;
  private dragStartPosition: number | null = null;
  private pointerActive = false;
  private pinchStartCrossCount = 1;
  private pinchMinimumCrossCount = 1;
  private disposed = false;
  readonly pointer: PointerGestureCallbacks;

  constructor(
    private readonly scroller: () => HTMLDivElement,
    private readonly horizontal: boolean,
    private readonly embedded: boolean,
    private readonly callbacks: {
      onSettled: () => void;
      onScrollEnd: () => void;
      onExitDrag: (offset: number) => void;
      onExitDragEnd: (velocity: number) => void;
      onResizeStart: () => { crossCount: number; minimumCrossCount: number };
      onResize: (crossCount: number) => void;
      onResizeEnd: () => void;
    },
  ) {
    this.pointer = {

      dragAxis: this.embedded
        ? this.horizontal
          ? "x"
          : "y"
        : "any",
      onStart: () => {
        this.fling.cancel();
        this.pointerActive = true;
        this.dragDirection = null;
        this.dragStartPosition = this.horizontal ? this.scroller().scrollLeft : this.scroller().scrollTop;
      },
      onMove: (info) => {
        if (this.dragDirection === null) {
          const mainDelta = this.horizontal ? Math.abs(info.dx) : Math.abs(info.dy);
          const exitDelta = this.horizontal ? Math.abs(info.dy) : Math.abs(info.dx);
          this.dragDirection = this.embedded || mainDelta >= exitDelta
            ? "scroll"
            : "exit";
        }
        if (this.dragDirection === "exit") {
          this.callbacks.onExitDrag(this.horizontal ? info.dy : info.dx);
          return;
        }
        if (this.dragStartPosition === null) {
          return;
        }
        if (this.horizontal) {
          this.scroller().scrollLeft = this.dragStartPosition - info.dx;
        } else {
          this.scroller().scrollTop = this.dragStartPosition - info.dy;
        }
      },
      onEnd: (info) => {
        this.dragStartPosition = null;
        this.pointerActive = false;
        this.callbacks.onSettled();
        if (this.dragDirection === "exit") {
          this.dragDirection = null;
          this.callbacks.onExitDragEnd(this.horizontal ? info.velocityY : info.velocityX);
          return;
        }
        this.dragDirection = null;
        this.fling.start({
          axis: this.horizontal ? "x" : "y",
          scroller: this.scroller(),
          initialVelocity: -(this.horizontal
            ? info.velocityX * HORIZONTAL_FLING_VELOCITY_FACTOR
            : info.velocityY),
          setScrollPosition: (position) => {
            if (this.horizontal) {
              this.scroller().scrollLeft = position;
            } else {
              this.scroller().scrollTop = position;
            }
          },
          canRun: () => !this.disposed && this.scroller().isConnected,
          onStop: () => this.callbacks.onScrollEnd(),
        });
      },
      onPinchStart: () => {
        if (this.embedded) {
          return false;
        }
        this.fling.cancel();
        const resize = this.callbacks.onResizeStart();
        this.pinchStartCrossCount = resize.crossCount;
        this.pinchMinimumCrossCount = resize.minimumCrossCount;
        return true;
      },
      onPinchMove: (info) => {
        if (this.embedded) {
          return;
        }
        this.callbacks.onResize(
          clamp(
            Math.round(this.pinchStartCrossCount / info.scale),
            this.pinchMinimumCrossCount,
            MAX_CROSS_COUNT,
          ),
        );
      },
      onPinchEnd: () => {
        this.callbacks.onResizeEnd();
      },

    };
  }

  get active(): boolean { return this.pointerActive; }
  cancelMotion(): void { this.fling.cancel(); }

  cancel(): void {
    this.fling.cancel();
    this.pointerActive = false;
    this.dragDirection = null;
    this.dragStartPosition = null;
  }

  dispose(): void {
    this.disposed = true;
    this.fling.cancel();
  }
}

function PreviewViewport(props: ScrollPreviewPanelProps & {
  fitContentHeight: (height: number | null, previousViewportHeight: number) => void;
  onExitDrag: (offset: number) => void;
  onExitDragEnd: (velocity: number, pageNum: number) => void;
}) {
  const texts = useReaderTexts();
  const decodeCache = untrack(() => props.decodeCache);
  const embedded = untrack(() => props.embedded);
  const previewCache = untrack(() => props.previewCache);
  const onClose = untrack(() => props.onClose);
  const onLoadError = untrack(() => props.onLoadError);
  const initialPreview = previewCache.source;
  const totalImages = initialPreview.totalPages;
  const maxBatchIndex = previewCache.maxBatch;
  const estimatedAspectRatio = layoutAspectRatio(
    initialPreview.aspectRatio,
  );
  const embeddedReferenceTileWidth = medianSize(
    initialPreview.initialPreviewItems.map((item) =>
      layoutThumbnailSize(item).width
    ),
    MAX_TILE_WIDTH,
  );
  const pixelScale = useUiPixelScale();
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
  const crossCountOverride = (): number | null => props.crossCountOverride;
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
  let scrollFrame: number | null = null;
  let positionBarActive = false;
  let initialized = false;

  const totalMainSize = createMemo(() => layout().totalMainSize);
  const mainViewportSize = createMemo(() =>
    horizontal ? layout().viewportWidth : layout().viewportHeight
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
  // Loading follows the centered batch once the panel has usable geometry.
  const [previewLoadReady, setPreviewLoadReady] = createSignal(false);
  const loading = createPreviewLoading({
    centeredPageNum,
    maxBatchIndex,
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
  const minimumCrossCount = (currentLayout: PreviewLayout): number =>
    minimumPreviewCrossCount(
      horizontal, estimatedAspectRatio,
      currentLayout.viewportWidth,
      currentLayout.viewportHeight,
      currentLayout.gap,
    );
  const resizeCrossCount = (delta: number): void => {
    gestures.cancelMotion();
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
  const requestDirectionChange = (): void => {
    if (!window.confirm(texts.gallery.confirmScrollPreviewDirection)) {
      return;
    }
    props.onDirectionChange?.(
      NEXT_SCROLL_PREVIEW_DIRECTION[readDirection],
      centeredPageNum(),
    );
  };
  let resizeAnchorPageNum: number | null = null;
  const gestures = new PreviewGestures(() => scroller, horizontal, embedded, {
    onSettled: () => applyPendingLayout(),
    onScrollEnd: () => setScrollOffset(readScrollOffset()),
    onExitDrag: untrack(() => props.onExitDrag),
    onExitDragEnd: velocity => props.onExitDragEnd(velocity, centeredPageNum()),
    onResizeStart: () => {
      resizeAnchorPageNum = preferredLayoutAnchorPageNum();
      const current = layout();
      return {
        crossCount: current.crossCount,
        minimumCrossCount: Math.min(current.crossCount, minimumCrossCount(current)),
      };
    },
    onResize: count => props.onCrossCountOverrideChange(count),
    onResizeEnd: () => {
      resizeAnchorPageNum = null;
      applyPendingLayout();
    },
  });
  createPointerGestureElement(
    () => props.disabled ? null : scroller ?? null,
    () => gestures.pointer,
  );
  createEffect(() => {
    if (!props.disabled) return;
    untrack(() => {
      gestures.cancel();
      resizeAnchorPageNum = null;
      applyPendingLayout();
    });
  });

  // Navigation targets are commands; highlighted progress is independent of the viewport.
  const scrollToPage = (pageNum: number, currentLayout = untrack(layout)): void => {
    const group = Math.floor(
      (clamp(pageNum, 1, totalImages) - 1) / currentLayout.crossCount,
    );
    updateScrollOffset(
      groupOffsetAt(currentLayout, group) -
      (mainViewportSize() - groupSizeAt(currentLayout, group)) / 2,
    );
  };
  createEffect(() => props.onReturnPageChange(centeredPageNum()));
  const scrollToPreview = (batchIndex: number, currentLayout: PreviewLayout): void => {
    scrollToPage(previewCache.pageForBatch(batchIndex), currentLayout);
  };

  createEffect(() => {
    const batchIndex = props.targetBatchIndex;
    const pageNum = props.targetPageNum;
    if (!initialized) {
      return;
    }
    if (scroller.isConnected) {
      if (pageNum === null) {
        scrollToPreview(batchIndex, untrack(layout));
      } else {
        scrollToPage(pageNum, untrack(layout));
      }
    }
  });

  // Layout work may wait for the current interaction; pending geometry stays local.
  let layoutFrame: number | null = null;
  let layoutHeight = 0;
  let layoutWidth = 0;
  let layoutDirty = false;
  let preserveResizeAnchor = false;
  let version = untrack(previewCache.version);

  const updateLayout = (
    fitEmbeddedPanel = true,
    preserveViewportAnchor = false,
  ): void => {
    preserveResizeAnchor = preserveViewportAnchor;
    setPreviewLoadReady(false);
    layoutDirty = false;
    if (fitEmbeddedPanel && embedded) {
      props.fitContentHeight(null, 0);
    }
    // Loaded-image reflows preserve the page center's relative screen position;
    // explicit zooms instead recenter their chosen page. Capture before resizing.
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
    const anchorPageNum = initialized
      ? resizeAnchorPageNum ?? preferredLayoutAnchorPageNum()
      : null;
    const next = calculatePreviewLayout({
      width, height, horizontal, embedded, totalImages,
      pixelScale: pixelScale(), gap: GRID_GAP, estimatedAspectRatio,
      maxTileWidth: MAX_TILE_WIDTH, embeddedReferenceTileWidth,
      referenceThumbnailCrossSize, crossCountOverride: crossCountOverride(),
      maximumCrossCount: maximumCrossCount(),
      item: (pageNum) => untrack(() => previewCache.item(pageNum)),
    });
    const { crossCount, gap, tileCrossSize } = next;
    // Content-sized embedded panels may shrink; filled columns retain available height.
    const fitEmbeddedHeight = embedded && !props.fillEmbeddedContainer();
    let viewportHeight = height;
    if (fitEmbeddedPanel && fitEmbeddedHeight && horizontal) {
      viewportHeight = crossCount * tileCrossSize + (crossCount - 1) * gap;
      props.fitContentHeight(viewportHeight, height);
    } else if (fitEmbeddedPanel && fitEmbeddedHeight) {
      const fittedScrollerHeight = next.totalMainSize;
      viewportHeight = Math.min(height, fittedScrollerHeight);
      if (viewportHeight < height) {
        props.fitContentHeight(viewportHeight, height);
      } else {
        props.fitContentHeight(null, 0);
      }
    } else if (fitEmbeddedPanel && embedded) {
      props.fitContentHeight(null, 0);
    }
    next.viewportHeight = viewportHeight;
    setLayout(next);

    if (layoutFrame !== null) {
      window.cancelAnimationFrame(layoutFrame);
    }
    // Apply new canvas dimensions before restoring position and enabling loads.
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
          scrollToPreview(props.targetBatchIndex, next);
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
      gestures.active ||
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

  // Only the panel owns observers and motion; the parent retains shared images and progress.
  onMount(() => {
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
      gestures.dispose();
      resizeObserver.disconnect();
      if (layoutFrame !== null) {
        window.cancelAnimationFrame(layoutFrame);
      }
      if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
      }
    });
  });

  // UI projections consume the operations above without owning layout or motion.
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
      gestures.cancelMotion();
      scrollToPage(highlightedPageNum);
    }
  };

  return (
    <>
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
      <div class="ehpeek-preview-viewport">
        <div
          ref={scroller}
          class="ehpeek-preview-scroller"
          classList={{
            "ehpeek-preview-scroller--embedded": embedded,
            "ehpeek-preview-scroller--horizontal": horizontal,
          }}
          onScroll={() => {
            if (scrollFrame !== null) return;
            scrollFrame = window.requestAnimationFrame(() => {
              scrollFrame = null;
              setScrollOffset(untrack(readScrollOffset));
            });
          }}
          onWheel={() => gestures.cancelMotion()}
        >
          <PreviewGrid
            layout={layout}
            scrollOffset={scrollOffset}
            previewCache={previewCache}
            decodeCache={decodeCache}
            highlightedPageNum={untrack(() => props.highlightedPageNum)}
            failedBatches={loading.failedBatches}
            onOpenPage={untrack(() => props.onOpenPage)}
            onRetry={loading.retry}
            rightToLeft={rightToLeft}
          />
        </div>
        <PreviewPositionBar
          disabled={props.disabled ?? false}
          layout={layout}
          scrollOffset={scrollOffset}
          ready={positionBarReady()}
          embedded={embedded}
          rightToLeft={rightToLeft}
          onScrollTo={(offset) => {
            gestures.cancelMotion();
            updateScrollOffset(offset);
          }}
          onInteractionChange={(active) => {
            positionBarActive = active;
            if (!active) applyPendingLayout();
          }}
        />
      </div>
    </>
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
      class="ehpeek-preview-tile"
      style={{ height: `${props.height}px` }}
    >
      <Show
        when={props.item}
        keyed
        fallback={
          <button
            type="button"
            class="ehpeek-preview-placeholder"
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
                    class="ehpeek-preview-image"
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
                  class="ehpeek-preview-image"
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
                class="ehpeek-preview-page-link"
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
                  class="ehpeek-preview-highlight"
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
