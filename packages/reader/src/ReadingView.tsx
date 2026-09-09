import { createEffect, createSignal, ErrorBoundary, onCleanup, onMount, Show, untrack } from "solid-js";
import { Reader, type ReaderActions } from "./Reader/index";
import { ScrollPreview, type ScrollPreviewOpenState } from "./ScrollPreview";
import { createReaderSettings } from "./features/ReaderSettings";
import { createPreviewCache } from "./features/PreviewCache";
import { ReadProgressSyncer, type ReadProgressPort } from "./features/ReadProgressSyncer";
import { ReaderPreviewNavi } from "./features/ReaderPreviewNavi";
import { createOverlayHost, OverlayHostProvider, OverlayPortal } from "./kit/Widgets/OverlayHost";
import { lockPageScroll, lockPageThemeColor } from "./features/Viewport";
import type { ReaderInstance, ReaderPage, ReaderPlacement, ReadingViewProps } from "./kit/interfaces";
import { applyUiScale } from "./kit/ui";
import "./styles";

export function ReadingView(props: ReadingViewProps) {
  const options = untrack(() => props.options);
  if (!Number.isSafeInteger(options.source.totalPages) || options.source.totalPages < 1) {
    throw new RangeError("A reader needs a positive, finite number of pages.");
  }
  const host = options.host ?? createOverlayHost(document.body, options.uiScale, options.texts);
  const settings = createReaderSettings(options.settings, options.onSettingChange);
  const cache = createPreviewCache(options.source);
  const [progress, setProgress] = createSignal(options.initialProgress ?? null);
  const [readerActions, setReaderActions] = createSignal<ReaderActions | null>(null);
  const [previewProgress, setPreviewProgress] = createSignal<ReadProgressPort | null>(null);
  const [fullscreenActive, setFullscreenActive] = createSignal(host.fullscreen.active());
  const onError = options.onError ?? ((error: unknown) => console.error("[reader]", error));
  let previewRoot!: HTMLDivElement;

  type ReaderOpenState = { pageNum: number; placement: ReaderPlacement | null };
  const [readerView, setReaderView] = createSignal<ReaderOpenState | null>(null);
  const [preview, setPreview] = createSignal<ScrollPreviewOpenState | null>(null);
  let disposed = false;

  // Browser history waits for navigation before removing the corresponding views.
  let closing: Promise<void> = Promise.resolve();
  let pendingBack: { done: Promise<void>; resolve: () => void; notifyReturn: boolean } | null = null;
  let previewReturnPage = options.source.initialPageNum;
  const historyDepth = () => Number(readerView() !== null) + Number(preview() !== null);
  const stopHistory = options.history?.subscribe(depth => {
    const notifyReturn = pendingBack?.notifyReturn ?? true;
    closing = closing.then(() => untrack(() => {
      if (depth < historyDepth()) return removeViews(depth < 1, notifyReturn);
    })).catch(onError).finally(() => {
      pendingBack?.resolve();
      pendingBack = null;
    });
  }) ?? (() => {});

  async function removeViews(closeReader: boolean, notifyReturn: boolean): Promise<void> {
    if (disposed) return;
    if (preview()) {
      setPreview(null);
      if (notifyReturn && (!closeReader || !readerView()))
        options.onPreviewClosed?.(previewReturnPage);
    }
    if (closeReader && readerView()) {
      setReaderView(null);
      options.onReaderMount?.(false);
      await exitFullscreen();
      if (!disposed) await options.onReaderClosed?.();
    }
  }

  function closeViews(closeReader: boolean, notifyReturn: boolean): Promise<void> {
    if (disposed) return Promise.resolve();
    if (pendingBack) return pendingBack.done;
    if (!preview() && (!closeReader || !readerView())) return closing;
    if (options.history) {
      let resolve!: () => void;
      const done = new Promise<void>(finish => { resolve = finish; });
      pendingBack = { done, resolve, notifyReturn };
      options.history.back(closeReader ? historyDepth() : 1);
      return done;
    }
    const completion = closing.then(() => untrack(() => removeViews(closeReader, notifyReturn)));
    closing = completion.catch(onError);
    return completion;
  }

  // Reader's initial page belongs to this mount; subsequent navigation uses its own progress.
  let opening: Promise<void> | null = null;
  let pendingMount: { resolve: () => void; reject: (error: unknown) => void } | null = null;

  function openReader(pageNum: number, configuredFullscreen: boolean): Promise<void> {
    if (disposed) return Promise.resolve();
    if (opening) {
      return opening.then(() => untrack(() => {
        if (!disposed) readerActions()?.gotoPage(pageNum);
      }));
    }
    const request = (async () => {
      if (options.beforeOpen && !(await options.beforeOpen(pageNum))) return;
      if (!disposed) await navi.openReader(pageNum, configuredFullscreen);
    })();
    opening = request;
    return request.finally(() => { opening = null; });
  }

  async function mountReader(pageNum: number, configuredFullscreen: boolean): Promise<void> {
    await (pendingBack?.done ?? closing);
    if (disposed) return;
    if (readerView()) {
      readerActions()?.gotoPage(pageNum);
      return;
    }
    const placement = options.placement?.() ?? null;
    if (!placement && configuredFullscreen && options.fullscreenOnOpen) {
      const canOpen = await enterFullscreen();
      if (disposed || !canOpen) return;
    }
    options.history?.push(1, "reader");
    try {
      options.onReaderOpen?.(pageNum, placement !== null);
      options.onReaderMount?.(true);
      await new Promise<void>((resolve, reject) => {
        pendingMount = { resolve, reject };
        setReaderView({ pageNum, placement });
      });
    } catch (error) {
      setReaderView(null);
      options.onReaderMount?.(false);
      options.history?.back(1);
      await exitFullscreen();
      throw error;
    } finally {
      pendingMount = null;
    }
  }

  const topPanel = () => disposed ? null : preview()?.mode === "overlay" ? "overlay-preview"
    : preview()?.mode === "embedded" ? "embedded-preview" : readerView() ? "reader" : null;
  const navi = ReaderPreviewNavi({
    top: topPanel,
    previewMode: () => {
      const placement = readerView()?.placement;
      return placement?.coversPreview && placement.container.available() && !fullscreenActive()
        ? "embedded" : "overlay";
    },
    openReader: mountReader,
    openPreview(pageNum, mode) {
      if (disposed) return;
      previewReturnPage = pageNum;
      if (!preview()) options.history?.push(historyDepth() + 1, "preview");
      setPreview({ mode, pageNum });
    },
    focusPreview: pageNum => previewProgress()?.setProgress(pageNum),
    closePreview: notifyReturn => closeViews(false, notifyReturn),
    closeReader: () => closeViews(true, false),
    onError,
  });

  createEffect(() => {
    const reader = readerActions();
    const target = previewProgress();
    if (!reader || !target) return;
    const syncer = new ReadProgressSyncer(reader.progress, target);
    onCleanup(() => syncer.dispose());
  });
  createEffect(() => applyUiScale(host.uiScale(), previewRoot));
  createEffect(() => {
    if (props.embeddedDirection !== undefined)
      settings.set("embeddedPreviewDirection", props.embeddedDirection);
    if (props.leftHandedControls !== undefined)
      settings.set("leftHandedControls", props.leftHandedControls);
  });

  function publishProgress(page: ReaderPage): void {
    if (page.pageNum) setProgress(page.pageNum);
    options.onProgress?.(page);
  }

  const embeddedPreviewDisabled = () => {
    if (preview()?.mode === "overlay") return true;
    if (preview()?.mode === "embedded") return false;
    const view = readerView();
    return Boolean(view && (fullscreenActive() || !view.placement || view.placement.coversPreview));
  };

  let preservingFullscreen = false;
  const stopFullscreen = host.fullscreen.subscribe((active) => untrack(() => {
    const wasFullscreen = fullscreenActive();
    setFullscreenActive(active);
    if (wasFullscreen && !active && !preservingFullscreen && options.exitOnFullscreenExit && readerView()) {
      navi.closeAll();
    }
  }));

  async function enterFullscreen(): Promise<boolean> {
    if (document.fullscreenElement || !document.fullscreenEnabled ||
      typeof host.element.requestFullscreen !== "function") return true;
    try {
      await host.fullscreen.enter();
      return host.fullscreen.active();
    } catch (error) {
      console.warn("[reader] Fullscreen request failed", error);
      return true;
    }
  }

  async function exitFullscreen(): Promise<void> {
    preservingFullscreen = true;
    try { await host.fullscreen.exit(); }
    finally { preservingFullscreen = false; }
  }

  function toggleFullscreen(): void {
    void (host.fullscreen.active() ? exitFullscreen() : host.fullscreen.enter()).catch(onError);
  }

  function ReaderOverlay(view: { pageNum: number; placement: ReaderPlacement | null }) {
    const container = untrack(() => view.placement?.container);
    const [bounds, setBounds] = createSignal<ReturnType<NonNullable<typeof container>["bounds"]>>(null);
    const updateBounds = () => setBounds(fullscreenActive() ? null : container?.bounds() ?? null);
    createEffect(updateBounds);
    onCleanup(lockPageScroll());
    onCleanup(lockPageThemeColor("#070707"));
    if (container) onCleanup(container.listen({ onBoundsChange: updateBounds }));
    onCleanup(() => setReaderActions(null));
    const element = (
      <div
        classList={{ "ehpeek-reader-panel": container !== undefined }}
        style={{
          ...(bounds() ? {
            height: `${bounds()!.height}px`,
            left: `${bounds()!.left}px`,
            overflow: "hidden",
            position: "fixed",
            top: `${bounds()!.top}px`,
            transform: "translateZ(0)",
            width: `${bounds()!.width}px`,
          } : {}),
          visibility: preview()?.mode === "embedded" ? "hidden" : undefined,
        }}
      >
        <Reader
          disabled={props.disabled || preview() !== null}
          actionsRef={setReaderActions}
          callbacks={{
            onClose: () => navi.back(),
            onProgress: publishProgress,
            onEnd: () => options.onEnd?.(),
            onOpenPreview: pageNum => navi.openPreview(pageNum, true),
            onToggleFullscreen: toggleFullscreen,
          }}
          settings={settings}
          customization={{
            ...options.customization,
            onOpenOriginalPage: options.customization?.onOpenOriginalPage
              ? (url, page) => {
                  void exitFullscreen().then(() => options.customization?.onOpenOriginalPage?.(url, page)).catch(onError);
                }
              : undefined,
          }}
          fullscreenActive={fullscreenActive()}
          options={{ initialPageNum: view.pageNum, totalPages: options.source.totalPages }}
          source={options.source}
        />
      </div>
    );
    onMount(() => {
      // Opening completes after child mount effects have initialized the Reader.
      if (pendingMount) queueMicrotask(pendingMount.resolve);
    });
    return element;
  }

  // Teardown follows instance ownership; injected hosts outlive this ReadingView.
  onCleanup(() => {
    disposed = true;
    stopFullscreen();
    stopHistory();
    pendingBack?.resolve();
    pendingBack = null;
    pendingMount?.resolve();
    pendingMount = null;
    options.onReaderMount?.(false);
    cache.dispose();
    props.instanceRef?.(null);
    void (async () => {
      await opening?.catch(onError);
      await exitFullscreen();
    })().catch(onError).finally(() => {
      if (!options.host) host.element.remove();
    });
  });

  const instance: ReaderInstance = {
    settings,
    progress,
    get activeView() {
      const top = topPanel();
      return top === "overlay-preview" || top === "embedded-preview" ? "preview" : top;
    },
    open: (pageNum = options.source.initialPageNum, fullscreen = false) => openReader(pageNum, fullscreen),
    openPreview: (pageNum = progress() ?? options.source.initialPageNum) => navi.openPreview(pageNum),
  };
  onMount(() => props.instanceRef?.(instance));

  return (
    <OverlayHostProvider host={host}>
      <div ref={previewRoot} class="ehpeek-ui-root ehpeek-reading-view">
        <ScrollPreview
          disabled={props.disabled ?? false}
          embeddedDisabled={embeddedPreviewDisabled()}
          openState={preview()}
          progressRef={(port) => {
            setPreviewProgress(port);
            const page = progress();
            if (page !== null) port?.setProgress(page);
          }}
          initialProgress={options.initialProgress}
          embeddedDirection={settings.value().embeddedPreviewDirection}
          fillEmbeddedContainer={props.fillPreviewContainer ?? (() => false)}
          leftHandedControls={() => settings.value().leftHandedControls}
          onReturnPageChange={(pageNum) => { previewReturnPage = pageNum; }}
          onClose={(pageNum) => {
            previewReturnPage = pageNum;
            navi.back();
          }}
          onOpenOverlay={pageNum => navi.openPreview(pageNum)}
          onSelectPage={(_url, page) => { void openReader(page, true).catch(onError); }}
          onLoadError={onError}
          onEmbeddedDirectionChange={(direction) => settings.set("embeddedPreviewDirection", direction)}
          onReadDirectionChange={(direction) => settings.set("previewDirection", direction)}
          previewCache={cache}
          readDirection={settings.value().previewDirection}
          replaceOriginalPreview={props.embeddedPreview ?? false}
        />
      </div>
      <Show when={readerView()} keyed>{(view) => (
        <ErrorBoundary fallback={(error) => {
          if (pendingMount) pendingMount.reject(error);
          else {
            queueMicrotask(() => untrack(() => {
              if (disposed || readerView() !== view) return;
              onError(error);
              navi.closeAll();
            }));
          }
          return null;
        }}>
          <OverlayPortal><ReaderOverlay {...view} /></OverlayPortal>
        </ErrorBoundary>
      )}</Show>
    </OverlayHostProvider>
  );
}
