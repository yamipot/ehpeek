import type { Accessor, JSX } from "solid-js";
import type { ScrollMotion } from "../kit/animation";

export interface ReaderViewportSize {
  /** Available reading area in CSS pixels. */
  width: number;
  height: number;
}

export interface ReaderViewportRef {
  size: Accessor<ReaderViewportSize | null>;
  /** First visible content page in reading order; null before layout or on the end screen. */
  firstVisiblePage: Accessor<number | null>;
  /**
   * Align a reading page after its frame is available. True means alignment completed;
   * replacement, user interruption or unmount settles the request with false.
   */
  moveToPage(pageNum: number, motion?: ScrollMotion): Promise<boolean>;
  /** Stop page movement and dragging without changing the committed reading page. */
  stopMotion(): void;
  /** Dismiss image zoom; return false when there was no zoom to dismiss. */
  closeZoom(): boolean;
}

export interface ReaderViewportProps {
  /** Initial normalized reading page, including the separate-cover and double-page rules. */
  initPage: number;
  ref?: (viewport: ReaderViewportRef | null) => void;
  /**
   * Report the reading page observed during user scrolling, not programmatic alignment.
   * Reader accepts this position without writing the same scroll offset back to the DOM.
   */
  onScrollPageChange(pageNum: number): void;
  /** Center taps toggle tools; opening image zoom hides them. */
  onToggleToolbar(): void;
  onHideToolbar(): void;
}

/**
 * Owns frame geometry, DOM position, motion, input routing and image-zoom presentation.
 * Window replacement and resizing preserve the reading anchor locally.
 * Page views and the position bar are children; the main Toolbar remains a sibling.
 */
export declare function ReaderViewport(props: ReaderViewportProps): JSX.Element;

export interface ReaderPositionBarProps {
  /** Observed DOM offset along the reading axis, in CSS pixels. */
  scrollOffset: number;
  /** Available reading length in CSS pixels, used for the expansion threshold. */
  viewportLength: number;
  /** Use the narrower track when Reader occupies only part of the browser width. */
  narrow: boolean;
}

/** Owns accumulated movement, visibility/expansion and idle timers; uses the shared seek actions. */
export declare function ReaderPositionBar(props: ReaderPositionBarProps): JSX.Element;
