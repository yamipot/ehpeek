import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import {
  Reader,
  type ReaderOptions,
} from "../components/Reader";
import texts from "../texts.json";
import type { GalleryPreviewCache } from "./GalleryPreviewCache";
import type { GalleryCoordinator } from "./GalleryCoordinator";
import {
  OverlayHostProvider,
  type OverlayHost,
} from "./OverlayHost";
import { lockPageScroll } from "./viewport";

export type ReaderSurface = {
  dispose: () => void;
  setFullscreenActive: (active: boolean) => void;
};

export function mountReaderSurface(options: {
  coordinator: GalleryCoordinator;
  options: ReaderOptions;
  overlayHost: OverlayHost;
  previewCache: GalleryPreviewCache;
}): ReaderSurface {
  const host = document.createElement("div");
  options.overlayHost.element.append(host);
  let setFullscreenActive = (_active: boolean): void => undefined;
  let disposed = false;
  const unlockPageScroll = lockPageScroll();
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
    unlockPageScroll();
    host.remove();
    throw error;
  }

  return {
    dispose: () => {
      if (disposed) {
        return;
      }
      disposed = true;
      disposeRoot();
      unlockPageScroll();
      host.remove();
    },
    setFullscreenActive,
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
