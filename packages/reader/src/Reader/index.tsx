import { batch, createEffect, createMemo, createSignal, on, onCleanup, onMount, Show, untrack, type Accessor } from "solid-js";
import { ReaderContextKey, getReaderControls, type ReaderContext } from "./Context";
import { ReaderViewport, type ReaderViewportRef } from "./Viewport";
import { ReaderToolbar } from "./Toolbar";
import { createReaderLoading } from "./loading";
import { createReaderScrollScale, ReaderScrollScaleControls } from "./ScrollScale";
import { currentReaderOrientation } from "../features/ReaderSettings";
import { normalizeReadingPage, nextReadingPage } from "./layout";
import { createReadProgressPublisher } from "../features/ReadProgressSyncer";
import { bindInteractionGate } from "../features/InteractionGate";
import "../styles";
import type { ReadProgressPort } from "../features/ReadProgressSyncer";
import type {
  ContentSource,
  ReaderCustomization,
  ReaderPage,
  ReaderSettingsState,
} from "../kit/interfaces";

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
export function Reader(props: ReaderProps) {
  const source = untrack(() => props.source);
  const settings = untrack(() => props.settings);
  const [orientation, setOrientation] = createSignal(currentReaderOrientation());
  const [firstPageSeparate, setFirstPageSeparate] = createSignal(false);
  const initial = untrack(() => {
    const controls = settings[`${orientation()}Controls`];
    return normalizeReadingPage(props.initPage ?? source.initialPageNum, source.totalPages,
      controls.navigationMode.value(), controls.pageLayout.value(), false);
  });
  const [page, setPage] = createSignal(initial);
  const [seeking, setSeeking] = createSignal(false);
  const [closing, setClosing] = createSignal(false);
  const [toolbarOpen, setToolbarOpen] = createSignal(false);
  const [viewport, setViewport] = createSignal<ReaderViewportRef | null>(null);
  const refs: ReaderContext["refs"] = { viewport, bindViewport: setViewport };
  const [notifyIntent, setNotifyIntent] = createSignal(true);
  const publisher = createReadProgressPublisher();
  let element!: HTMLDivElement;
  let disposed = false;
  let turnTarget: number | null = null;
  let turnRevision = 0;
  let seekTimer: number | undefined;
  let lastReported: number | null = null;
  const disabled = () => (props.disabled ?? false) || closing();
  const controls = () => getReaderControls(ctx);
  const normalize = (pageNum: number) => normalizeReadingPage(pageNum, source.totalPages,
    controls().navigationMode, controls().pageLayout, firstPageSeparate());

  // Page-turn intent outlives a pointer event, but is invalidated by a new seek or interruption.
  const cancelTurn = () => {
    turnRevision++;
    turnTarget = null;
    refs.viewport()?.stopMotion();
  };
  const cancelSeek = () => {
    window.clearTimeout(seekTimer);
    seekTimer = undefined;
    setSeeking(false);
  };
  function gotoPage(pageNum: number, publish = true): void {
    if (disposed || closing() || !Number.isFinite(pageNum)) return;
    const target = normalize(pageNum);
    if (!publish) lastReported = target;
    cancelTurn();
    batch(() => {
      cancelSeek();
      setNotifyIntent(publish);
      setPage(target);
    });
    void refs.viewport()?.moveToPage(page());
  }
  const position: ReaderPosition = {
    page,
    seeking,
    contentPages() {
      const current = page();
      const double = controls().navigationMode === "paged" && controls().pageLayout === "double" &&
        !(firstPageSeparate() && current === 1);
      return (double ? [current, current + 1] : [current]).filter(number =>
        number >= 1 && (!source.totalPages || number <= source.totalPages));
    },
    gotoPage,
    turnPage(step) {
      if (disabled()) return;
      if (controls().navigationMode !== "paged") { gotoPage(page() + step); return; }
      const base = turnTarget ?? page();
      const target = nextReadingPage(base, step, source.totalPages, controls().pageLayout, firstPageSeparate());
      if (target === base) {
        if (turnTarget === null) void refs.viewport()?.moveToPage(page(), "animated");
        return;
      }
      cancelSeek();
      const token = ++turnRevision;
      turnTarget = target;
      // A target outside the current window must first make its frame renderable.
      if (!loading.windowPages().includes(target)) {
        batch(() => { setNotifyIntent(true); setPage(target); });
      }
      void refs.viewport()?.moveToPage(target, "animated").then(completed => untrack(() => {
        if (disposed || token !== turnRevision) return;
        turnTarget = null;
        if (completed) {
          batch(() => { setNotifyIntent(true); setPage(target); });
          void refs.viewport()?.moveToPage(target);
        }
      }));
    },
    beginSeek() {
      if (disabled()) return;
      cancelTurn();
      window.clearTimeout(seekTimer);
      setNotifyIntent(false);
      setSeeking(true);
    },
    seek(pageNum) {
      if (disabled() || !Number.isFinite(pageNum) || pageNum <= 0) return;
      position.beginSeek();
      setPage(normalize(Math.min(pageNum, source.totalPages || Number.MAX_SAFE_INTEGER)));
      void refs.viewport()?.moveToPage(page());
      seekTimer = window.setTimeout(position.commitSeek, 180);
    },
    commitSeek() {
      if (disabled() || !seeking()) return;
      gotoPage(page());
    },
  };
  const loading = untrack(() => createReaderLoading({
    source,
    requestedPage: page,
    priorityPages: position.contentPages,
    firstVisiblePage: () => refs.viewport()?.firstVisiblePage() ?? null,
    seeking,
    closing,
    renderWindowSize: props.renderWindowSize,
    preloadWindowSize: props.preloadWindowSize,
    concurrentLoads: props.concurrentLoads,
    decodedImageCacheLimit: props.decodedImageCacheLimit,
  }));
  const referenceImageSize = createMemo<{ width: number; height: number } | null>(previous => {
    if (previous) return previous;
    const resource = loading.page(initial);
    const width = resource?.element?.naturalWidth || resource?.image?.width;
    const height = resource?.element?.naturalHeight || resource?.image?.height;
    return width && height ? { width, height } : null;
  }, null);
  const scrollScale = untrack(() => createReaderScrollScale({
    settings,
    direction: () => {
      const current = settings[`${orientation()}Controls`];
      return current.navigationMode.value() === "scroll" ? current.scrollDirection.value() : current.pagedDirection.value();
    },
    viewportSize: () => refs.viewport()?.size() ?? null,
    referenceImageSize,
  }));
  function close(): void {
    if (closing() || refs.viewport()?.closeZoom()) return;
    if (props.onClose()) {
      cancelTurn();
      cancelSeek();
      setClosing(true);
    }
  }
  const ctx: ReaderContext = {
    source, settings, orientation, position, loading, scrollScale, firstPageSeparate: [firstPageSeparate, setFirstPageSeparate], disabled, refs,
    customization: untrack(() => props.customization) ?? {},
    close,
    openPreview: () => props.onOpenPreview(page()),
    finish: () => { props.onEnd(); close(); },
  };

  createEffect(() => {
    const current = page();
    const resource = loading.page(current);
    if (seeking() || closing() || !notifyIntent() || !resource?.page || lastReported === current) return;
    lastReported = current;
    untrack(() => {
      publisher.publish(current);
      props.onProgress(resource.page!);
    });
  });
  createEffect(on(controls, (next, previous) => {
    if (previous && next.navigationMode === previous.navigationMode && next.pageLayout === previous.pageLayout &&
      next.direction === previous.direction && next.firstPageSeparate === previous.firstPageSeparate) return;
    cancelTurn();
    if (controls().navigationMode !== "scroll") scrollScale.apply();
    batch(() => { setNotifyIntent(true); setPage(normalize(page())); });
    void refs.viewport()?.moveToPage(page());
  }, { defer: true }));
  createEffect(() => {
    if (!disabled()) return;
    untrack(() => { cancelTurn(); cancelSeek(); setNotifyIntent(false); });
  });
  untrack(() => bindInteractionGate(() => element, disabled));
  onMount(() => {
    const updateOrientation = () => setOrientation(currentReaderOrientation());
    window.addEventListener("resize", updateOrientation);
    onCleanup(() => window.removeEventListener("resize", updateOrientation));
    props.ref?.({
      gotoPage,
      progress: {
        current: page,
        subscribe: publisher.subscribe,
        setProgress: number => gotoPage(number, false),
      },
    });
  });
  onCleanup(() => {
    disposed = true;
    cancelTurn();
    cancelSeek();
    props.ref?.(null);
  });

  return <ReaderContextKey.Provider value={ctx}>
    <div ref={element} id="ehpeek-reader" class="ehpeek-reader"
      data-navigation-mode={controls().navigationMode}
      data-page-layout={controls().pageLayout === "double" && firstPageSeparate() && page() === 1 ? "single" : controls().pageLayout}
      data-read-direction={controls().direction}>
      <Show when={!scrollScale.adjusting()}>
        <header class="ehpeek-reader-header">
          <ReaderToolbar open={toolbarOpen()} fullscreenActive={props.fullscreenActive} onToggleFullscreen={props.onToggleFullscreen} />
        </header>
      </Show>
      <ReaderViewport initPage={initial}
        onScrollPageChange={number => {
          if (seeking() || closing()) return;
          turnTarget = null;
          batch(() => { setNotifyIntent(true); setPage(number); });
        }}
        onToggleToolbar={() => setToolbarOpen(value => !value)}
        onHideToolbar={() => setToolbarOpen(false)} />
      <ReaderScrollScaleControls />
    </div>
  </ReaderContextKey.Provider>;
}
