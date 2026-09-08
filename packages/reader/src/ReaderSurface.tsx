import { createSignal } from "solid-js";
import type { ReaderActions, ReaderCallbacks } from "./components/Reader";
import type { ContentSource } from "./ContentSource";
import type { ReaderSettingsState } from "./settings";
import type { ReaderCustomization } from "./customization";

import { render } from "solid-js/web";
import { Reader, type ReaderOptions } from "./components/Reader";

import { OverlayHostProvider, type OverlayHost } from "./App/OverlayHost";
import { lockPageScroll, lockPageThemeColor } from "./App/viewport";

export type ReaderContainer = {
  available: () => boolean;
  bounds: () => {
    height: number;
    left: number;
    top: number;
    width: number;
  } | null;
  listen: (callbacks: { onBoundsChange: () => void }) => () => void;
};

const READER_THEME_COLOR = "#070707";

export type ReaderSurface = {
  embedded: () => boolean;
  dispose: () => void;
  setFullscreenActive: (active: boolean) => void;
  setVisible: (visible: boolean) => void;
};

export function mountReaderSurface(options: {
  cover: ReaderContainer | null;
  callbacks: ReaderCallbacks;
  actionsRef: (actions: ReaderActions | null) => void;
  settings: ReaderSettingsState;
  customization?: ReaderCustomization;
  options: ReaderOptions;
  overlayHost: OverlayHost;
  source: ContentSource;
}): ReaderSurface {
  const host = document.createElement("div");
  options.overlayHost.element.append(host);
  const stopCoveringContainer = coverContainer(
    host,
    options.cover,
    options.overlayHost,
  );
  let setFullscreenActive = (_active: boolean): void => undefined;
  let disposed = false;
  const unlockPageScroll = lockPageScroll();
  const unlockPageThemeColor = lockPageThemeColor(READER_THEME_COLOR);
  let disposeRoot: () => void;
  try {
    disposeRoot = render(() => {
      const [fullscreenActive, updateFullscreenActive] = createSignal(
        options.overlayHost.fullscreen.active(),
      );
      setFullscreenActive = updateFullscreenActive;
      return (
        <OverlayHostProvider host={options.overlayHost}>
          <Reader
            callbacks={options.callbacks}
            actionsRef={options.actionsRef}
            settings={options.settings}
            customization={options.customization}
            fullscreenActive={fullscreenActive()}
            options={options.options}
            source={options.source}
          />
        </OverlayHostProvider>
      );
    }, host);
  } catch (error) {
    options.actionsRef(null);
    unlockPageThemeColor();
    unlockPageScroll();
    stopCoveringContainer();
    host.remove();
    throw error;
  }

  return {
    embedded: () =>
      options.cover !== null &&
      options.cover.available() &&
      !options.overlayHost.fullscreen.active(),
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      disposeRoot();
      unlockPageThemeColor();
      unlockPageScroll();
      stopCoveringContainer();
      host.remove();
    },
    setFullscreenActive,
    setVisible: (visible) => {
      host.style.visibility = visible ? "" : "hidden";
    },
  };
}

function coverContainer(
  host: HTMLElement,
  container: ReaderContainer | null,
  overlayHost: OverlayHost,
): () => void {
  if (!container) {
    return () => undefined;
  }

  host.classList.add("z-reader-panel");
  const clearBounds = () => {
    host.style.height = "";
    host.style.left = "";
    host.style.overflow = "";
    host.style.position = "";
    host.style.top = "";
    host.style.transform = "";
    host.style.width = "";
  };
  const updateBounds = () => {
    if (overlayHost.fullscreen.active()) {
      clearBounds();
      return;
    }
    const bounds = container.bounds();
    if (!bounds) {
      clearBounds();
      return;
    }
    Object.assign(host.style, {
      height: `${bounds.height}px`,
      left: `${bounds.left}px`,
      overflow: "hidden",
      position: "fixed",
      top: `${bounds.top}px`,
      transform: "translateZ(0)",
      width: `${bounds.width}px`,
    });
  };
  const unsubscribeColumn = container.listen({ onBoundsChange: updateBounds });
  const unsubscribeFullscreen = overlayHost.fullscreen.subscribe(updateBounds);
  updateBounds();

  return () => {
    unsubscribeColumn();
    unsubscribeFullscreen();
  };
}
