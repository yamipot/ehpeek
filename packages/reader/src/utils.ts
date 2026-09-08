export function clamp(value: number, min: number, max: number): number {
  if (max < min) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

export function normalizeUrl(url: string, baseUrl = window.location.href): string {
  try {
    return new URL(url, baseUrl).href;
  } catch {
    return "";
  }
}

export function normalizedAspectRatio(value: number | null | undefined, fallback: number): number {
  return value && Number.isFinite(value) && value > 0 ? value : fallback;
}

export function positiveNumber(value: number | null | undefined): number | null {
  return value && Number.isFinite(value) && value > 0 ? value : null;
}

export function stopEvent(event: Event): void {
  event.stopPropagation();
}

export function registerGlobalStyle(id: string, css: string): void {
  if (!css || document.getElementById(id)) {
    return;
  }

  const style = document.createElement("style");
  style.id = id;
  style.textContent = css;
  // document-start can run before the parser creates <head>.
  (document.head ?? document.documentElement).append(style);
}

export function targetSummary(target: EventTarget | null): string {
  if (!(target instanceof Element)) {
    return String(target);
  }

  const id = target.id ? `#${target.id}` : "";
  const className = typeof target.className === "string" && target.className ? `.${target.className.replace(/\s+/g, ".")}` : "";

  return `${target.tagName.toLowerCase()}${id}${className}`;
}
