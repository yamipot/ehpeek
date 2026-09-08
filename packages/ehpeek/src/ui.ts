import { applyUiScale as applyRootUiScale, uiScaleDeclarations, uiScaleFactor, UI_SCALE_NAMES, type UiScale } from "@ehpeek/reader/ui";
export { UI_SCALE_NAMES, type UiScale, type UiSizeScale } from "@ehpeek/reader/ui";

export type UiPointer = "mouse" | "touch";
export type UiSite = "e-hentai" | "exhentai";

const UI_ROOT_CLASS = "ehpeek-ui-root";
const UI_STATE_STYLE_ID = "ehpeek-ui-state";
const UI_SCALE_SELECTOR =
  ".ehpeek-ui-root, body.ehpeek-touch-gallery-page, .ehpeek-external-autocomplete";

let uiState: { pointer: UiPointer; site: UiSite } | undefined;

export function configureUi(options: {
  pointer: UiPointer;
  site: UiSite;
}): void {
  uiState = { ...options };
  applyUiStateClasses();
}

export function markUiRoot(root: HTMLElement): void {
  if (root.parentElement?.closest(`.${UI_ROOT_CLASS}`)) {
    return;
  }
  root.classList.add(UI_ROOT_CLASS);
}

export function setUiPointer(pointer: UiPointer): void {
  const state = requireUiState();
  state.pointer = pointer;
  applyUiStateClasses();
}

export function nextUiScale(scale: UiScale): UiScale {
  const index = UI_SCALE_NAMES.indexOf(scale);
  return UI_SCALE_NAMES[(index + 1) % UI_SCALE_NAMES.length]!;
}

export function uiScaleLevel(scale: UiScale): number {
  return UI_SCALE_NAMES.indexOf(scale) + 1;
}

export function applyUiScale(
  scale: UiScale,
  root?: HTMLElement,
  pixelFactor = 1,
): void {
  const factor = uiScaleFactor(scale) * pixelFactor;

  if (!root) {
    applyGlobalUiScale(factor);
    return;
  }
  applyRootUiScale(scale, root, pixelFactor);
}

function applyGlobalUiScale(factor: number): void {
  const style = uiStateStyle();
  const declarations = uiScaleDeclarations(factor)
    .map(([property, value]) => `${property}:${value}`)
    .join(";");
  style.textContent = `${UI_SCALE_SELECTOR}{${declarations}}`;
}

function applyUiStateClasses(): void {
  const state = requireUiState();
  const style = uiStateStyle();
  style.classList.toggle("ehpeek-pointer-mouse", state.pointer === "mouse");
  style.classList.toggle("ehpeek-site-e-hentai", state.site === "e-hentai");
  style.classList.toggle("ehpeek-site-exhentai", state.site === "exhentai");
}

function uiStateStyle(): HTMLStyleElement {
  let style = document.getElementById(UI_STATE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = UI_STATE_STYLE_ID;
    (document.head ?? document.documentElement).append(style);
  }
  return style;
}

function requireUiState(): { pointer: UiPointer; site: UiSite } {
  if (!uiState) {
    throw new Error("UI must be configured before it is initialized.");
  }
  return uiState;
}
