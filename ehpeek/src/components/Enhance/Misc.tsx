import { h } from "../../jsx";

export type ReadButtonInfo = {
  label: string;
  detail: string;
};

export function createGalleryReadButton(info: ReadButtonInfo, onClick: () => void): HTMLButtonElement {
  return readButtonDom(
    info,
    "ehpeek-continue-reading block box-border w-full max-w-full mt-4px control-compact color-btn shadow-none cursor-pointer text-center font-sans textsize-sm font-700 leading-[1.15]",
    "ehpeek-continue-reading-page block mt-1px opacity-72 textsize-xs font-600",
    onClick,
  );
}

export function createTouchGalleryReadButton(info: ReadButtonInfo, onClick: () => void): HTMLButtonElement {
  return readButtonDom(
    info,
    "ehpeek-continue-reading ehpeek-touch-gallery-primary-button control-primary-action textsize-lg font-700",
    "ehpeek-continue-reading-page block mt-2px color-accent textsize-sm font-600 opacity-78 normal-case",
    onClick,
  );
}

export function removeGalleryReadButton(): void {
  document.querySelector(".ehpeek-continue-reading")?.remove();
}

export class SwipeIndicator {
  readonly element: HTMLDivElement;

  constructor() {
    this.element = (
      <div
        className="ehpeek-swipe-indicator fixed top-1/2 z-[2147483645] hidden w-42px h-108px items-center justify-center border color-search-swipe rounded-22px text-52px font-sans font-300 leading-1 pointer-events-none select-none transition-opacity duration-120 ease-in-out"
        aria-hidden="true"
      />
    ) as HTMLDivElement;
    this.element.style.setProperty("--ehpeek-swipe-pull", "0px");
    this.element.style.backdropFilter = "blur(8px)";
  }

  show(direction: "left" | "right", progress: number): void {
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const pull = Math.round(48 * clampedProgress);

    this.element.hidden = false;
    this.element.style.display = "flex";
    this.element.textContent = direction === "left" ? "‹" : "›";
    this.element.style.left = direction === "right" ? "6px" : "";
    this.element.style.right = direction === "left" ? "6px" : "";
    this.element.style.opacity = String(0.35 + clampedProgress * 0.65);
    this.element.style.setProperty("--ehpeek-swipe-pull", `${pull}px`);
    this.element.style.transform =
      direction === "left"
        ? "translate(calc(42px - var(--ehpeek-swipe-pull)), -50%)"
        : "translate(calc(-42px + var(--ehpeek-swipe-pull)), -50%)";
  }

  hide(): void {
    this.element.hidden = true;
    this.element.style.display = "none";
    this.element.style.opacity = "";
    this.element.style.left = "";
    this.element.style.right = "";
    this.element.style.transform = "";
    this.element.style.setProperty("--ehpeek-swipe-pull", "0px");
  }
}

function readButtonDom(
  info: ReadButtonInfo,
  buttonClassName: string,
  detailClassName: string,
  onClick: () => void,
): HTMLButtonElement {
  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        onClick();
      }}
    >
      {info.label}
      <span className={detailClassName}>{info.detail}</span>
    </button>
  ) as HTMLButtonElement;
}
