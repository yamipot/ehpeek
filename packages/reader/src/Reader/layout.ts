import type { NavigationMode, PageLayout, ReaderScrollSizeScale } from "../kit/interfaces";
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
