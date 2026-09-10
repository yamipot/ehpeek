import type { Accessor } from "solid-js";
import type { ContentSource, LoadedReaderPage, ReaderPage } from "../kit/interfaces";

/** A page's metadata can be available before its image is ready for display. */
export interface ReaderPageResource {
  readonly page: ReaderPage | null;
  readonly image: LoadedReaderPage | null;
  /** Decoded or progressively displayed DOM image; loading owns retention and eviction. */
  readonly element: HTMLImageElement | null;
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly error: string | null;
}

export interface ReaderLoading {
  /** Content, blank and end-screen page numbers needed by the current render window. */
  windowPages: Accessor<readonly number[]>;
  /** Reactive resource lookup; undefined means this page has not been requested. */
  page(pageNum: number): ReaderPageResource | undefined;
  /** Retry either metadata or image loading according to the page's current failure. */
  retry(pageNum: number): void;
}

/** Owns request cancellation, page failures, prefetch direction and decoded-image retention. */
export declare function createReaderLoading(options: {
  source: ContentSource;
  /** Reading destination used to choose the render window, including tentative progress seeks. */
  requestedPage: Accessor<number>;
  /** Pages of the displayed spread receive high-priority image fetches, including its second page. */
  priorityPages: Accessor<readonly number[]>;
  /** Read-only viewport observation used for prefetch priority; loading does not measure the DOM. */
  firstVisiblePage: Accessor<number | null>;
  /** Seek previews replace the render window without starting new prefetch work until commitment. */
  seeking: Accessor<boolean>;
  /** Closure has been accepted; ignore remaining results before the host finishes unmounting. */
  closing: Accessor<boolean>;
  renderWindowSize?: number;
  preloadWindowSize?: number;
  concurrentLoads?: number;
  decodedImageCacheLimit?: number;
}): ReaderLoading;
