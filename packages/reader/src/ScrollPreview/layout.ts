import { clamp } from "../kit/helpers";
import type { PreviewItem } from "../kit/interfaces";

const MAX_LAYOUT_ASPECT_RATIO = 3;

export type PreviewLayout = {
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

export function groupAtOffset(layout: PreviewLayout, offset: number): number {
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

export function groupOffsetAt(layout: PreviewLayout, group: number): number {
  const offset = layout.groupOffsets[group];
  if (offset === undefined) {
    throw new RangeError(`Invalid preview group: ${group}`);
  }
  return offset;
}

export function groupSizeAt(layout: PreviewLayout, group: number): number {
  const size = layout.groupSizes[group];
  if (size === undefined) {
    throw new RangeError(`Invalid preview group: ${group}`);
  }
  return size;
}

export function logicalGroupOffset(layout: PreviewLayout, offset: number): number {
  const group = groupAtOffset(layout, offset);
  const stride = groupSizeAt(layout, group) + layout.gap;
  return group + clamp((offset - groupOffsetAt(layout, group)) / stride, 0, 1);
}

export function physicalGroupOffset(layout: PreviewLayout, logicalOffset: number): number {
  const lastGroup = layout.groupOffsets.length - 1;
  const group = clamp(Math.floor(logicalOffset), 0, lastGroup);
  const fraction = clamp(logicalOffset - group, 0, 1);
  return groupOffsetAt(layout, group) +
    fraction * (groupSizeAt(layout, group) + layout.gap);
}

/** Pure sizing; DOM measurement, height application and anchor restoration stay in the view. */
export function calculatePreviewLayout(options: {
  width: number; height: number; horizontal: boolean; embedded: boolean;
  totalImages: number; pixelScale: number; gap: number; estimatedAspectRatio: number;
  maxTileWidth: number; embeddedReferenceTileWidth: number;
  referenceThumbnailCrossSize: number; crossCountOverride: number | null;
  maximumCrossCount: number; item: (pageNum: number) => PreviewItem | null;
}): PreviewLayout {
  const { width, height, horizontal, embedded, totalImages } = options;
  const scale = options.pixelScale;
  const gap = options.gap * scale;
  const aspectRatio = options.estimatedAspectRatio;
  const baseMaxTileWidth = options.maxTileWidth * scale;
  const maxTileWidth = embedded
    ? options.embeddedReferenceTileWidth * scale
    : baseMaxTileWidth;
  // crossCount counts rows horizontally and columns vertically. Automatic fitting
  // starts from the reference thumbnail width, not from each image independently.
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
    : Math.min(itemsPerRow, options.maximumCrossCount);
  const automaticCrossCount = embedded
    ? Math.max(
      fittedCrossCount,
      minimumPreviewCrossCount(horizontal, aspectRatio, width, height, gap),
    )
    : fittedCrossCount;
  // Explicit overrides replace automatic fitting but retain the shared count limit.
  const crossCount = clamp(
    options.crossCountOverride ?? automaticCrossCount,
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
    crossCount, gap, horizontal, itemScaleLimit, tileCrossSize,
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
