import type { Component } from "solid-js";

export interface PreviewToolbarProps {
  /** Actual fitted row/column count, which may differ from the requested count. */
  crossCount: number;
  /** Allowed row/column counts for the current viewport. */
  crossCountLimits: { min: number; max: number };
  /** Inclusive page range currently visible; null before initial layout. */
  visiblePages: { first: number; last: number } | null;
  /** Derived from metadata requests relevant to this viewport. */
  loading: boolean;
  /** Reveal the current reading-progress page without changing it. */
  locateHighlightedPage(): void;
}

export type PreviewToolbar = Component<PreviewToolbarProps>;
