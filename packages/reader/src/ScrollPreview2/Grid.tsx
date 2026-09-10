import type { Component } from "solid-js";

/** A thumbnail's allocated rectangle in content coordinates, measured in CSS pixels. */
export interface PreviewTilePlacement {
  pageNum: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PreviewTileProps {
  /** Shown before metadata becomes available. */
  pageNum: number;
  /** Available image area in CSS pixels. */
  width: number;
  height: number;
  /** Upper bound on enlargement relative to the thumbnail's intrinsic dimensions. */
  maximumScale: number;
}

export interface PreviewGridProps {
  /** Full scrollable content dimensions in CSS pixels, including unrendered images. */
  contentSize: { width: number; height: number };
  /** Only visible and overscan tiles, with geometry already calculated by the viewport. */
  tiles: readonly PreviewTilePlacement[];
  /** Enlargement limit applied to every tile, relative to intrinsic dimensions. */
  maximumScale: number;
}

export type PreviewGrid = Component<PreviewGridProps>;
export type PreviewTile = Component<PreviewTileProps>;
