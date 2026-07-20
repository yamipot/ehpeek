export type ReaderViewportSnapshot = {
  content: string | null;
  created: boolean;
  meta: HTMLMetaElement;
  scale: number;
  scrollX: number;
  scrollY: number;
};

const FULLSCREEN_UI_SCALE_PROPERTY = "--ehpeek-reader-fullscreen-ui-scale";
const FULLSCREEN_PROGRESS_SIZE_PROPERTY = "--ehpeek-reader-fullscreen-progress-size";

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

/** Captures and normalizes the page viewport before Reader enters fullscreen. */
function pageViewportForFullscreen(): ReaderViewportSnapshot {
  const existing = document.querySelector<HTMLMetaElement>(
    'meta[name="viewport"]',
  );
  const meta = existing ?? document.createElement("meta");
  const scale = Math.max(0.1, window.visualViewport?.scale ?? 1);
  const snapshot: ReaderViewportSnapshot = {
    content: existing?.getAttribute("content") ?? null,
    created: !existing,
    meta,
    scale,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  };

  if (!existing) {
    meta.name = "viewport";
    document.head.append(meta);
  }

  meta.content = lockedViewportContent(snapshot.content, scale);
  return snapshot;
}

/** Restores the page viewport after Reader leaves fullscreen. */
async function restorePageViewport(
  snapshot: ReaderViewportSnapshot,
): Promise<void> {
  await nextAnimationFrame();

  if (snapshot.created) {
    snapshot.meta.remove();
  } else if (snapshot.content === null) {
    snapshot.meta.removeAttribute("content");
  } else {
    snapshot.meta.content = snapshot.content;
  }

  await nextAnimationFrame();
  await nextAnimationFrame();
  window.scrollTo(snapshot.scrollX, snapshot.scrollY);
}

export const readerViewport = {
  createFullscreen: createReaderFullscreen,
  lockScroll: lockPageScroll,
  prepareFullscreen: pageViewportForFullscreen,
  restore: restorePageViewport,
};

export type ReaderViewport = typeof readerViewport;

function createReaderFullscreen(
  target: HTMLElement,
  initialSnapshot: ReaderViewportSnapshot | null = null,
) {
  let snapshot = initialSnapshot;
  let restorePromise: Promise<void> | null = null;

  const restore = async (): Promise<void> => {
    target.style.removeProperty(FULLSCREEN_UI_SCALE_PROPERTY);
    target.style.removeProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY);
    if (!snapshot) {
      return;
    }

    restorePromise ??= restorePageViewport(snapshot).finally(() => {
      restorePromise = null;
    });
    await restorePromise;
  };

  return {
    active: () => document.fullscreenElement === target,
    enter: async (): Promise<void> => {
      if (document.fullscreenElement || !document.fullscreenEnabled) {
        return;
      }
      snapshot = pageViewportForFullscreen();
      const scaleBefore = window.visualViewport?.scale ?? 1;
      try {
        await target.requestFullscreen();
        await nextAnimationFrame();
        const scaleAfter = window.visualViewport?.scale ?? 1;
        const uiScale = Math.min(1, Math.max(0.25, scaleBefore / Math.max(scaleAfter, 0.01)));
        const progressSize = Number.parseFloat(getComputedStyle(target).getPropertyValue("--font-size-lg")) || 24;
        target.style.setProperty(FULLSCREEN_UI_SCALE_PROPERTY, String(uiScale));
        target.style.setProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY, `${progressSize * uiScale}px`);
      } catch (error) {
        await restore();
        throw error;
      }
    },
    exit: async (): Promise<void> => {
      if (document.fullscreenElement === target) {
        await document.exitFullscreen();
      }
      if (snapshot) {
        await waitForViewportSettled();
      }
      target.style.removeProperty(FULLSCREEN_UI_SCALE_PROPERTY);
      target.style.removeProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY);
    },
    restore,
    subscribe: (callback: (active: boolean) => void): (() => void) => {
      const onChange = () => {
        const active = document.fullscreenElement === target;
        if (!active) {
          target.style.removeProperty(FULLSCREEN_UI_SCALE_PROPERTY);
          target.style.removeProperty(FULLSCREEN_PROGRESS_SIZE_PROPERTY);
        }
        callback(active);
      };
      document.addEventListener("fullscreenchange", onChange);
      return () => document.removeEventListener("fullscreenchange", onChange);
    },
  };
}

function lockedViewportContent(content: string | null, scale: number): string {
  const preserved = (content ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(
      (item) =>
        item &&
        !/^(?:initial-scale|minimum-scale|maximum-scale|user-scalable|viewport-fit)\s*=/i.test(item),
    );
  const value = String(Math.round(scale * 1000) / 1000);
  return [
    ...preserved,
    `initial-scale=${value}`,
    `minimum-scale=${value}`,
    `maximum-scale=${value}`,
    "user-scalable=no",
    "viewport-fit=cover",
  ].join(", ");
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForViewportSettled(): Promise<void> {
  await nextAnimationFrame();

  await new Promise<void>((resolve) => {
    const viewport = window.visualViewport;
    let quietTimer = window.setTimeout(finish, 80);
    const timeoutTimer = window.setTimeout(finish, 500);
    const onResize = () => {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, 80);
    };

    function finish(): void {
      viewport?.removeEventListener("resize", onResize);
      window.clearTimeout(quietTimer);
      window.clearTimeout(timeoutTimer);
      resolve();
    }

    viewport?.addEventListener("resize", onResize);
  });

  await nextAnimationFrame();
}
