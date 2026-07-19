export type ReaderViewportSnapshot = {
  content: string | null;
  created: boolean;
  meta: HTMLMetaElement;
  scale: number;
  scrollX: number;
  scrollY: number;
};

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
  lockScroll: lockPageScroll,
  prepareFullscreen: pageViewportForFullscreen,
  restore: restorePageViewport,
};

export type ReaderViewport = typeof readerViewport;

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
