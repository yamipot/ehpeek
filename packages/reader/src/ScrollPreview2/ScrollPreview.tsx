import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  Show,
  untrack,
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

export function ScrollPreview(props: ScrollPreviewProps) {
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
  let currentPage = normalizePage(untrack(() => props.initPage), totalPages);
  const [exitDragOffset, setExitDragOffset] = createSignal(0);
  let viewport: PreviewViewportRef | null = null;
  let panel!: HTMLElement;
  let exitAnimation: Animation | null = null;
  let disposed = false;
  const exitDragSize = (): number => Math.max(
    1,
    context.settings[0].direction === "ttb"
      ? panel?.clientWidth ?? 0
      : panel?.clientHeight ?? 0,
  );

  const progress: ReadProgressPort = {
    current: highlightedPage,
    subscribe: publisher.subscribe,
    setProgress(pageNum) {
      setHighlightedPage(normalizePage(pageNum, totalPages));
    },
  };
  const context: ScrollPreviewContext = {
    previewCache,
    decodeCache,
    progress,
    settings: untrack(() => props.settings),
    visible,
    disabled,
    leftHanded,
    selectPage(pageNum) {
      const next = normalizePage(pageNum, totalPages);
      setHighlightedPage(next);
      publisher.publish(next);
      onSelectPage(next);
    },
    resize: onResize
      ? () => onResize(currentPage)
      : undefined,
    close: onClose
      ? () => onClose(currentPage)
      : undefined,
    reportError(error) {
      onError(error);
    },
  };
  const reference: ScrollPreviewRef = {
    progress,
    currentPage: () => currentPage,
    scrollToPage(pageNum) {
      viewport?.scrollToPage(normalizePage(pageNum, totalPages));
    },
  };

  setRef?.(reference);
  untrack(() => bindInteractionGate(() => panel, disabled));

  createEffect(() => {
    if (!props.disabled && props.visible) return;
    exitAnimation?.cancel();
    exitAnimation = null;
    setExitDragOffset(0);
  });

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

  const updateExitDrag = (offset: number): void => {
    exitAnimation?.cancel();
    exitAnimation = null;
    setExitDragOffset(offset);
  };
  const finishExitDrag = (velocity: number): void => {
    if (!context.close) {
      setExitDragOffset(0);
      return;
    }
    const horizontal = context.settings[0].direction !== "ttb";
    const offset = exitDragOffset();
    const exitSize = exitDragSize();
    const shouldClose = Math.abs(offset) >= exitSize * 0.2 || Math.abs(velocity) >= 0.6;
    const direction = offset === 0 ? Math.sign(velocity) || 1 : Math.sign(offset);
    const endTransform = shouldClose
      ? horizontal
        ? `translate3d(0, ${direction * 100}%, 0) scale(0.97)`
        : `translate3d(${direction * 100}%, 0, 0) scale(0.97)`
      : "translate3d(0, 0, 0) scale(1)";
    exitAnimation?.cancel();
    exitAnimation = panel.animate(
      [
        { opacity: panel.style.opacity, transform: panel.style.transform },
        { opacity: shouldClose ? 0.7 : 1, transform: endTransform },
      ],
      { duration: 180, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)", fill: "forwards" },
    );
    void exitAnimation.finished.then(() => {
      if (disposed || untrack(() => props.disabled || !props.visible)) return;
      if (shouldClose) context.close?.();
      else setExitDragOffset(0);
    }).catch(() => undefined);
  };

  onCleanup(() => {
    disposed = true;
    exitAnimation?.cancel();
    setRef?.(null);
  });

  return (
    <ScrollPreviewContextKey.Provider value={context}>
      <section
        ref={panel}
        class="ehpeek-preview-panel"
        data-scroll-preview-instance
        hidden={!props.visible}
        style={{
          opacity: `${1 - Math.min(0.15, Math.abs(exitDragOffset()) /
            exitDragSize() * 0.15)}`,
          transform: context.settings[0].direction === "ttb"
            ? `translate3d(${exitDragOffset()}px, 0, 0) scale(${1 - Math.min(0.03, Math.abs(exitDragOffset()) / exitDragSize() * 0.03)})`
            : `translate3d(0, ${exitDragOffset()}px, 0) scale(${1 - Math.min(0.03, Math.abs(exitDragOffset()) / exitDragSize() * 0.03)})`,
        }}
      >
        <Show when={context.settings[0].direction} keyed>{(_direction) => (
          <PreviewViewport
            initPage={currentPage}
            ref={(next) => { viewport = next; }}
            onCurrentPageChange={(pageNum) => { currentPage = pageNum; }}
            onExitDrag={updateExitDrag}
            onExitDragEnd={finishExitDrag}
          />
        )}</Show>
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
