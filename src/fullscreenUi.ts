const FULLSCREEN_SCALE_PROPERTY = "--ehpeek-fullscreen-scale";
const UI_TOKEN_PROPERTY = /^--ui-/;

/** Keeps component-owned fullscreen UI in visual viewport coordinates. */
export function observeFullscreenUiSizing(target: HTMLElement): () => void {
  const applied = new Set<string>();
  let fullscreenObserver: MutationObserver | null = null;
  let frame: number | null = null;

  const sync = () => {
    for (const property of applied) {
      target.style.removeProperty(property);
    }
    applied.clear();

    const fullscreenElement = document.fullscreenElement;
    if (!(fullscreenElement instanceof HTMLElement)) {
      return;
    }

    const factor = Number.parseFloat(
      fullscreenElement.style.getPropertyValue(FULLSCREEN_SCALE_PROPERTY),
    );
    if (!Number.isFinite(factor) || factor >= 1) {
      return;
    }

    const source = document.documentElement.style;
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

      target.style.setProperty(property, `${Number(match[1]) * factor}px`);
      applied.add(property);
    }
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
    for (const property of applied) {
      target.style.removeProperty(property);
    }
  };
}
