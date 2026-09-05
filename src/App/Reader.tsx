import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import {
  Reader,
  type ReaderOptions,
} from "../components/Reader";
import texts from "../i18n";
import type { GalleryPreviewCache } from "./GalleryPreviewCache";
import type { GalleryCoordinator } from "./GalleryCoordinator";
import {
  OverlayHostProvider,
  type OverlayHost,
} from "./OverlayHost";
import { lockPageScroll, lockPageThemeColor } from "./viewport";

const READER_THEME_COLOR = "#070707";

export type ReaderSurface = {
  coveredColumn: () => ReaderCoverColumn | null;
  dispose: () => void;
  setFullscreenActive: (active: boolean) => void;
  setVisible: (visible: boolean) => void;
};

export type ReaderCoverColumn = "info" | "preview";

export function mountReaderSurface(options: {
  coverColumn: ReaderCoverColumn | null;
  coverTarget: HTMLElement | null;
  coordinator: GalleryCoordinator;
  options: ReaderOptions;
  overlayHost: OverlayHost;
  previewCache: GalleryPreviewCache;
}): ReaderSurface {
  const host = document.createElement("div");
  options.overlayHost.element.append(host);
  const stopCoveringColumn = coverGalleryColumn(
    host,
    options.coverTarget,
    options.overlayHost,
  );
  let setFullscreenActive = (_active: boolean): void => undefined;
  let disposed = false;
  const unlockPageScroll = lockPageScroll();
  const unlockPageThemeColor = lockPageThemeColor(READER_THEME_COLOR);
  let disposeRoot: () => void;
  try {
    disposeRoot = render(
      () => {
        const [fullscreenActive, updateFullscreenActive] = createSignal(
          options.overlayHost.fullscreen.active(),
        );
        setFullscreenActive = updateFullscreenActive;
        return (
          <OverlayHostProvider host={options.overlayHost}>
            <Reader
              coordinator={options.coordinator}
              fullscreenActive={fullscreenActive()}
              options={options.options}
              previewCache={options.previewCache}
            />
          </OverlayHostProvider>
        );
      },
      host,
    );
  } catch (error) {
    options.coordinator.attachReader(null);
    unlockPageThemeColor();
    unlockPageScroll();
    stopCoveringColumn();
    host.remove();
    throw error;
  }

  return {
    coveredColumn: () =>
      options.coverTarget !== null &&
        options.coverTarget.isConnected &&
        !options.overlayHost.fullscreen.active()
        ? options.coverColumn
        : null,
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      disposeRoot();
      unlockPageThemeColor();
      unlockPageScroll();
      stopCoveringColumn();
      host.remove();
    },
    setFullscreenActive,
    setVisible: (visible) => {
      host.style.visibility = visible ? "" : "hidden";
    },
  };
}

function coverGalleryColumn(
  host: HTMLElement,
  target: HTMLElement | null,
  overlayHost: OverlayHost,
): () => void {
  if (!target) {
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
    if (overlayHost.fullscreen.active() || !target.isConnected) {
      clearBounds();
      return;
    }
    const bounds = target.getBoundingClientRect();
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
  const resizeObserver = new ResizeObserver(updateBounds);
  resizeObserver.observe(target);
  window.addEventListener("resize", updateBounds);
  window.addEventListener("scroll", updateBounds, true);
  const unsubscribeFullscreen = overlayHost.fullscreen.subscribe(updateBounds);
  updateBounds();

  return () => {
    resizeObserver.disconnect();
    window.removeEventListener("resize", updateBounds);
    window.removeEventListener("scroll", updateBounds, true);
    unsubscribeFullscreen();
  };
}

export async function openOriginalReader(
  pageNum: number,
  previewCache: GalleryPreviewCache,
): Promise<void> {
  const page = (await previewCache.getPages([pageNum]))[0];

  if (!page || page.pageNum !== pageNum) {
    throw new Error(texts.errors.imageNotFound);
  }

  window.location.assign(page.url);
}

export function reportReaderOpenError(error: unknown): void {
  const message = error instanceof Error ? error.message : texts.errors.loadFailed;
  console.error("[ehpeek]", error);
  window.alert(message);
}
