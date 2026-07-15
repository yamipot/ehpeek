const REQUEST_TIMEOUT_MS = 30000;

export function debugLog(message: string, detail?: unknown): void {
  if (!__EHPEEK_DEBUG__) {
    return;
  }

  if (detail === undefined) {
    console.debug("[ehpeek]", message);
  } else {
    console.debug("[ehpeek]", message, detail);
  }
}

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

export async function requestText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    window.clearTimeout(timeout);
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
  const styleId = `style-${id}`;

  if (document.getElementById(styleId)) {
    return;
  }

  const style = document.createElement("style");
  style.id = styleId;
  style.textContent = css;
  document.head.append(style);
}

export function targetSummary(target: EventTarget | null): string {
  if (!(target instanceof Element)) {
    return String(target);
  }

  const id = target.id ? `#${target.id}` : "";
  const className = typeof target.className === "string" && target.className ? `.${target.className.replace(/\s+/g, ".")}` : "";

  return `${target.tagName.toLowerCase()}${id}${className}`;
}
