import { h } from "preact";
export { ExternalDomNode as DomNode, ExternalDomNodes as DomNodes } from "../ExternalDom";

export type ReadButtonInfo = {
  label: string;
  detail: string;
};

export function ReadButton(props: {
  info: ReadButtonInfo;
  onClick: () => void;
  variant: "gallery" | "touchGallery";
}) {
  const buttonClassName =
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button control-primary-action textsize-lg font-700"
      : "ehpeek-continue-reading block box-border w-full max-w-full mt-4px control-compact color-btn shadow-none cursor-pointer text-center font-sans textsize-sm font-700 leading-[1.15]";
  const detailClassName =
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading-page block mt-2px color-accent textsize-sm font-600 opacity-78 normal-case"
      : "ehpeek-continue-reading-page block mt-1px opacity-72 textsize-xs font-600";

  return (
    <button
      type="button"
      className={buttonClassName}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.info.label}
      <span className={detailClassName}>{props.info.detail}</span>
    </button>
  );
}

export type SwipeDirection = "left" | "right";

export type SwipeIndicatorState = {
  blocked?: boolean;
  direction: SwipeDirection;
  progress: number;
};

export type SwipeIndicatorHandle = {
  hide: (direction: SwipeDirection) => void;
  update: (state: SwipeIndicatorState) => void;
};

const SWIPE_INDICATOR_HIDE_PROGRESS = 0.001;

export function SwipeIndicator(props: { handleRef: (handle: SwipeIndicatorHandle | null) => void }) {
  const handleFor = (element: HTMLDivElement): SwipeIndicatorHandle => ({
    hide: (direction) => {
      updateSwipeIndicatorElement(element, { direction, progress: 0 });
    },
    update: (state) => {
      updateSwipeIndicatorElement(element, state);
    },
  });

  return (
    <div
      ref={(element: HTMLDivElement | null) => {
        props.handleRef(element ? handleFor(element) : null);
      }}
      className="ehpeek-swipe-indicator fixed top-1/2 z-[2147483645] flex w-42px h-108px items-center justify-center border color-search-swipe rounded-22px text-52px font-sans font-300 leading-1 pointer-events-none select-none transition-opacity duration-120 ease-in-out"
      aria-hidden="true"
      style={{
        backdropFilter: "blur(8px)",
        display: "none",
        opacity: "0",
        transform: "translate(42px, -50%)",
      }}
    />
  );
}

function updateSwipeIndicatorElement(element: HTMLDivElement, state: SwipeIndicatorState): void {
  const clampedProgress = Math.min(1, Math.max(0, state.progress));
  const pull = Math.round(48 * clampedProgress);
  const hidden = clampedProgress <= SWIPE_INDICATOR_HIDE_PROGRESS;
  const offset = state.direction === "left" ? 42 - pull : pull - 42;
  const blocked = state.blocked === true;

  element.setAttribute("aria-hidden", hidden ? "true" : "false");
  element.textContent = blocked ? "×" : state.direction === "left" ? "‹" : "›";
  element.style.display = hidden ? "none" : "flex";
  element.style.left = state.direction === "right" ? "6px" : "";
  element.style.opacity = String(0.35 + clampedProgress * 0.65);
  element.style.right = state.direction === "left" ? "6px" : "";
  element.style.transform = `translate(${offset}px, -50%)`;
  element.style.width = "";
}
