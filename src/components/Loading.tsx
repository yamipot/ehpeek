import { h, render } from "preact";

export function LoadingSpinner(props: { label: string; size?: "md" | "lg" }) {
  const sizeClass = props.size === "lg" ? "w-34px h-34px border-4" : "w-24px h-24px border-3";

  return (
    <span className="inline-flex items-center justify-center gap-10px color-reader-text" role="status" aria-live="polite">
      <span
        className={`${sizeClass} inline-block box-border animate-spin rounded-full border-solid border-[rgba(255,255,255,0.28)] border-t-[var(--ehpeek-color-accent)]`}
        aria-hidden="true"
      />
      <span>{props.label}</span>
    </span>
  );
}

export function LoadingOverlay(props: { label: string; visible: boolean }) {
  return props.visible ? (
    <div className="fixed left-1/2 top-1/2 z-[2147483644] flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-[var(--ehpeek-control-radius-reader)] border color-search-swipe px-18px py-14px pointer-events-none select-none">
      <LoadingSpinner label={props.label} />
    </div>
  ) : null;
}

export function loadingSpinnerElement(label: string, size?: "md" | "lg"): HTMLElement {
  const host = document.createElement("span");
  render(<LoadingSpinner label={label} size={size} />, host);
  return host;
}
