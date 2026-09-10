import { createEffect, createSignal, on, onCleanup, onMount, Show, untrack, type Accessor } from "solid-js";
import { createStore } from "solid-js/store";
import { ScrollPreview, type PreviewSettings, type ScrollPreviewRef } from "./ScrollPreview";
import { PreviewDecodeCache } from "./ScrollPreview/DecodeCache";
import type { PreviewCache } from "./features/PreviewCache";
import { createReadProgressPublisher, type ReadProgressPort } from "./features/ReadProgressSyncer";
import { bindInteractionGate } from "./features/InteractionGate";
import { lockPageScroll } from "./features/Viewport";
import { OverlayPortal } from "./kit/Widgets/OverlayHost";
import { LauncherButton } from "./kit/Widgets/LauncherButton";
import { useReaderTexts } from "./kit/i18n";
import type { ReadDirection } from "./kit/interfaces";

export type ScrollPreviewOpenState = {
  mode: "overlay" | "embedded";
  pageNum: number;
};

export interface ReadingPreviewProps {
  disabled: boolean;
  embeddedDisabled: boolean;
  openState: ScrollPreviewOpenState | null;
  previewCache: PreviewCache;
  initialProgress?: number | null;
  replaceOriginalPreview: boolean;
  fillEmbeddedContainer: Accessor<boolean>;
  leftHandedControls: Accessor<boolean>;
  embeddedDirection: ReadDirection;
  readDirection: ReadDirection;
  progressRef(progress: ReadProgressPort | null): void;
  /** Retain the active browsing page for browser-history returns. */
  onReturnPageChange(pageNum: number): void;
  onClose(pageNum: number): void;
  onOpenOverlay(pageNum: number): void;
  onSelectPage(pageNum: number): void;
  onLoadError(error: unknown): void;
  onEmbeddedDirectionChange(direction: ReadDirection): void;
  onReadDirectionChange(direction: ReadDirection): void;
}

/** Composes the two Preview presentations used by ReadingView. */
export function ReadingPreview(props: ReadingPreviewProps) {
  const texts = useReaderTexts();
  const cache = untrack(() => props.previewCache);
  const embeddedDisabled = () => props.disabled || props.embeddedDisabled;
  const decodeCache = new PreviewDecodeCache(64 * 1024 * 1024, 160);
  onCleanup(() => decodeCache.dispose());
  const [embedded, setEmbedded] = createSignal<ScrollPreviewRef | null>(null);
  const [overlay, setOverlay] = createSignal<ScrollPreviewRef | null>(null);

  // Directions persist through ReadingView; zoom counts last for this reading instance.
  const [embeddedSettings, setEmbeddedSettings] = createStore<PreviewSettings>({
    direction: untrack(() => props.embeddedDirection), crossCount: null,
  });
  const [overlaySettings, setOverlaySettings] = createStore<PreviewSettings>({
    direction: untrack(() => props.readDirection), crossCount: null,
  });
  createEffect(on(() => props.embeddedDirection, next => setEmbeddedSettings("direction", next)));
  createEffect(on(() => props.readDirection, next => setOverlaySettings("direction", next)));
  createEffect(on(() => embeddedSettings.direction, next => props.onEmbeddedDirectionChange(next), { defer: true }));
  createEffect(on(() => overlaySettings.direction, next => props.onReadDirectionChange(next), { defer: true }));

  // Each Preview owns its highlight. This port connects Reader progress to both,
  // while only the inline presentation follows Reader's page with its viewport.
  const [highlightedPage, setHighlightedPage] = createSignal<number | null>(
    untrack(() => props.initialProgress ?? null),
  );
  const publisher = createReadProgressPublisher();
  const progress: ReadProgressPort = {
    current: highlightedPage,
    subscribe: publisher.subscribe,
    setProgress(pageNum) {
      setHighlightedPage(pageNum);
      embedded()?.progress.setProgress(pageNum);
      overlay()?.progress.setProgress(pageNum);
      if (!props.openState) embedded()?.scrollToPage(pageNum);
    },
  };
  const selectPage = (pageNum: number): void => {
    progress.setProgress(pageNum);
    publisher.publish(pageNum);
    props.onSelectPage(pageNum);
  };
  untrack(() => props.progressRef(progress));
  onCleanup(() => props.progressRef(null));

  createEffect(on([() => props.openState, embedded, overlay], ([view, inline, full]) => {
    if (view) (view.mode === "embedded" ? inline : full)?.scrollToPage(view.pageNum);
    else {
      const page = highlightedPage();
      if (page !== null) inline?.scrollToPage(page);
    }
  }));
  createEffect(() => {
    const view = props.openState;
    const active = view?.mode === "embedded" ? embedded() : overlay();
    if (view && active) props.onReturnPageChange(active.currentPage());
  });

  // Inline Preview has an expand button, not a close button. Escape only returns
  // from it when navigation has explicitly placed it above Reader.
  onMount(() => {
    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key !== "Escape" || props.disabled || props.embeddedDisabled ||
        props.openState?.mode !== "embedded") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      props.onClose(embedded()?.currentPage() ?? props.openState.pageNum);
    };
    document.addEventListener("keydown", onKeydown, true);
    onCleanup(() => document.removeEventListener("keydown", onKeydown, true));
  });

  function OverlayPreview() {
    const initPage = untrack(() => props.openState!.pageNum);
    let host!: HTMLDivElement;
    onCleanup(lockPageScroll());
    onMount(() => {
      const horizontal = untrack(() => overlaySettings.direction !== "ttb");
      const animation = host.animate([
        { opacity: 0.72, transform: horizontal
          ? "translate3d(0, -32px, 0) scale(0.99)"
          : "translate3d(32px, 0, 0) scale(0.99)" },
        { opacity: 1, transform: "translate3d(0, 0, 0) scale(1)" },
      ], { duration: 120, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" });
      void animation.finished.catch(() => undefined);
      onCleanup(() => animation.cancel());
    });
    return (
      <div ref={host} class="ehpeek-preview-host" data-embedded="false">
        <ScrollPreview
          previewCache={cache}
          decodeCache={decodeCache}
          settings={[overlaySettings, setOverlaySettings]}
          initPage={initPage}
          initialProgress={highlightedPage()}
          visible
          disabled={props.disabled}
          leftHanded={props.leftHandedControls()}
          ref={setOverlay}
          onSelectPage={selectPage}
          onClose={props.onClose}
          onError={props.onLoadError}
        />
      </div>
    );
  }

  return (
    <>
      <Show when={props.replaceOriginalPreview} fallback={
        <div
          ref={element => bindInteractionGate(() => element, embeddedDisabled)}
          class="ehpeek-preview-launcher"
        >
          <LauncherButton icon="grid" label={texts.gallery.scrollPreview}
            onClick={() => props.onOpenOverlay(highlightedPage() ?? 1)} />
        </div>
      }>
        <div class="ehpeek-preview-host" data-embedded="true">
          <ScrollPreview
            previewCache={cache}
            decodeCache={decodeCache}
            settings={[embeddedSettings, setEmbeddedSettings]}
            initPage={highlightedPage() ?? 1}
            initialProgress={highlightedPage()}
            visible
            disabled={embeddedDisabled()}
            leftHanded={props.leftHandedControls()}
            fitContentHeight={!props.fillEmbeddedContainer()}
            ref={setEmbedded}
            onSelectPage={selectPage}
            onResize={props.onOpenOverlay}
            onError={props.onLoadError}
          />
        </div>
      </Show>
      <Show when={props.openState?.mode === "overlay"}>
        <OverlayPortal><OverlayPreview /></OverlayPortal>
      </Show>
    </>
  );
}
