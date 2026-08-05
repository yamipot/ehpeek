import { type JSX, onCleanup, onMount } from "solid-js";
import { OverlayPortal } from "../../App/OverlayHost";
import texts from "../../texts.json";
import { Icon } from "./Icon";

const DIALOG_WIDTHS = {
  md: "max-w-[calc(var(--ui-control-size-xl)*7.5)]",
  lg: "max-w-[calc(var(--ui-control-size-xl)*9.25)]",
} as const;

export function Dialog(props: {
  bodyClass: string;
  children: JSX.Element;
  label: string;
  onClose: () => void;
  title: JSX.Element;
  variant: "reader" | "site";
  width: keyof typeof DIALOG_WIDTHS;
}) {
  onMount(() => {
    const scrollRoots = [document.documentElement, document.body];
    const overflowStyles = scrollRoots.map((root) => ({
      priority: root.style.getPropertyPriority("overflow"),
      value: root.style.getPropertyValue("overflow"),
    }));
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      props.onClose();
    };
    for (const root of scrollRoots) {
      root.style.setProperty("overflow", "hidden", "important");
    }
    window.addEventListener("keydown", closeOnEscape, true);
    onCleanup(() => {
      window.removeEventListener("keydown", closeOnEscape, true);
      scrollRoots.forEach((root, index) => {
        const previous = overflowStyles[index];
        if (previous?.value) {
          root.style.setProperty("overflow", previous.value, previous.priority);
        } else {
          root.style.removeProperty("overflow");
        }
      });
    });
  });

  const reader = () => props.variant === "reader";

  return (
    <OverlayPortal>
      <div
        class="fixed inset-0 z-dialog flex items-center justify-center overflow-hidden p-lg bg-black/65 pointer-events-auto font-sans"
        role="dialog"
        aria-modal="true"
        aria-label={props.label}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          if (event.target === event.currentTarget) {
            props.onClose();
          }
        }}
        onPointerDown={(event: PointerEvent) => event.stopPropagation()}
        onWheel={(event: WheelEvent) => event.stopPropagation()}
      >
        <div
          class={`box-border flex w-full ${DIALOG_WIDTHS[props.width]} max-h-[min(calc(var(--ui-control-size-xl)*12.75),calc(100dvh-32px))] flex-col overflow-hidden rounded-lg border shadow-xl ${
            reader()
              ? "border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-text)]"
              : "ehp-color-site-border ehp-color-site-elevated ehp-color-site-text"
          }`}
        >
          <div class={`flex min-h-[var(--ui-control-size-lg)] flex-none items-center justify-between gap-md py-sm pl-lg pr-sm border-0 border-b ${
            reader()
              ? "border-[var(--color-border)]"
              : "ehp-color-site-border-subtle-b"
          }`}>
            <h2 class="m-0 textsize-lg font-700">{props.title}</h2>
            <button
              type="button"
              class={`inline-flex w-[var(--ui-control-size-md)] h-[var(--ui-control-size-md)] flex-none items-center justify-center p-0 rounded-md border bg-transparent cursor-pointer ${
                reader()
                  ? "border-[var(--color-border)] text-[var(--color-text)]"
                  : "ehp-color-site-border ehp-color-site-text hover:bg-[var(--color-site-item-hover)]"
              }`}
              aria-label={texts.button.close}
              title={texts.button.close}
              onClick={() => props.onClose()}
            >
              <Icon name="close" size="var(--ui-icon-size-md)" />
            </button>
          </div>
          <div class={`min-h-0 overflow-y-auto overscroll-contain ${props.bodyClass}`}>
            {props.children}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
