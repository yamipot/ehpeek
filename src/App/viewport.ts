type FullscreenSnapshot = {
  content: string | null;
  created: boolean;
  meta: HTMLMetaElement;
  scale: number;
  scrollX: number;
  scrollY: number;
};

const FULLSCREEN_SCALE_PROPERTY = "--ehpeek-fullscreen-scale";
const FULLSCREEN_SCALE_INVERSE_PROPERTY = "--ehpeek-fullscreen-scale-inverse";
const FULLSCREEN_UI_ATTRIBUTE = "data-ehpeek-fullscreen-ui";
const FULLSCREEN_UI_TOKEN_PREFIX = "--ehpeek-fullscreen-";
const UI_TOKEN_PROPERTY = /^--ui-/;

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

/** Locks the current page scale before fullscreen changes the visual viewport. */
function prepareFullscreenSnapshot(): FullscreenSnapshot {
  const existing = document.querySelector<HTMLMetaElement>(
    'meta[name="viewport"]',
  );
  const meta = existing ?? document.createElement("meta");
  const scale = Math.max(0.1, window.visualViewport?.scale ?? 1);
  const snapshot = {
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

/** Restores the original page position after leaving fullscreen. */
async function restorePageViewport(
  snapshot: FullscreenSnapshot,
): Promise<void> {
  await nextAnimationFrame();
  restoreViewportMeta(snapshot);
  await nextAnimationFrame();

  // Some mobile WebViews leave the visual viewport at fullscreen scale unless
  // the pre-fullscreen scale is submitted again after fullscreen has ended.
  if (!snapshot.meta.isConnected) {
    snapshot.meta.name = "viewport";
    document.head.append(snapshot.meta);
  }
  snapshot.meta.content = lockedViewportContent(snapshot.content, snapshot.scale);
  await waitForViewportSettled();
  restoreViewportMeta(snapshot);
  await nextAnimationFrame();
  await nextAnimationFrame();
  window.scrollTo(snapshot.scrollX, snapshot.scrollY);
}

function restoreViewportMeta(snapshot: FullscreenSnapshot): void {
  if (snapshot.created) {
    snapshot.meta.remove();
  } else if (snapshot.content === null) {
    snapshot.meta.removeAttribute("content");
  } else {
    snapshot.meta.content = snapshot.content;
  }
}

export const readerViewport = {
  createFullscreen: createReaderFullscreen,
  lockScroll: lockPageScroll,
};

export type ReaderViewport = typeof readerViewport;

export function fullscreenUiScale(): number {
  const fullscreenElement = document.fullscreenElement;
  if (!(fullscreenElement instanceof HTMLElement)) {
    return 1;
  }
  const factor = Number.parseFloat(
    fullscreenElement.style.getPropertyValue(FULLSCREEN_SCALE_PROPERTY),
  );
  return Number.isFinite(factor) && factor > 0 && factor < 1 ? factor : 1;
}

/** Publishes fullscreen-adjusted UI tokens once for every descendant overlay. */
export function observeFullscreenUiSizing(): () => void {
  let target: HTMLElement | null = null;
  let applied = new Set<string>();
  let fullscreenObserver: MutationObserver | null = null;
  let frame: number | null = null;

  const clear = () => {
    if (!target) {
      return;
    }
    target.removeAttribute(FULLSCREEN_UI_ATTRIBUTE);
    for (const property of applied) {
      target.style.removeProperty(property);
    }
    target = null;
    applied = new Set();
  };

  const sync = () => {
    const fullscreenElement = document.fullscreenElement;
    if (!(fullscreenElement instanceof HTMLElement)) {
      clear();
      return;
    }
    if (target !== fullscreenElement) {
      clear();
      target = fullscreenElement;
    }

    const factor = fullscreenUiScale();
    const source = document.documentElement.style;
    const next = new Set<string>();
    for (let index = 0; index < source.length; index += 1) {
      const property = source.item(index);
      if (!UI_TOKEN_PROPERTY.test(property)) {
        continue;
      }

      const value = source.getPropertyValue(property).trim();
      const match = /^([\d.]+)px$/.exec(value);
      if (!match) {
        continue;
      }

      const fullscreenProperty = `${FULLSCREEN_UI_TOKEN_PREFIX}${property.slice(2)}`;
      const scaledValue = `${Number(match[1]) * factor}px`;
      if (target.style.getPropertyValue(fullscreenProperty) !== scaledValue) {
        target.style.setProperty(fullscreenProperty, scaledValue);
      }
      next.add(fullscreenProperty);
    }

    for (const property of applied) {
      if (!next.has(property)) {
        target.style.removeProperty(property);
      }
    }
    target.setAttribute(FULLSCREEN_UI_ATTRIBUTE, "");
    applied = next;
  };

  const scheduleSync = () => {
    if (frame !== null) {
      return;
    }
    frame = window.requestAnimationFrame(() => {
      frame = null;
      sync();
    });
  };

  const observeFullscreenElement = () => {
    fullscreenObserver?.disconnect();
    fullscreenObserver = null;
    const fullscreenElement = document.fullscreenElement;
    if (fullscreenElement instanceof HTMLElement) {
      fullscreenObserver = new MutationObserver(scheduleSync);
      fullscreenObserver.observe(fullscreenElement, {
        attributeFilter: ["style"],
        attributes: true,
      });
    }
    scheduleSync();
  };

  const rootObserver = new MutationObserver(scheduleSync);
  rootObserver.observe(document.documentElement, {
    attributeFilter: ["style"],
    attributes: true,
  });
  document.addEventListener("fullscreenchange", observeFullscreenElement);
  observeFullscreenElement();

  return () => {
    document.removeEventListener("fullscreenchange", observeFullscreenElement);
    rootObserver.disconnect();
    fullscreenObserver?.disconnect();
    if (frame !== null) {
      window.cancelAnimationFrame(frame);
    }
    clear();
  };
}

function createReaderFullscreen(target: HTMLElement) {
  let snapshot: FullscreenSnapshot | null = null;
  let restorePromise: Promise<void> | null = null;
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
    if (!captured) {
      return Promise.resolve();
    }
    restorePromise = waitForViewportSettled()
      .then(() => restorePageViewport(captured))
      .finally(() => {
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
      await restorePromise;
      snapshot = prepareFullscreenSnapshot();
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
        await restore();
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
          void restore();
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
