import { createContext, type Accessor, useContext } from "solid-js";
import type { PreviewCache } from "../features/PreviewCache";
import type { ReadProgressPort } from "../features/ReadProgressSyncer";
import type { PreviewDecodeCache } from "./DecodeCache";
import type { PreviewSettingsStore } from "./index";
import type { createPreviewLoading } from "./loading";
import type { PreviewViewportRef } from "./Viewport";

/** One Root's capabilities; reading progress and viewport position remain independent between instances. */
export interface ScrollPreviewContext {
  // Resources

  /** Content metadata and thumbnail requests; the creator owns this potentially shared cache. */
  previewCache: PreviewCache;
  /** Reusable decoded thumbnails; each tile releases its own reference, not the shared cache. */
  decodeCache: PreviewDecodeCache;
  /** This instance's request window, pending loads and failures, independent of other viewports. */
  loading: ReturnType<typeof createPreviewLoading>;

  // Instance settings and availability

  /** Reading direction and requested row/column count; the fitted count comes from the viewport. */
  settings: PreviewSettingsStore;
  /** Hiding retains the browsing position and highlight for the next presentation. */
  visible: Accessor<boolean>;
  /** Suspend user input and motion while allowing programmatic positioning and progress sync. */
  disabled: Accessor<boolean>;
  /** Arrange controls for left-handed use without changing reading direction. */
  leftHanded: Accessor<boolean>;
  /** Shrink unused panel height within the container's available space. */
  fitContentHeight: Accessor<boolean>;

  // Reading progress and viewport observations

  /** Reading highlight, not browsing position; received progress is silent, local selection publishes. */
  progress: ReadProgressPort;
  /** Browsing page, retained while the viewport is absent; page numbers start at 1. */
  currentPage: Accessor<number>;
  /** Viewport-owned measurements and positioning; null while absent, replaced when direction changes. */
  viewport: Accessor<PreviewViewportRef | null>;

  // Internal viewport binding

  /** Drag-to-close moves the complete panel, including custom layout and controls. */
  readonly panel: HTMLElement;
  /** Attach the active viewport; null retains its last browsing page for the next viewport. */
  viewportRef(viewport: PreviewViewportRef | null): void;

  // User actions

  /** Center a page without changing reading progress; page numbers start at 1. */
  scrollToPage(pageNum: number): void;
  /** Reveal the reading highlight without selecting or publishing it again. */
  locateHighlightedPage(): void;
  /** Mark and publish reading progress, then request that the host open the selected page. */
  selectPage(pageNum: number): void;
  /** Request another presentation at the current browsing page; absent when unavailable. */
  resize?(): void;
  /** Request leaving at the current browsing page; the host decides whether to hide or unmount. */
  close?(): void;
}

export const ScrollPreviewContextKey = createContext<ScrollPreviewContext>();

export function useScrollPreviewContext(): ScrollPreviewContext {
  const ctx = useContext(ScrollPreviewContextKey);
  if (!ctx) throw new Error("ScrollPreview context is unavailable.");
  return ctx;
}
