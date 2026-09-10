import type { Component, Ref } from "solid-js";
import type { SetStoreFunction, Store } from "solid-js/store";
import type { PreviewCache } from "../features/PreviewCache";
import type { ReadProgressPort } from "../features/ReadProgressSyncer";
import type { ReadDirection } from "../kit/interfaces";
import type { PreviewDecodeCache } from "../ScrollPreview/DecodeCache";

/** Settings owned by one Preview instance. */
export interface PreviewSettings {
  direction: ReadDirection;
  /** Requested rows horizontally or columns vertically; null means automatic fitting. */
  crossCount: number | null;
}

export type PreviewSettingsStore = [
  Store<PreviewSettings>,
  SetStoreFunction<PreviewSettings>,
];

export interface ScrollPreviewRef {
  progress: ReadProgressPort;
  /** Center the page without changing reading progress. */
  scrollToPage(pageNum: number): void;
}

/** Owns one Preview instance. */
export interface ScrollPreviewProps {
  previewCache: PreviewCache;
  decodeCache: PreviewDecodeCache;
  /** Hiding the Preview retains its settings and viewport positions. */
  visible: boolean;
  settings: PreviewSettingsStore;
  /** Initial page number; the first page is 1. */
  initPage: number;
  /** Initial reading highlight; null or omitted starts without one. */
  initialProgress?: number | null;
  /** Suspend input and motion while covered without discarding state. */
  disabled: boolean;
  /** Place controls for left-handed use without changing reading direction. */
  leftHanded: boolean;
  ref?: Ref<ScrollPreviewRef>;
  /** Mark a page as reading progress and request that the host open it. */
  onSelectPage(pageNum: number): void;
  /** Request another presentation while keeping the current page. */
  onResize?(pageNum: number): void;
  /** Request leaving Preview. */
  onClose?(): void;
}

export type ScrollPreview = Component<ScrollPreviewProps>;
