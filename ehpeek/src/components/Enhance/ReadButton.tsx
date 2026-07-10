import { h } from "../../jsx";
import * as eh from "../../eh";
import readButtonCss from "./ReadButton.css";

const STYLE_ID = "ehpeek-continue-reading-style";

type ReadButtonInfo = {
  label: string;
  detail: string;
};

export function installReadButton(
  info: ReadButtonInfo,
  onClick: () => void,
  mountMobileButton?: (button: HTMLButtonElement) => boolean,
): void {
  document.querySelector(".ehpeek-continue-reading")?.remove();
  ensureReadButtonStyle();

  const button = (
    <button
      type="button"
      className="ehpeek-continue-reading block box-border w-full max-w-full mt-4px py-4px px-8px border rounded-4px color-panel-reader shadow-none cursor-pointer text-center font-sans textsize-sm font-700 leading-[1.15]"
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      {info.label}
      <span className="ehpeek-continue-reading-page block mt-1px opacity-72 textsize-xs font-600">{info.detail}</span>
    </button>
  ) as HTMLButtonElement;

  if (mountMobileButton?.(button)) {
    return;
  }

  eh.mountGalleryContinueReadingButton(button);
}

export function uninstallReadButton(): void {
  document.querySelector(".ehpeek-continue-reading")?.remove();
}

function ensureReadButtonStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = readButtonCss;
  document.head.append(style);
}
