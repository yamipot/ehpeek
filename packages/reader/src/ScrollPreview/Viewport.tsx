import { batch, createEffect, createMemo, createSignal, on, onCleanup, onMount, Show, untrack, type Accessor, type JSX } from "solid-js";
import { clamp } from "../kit/helpers";
import { useUiPixelScale } from "../UiPixelScale";
import { useScrollPreviewContext } from "./Context";
import { PreviewGrid } from "./Grid";
import { PreviewPositionBar } from "./PositionBar";
import { createPreviewGestures } from "./gestures";
import {
  calculatePreviewLayout, groupAtOffset, groupOffsetAt, groupSizeAt,
  layoutAspectRatio, layoutThumbnailSize, MAX_PREVIEW_CROSS_COUNT, medianSize,
  previewContentSize, previewMainViewportSize, previewPageAtCenter,
  previewPageScrollOffset, previewTilePlacements, previewVisiblePages,
  previewCrossCountLimits, previewZoomAnchor, type PreviewLayout,
} from "./layout";

const GRID_GAP = 8;
const MAX_TILE_WIDTH = 220;
const OVERSCAN_GROUPS = 4;

export interface PreviewViewportRef {
  /** Browsing page retained when changing presentation; independent of the reading highlight. */
  currentPage: Accessor<number>;
  /** Inclusive visible page range; null until the first layout. */
  visiblePages: Accessor<{ first: number; last: number } | null>;
  /** Actual fitted count and its allowed zoom range. */
  crossCount: Accessor<number>;
  crossCountLimits: Accessor<{ min: number; max: number }>;
  /** Loading may use the browsing page once layout and scroll restoration have settled. */
  ready: Accessor<boolean>;
  /** Center a page without changing the reading highlight. */
  scrollToPage(pageNum: number): void;
}

export interface PreviewViewportProps {
  class?: string;
  style?: JSX.CSSProperties;
}

export function PreviewViewport(props: PreviewViewportProps) {
  const ctx = useScrollPreviewContext();
  // Each direction has its own geometry and gestures; only the browsing page survives replacement.
  return <Show when={ctx.settings[0].direction} keyed>{(_direction) => <Viewport {...props} />}</Show>;
}

function Viewport(props: PreviewViewportProps) {
  const ctx = useScrollPreviewContext();
  const source = ctx.previewCache.source;
  const direction = untrack(() => ctx.settings[0].direction);
  const horizontal = direction !== "ttb";
  const rightToLeft = direction === "rtl";
  const initPage = untrack(ctx.currentPage);
  const panel = ctx.panel;
  const pixelScale = useUiPixelScale();
  const estimatedAspectRatio = layoutAspectRatio(source.aspectRatio);
  const referenceThumbnailCrossSize = medianSize(
    source.initialPreviewItems.map((item) => {
      const size = layoutThumbnailSize(item);
      return horizontal ? size.height : size.width;
    }),
    horizontal ? MAX_TILE_WIDTH * estimatedAspectRatio : MAX_TILE_WIDTH,
  );
  let scroller!: HTMLDivElement;
  const [layout, setLayout] = createSignal<PreviewLayout | null>(null);
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [ready, setReady] = createSignal(false);
  const [positionBarActive, setPositionBarActive] = createSignal(false);
  const gestures = createPreviewGestures({
    scroller: () => scroller ?? null,
    panel: () => panel,
    preview: ctx,
    layout,
    scrollOffset,
  });

  // Native scrolling reports actual positions. Explicit positioning writes the same
  // logical state, with RTL conversion kept at this DOM boundary.
  const maximumOffset = (layout: PreviewLayout): number => Math.max(
    0, layout.totalMainSize - previewMainViewportSize(layout),
  );
  const readScrollOffset = (): number => {
    const current = layout();
    if (!current) return 0;
    const maximum = maximumOffset(current);
    return clamp(!horizontal ? scroller.scrollTop
      : rightToLeft ? maximum - scroller.scrollLeft : scroller.scrollLeft, 0, maximum);
  };
  const restoreScrollOffset = (): void => {
    const current = layout();
    if (!current) return;
    const maximum = maximumOffset(current);
    const offset = clamp(scrollOffset(), 0, maximum);
    if (horizontal) scroller.scrollLeft = rightToLeft ? maximum - offset : offset;
    else scroller.scrollTop = offset;
    setScrollOffset(offset);
  };
  const scrollToPage = (pageNum: number): void => {
    const current = layout();
    if (!current) return;
    gestures.cancelMotion();
    setScrollOffset(clamp(
      previewPageScrollOffset(current, pageNum, source.totalPages), 0, maximumOffset(current),
    ));
  };
  let scrollFrame: number | null = null;
  const reportScroll = (): void => {
    if (layoutFrame !== null || scrollFrame !== null) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null;
      if (layoutFrame === null) setScrollOffset(untrack(readScrollOffset));
    });
  };

  // Layout changes preserve either a zoom subject or the center page's screen position.
  let metadataDirty = false;
  let layoutFrame: number | null = null;
  const updateLayout = (preserveScreenPosition: boolean): void => {
    if (!ctx.visible()) return;
    const previous = layout();
    const anchor = previous
      ? preserveScreenPosition
        ? previewPageAtCenter(previous, scrollOffset(), source.totalPages)
        : gestures.resizeAnchor() ?? previewZoomAnchor(
          previous, scrollOffset(), source.totalPages, ctx.progress.current(),
        )
      : initPage;
    let screenRatio = 0.5;
    if (previous && preserveScreenPosition) {
      const group = Math.floor((anchor - 1) / previous.crossCount);
      const center = groupOffsetAt(previous, group) + groupSizeAt(previous, group) / 2;
      // Keep the page at the same fraction of the viewport as thumbnail sizes arrive.
      screenRatio = (center - scrollOffset()) / previewMainViewportSize(previous);
    }
    // Measure the container's full allowance before fitting, so a previously
    // shortened panel can grow again after resizing or a direction change.
    panel.style.removeProperty("height");
    const next = calculatePreviewLayout({
      width: Math.max(1, scroller.clientWidth),
      height: Math.max(1, scroller.clientHeight),
      horizontal,
      totalImages: source.totalPages,
      pixelScale: pixelScale(),
      gap: GRID_GAP,
      estimatedAspectRatio,
      maxTileWidth: MAX_TILE_WIDTH,
      referenceThumbnailCrossSize,
      crossCountOverride: ctx.settings[0].crossCount,
      maximumCrossCount: horizontal
        ? Math.min(MAX_PREVIEW_CROSS_COUNT, source.totalPages) : MAX_PREVIEW_CROSS_COUNT,
      item: ctx.previewCache.item,
    });
    if (ctx.fitContentHeight()) {
      const contentHeight = horizontal
        ? next.crossCount * next.tileCrossSize + (next.crossCount - 1) * next.gap
        : next.totalMainSize;
      const height = Math.min(next.viewportHeight, contentHeight);
      panel.style.height = `${Math.ceil(panel.clientHeight - scroller.clientHeight + height)}px`;
      next.viewportHeight = height;
    }
    // Centering places the anchor at 0.5; the correction retains its prior screen fraction.
    const offset = previewPageScrollOffset(next, anchor, source.totalPages) +
      (0.5 - screenRatio) * previewMainViewportSize(next);
    metadataDirty = false;
    if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
    // Canvas dimensions must reach the DOM before restoring a position within them.
    layoutFrame = window.requestAnimationFrame(() => {
      layoutFrame = null;
      untrack(restoreScrollOffset);
      setReady(true);
    });
    batch(() => {
      setLayout(next);
      setScrollOffset(clamp(offset, 0, maximumOffset(next)));
      setReady(false);
    });
  };

  onMount(() => {
    ctx.viewportRef(reference);

    createEffect(on(
      [ctx.visible, () => ctx.settings[0].crossCount, pixelScale, ctx.fitContentHeight],
      ([visible], previous) => {
        if (!visible) {
          setReady(false);
          return;
        }
        updateLayout(previous !== undefined && !previous[0]);
      },
    ));
    createEffect(on(
      [ctx.previewCache.version, () => gestures.active() || positionBarActive(), ctx.visible],
      ([version, interacting, visible], previous) => {
        if (previous && version !== previous[0]) metadataDirty = true;
        if (metadataDirty && !interacting && visible) updateLayout(true);
      },
    ));
    createEffect(on(scrollOffset, (offset) => {
      if (layoutFrame === null && ctx.visible() && readScrollOffset() !== offset) {
        restoreScrollOffset();
      }
    }));

    const observer = new ResizeObserver(() => {
      const current = layout();
      if (current && Math.abs(scroller.clientWidth - current.viewportWidth) <= 1 &&
        Math.abs(scroller.clientHeight - current.viewportHeight) <= 1) return;
      updateLayout(false);
    });
    observer.observe(scroller);
    onCleanup(() => {
      observer.disconnect();
      if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      ctx.viewportRef(null);
    });
  });

  const tiles = createMemo(() => {
    const current = layout();
    if (!current) return [];
    const lastGroup = Math.max(0, current.groupSizes.length - 1);
    const first = clamp(groupAtOffset(current, scrollOffset()) - OVERSCAN_GROUPS, 0, lastGroup);
    const last = clamp(groupAtOffset(current, scrollOffset() + previewMainViewportSize(current)) +
      OVERSCAN_GROUPS, first, lastGroup);
    return previewTilePlacements({ layout: current, firstGroup: first, lastGroup: last,
      totalPages: source.totalPages, rightToLeft });
  });

  const currentPage = createMemo(() => {
    const current = layout();
    return current ? previewPageAtCenter(current, scrollOffset(), source.totalPages) : initPage;
  });
  const visiblePages = createMemo(() => {
    const current = layout();
    return current ? previewVisiblePages(current, scrollOffset(), source.totalPages) : null;
  });
  const reference: PreviewViewportRef = {
    currentPage,
    visiblePages,
    crossCount: () => layout()?.crossCount ?? 1,
    crossCountLimits: () => previewCrossCountLimits(layout(), source.aspectRatio, source.totalPages),
    ready,
    scrollToPage,
  };

  return (
    <div class={`ehpeek-preview-viewport${props.class ? ` ${props.class}` : ""}`} style={props.style}>
      <div
        ref={scroller}
        class="ehpeek-preview-scroller"
        classList={{ "ehpeek-preview-scroller--horizontal": horizontal }}
        style={{
          "touch-action": ctx.close ? "none" : horizontal ? "pan-y" : "pan-x",
          "overscroll-behavior": ctx.close ? "contain" : "auto",
        }}
        onScroll={reportScroll}
      >
        <Show when={layout()}>{(current) => (
          <PreviewGrid
            contentSize={previewContentSize(current())}
            tiles={tiles()}
            maximumScale={current().itemScaleLimit}
          />
        )}</Show>
      </div>
      <Show when={layout()}>{(current) => (
        <PreviewPositionBar
          layout={current}
          scrollOffset={scrollOffset}
          rightToLeft={rightToLeft}
          scrollTo={(offset) => {
            gestures.cancelMotion();
            setScrollOffset(offset);
          }}
          setInteracting={setPositionBarActive}
        />
      )}</Show>
    </div>
  );
}
