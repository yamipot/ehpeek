import type { JSX } from "solid-js";

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

// A dynamic class assignment can erase Solid's separately applied classList.
// Resolve both together so changes to either preserve the caller's toggles.
export function widgetClass(
  base: string,
  props: Pick<JSX.HTMLAttributes<HTMLElement>, "class" | "classList">,
): string {
  const toggles = Object.entries(props.classList ?? {})
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  return [base, props.class ?? "", ...toggles].join(" ");
}

export function listenForOutsidePress(options: {
  document: Document;
  contains: (target: Node) => boolean;
  event: "click" | "pointerdown";
  onOutsidePress: (event: MouseEvent | PointerEvent) => void;
}): () => void {
  const listener = (event: MouseEvent | PointerEvent) => {
    if (event.target instanceof Node && options.contains(event.target)) {
      return;
    }
    options.onOutsidePress(event);
  };
  options.document.addEventListener(options.event, listener);
  return () => options.document.removeEventListener(options.event, listener);
}
