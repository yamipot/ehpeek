import unoCss from "ehpeek:uno.css";

const STYLE_ID = "ehpeek-uno-style";

export function installUnoStyle(): void {
  if (!unoCss || document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = unoCss;
  document.head.append(style);
}
