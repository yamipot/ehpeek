import { type JSX, onCleanup, onMount } from "solid-js";
import { OverlayPortal } from "./OverlayHost";
import { lockPageScroll } from "../../features/Viewport";
import { useReaderTexts } from "../i18n";
import { IconButton } from "./Button";
import { Icon } from "./Icon";
import "../../styles";

const DIALOG_WIDTHS = {
  md: "ehpeek-dialog__panel--md",
  lg: "ehpeek-dialog__panel--lg",
} as const;

export function Dialog(props: {
  bodyClass?: string;
  children: JSX.Element;
  label: string;
  lockPageScroll?: boolean;
  onClose: () => void;
  title: JSX.Element;
  // Variants style the shell; its palette is inherited from the OverlayHost.
  variant: "reader" | "site";
  width: keyof typeof DIALOG_WIDTHS;
}) {
  const texts = useReaderTexts();
  onMount(() => {
    const unlockScroll = props.lockPageScroll ? lockPageScroll() : () => {};
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      props.onClose();
    };

    window.addEventListener("keydown", closeOnEscape, true);
    onCleanup(() => {
      window.removeEventListener("keydown", closeOnEscape, true);
      unlockScroll();
    });
  });

  return (
    <OverlayPortal>
      <div
        class="ehpeek-dialog"
        data-ui-dialog={props.variant}
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
          class={`ehpeek-dialog__panel ${DIALOG_WIDTHS[props.width]}`}
        >
          <div class="ehpeek-dialog__header">
            <h2 class="ehpeek-dialog__title">{props.title}</h2>
            <IconButton
              variant="ghost"
              size="md"
              class="ehpeek-dialog__close"
              aria-label={texts.common.actions.close}
              title={texts.common.actions.close}
              onClick={() => props.onClose()}
            >
              <Icon name="close" size="var(--ui-icon-size-md)" />
            </IconButton>
          </div>
          <div class={`ehpeek-dialog__body ${props.bodyClass ?? ""}`}>
            {props.children}
          </div>
        </div>
      </div>
    </OverlayPortal>
  );
}
