import { clamp } from "../kit/helpers";
import type { PreviewItem } from "../kit/interfaces";
import {
  buildGroupGeometry,
  minimumPreviewCrossCount,
  type PreviewLayout,
} from "../ScrollPreview2/layout";

export {
  buildGroupGeometry,
  groupAtOffset,
  groupOffsetAt,
  groupSizeAt,
  layoutAspectRatio,
  layoutThumbnailSize,
  logicalGroupOffset,
  medianSize,
  minimumPreviewCrossCount,
  physicalGroupOffset,
  type PreviewLayout,
} from "../ScrollPreview2/layout";

/** Preserves the old component's presentation-specific sizing during migration. */
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
  const itemsPerRow = Math.max(
    1,
    embedded
      ? Math.round((width + gap) / (maxTileWidth + gap))
      : Math.ceil((width + gap) / (maxTileWidth + gap)),
  );
  const itemWidth = Math.max(1, (width - gap * (itemsPerRow - 1)) / itemsPerRow);
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
    crossCount,
    gap,
    horizontal,
    itemScaleLimit,
    tileCrossSize,
    viewportWidth: width,
    viewportHeight: height,
    ...geometry,
  };
}
