// Remembers the search page's scroll position across a full navigation to a
// gallery and back.
//
// On Android, Chrome keeps the whole search page in its back/forward cache and
// restores it (scroll included) on Back, so nothing here is needed. iOS Safari
// usually evicts these heavy image grids and reloads the search page fresh; and
// because enhanced pagination sets `history.scrollRestoration` to "manual", the
// browser no longer restores scroll on that reload either.
//
// The position is saved on `pagehide` (and on the tab becoming hidden) rather
// than on a gallery-link click: those events fire reliably whenever the page is
// actually left — including a tap that immediately navigates away — while a
// click handler can be missed if the grid was reflowed or the event was
// consumed elsewhere. On return we re-apply the saved position, retrying across
// frames until the page has grown tall enough (its thumbnails have loaded) to
// actually reach it, since an early scroll would otherwise be clamped short.

const STORAGE_KEY = "ehpeek:search-scroll";
const MAX_RESTORE_FRAMES = 60;

type SavedScroll = { url: string; y: number };

function currentScrollY(): number {
  return (
    window.scrollY ||
    document.documentElement.scrollTop ||
    document.body.scrollTop ||
    0
  );
}

function readSaved(): SavedScroll | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<SavedScroll>;
    if (typeof parsed.url === "string" && typeof parsed.y === "number") {
      return { url: parsed.url, y: parsed.y };
    }
  } catch {
    // sessionStorage unavailable or a corrupt value; treat as nothing saved.
  }
  return null;
}

function writeSaved(): void {
  try {
    const value: SavedScroll = { url: window.location.href, y: currentScrollY() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Best-effort; a blocked sessionStorage just means no scroll memory.
  }
}

function clearSaved(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore; a duplicate restore is harmless.
  }
}

function restore(): void {
  const saved = readSaved();
  if (!saved || saved.url !== window.location.href || saved.y <= 0) {
    return;
  }

  let frames = 0;
  let aborted = false;
  const abort = () => {
    aborted = true;
  };
  // If the reader starts interacting, stop fighting them.
  const abortEvents = ["wheel", "touchmove", "keydown", "pointerdown"] as const;
  for (const type of abortEvents) {
    window.addEventListener(type, abort, { once: true, passive: true });
  }
  const cleanupAbort = () => {
    for (const type of abortEvents) {
      window.removeEventListener(type, abort);
    }
  };

  const tick = () => {
    if (aborted) {
      cleanupAbort();
      return;
    }
    window.scrollTo(0, saved.y);
    frames += 1;
    // Keep retrying until we can actually reach the saved offset (the grid has
    // grown tall enough) or we run out of patience.
    if (currentScrollY() < saved.y - 2 && frames < MAX_RESTORE_FRAMES) {
      requestAnimationFrame(tick);
      return;
    }
    clearSaved();
    cleanupAbort();
  };
  requestAnimationFrame(tick);
}

/**
 * Starts remembering and restoring the search page's scroll position. Safe to
 * call once per search page load; returns a disposer that detaches listeners.
 */
export function installSearchScrollMemory(): () => void {
  restore();

  const onHide = () => writeSaved();
  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      writeSaved();
    }
  };
  const onPageShow = () => restore();

  window.addEventListener("pagehide", onHide);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pageshow", onPageShow);

  return () => {
    window.removeEventListener("pagehide", onHide);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pageshow", onPageShow);
  };
}
