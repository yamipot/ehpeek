import { createEffect, createSignal, ErrorBoundary, onCleanup, onMount, Show, untrack } from "solid-js";
import { Reader, type ReaderActions } from "./Reader/index";
import { ScrollPreview, type ScrollPreviewOpenState } from "./ScrollPreview";
import { createReaderSettings } from "./features/ReaderSettings";
import { createPreviewCache } from "./features/PreviewCache";
import { ReadProgressSyncer, type ReadProgressPort } from "./features/ReadProgressSyncer";
import { SurfaceStack } from "./features/SurfaceStack";
import { createOverlayHost, OverlayHostProvider, OverlayPortal } from "./kit/Widgets/OverlayHost";
import { lockPageScroll, lockPageThemeColor } from "./features/Viewport";
import type { ReaderInstance, ReaderPage, ReaderPlacement, ReadingSurface, ReadingViewProps } from "./kit/interfaces";
import { applyUiScale } from "./kit/ui";

export function ReadingView(props: ReadingViewProps) {
  const options = untrack(() => props.options);
  if (!Number.isSafeInteger(options.source.totalPages) || options.source.totalPages < 1) {
    throw new RangeError("A reader needs a positive, finite number of pages.");
  }
  const host = options.host ?? createOverlayHost(document.body, options.uiScale, options.texts);
  const settings = createReaderSettings(options.settings, options.onSettingChange);
  const cache = createPreviewCache(options.source);
  const [progress, setProgress] = createSignal(options.initialProgress ?? null);
  const [fullscreenActive, setFullscreenActive] = createSignal(host.fullscreen.active());
  const [readerView, setReaderView] = createSignal<{ pageNum: number; placement: ReaderPlacement | null } | null>(null);
  const [preview, setPreview] = createSignal<ScrollPreviewOpenState | null>(null);
  const [readerActions, setReaderActions] = createSignal<ReaderActions | null>(null);
  const [previewProgress, setPreviewProgress] = createSignal<ReadProgressPort | null>(null);
  const onError = options.onError ?? ((error: unknown) => console.error("[reader]", error));
  let disposed = false;
  let preservingFullscreen = false;
  let opening: Promise<void> | null = null;
  let pendingMount: { resolve: () => void; reject: (error: unknown) => void } | null = null;
  let previewRoot!: HTMLDivElement;
  const stack = new SurfaceStack(closeView, onError, options.history);
  const stopFullscreen = host.fullscreen.subscribe((active) => untrack(() => {
    const wasFullscreen = fullscreenActive();
    setFullscreenActive(active);
    if (wasFullscreen && !active && !preservingFullscreen && options.exitOnFullscreenExit && readerView()) {
      setPreview(null);
      setReaderView(null);
      stack.requestCloseAll();
    }
  }));

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

  onCleanup(() => {
    disposed = true;
    stopFullscreen();
    stack.dispose();
    cache.dispose();
    pendingMount?.resolve();
    pendingMount = null;
    options.onReaderMount?.(false);
    props.instanceRef?.(null);
    void (async () => {
      await opening?.catch(onError);
      await exitFullscreen();
    })().catch(onError).finally(() => {
      if (!options.host) host.element.remove();
    });
  });

  function publishProgress(page: ReaderPage): void {
    if (page.pageNum) setProgress(page.pageNum);
    options.onProgress?.(page);
  }

  function openReader(pageNum: number, configuredFullscreen = false): Promise<void> {
    if (disposed) return Promise.resolve();
    if (opening) {
      return opening.then(() => untrack(() => {
        if (!disposed) readerActions()?.gotoPage(pageNum);
      }));
    }
    const request = openReaderAt(pageNum, configuredFullscreen);
    opening = request;
    return request.finally(() => { opening = null; });
  }

  async function openReaderAt(pageNum: number, configuredFullscreen: boolean): Promise<void> {
    if (options.beforeOpen && !(await options.beforeOpen(pageNum))) return;
    if (disposed) return;
    if (readerView()) {
      readerActions()?.gotoPage(pageNum);
      return;
    }
    const placement = options.placement?.() ?? null;
    if (!placement && configuredFullscreen && options.fullscreenOnOpen &&
      !document.fullscreenElement && document.fullscreenEnabled &&
      typeof host.element.requestFullscreen === "function") {
      let entered = false;
      try {
        await host.fullscreen.enter();
        entered = true;
      } catch (error) {
        console.warn("[reader] Fullscreen request failed", error);
      }
      if (disposed || (entered && !host.fullscreen.active())) return;
    }
    stack.push("reader");
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
      stack.rollbackPush("reader");
      await exitFullscreen();
      throw error;
    } finally {
      pendingMount = null;
    }
  }

  function openPreview(pageNum: number): void {
    if (disposed) return;
    if (stack.top !== "preview") stack.push("preview");
    setPreview({ mode: "overlay", pageNum });
  }

  function openReaderPreview(pageNum: number): void {
    previewProgress()?.setProgress(pageNum);
    const placement = readerView()?.placement;
    if (placement?.coversPreview && placement.container.available() && !fullscreenActive()) {
      if (stack.top !== "preview") stack.push("preview");
      setPreview({ mode: "embedded", pageNum });
    } else {
      openPreview(pageNum);
    }
  }

  function selectPage(pageNum: number): void {
    const open = () => { void openReader(pageNum, true).catch(onError); };
    if (stack.top === "preview") stack.requestClose("preview", open);
    else open();
  }

  async function closeView(view: ReadingSurface): Promise<void> {
    if (disposed) return;
    if (view === "preview") {
      setPreview(null);
      return;
    }
    setReaderView(null);
    options.onReaderMount?.(false);
    await exitFullscreen();
    if (!disposed) await options.onReaderClosed?.();
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
        classList={{ "z-reader-panel": container !== undefined }}
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
          actionsRef={setReaderActions}
          callbacks={{
            onClose: () => stack.requestClose("reader"),
            onProgress: publishProgress,
            onEnd: () => options.onEnd?.(),
            onOpenPreview: openReaderPreview,
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
      // Child mount effects must finish before open() reports a successful mount.
      if (pendingMount) queueMicrotask(pendingMount.resolve);
    });
    return element;
  }

  const instance: ReaderInstance = {
    settings,
    progress,
    get activeView() { return stack.top ?? null; },
    open: (pageNum = options.source.initialPageNum, fullscreen = false) => openReader(pageNum, fullscreen),
    openPreview: (pageNum = progress() ?? options.source.initialPageNum) => openPreview(pageNum),
  };
  onMount(() => props.instanceRef?.(instance));

  return (
    <OverlayHostProvider host={host}>
      <div ref={previewRoot} class="ehpeek-ui-root contents">
        <ScrollPreview
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
          onClose={(pageNum) => stack.requestClose("preview", () => options.onPreviewClosed?.(pageNum))}
          onOpenOverlay={openPreview}
          onSelectPage={(_url, page) => selectPage(page)}
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
            // Let Solid dispose the failed subtree before closing its owning view.
            queueMicrotask(() => untrack(() => {
              if (disposed || readerView() !== view) return;
              onError(error);
              stack.requestCloseAll();
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
