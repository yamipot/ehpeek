export type UiPointer = "mouse" | "touch";
export type UiSite = "e-hentai" | "exhentai";

const UI_ROOT_CLASS = "ehpeek-ui-root";
const UI_STATE_STYLE_ID = "ehpeek-ui-state";

let uiRootState: { pointer: UiPointer; site: UiSite } | undefined;

export function configureUiRoots(options: {
  pointer: UiPointer;
  site: UiSite;
}): void {
  uiRootState = { ...options };
  applyUiStateClasses();
}

export function markUiRoot(root: HTMLElement): void {
  if (root.parentElement?.closest(`.${UI_ROOT_CLASS}`)) {
    return;
  }
  root.classList.add(UI_ROOT_CLASS);
}

export function setUiPointer(pointer: UiPointer): void {
  const state = requireUiRootState();
  state.pointer = pointer;
  applyUiStateClasses();
}

export function uiStateStyle(): HTMLStyleElement {
  let style = document.getElementById(UI_STATE_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = UI_STATE_STYLE_ID;
    (document.head ?? document.documentElement).append(style);
  }
  return style;
}

function applyUiStateClasses(): void {
  const state = requireUiRootState();
  const style = uiStateStyle();
  style.classList.toggle("ehpeek-pointer-mouse", state.pointer === "mouse");
  style.classList.toggle("ehpeek-site-e-hentai", state.site === "e-hentai");
  style.classList.toggle("ehpeek-site-exhentai", state.site === "exhentai");
}

function requireUiRootState(): { pointer: UiPointer; site: UiSite } {
  if (!uiRootState) {
    throw new Error("UI roots must be configured before they are initialized.");
  }
  return uiRootState;
}
