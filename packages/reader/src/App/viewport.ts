type FullscreenSnapshot = {
  content: string | null;
  created: boolean;
  meta: HTMLMetaElement;
  scale: number;
  scrollX: number;
  scrollY: number;
};

export type FullscreenController = ReturnType<typeof createFullscreenController>;

const themeLocks: Array<{ color: string }> = [];
let themeMeta: HTMLMetaElement | null = null;
let restoreTheme: (() => void) | null = null;

/** Overlapping surfaces restore the original theme only after the last owner releases it. */
export function lockPageThemeColor(color: string): () => void {
  if (themeLocks.length === 0) {
    const existing = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const meta = existing ?? document.createElement("meta");
    const previous = existing?.getAttribute("content") ?? null;
    if (!existing) { meta.name = "theme-color"; document.head.append(meta); }
    themeMeta = meta;
    restoreTheme = () => {
      if (!existing) meta.remove();
      else if (previous === null) meta.removeAttribute("content");
      else meta.content = previous;
    };
  }
  const entry = { color };
  themeLocks.push(entry);
  themeMeta!.content = color;
  return () => {
    const index = themeLocks.indexOf(entry);
    if (index < 0) return;
    themeLocks.splice(index, 1);
    const active = themeLocks[themeLocks.length - 1];
    if (active) themeMeta!.content = active.color;
    else {
      restoreTheme?.();
      themeMeta = null;
      restoreTheme = null;
    }
  };
}

let scrollLockCount = 0;
let restoreScroll: (() => void) | null = null;

/** Multiple surfaces share the document lock and may close in any order. */
export function lockPageScroll(): () => void {
  if (scrollLockCount++ === 0) {
    const roots = [document.documentElement, document.body];
    const previous = roots.map(root => ({
      value: root.style.getPropertyValue("overflow"),
      priority: root.style.getPropertyPriority("overflow"),
    }));
    for (const root of roots) root.style.setProperty("overflow", "hidden", "important");
    restoreScroll = () => roots.forEach((root, index) => {
      const style = previous[index]!;
      if (style.value) root.style.setProperty("overflow", style.value, style.priority);
      else root.style.removeProperty("overflow");
    });
  }
  let released = false;
  return () => {
    if (released) return;
    released = true;
    if (--scrollLockCount === 0) {
      restoreScroll?.();
      restoreScroll = null;
    }
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

export function createFullscreenController(
  target: HTMLElement,
  onScaleChange: (factor: number) => void = () => undefined,
) {
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
    onScaleChange(1);
    const captured = snapshot;
    snapshot = null;
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
        onScaleChange(scale);
      } catch (error) {
        await restore();
        throw error;
      }
    },
    exit: async (): Promise<void> => {
      if (active()) {
        await document.exitFullscreen();
      }
      await restore();
      onScaleChange(1);
    },
    restore,
    subscribe: (callback: (active: boolean) => void): (() => void) => {
      const onChange = () => {
        const fullscreenActive = active();
        if (!fullscreenActive) {
          onScaleChange(1);
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
