import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  untrack,
  type JSX,
} from "solid-js";
import type { SetStoreFunction, Store } from "solid-js/store";
import { bindInteractionGate } from "../features/InteractionGate";
import type { PreviewCache } from "../features/PreviewCache";
import {
  createReadProgressPublisher,
  type ReadProgressPort,
} from "../features/ReadProgressSyncer";
import { clamp } from "../kit/helpers";
import type { ReadDirection } from "../kit/interfaces";
import type { PreviewDecodeCache } from "./DecodeCache";
import { ScrollPreviewContextKey, type ScrollPreviewContext } from "./Context";
import { PreviewViewport, type PreviewViewportRef } from "./Viewport";
import { PreviewToolbar } from "./Toolbar";
import { createPreviewLoading } from "./loading";

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
  /** Current viewport page for host-driven presentation changes or closure. */
  currentPage(): number;
  /** Center the page without changing reading progress. */
  scrollToPage(pageNum: number): void;
}

/** Owns one Preview instance. */
export interface ScrollPreviewProps {
  class?: string;
  style?: JSX.CSSProperties;
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
  /** Shrink unused vertical space within the height supplied by the container. */
  fitContentHeight?: boolean;
  /** Place controls for left-handed use without changing reading direction. */
  leftHanded: boolean;
  ref?: (preview: ScrollPreviewRef | null) => void;
  /** Mark a page as reading progress and request that the host open it. */
  onSelectPage(pageNum: number): void;
  /** Request another presentation while keeping the current page. */
  onResize?(pageNum: number): void;
  /** Request leaving Preview while retaining its current viewport page. */
  onClose?(pageNum: number): void;
  /** Report a thumbnail batch that could not be loaded. */
  onError?(error: unknown): void;
}

export interface PreviewRootProps extends ScrollPreviewProps {
  /** Compose one viewport and its controls inside this instance. */
  children: JSX.Element;
}

function DefaultScrollPreview(props: ScrollPreviewProps): JSX.Element {
  return (
    <ScrollPreview.Root {...props}>
      <ScrollPreview.Toolbar />
      <ScrollPreview.Viewport />
    </ScrollPreview.Root>
  );
}

export const ScrollPreview = Object.assign(DefaultScrollPreview, {
  Root: PreviewRoot,
  Toolbar: PreviewToolbar,
  Viewport: PreviewViewport,
});

function PreviewRoot(props: PreviewRootProps) {
  const previewCache = untrack(() => props.previewCache);
  const decodeCache = untrack(() => props.decodeCache);
  const onResize = untrack(() => props.onResize);
  const onClose = untrack(() => props.onClose);
  const onSelectPage = untrack(() => props.onSelectPage);
  const setRef = untrack(() => props.ref);
  const onError = untrack(() => props.onError) ??
    ((error: unknown) => console.error("[reader]", error));
  const visible = () => props.visible;
  const disabled = () => props.disabled;
  const leftHanded = () => props.leftHanded;
  const totalPages = previewCache.source.totalPages;
  if (!Number.isSafeInteger(totalPages) || totalPages < 1) {
    throw new RangeError("A Scroll Preview needs a positive, finite number of pages.");
  }
  const publisher = createReadProgressPublisher();
  const [highlightedPage, setHighlightedPage] = createSignal<number | null>(
    normalizeOptionalPage(untrack(() => props.initialProgress), totalPages),
  );
  let retainedPage = normalizePage(untrack(() => props.initPage), totalPages);
  const [viewport, setViewport] = createSignal<PreviewViewportRef | null>(null);
  const currentPage = createMemo(() => viewport()?.currentPage() ?? retainedPage);
  const bindViewport = (next: PreviewViewportRef | null): void => {
    // Direction changes replace the viewport; only its browsing page survives.
    if (next === null) retainedPage = viewport()?.currentPage() ?? retainedPage;
    setViewport(next);
  };
  const loading = createPreviewLoading({
    centeredPageNum: currentPage,
    onLoadError: onError,
    previewCache,
    ready: () => visible() && viewport()?.ready() === true,
  });
  let panel!: HTMLElement;

  const progress: ReadProgressPort = {
    current: highlightedPage,
    subscribe: publisher.subscribe,
    setProgress(pageNum) {
      setHighlightedPage(normalizePage(pageNum, totalPages));
    },
  };
  const scrollToPage = (pageNum: number): void => {
    viewport()?.scrollToPage(normalizePage(pageNum, totalPages));
  };
  const context: ScrollPreviewContext = untrack(() => ({
    previewCache,
    decodeCache,
    progress,
    settings: props.settings,
    loading,
    visible,
    disabled,
    leftHanded,
    fitContentHeight: () => props.fitContentHeight ?? false,
    refs: {
      viewport,
      get panel() { return panel; },
      bindViewport,
    },
    currentPage,
    scrollToPage,
    locateHighlightedPage() {
      const pageNum = highlightedPage();
      if (pageNum !== null) scrollToPage(pageNum);
    },
    selectPage(pageNum) {
      const next = normalizePage(pageNum, totalPages);
      setHighlightedPage(next);
      publisher.publish(next);
      onSelectPage(next);
    },
    resize: onResize ? () => onResize(untrack(currentPage)) : undefined,
    close: onClose ? () => onClose(untrack(currentPage)) : undefined,
  }));
  const reference: ScrollPreviewRef = {
    progress,
    currentPage,
    scrollToPage,
  };

  setRef?.(reference);
  untrack(() => bindInteractionGate(() => panel, disabled));

  onMount(() => {
    // Only the enabled presentation consumes Escape; a covered sibling retains
    // its state without competing for the same dismissal.
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || !visible() || disabled() || !context.close) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      context.close();
    };
    document.addEventListener("keydown", onKeydown, true);
    onCleanup(() => document.removeEventListener("keydown", onKeydown, true));
  });

  onCleanup(() => setRef?.(null));

  return (
    <ScrollPreviewContextKey.Provider value={context}>
      <section
        ref={panel}
        class={`ehpeek-preview-panel${props.class ? ` ${props.class}` : ""}`}
        style={props.style}
        data-scroll-preview-instance
        hidden={!props.visible}
      >
        {props.children}
      </section>
    </ScrollPreviewContextKey.Provider>
  );
}

function normalizePage(pageNum: number, totalPages: number): number {
  return clamp(Number.isFinite(pageNum) ? Math.round(pageNum) : 1, 1, totalPages);
}

function normalizeOptionalPage(
  pageNum: number | null | undefined,
  totalPages: number,
): number | null {
  return pageNum === null || pageNum === undefined
    ? null
    : normalizePage(pageNum, totalPages);
}

export { PreviewDecodeCache } from "./DecodeCache";
export { createPreviewCache, type PreviewCache } from "../features/PreviewCache";
