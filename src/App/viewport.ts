type FullscreenSnapshot = {
  scale: number;
  scrollX: number;
  scrollY: number;
};

const FULLSCREEN_SCALE_PROPERTY = "--ehpeek-fullscreen-scale";
const FULLSCREEN_SCALE_INVERSE_PROPERTY = "--ehpeek-fullscreen-scale-inverse";

export type ReaderFullscreenController = ReturnType<typeof createReaderFullscreen>;

/** Locks original-page scrolling while the Reader overlay owns the viewport. */
function lockPageScroll(): () => void {
  const documentElement = document.documentElement;
  const body = document.body;
  const documentOverflow = documentElement.style.overflow;
  const bodyOverflow = body.style.overflow;
  documentElement.style.overflow = "hidden";
  body.style.overflow = "hidden";
  return () => {
    documentElement.style.overflow = documentOverflow;
    body.style.overflow = bodyOverflow;
  };
}

/** Captures the page state that fullscreen temporarily changes. */
function captureFullscreenSnapshot(): FullscreenSnapshot {
  return {
    scale: Math.max(0.01, window.visualViewport?.scale ?? 1),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };
}

/** Restores the original page position after leaving fullscreen. */
async function restorePageViewport(
  snapshot: FullscreenSnapshot,
): Promise<void> {
  await nextAnimationFrame();
  await nextAnimationFrame();
  window.scrollTo(snapshot.scrollX, snapshot.scrollY);
}

export const readerViewport = {
  createFullscreen: createReaderFullscreen,
  lockScroll: lockPageScroll,
};

export type ReaderViewport = typeof readerViewport;

function createReaderFullscreen(target: HTMLElement) {
  let snapshot: FullscreenSnapshot | null = null;
  const active = () => {
    const fullscreenElement = document.fullscreenElement;
    return fullscreenElement === target ||
      (fullscreenElement instanceof HTMLElement &&
        fullscreenElement.contains(target));
  };

  const restore = async (): Promise<void> => {
    target.style.removeProperty(FULLSCREEN_SCALE_PROPERTY);
    target.style.removeProperty(FULLSCREEN_SCALE_INVERSE_PROPERTY);
    const captured = snapshot;
    snapshot = null;
    if (!captured) {
      return;
    }
    await restorePageViewport(captured);
  };

  return {
    active,
    enter: async (): Promise<void> => {
      if (document.fullscreenElement || !document.fullscreenEnabled) {
        return;
      }
      snapshot = captureFullscreenSnapshot();
      const scaleBefore = snapshot.scale;
      try {
        await target.requestFullscreen();
        await nextAnimationFrame();
        const scaleAfter = Math.max(0.01, window.visualViewport?.scale ?? 1);
        const scale = Math.min(1, Math.max(0.1, scaleBefore / scaleAfter));
        target.style.setProperty(FULLSCREEN_SCALE_PROPERTY, String(scale));
        target.style.setProperty(
          FULLSCREEN_SCALE_INVERSE_PROPERTY,
          String(1 / scale),
        );
      } catch (error) {
        await restore();
        throw error;
      }
    },
    exit: async (): Promise<void> => {
      if (active()) {
        await document.exitFullscreen();
      }
      target.style.removeProperty(FULLSCREEN_SCALE_PROPERTY);
      target.style.removeProperty(FULLSCREEN_SCALE_INVERSE_PROPERTY);
    },
    restore,
    subscribe: (callback: (active: boolean) => void): (() => void) => {
      const onChange = () => {
        const fullscreenActive = active();
        if (!fullscreenActive) {
          target.style.removeProperty(FULLSCREEN_SCALE_PROPERTY);
          target.style.removeProperty(FULLSCREEN_SCALE_INVERSE_PROPERTY);
        }
        callback(fullscreenActive);
      };
      document.addEventListener("fullscreenchange", onChange);
      return () => document.removeEventListener("fullscreenchange", onChange);
    },
  };
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}
