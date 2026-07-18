import { createMemo } from "solid-js";
import { Icon, type IconName } from "../Icon";
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
      ? "ehpeek-continue-reading ehpeek-touch-gallery-primary-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-xl font-700"
      : "ehpeek-continue-reading block box-border w-full max-w-full mt-xs min-h-sm py-xs px-sm rounded-sm border ehp-color-site-border bg-transparent ehp-color-site-accent hover:bg-[var(--color-site-accent-hover)] shadow-none cursor-pointer text-center font-sans textsize-md font-700 leading-[1.15]";
  const detailClassName =
    props.variant === "touchGallery"
      ? "ehpeek-continue-reading-page block mt-2px ehp-color-site-accent textsize-md font-600 opacity-78 normal-case"
      : "ehpeek-continue-reading-page block mt-1px opacity-72 textsize-sm font-600";

  return (
    <button
      type="button"
      class={buttonClassName}
      onClick={(event: MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        props.onClick();
      }}
    >
      {props.info.label}
      <span class={detailClassName}>{props.info.detail}</span>
    </button>
  );
}

export type SwipeDirection = "left" | "right";

export type SwipeIndicatorState = {
  blocked?: boolean;
  direction: SwipeDirection;
  progress: number;
};

const SWIPE_INDICATOR_HIDE_PROGRESS = 0.001;

export function SwipeIndicator(props: { state: SwipeIndicatorState }) {
  const progress = createMemo(() => Math.min(1, Math.max(0, props.state.progress)));
  const hidden = createMemo(() => progress() <= SWIPE_INDICATOR_HIDE_PROGRESS);
  const pull = createMemo(() => Math.round(48 * progress()));
  const offset = createMemo(() => props.state.direction === "left" ? 42 - pull() : pull() - 42);
  const iconName = createMemo<IconName>(() =>
    props.state.blocked ? "close" : props.state.direction === "left" ? "chevron-left" : "chevron-right"
  );

  return (
    <div
      class="ehpeek-swipe-indicator fixed top-1/2 z-overlay flex w-42px h-108px items-center justify-center border border-[var(--color-site-swipe-border)] rounded-full bg-[var(--color-site-swipe-background)] text-[var(--color-site-text)] shadow-[0_6px_20px_var(--color-shadow-floating)] pointer-events-none select-none transition-opacity duration-120 ease-in-out"
      aria-hidden={hidden() ? "true" : "false"}
      style={{
        "backdrop-filter": "blur(8px)",
        display: hidden() ? "none" : "flex",
        left: props.state.direction === "right" ? "6px" : "",
        opacity: hidden() ? "0" : String(0.35 + progress() * 0.65),
        right: props.state.direction === "left" ? "6px" : "",
        transform: `translate(${offset()}px, -50%)`,
      }}
    >
      <Icon name={iconName()} size={36} />
    </div>
  );
}
