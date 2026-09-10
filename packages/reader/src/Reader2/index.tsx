import type { Accessor, JSX } from "solid-js";
import type { ReadProgressPort } from "../features/ReadProgressSyncer";
import type {
  ContentSource,
  ReaderCustomization,
  ReaderPage,
  ReaderSettingsState,
} from "../kit/interfaces";

// Signature draft only. ReadingView continues to mount Reader until implementation is complete.

export interface ReaderRef {
  /** Receiving progress positions the reader silently; local reading publishes changes. */
  progress: ReadProgressPort;
  /** Open a reading page immediately; page numbers start at 1. */
  gotoPage(pageNum: number): void;
}

export interface ReaderProps {
  /** Fixed for this mount; supplies page count and content without client pagination details. */
  source: ContentSource;
  /** Initial reading page; defaults to source.initialPageNum. */
  initPage?: number;
  /** Instance preferences, including per-key persistence notifications supplied by the host. */
  settings: ReaderSettingsState;
  customization?: ReaderCustomization;
  /** Suspend user input and motion, but retain resources and accept programmatic positioning. */
  disabled?: boolean;
  /** Controls the fullscreen button and clock; layout uses the actual container size. */
  fullscreenActive: boolean;
  /** Number of neighboring pages retained on each side of the reading page. */
  renderWindowSize?: number;
  /** Number of pages to prefetch ahead of the visible reading range. */
  preloadWindowSize?: number;
  concurrentLoads?: number;
  /** Maximum number of decoded images retained outside the rendered window. */
  decodedImageCacheLimit?: number;
  ref?: (reader: ReaderRef | null) => void;
  /** True means the host accepted closure; it may finish unmounting asynchronously. */
  onClose(): boolean;
  /** Reports local reading progress once page metadata is available; seeking does not publish. */
  onProgress(page: ReaderPage): void;
  /** Activating the end screen reports completion before requesting closure. */
  onEnd(): void;
  /** Request Preview at the current reading page. */
  onOpenPreview(pageNum: number): void;
  /** Request a browser fullscreen change; the host owns that lifecycle. */
  onToggleFullscreen(): void;
}

/** Shared reading-position rules owned by Reader, used by both progress controls and page input. */
export interface ReaderPosition {
  /** Displayed reading page, including seek previews and the end screen at totalPages + 1. */
  page: Accessor<number>;
  /** Content pages in the displayed page/spread; excludes blanks and the end screen. */
  contentPages: Accessor<readonly number[]>;
  /** A progress control is previewing a destination without committing reading progress. */
  seeking: Accessor<boolean>;
  /** Position immediately, cancel pending navigation and commit local reading progress. */
  gotoPage(pageNum: number): void;
  /** Move by one reading step, honoring double-page pairs, the separate cover and the end screen. */
  turnPage(step: -1 | 1): void;
  /** Start progress scrubbing and interrupt any pending page-turn animation. */
  beginSeek(): void;
  /** Preview a content page without publishing progress or starting a new prefetch run. */
  seek(pageNum: number): void;
  /** Commit the latest seek destination; idle commitment uses the same rule. */
  commitSeek(): void;
}

/**
 * Owns reading position, pending turns, seek commitment, progress publication and toolbar visibility.
 * Toolbar and Viewport are siblings under this instance's Context; neither owns the other.
 */
export declare function Reader(props: ReaderProps): JSX.Element;
