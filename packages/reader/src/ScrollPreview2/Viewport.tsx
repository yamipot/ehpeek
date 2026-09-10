import {
  createEffect,
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  untrack,
} from "solid-js";
import { clamp } from "../kit/helpers";
import { createPointerGestureElement } from "../kit/PointerGesture";
import { useUiPixelScale } from "../UiPixelScale";
import { createPreviewLoading } from "./loading";
import {
  buildGroupGeometry,
  calculatePreviewLayout,
  groupAtOffset,
  groupOffsetAt,
  groupSizeAt,
  layoutAspectRatio,
  layoutThumbnailSize,
  medianSize,
  minimumPreviewCrossCount,
  previewContentSize,
  previewMainViewportSize,
  previewPageAtCenter,
  previewPageScrollOffset,
  previewTilePlacements,
  previewVisiblePages,
  type PreviewLayout,
} from "./layout";
import { useScrollPreview } from "./Context";
import { PreviewGrid } from "./Grid";
import { PreviewGestures } from "./gestures";
import { PreviewPositionBar } from "./PositionBar";
import { PreviewToolbar } from "./Toolbar";

const GRID_GAP = 8;
const MAX_TILE_WIDTH = 220;
const MAX_CROSS_COUNT = 12;
const OVERSCAN_GROUPS = 4;

export interface PreviewViewportRef {
  /** Center the page without changing reading progress. */
  scrollToPage(pageNum: number): void;
}

export interface PreviewViewportProps {
  /** Page centered by the first usable layout; the first page is 1. */
  initPage: number;
  ref?: (viewport: PreviewViewportRef | null) => void;
  /** Track which page would be retained if the Preview changes presentation. */
  onCurrentPageChange(pageNum: number): void;
  /** Move the containing Preview along the axis perpendicular to reading. */
  onExitDrag(offset: number): void;
  /** Settle or close the containing Preview after a perpendicular drag. */
  onExitDragEnd(velocity: number): void;
}

/** Owns scrolling, responsive layout, virtualization and gesture motion. */
export function PreviewViewport(props: PreviewViewportProps) {
  const preview = useScrollPreview();
  const previewCache = preview.previewCache;
  const initialPreview = previewCache.source;
  const totalPages = initialPreview.totalPages;
  const maxBatchIndex = previewCache.maxBatch;
  const pixelScale = useUiPixelScale();
  const direction = untrack(() => preview.settings[0].direction);
  const horizontal = direction !== "ttb";
  const rightToLeft = direction === "rtl";
  const estimatedAspectRatio = layoutAspectRatio(initialPreview.aspectRatio);
  const referenceThumbnailCrossSize = medianSize(
    initialPreview.initialPreviewItems.map((item) => {
      const size = layoutThumbnailSize(item);
      return horizontal ? size.height : size.width;
    }),
    horizontal ? MAX_TILE_WIDTH * estimatedAspectRatio : MAX_TILE_WIDTH,
  );
  const initialPixelScale = untrack(pixelScale);
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
    totalImages: totalPages,
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
  const [scrollOffset, setScrollOffset] = createSignal(0);
  const [positionBarReady, setPositionBarReady] = createSignal(false);
  const [loadReady, setLoadReady] = createSignal(false);
  let scroller!: HTMLDivElement;
  let initialized = false;
  let mounted = false;
  let layoutWidth = 0;
  let layoutHeight = 0;
  let resizeAnchorPage: number | null = null;
  let layoutDirty = false;
  let preserveResizeAnchor = false;
  let layoutFrame: number | null = null;
  let scrollFrame: number | null = null;
  let positionBarActive = false;
  let cacheVersion = untrack(previewCache.version);

  const maximumScrollOffset = (current = layout()) => Math.max(
    0,
    current.totalMainSize - previewMainViewportSize(current),
  );
  const visiblePages = createMemo(() => previewVisiblePages(
    layout(),
    scrollOffset(),
    totalPages,
  ));
  const centeredPage = () => previewPageAtCenter(layout(), scrollOffset(), totalPages);
  const loading = createPreviewLoading({
    centeredPageNum: centeredPage,
    maxBatchIndex,
    onLoadError: preview.reportError,
    previewCache,
    ready: loadReady,
  });
  const maximumCrossCount = () => horizontal
    ? Math.min(MAX_CROSS_COUNT, totalPages)
    : MAX_CROSS_COUNT;
  const minimumCrossCount = (current: PreviewLayout) => minimumPreviewCrossCount(
    horizontal,
    estimatedAspectRatio,
    current.viewportWidth,
    current.viewportHeight,
    current.gap,
  );
  const preferredLayoutAnchor = (): number => {
    const highlighted = preview.progress.current();
    return highlighted !== null &&
      highlighted >= visiblePages().first &&
      highlighted <= visiblePages().last
      ? highlighted
      : centeredPage();
  };
  const readScrollOffset = (): number => {
    const maximum = maximumScrollOffset();
    const value = !horizontal
      ? scroller.scrollTop
      : rightToLeft
        ? maximum - scroller.scrollLeft
        : scroller.scrollLeft;
    return clamp(value, 0, maximum);
  };
  const updateScrollOffset = (value: number): void => {
    const maximum = maximumScrollOffset();
    const next = clamp(value, 0, maximum);
    if (horizontal) scroller.scrollLeft = rightToLeft ? maximum - next : next;
    else scroller.scrollTop = next;
    setScrollOffset(next);
  };
  const scrollToPage = (pageNum: number, current = untrack(layout)): void => {
    updateScrollOffset(previewPageScrollOffset(current, pageNum, totalPages));
    props.onCurrentPageChange(centeredPage());
  };

  let applyPendingLayout = (): void => undefined;
  const gestures = new PreviewGestures(
    () => scroller,
    horizontal,
    preview.close !== undefined,
    {
      settled: () => applyPendingLayout(),
      scrollEnded: () => setScrollOffset(readScrollOffset()),
      exitDragged: untrack(() => props.onExitDrag),
      exitDragEnded: untrack(() => props.onExitDragEnd),
      resizeStarted: () => {
        resizeAnchorPage = preferredLayoutAnchor();
        const current = layout();
        return {
          crossCount: current.crossCount,
          minimumCrossCount: Math.min(current.crossCount, minimumCrossCount(current)),
        };
      },
      resized: (crossCount) => preview.settings[1]("crossCount", crossCount),
      resizeEnded: () => {
        resizeAnchorPage = null;
        applyPendingLayout();
      },
    },
  );
  createPointerGestureElement(
    () => preview.disabled() || !preview.visible() ? null : scroller ?? null,
    () => gestures.pointer,
  );

  const updateLayout = (preserveViewportAnchor = false): void => {
    preserveResizeAnchor = preserveViewportAnchor;
    setLoadReady(false);
    layoutDirty = false;

    // Metadata reflows retain the page center's screen position; explicit resizing
    // recenters the selected anchor so a control never drifts away from its subject.
    const previous = untrack(layout);
    const preservedPage = initialized && preserveViewportAnchor ? centeredPage() : null;
    const preservedViewportRatio = preservedPage === null
      ? null
      : (() => {
        const group = Math.floor((preservedPage - 1) / previous.crossCount);
        const center = groupOffsetAt(previous, group) + groupSizeAt(previous, group) / 2;
        return (center - scrollOffset()) / previewMainViewportSize(previous);
      })();
    const width = Math.max(1, scroller.clientWidth);
    const height = Math.max(1, scroller.clientHeight);
    const anchor = initialized
      ? resizeAnchorPage ?? preferredLayoutAnchor()
      : props.initPage;
    const next = calculatePreviewLayout({
      width,
      height,
      horizontal,
      totalImages: totalPages,
      pixelScale: pixelScale(),
      gap: GRID_GAP,
      estimatedAspectRatio,
      maxTileWidth: MAX_TILE_WIDTH,
      referenceThumbnailCrossSize,
      crossCountOverride: preview.settings[0].crossCount,
      maximumCrossCount: maximumCrossCount(),
      item: (pageNum) => untrack(() => previewCache.item(pageNum)),
    });
    setLayout(next);

    if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
    // Canvas dimensions must reach the DOM before the new logical offset is restored.
    layoutFrame = window.requestAnimationFrame(() => untrack(() => {
      layoutFrame = null;
      if (!scroller.isConnected) return;
      if (!initialized) {
        initialized = true;
        scrollToPage(props.initPage, next);
      } else if (preservedPage !== null && preservedViewportRatio !== null) {
        const group = Math.floor((preservedPage - 1) / next.crossCount);
        const center = groupOffsetAt(next, group) + groupSizeAt(next, group) / 2;
        updateScrollOffset(
          center - preservedViewportRatio * previewMainViewportSize(next),
        );
      } else {
        scrollToPage(anchor, next);
      }
      setLoadReady(true);
      setPositionBarReady(true);
      preserveResizeAnchor = false;
    }));
  };

  applyPendingLayout = (): void => {
    if (!layoutDirty || !initialized || !preview.visible() ||
      gestures.active || positionBarActive) return;
    untrack(() => updateLayout(true));
  };
  const markLayoutDirty = (): void => {
    layoutDirty = true;
    applyPendingLayout();
  };
  const resizeCrossCount = (delta: number): void => {
    gestures.cancelMotion();
    resizeAnchorPage = preferredLayoutAnchor();
    const current = layout();
    preview.settings[1](
      "crossCount",
      clamp(
        current.crossCount + delta,
        minimumCrossCount(current),
        maximumCrossCount(),
      ),
    );
    queueMicrotask(() => { resizeAnchorPage = null; });
  };
  const locateHighlightedPage = (): void => {
    const pageNum = preview.progress.current();
    if (pageNum === null) return;
    gestures.cancelMotion();
    scrollToPage(pageNum);
  };

  createEffect(() => props.onCurrentPageChange(centeredPage()));
  createEffect(() => {
    if (!preview.disabled() && preview.visible()) return;
    untrack(() => {
      gestures.cancel();
      resizeAnchorPage = null;
      if (preview.visible()) applyPendingLayout();
      else setLoadReady(false);
    });
  });
  createEffect(() => {
    if (!preview.visible() || !mounted) return;
    untrack(() => updateLayout(initialized));
  });
  createEffect(() => {
    const nextVersion = previewCache.version();
    if (nextVersion === cacheVersion) return;
    cacheVersion = nextVersion;
    if (initialized) untrack(markLayoutDirty);
  });
  createEffect(() => {
    const _crossCount = preview.settings[0].crossCount;
    if (initialized && preview.visible()) untrack(() => updateLayout());
  });
  createEffect(() => {
    pixelScale();
    if (initialized && preview.visible()) untrack(() => updateLayout());
  });

  const visibleStartGroup = createMemo(() => clamp(
    groupAtOffset(layout(), scrollOffset()) - OVERSCAN_GROUPS,
    0,
    Math.max(0, layout().groupSizes.length - 1),
  ));
  const visibleEndGroup = createMemo(() => clamp(
    groupAtOffset(layout(), scrollOffset() + previewMainViewportSize(layout())) + OVERSCAN_GROUPS,
    visibleStartGroup(),
    Math.max(0, layout().groupSizes.length - 1),
  ));
  const tiles = createMemo(() => previewTilePlacements({
    layout: layout(),
    firstGroup: visibleStartGroup(),
    lastGroup: visibleEndGroup(),
    totalPages,
    rightToLeft,
  }));
  const contentSize = createMemo(() => previewContentSize(layout()));

  const reference: PreviewViewportRef = { scrollToPage };
  untrack(() => props.ref?.(reference));

  onMount(() => {
    mounted = true;
    const observer = new ResizeObserver(() => untrack(() => {
      if (!preview.visible()) return;
      const width = scroller.clientWidth;
      const height = scroller.clientHeight;
      if (Math.abs(width - layoutWidth) <= 1 && Math.abs(height - layoutHeight) <= 1) return;
      layoutWidth = width;
      layoutHeight = height;
      updateLayout(preserveResizeAnchor);
    }));
    observer.observe(scroller);
    layoutWidth = scroller.clientWidth;
    layoutHeight = scroller.clientHeight;
    if (preview.visible()) updateLayout();
    onCleanup(() => {
      mounted = false;
      gestures.dispose();
      observer.disconnect();
      if (layoutFrame !== null) window.cancelAnimationFrame(layoutFrame);
      if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
      props.ref?.(null);
    });
  });

  return (
    <>
      <PreviewToolbar
        crossCount={layout().crossCount}
        crossCountLimits={{
          min: minimumCrossCount(layout()),
          max: maximumCrossCount(),
        }}
        visiblePages={visiblePages()}
        loading={loading.loadingCount() > 0}
        locateHighlightedPage={locateHighlightedPage}
        zoomIn={() => resizeCrossCount(-1)}
        zoomOut={() => resizeCrossCount(1)}
      />
      <div class="ehpeek-preview-viewport">
        <div
          ref={scroller}
          class="ehpeek-preview-scroller"
          classList={{ "ehpeek-preview-scroller--horizontal": horizontal }}
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
            contentSize={contentSize()}
            tiles={tiles()}
            maximumScale={layout().itemScaleLimit}
            failedBatches={loading.failedBatches()}
            retry={loading.retry}
          />
        </div>
        <PreviewPositionBar
          layout={layout}
          scrollOffset={scrollOffset}
          ready={positionBarReady()}
          rightToLeft={rightToLeft}
          scrollTo={(offset) => {
            gestures.cancelMotion();
            updateScrollOffset(offset);
          }}
          setInteracting={(active) => {
            positionBarActive = active;
            if (!active) applyPendingLayout();
          }}
        />
      </div>
    </>
  );
}
