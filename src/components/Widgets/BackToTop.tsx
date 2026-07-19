import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { Icon } from "./Icon";

const BACK_TO_TOP_POSITION_KEY = "ehpeek:back-to-top:position";

type ButtonPosition = {
  bottom: number;
  right: number;
};

export function BackToTop() {
  let button!: HTMLButtonElement;
  let drag: { bottom: number; pointerId: number; right: number; x: number; y: number } | null = null;
  let dragged = false;
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal<ButtonPosition | null>(null);

  onMount(() => {
    const updateVisibility = () => {
      setVisible(window.scrollY > Math.max(320, window.innerHeight * 0.5));
    };

    updateVisibility();
    const savedPosition = GM_getValue<ButtonPosition | null>(BACK_TO_TOP_POSITION_KEY, null);

    if (savedPosition) {
      setPosition(savedPosition);
    }
    window.addEventListener("scroll", updateVisibility, { passive: true });
    onCleanup(() => window.removeEventListener("scroll", updateVisibility));
  });

  return (
    <Show when={visible()}>
      <button
        ref={button}
        type="button"
        class="ehpeek-back-to-top fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(max(16px,env(safe-area-inset-bottom,0px))_+_64px)] z-ui inline-flex w-lg h-lg items-center justify-center rounded-full border ehp-color-site-border bg-[var(--color-site-elevated)] ehp-color-site-accent shadow-[0_4px_14px_var(--color-shadow-floating)] cursor-pointer [touch-action:none] active:scale-96"
        style={position() ? { bottom: `${position()!.bottom}px`, right: `${position()!.right}px` } : undefined}
        onPointerDown={(event) => {
          const rect = button.getBoundingClientRect();
          dragged = false;
          drag = {
            bottom: window.innerHeight - rect.bottom,
            pointerId: event.pointerId,
            right: window.innerWidth - rect.right,
            x: event.clientX,
            y: event.clientY,
          };
          button.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          if (!drag || drag.pointerId !== event.pointerId) {
            return;
          }

          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          dragged ||= Math.hypot(dx, dy) > 4;
          setPosition(clampPosition({ bottom: drag.bottom - dy, right: drag.right - dx }, button));
        }}
        onPointerUp={(event) => {
          if (!drag || drag.pointerId !== event.pointerId) {
            return;
          }

          button.releasePointerCapture(event.pointerId);
          drag = null;
          if (dragged && position()) {
            GM_setValue(BACK_TO_TOP_POSITION_KEY, position());
          }
        }}
        onClick={(event) => {
          if (dragged) {
            event.preventDefault();
            dragged = false;
            return;
          }
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        <Icon name="arrow-up" />
      </button>
    </Show>
  );
}

function clampPosition(position: ButtonPosition, button: HTMLButtonElement): ButtonPosition {
  return {
    bottom: Math.min(Math.max(0, position.bottom), Math.max(0, window.innerHeight - button.offsetHeight)),
    right: Math.min(Math.max(0, position.right), Math.max(0, window.innerWidth - button.offsetWidth)),
  };
}
