import { clamp } from "../kit/helpers";
import type { PreviewItem } from "../kit/interfaces";

const MAX_LAYOUT_ASPECT_RATIO = 3;
export const MAX_PREVIEW_CROSS_COUNT = 12;

/** Group extents along the scrolling axis, measured in CSS pixels. */
export interface GroupGeometry {
  estimatedGroupSize: number;
  gap: number;
  groupOffsets: number[];
  groupSizes: number[];
  totalMainSize: number;
}

export interface PreviewLayout extends GroupGeometry {
  crossCount: number;
  horizontal: boolean;
  itemScaleLimit: number;
  tileCrossSize: number;
  viewportHeight: number;
  viewportWidth: number;
}

/** A thumbnail's allocated rectangle in content coordinates, measured in CSS pixels. */
export type PreviewTilePlacement = {
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export function layoutAspectRatio(aspectRatio: number): number {
  return clamp(
    aspectRatio,
    1 / MAX_LAYOUT_ASPECT_RATIO,
    MAX_LAYOUT_ASPECT_RATIO,
  );
}

export function layoutThumbnailSize(item: PreviewItem): {
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

export function medianSize(sizes: number[], estimatedSize: number): number {
  const sorted = [...sizes].sort((left, right) => left - right);
  const middle = (sorted.length - 1) / 2;
  const lower = sorted[Math.floor(middle)] ?? estimatedSize;
  const upper = sorted[Math.ceil(middle)] ?? lower;
  return (lower + upper) / 2;
}

export function buildGroupGeometry(options: {
  crossCount: number;
  estimatedAspectRatio: number;
  gap: number;
  horizontal: boolean;
  item: (pageNum: number) => PreviewItem | null;
  itemScaleLimit: number;
  tileCrossSize: number;
  totalImages: number;
}): GroupGeometry {
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
    gap: options.gap,
    groupOffsets,
    groupSizes,
    totalMainSize: Math.max(1, offset - options.gap),
  };
}

export function groupAtOffset(geometry: GroupGeometry, offset: number): number {
  const lastGroup = geometry.groupOffsets.length - 1;
  if (lastGroup <= 0 || offset <= 0) {
    return 0;
  }

  let low = 0;
  let high = lastGroup;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (groupOffsetAt(geometry, middle) <= offset) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

export function groupOffsetAt(geometry: GroupGeometry, group: number): number {
  const offset = geometry.groupOffsets[group];
  if (offset === undefined) {
    throw new RangeError(`Invalid preview group: ${group}`);
  }
  return offset;
}

export function groupSizeAt(geometry: GroupGeometry, group: number): number {
  const size = geometry.groupSizes[group];
  if (size === undefined) {
    throw new RangeError(`Invalid preview group: ${group}`);
  }
  return size;
}

export function logicalGroupOffset(geometry: GroupGeometry, offset: number): number {
  const group = groupAtOffset(geometry, offset);
  const stride = groupSizeAt(geometry, group) + geometry.gap;
  return group + clamp((offset - groupOffsetAt(geometry, group)) / stride, 0, 1);
}

export function physicalGroupOffset(geometry: GroupGeometry, logicalOffset: number): number {
  const lastGroup = geometry.groupOffsets.length - 1;
  const group = clamp(Math.floor(logicalOffset), 0, lastGroup);
  const fraction = clamp(logicalOffset - group, 0, 1);
  return groupOffsetAt(geometry, group) +
    fraction * (groupSizeAt(geometry, group) + geometry.gap);
}

export function previewMainViewportSize(layout: PreviewLayout): number {
  return layout.horizontal ? layout.viewportWidth : layout.viewportHeight;
}

export function previewPageAtCenter(
  layout: PreviewLayout,
  scrollOffset: number,
  totalPages: number,
): number {
  const group = groupAtOffset(
    layout,
    scrollOffset + previewMainViewportSize(layout) / 2,
  );
  return clamp(
    group * layout.crossCount + Math.floor(layout.crossCount / 2) + 1,
    1,
    totalPages,
  );
}

export function previewVisiblePages(
  layout: PreviewLayout,
  scrollOffset: number,
  totalPages: number,
): { first: number; last: number } {
  const first = clamp(
    groupAtOffset(layout, scrollOffset) * layout.crossCount + 1,
    1,
    totalPages,
  );
  const endOffset = Math.max(
    scrollOffset,
    scrollOffset + previewMainViewportSize(layout) - 1,
  );
  return {
    first,
    last: clamp(
      (groupAtOffset(layout, endOffset) + 1) * layout.crossCount,
      first,
      totalPages,
    ),
  };
}

/** Keep a visible reading highlight in place when zooming; otherwise use the viewport center. */
export function previewZoomAnchor(
  layout: PreviewLayout,
  scrollOffset: number,
  totalPages: number,
  highlightedPage: number | null,
): number {
  const visible = previewVisiblePages(layout, scrollOffset, totalPages);
  return highlightedPage !== null && highlightedPage >= visible.first && highlightedPage <= visible.last
    ? highlightedPage
    : previewPageAtCenter(layout, scrollOffset, totalPages);
}

export function previewCrossCountLimits(
  layout: PreviewLayout | null,
  aspectRatio: number,
  totalPages: number,
): { min: number; max: number } {
  return {
    min: layout ? minimumPreviewCrossCount(
      layout.horizontal, layoutAspectRatio(aspectRatio),
      layout.viewportWidth, layout.viewportHeight, layout.gap,
    ) : 1,
    max: layout?.horizontal
      ? Math.min(MAX_PREVIEW_CROSS_COUNT, totalPages)
      : MAX_PREVIEW_CROSS_COUNT,
  };
}

export function previewPageScrollOffset(
  layout: PreviewLayout,
  pageNum: number,
  totalPages: number,
): number {
  const group = Math.floor(
    (clamp(pageNum, 1, totalPages) - 1) / layout.crossCount,
  );
  return groupOffsetAt(layout, group) -
    (previewMainViewportSize(layout) - groupSizeAt(layout, group)) / 2;
}

export function previewContentSize(layout: PreviewLayout): {
  width: number;
  height: number;
} {
  return {
    width: layout.horizontal
      ? Math.max(layout.totalMainSize, layout.viewportWidth)
      : layout.viewportWidth,
    height: layout.horizontal
      ? layout.viewportHeight
      : Math.max(layout.totalMainSize, layout.viewportHeight),
  };
}

/** Projects only the requested group window; unloaded pages retain estimated geometry. */
export function previewTilePlacements(options: {
  layout: PreviewLayout;
  firstGroup: number;
  lastGroup: number;
  totalPages: number;
  rightToLeft: boolean;
}): PreviewTilePlacement[] {
  const { layout } = options;
  const contentWidth = previewContentSize(layout).width;
  const placements: PreviewTilePlacement[] = [];
  const firstPage = options.firstGroup * layout.crossCount + 1;
  const lastPage = Math.min(
    options.totalPages,
    (options.lastGroup + 1) * layout.crossCount,
  );
  for (let pageNum = firstPage; pageNum <= lastPage; pageNum += 1) {
    const index = pageNum - 1;
    const group = Math.floor(index / layout.crossCount);
    const crossIndex = index % layout.crossCount;
    const groupSize = groupSizeAt(layout, group);
    const groupOffset = groupOffsetAt(layout, group);
    placements.push({
      pageNum,
      x: layout.horizontal
        ? options.rightToLeft
          ? contentWidth - groupSize - groupOffset
          : groupOffset
        : crossIndex * (layout.tileCrossSize + layout.gap),
      y: layout.horizontal
        ? crossIndex * (layout.tileCrossSize + layout.gap)
        : groupOffset,
      width: layout.horizontal ? groupSize : layout.tileCrossSize,
      height: layout.horizontal ? layout.tileCrossSize : groupSize,
    });
  }
  return placements;
}

/** Pure sizing; DOM measurement and anchor restoration stay in the viewport. */
export function calculatePreviewLayout(options: {
  width: number; height: number; horizontal: boolean;
  totalImages: number; pixelScale: number; gap: number; estimatedAspectRatio: number;
  maxTileWidth: number;
  referenceThumbnailCrossSize: number; crossCountOverride: number | null;
  maximumCrossCount: number; item: (pageNum: number) => PreviewItem | null;
}): PreviewLayout {
  const { width, height, horizontal, totalImages } = options;
  const scale = options.pixelScale;
  const gap = options.gap * scale;
  const aspectRatio = options.estimatedAspectRatio;
  const maxTileWidth = options.maxTileWidth * scale;
  // crossCount counts rows horizontally and columns vertically. Automatic fitting
  // starts from the reference thumbnail width, not from each image independently.
  const itemsPerRow = Math.max(
    1,
    Math.ceil((width + gap) / (maxTileWidth + gap)),
  );
  const itemWidth = Math.max(
    1,
    (width - gap * (itemsPerRow - 1)) / itemsPerRow,
  );
  const itemHeight = Math.max(1, Math.round(itemWidth * aspectRatio));
  const availableRows = Math.max(
    1,
    Math.ceil((height + gap) / (itemHeight + gap)),
  );
  const fittedCrossCount = horizontal
    ? Math.min(availableRows, Math.ceil(totalImages / itemsPerRow))
    : Math.min(itemsPerRow, options.maximumCrossCount);
  // Automatic sizing and explicit resizing obey the same cap, so the first
  // interaction never jumps from an initially unreachable count.
  const crossCount = clamp(
    options.crossCountOverride ?? fittedCrossCount,
    1,
    options.maximumCrossCount,
  );
  const availableTileHeight = Math.max(
    1,
    (height - gap * (crossCount - 1)) / crossCount,
  );
  const crossCountOverridden = options.crossCountOverride !== null;
  const overriddenTileWidth = Math.min(
    Math.max(1, (width - gap * (crossCount - 1)) / crossCount),
    width,
    height / aspectRatio,
  );
  // Explicit zoom also fits a whole reference image in the viewport; automatic
  // sizing follows available rows and the reference thumbnail width.
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
  // Real thumbnails share a scale relative to the reference before group accumulation.
  const itemScaleLimit = tileCrossSize / options.referenceThumbnailCrossSize;
  const geometry = buildGroupGeometry({
    crossCount,
    estimatedAspectRatio: aspectRatio,
    gap,
    horizontal,
    item: options.item,
    itemScaleLimit,
    tileCrossSize,
    totalImages,
  });

  return {
    crossCount, horizontal, itemScaleLimit, tileCrossSize,
    viewportWidth: width, viewportHeight: height, ...geometry
  };
}

export function minimumPreviewCrossCount(
  horizontal: boolean, aspectRatio: number,
  viewportWidth: number, viewportHeight: number, gap: number,
): number {
  const crossSize = horizontal ? viewportHeight : viewportWidth;
  const maximumTileCrossSize = horizontal
    ? Math.min(viewportHeight, viewportWidth * aspectRatio)
    : Math.min(viewportWidth, viewportHeight / aspectRatio);
  // Enough rows/columns to avoid enlarging the reference tile beyond a viewport.
  return Math.max(1, Math.ceil((crossSize + gap) / (maximumTileCrossSize + gap)));
}
