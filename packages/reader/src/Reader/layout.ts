import type { NavigationMode, PageLayout, ReaderScrollSizeScale } from "../kit/interfaces";
import { clamp } from "../kit/helpers";

export function doublePagePairStart(pageNum: number, firstPageSeparate: boolean): number {
  return firstPageSeparate
    ? pageNum <= 1 ? 1 : pageNum - pageNum % 2
    : pageNum % 2 === 0 ? pageNum - 1 : pageNum;
}

/** The end screen is a reading destination, never the second half of a spread. */
export function normalizeReadingPage(page: number, total: number | undefined, mode: NavigationMode, layout: PageLayout, separate: boolean): number {
  const target = clamp(Math.round(page), 1, total ? total + 1 : Number.MAX_SAFE_INTEGER);
  return mode === "paged" && layout === "double" && (!total || target !== total + 1)
    ? doublePagePairStart(target, separate) : target;
}

export function nextReadingPage(page: number, step: -1 | 1, total: number | undefined, layout: PageLayout, separate: boolean): number {
  let delta: number = step;
  if (layout === "double") {
    if (total && page === total + 1 && step < 0) delta = doublePagePairStart(total, separate) - page;
    else if (separate && page === 1 && step > 0) delta = 1;
    else if (separate && page === 2 && step < 0) delta = -1;
    else delta = step * 2;
  }
  return clamp(page + delta, 1, total ? total + 1 : Number.MAX_SAFE_INTEGER);
}

export function pageWindowNumbers(currentPageNum: number, windowSize: number): number[] {
  const numbers: number[] = [];

  for (let offset = -windowSize; offset <= windowSize; offset += 1) {
    numbers.push(currentPageNum + offset);
  }

  return numbers;
}

export function containFitScale(
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  return Math.min(
    Math.max(1, viewportWidth) / Math.max(1, imageWidth),
    Math.max(1, viewportHeight) / Math.max(1, imageHeight),
  );
}

export function containFitFrame(
  aspectRatio: number,
  viewportWidth: number,
  viewportHeight: number,
  scale = 1,
): { height: number; width: number } {
  const width = Math.max(1, Math.min(
    Math.max(1, viewportWidth),
    Math.max(1, viewportHeight) / aspectRatio,
  ) * scale);
  return { height: width * aspectRatio, width };
}

export function pageFrameSize(options: {
  aspectRatio: number;
  contentPage: boolean;
  viewportWidth: number;
  viewportHeight: number;
  navigationMode: NavigationMode;
  pageLayout: PageLayout;
  sizeScale: ReaderScrollSizeScale;
  reference: { width: number; height: number } | null;
  referenceAspectRatio: number;
  horizontal: boolean;
}): { width: number; height: number } {
  const { aspectRatio, viewportWidth, viewportHeight, navigationMode, pageLayout, sizeScale, reference, referenceAspectRatio, horizontal } = options;
  // Paged images fit independently inside their single-page or half-spread frame.
  if (navigationMode === "paged") {
    const availableWidth = pageLayout === "double"
      ? Math.max(1, (viewportWidth - 3) / 2)
      : viewportWidth;
    if (!options.contentPage) {
      return { width: availableWidth, height: viewportHeight };
    }
    const frameSize = containFitFrame(aspectRatio, availableWidth, viewportHeight);
    return frameSize;
  }
  // Scrolling pages share a reference cross-axis size, so different aspect ratios
  // change their length along the reading direction instead of their zoom level.
  const scaleMultiplier = sizeScale === "one-to-one" && reference
    ? 1 / containFitScale(
      reference.width,
      reference.height,
      viewportWidth,
      viewportHeight,
    )
    : typeof sizeScale === "number"
      ? sizeScale
      : 1;
  const referenceFrame = sizeScale === "fill"
    ? horizontal
      ? {
        height: viewportHeight,
        width: viewportHeight / referenceAspectRatio,
      }
      : {
        height: viewportWidth * referenceAspectRatio,
        width: viewportWidth,
      }
    : containFitFrame(
      referenceAspectRatio,
      viewportWidth,
      viewportHeight,
      scaleMultiplier,
    );
  if (horizontal) {
    return { height: referenceFrame.height, width: referenceFrame.height / aspectRatio };
  } else {
    return { width: referenceFrame.width, height: referenceFrame.width * aspectRatio };
  }
}
