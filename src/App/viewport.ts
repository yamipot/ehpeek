type FullscreenSnapshot = {
  scale: number;
  scrollX: number;
  scrollY: number;
  viewport: {
    content: string | null;
    element: HTMLMetaElement;
  } | null;
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
  const viewport = document.querySelector<HTMLMetaElement>(
    'meta[name="viewport"]',
  );
  return {
    scale: Math.max(0.01, window.visualViewport?.scale ?? 1),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    viewport: viewport
      ? {
        content: viewport.getAttribute("content"),
        element: viewport,
      }
      : null,
  };
}

/** Restores the original page position after leaving fullscreen. */
async function restorePageViewport(
  snapshot: FullscreenSnapshot | null,
): Promise<void> {
  const currentViewport = document.querySelector<HTMLMetaElement>(
    'meta[name="viewport"]',
  );
  const viewport = snapshot?.viewport ??
    (currentViewport
      ? {
        content: currentViewport.getAttribute("content"),
        element: currentViewport,
      }
      : null);
  if (viewport?.element.isConnected) {
    viewport.element.removeAttribute("content");
    if (viewport.content !== null) {
      viewport.element.setAttribute("content", viewport.content);
    }
  }
  await nextAnimationFrame();
  await nextAnimationFrame();
  if (snapshot) {
    window.scrollTo(snapshot.scrollX, snapshot.scrollY);
  }
}

export const readerViewport = {
  createFullscreen: createReaderFullscreen,
  lockScroll: lockPageScroll,
};

export type ReaderViewport = typeof readerViewport;

function createReaderFullscreen(target: HTMLElement) {
  let snapshot: FullscreenSnapshot | null = null;
  let restorePromise: Promise<void> | null = null;
  let restoreViewport = false;
  const active = () => {
    const fullscreenElement = document.fullscreenElement;
    return fullscreenElement === target ||
      (fullscreenElement instanceof HTMLElement &&
        fullscreenElement.contains(target));
  };

  const restore = (): Promise<void> => {
    if (restorePromise) {
      return restorePromise;
    }
    target.style.removeProperty(FULLSCREEN_SCALE_PROPERTY);
    target.style.removeProperty(FULLSCREEN_SCALE_INVERSE_PROPERTY);
    const captured = snapshot;
    snapshot = null;
    if (!captured && !restoreViewport) {
      return Promise.resolve();
    }
    restoreViewport = false;
    restorePromise = restorePageViewport(captured).finally(() => {
      restorePromise = null;
    });
    return restorePromise;
  };

  return {
    active,
    enter: async (): Promise<void> => {
      if (document.fullscreenElement || !document.fullscreenEnabled) {
        return;
      }
      snapshot = captureFullscreenSnapshot();
      restoreViewport = true;
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
        restoreViewport = true;
        await document.exitFullscreen();
        await restore();
      }
      target.style.removeProperty(FULLSCREEN_SCALE_PROPERTY);
      target.style.removeProperty(FULLSCREEN_SCALE_INVERSE_PROPERTY);
    },
    restore,
    subscribe: (callback: (active: boolean) => void): (() => void) => {
      let previousActive = active();
      const onChange = () => {
        const fullscreenActive = active();
        if (previousActive && !fullscreenActive) {
          restoreViewport = true;
          void restore();
        }
        previousActive = fullscreenActive;
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
