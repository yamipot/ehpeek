import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  type Accessor,
  type JSX,
} from "solid-js";
import { Icon } from "./Icon";

const BACK_TO_TOP_POSITION_KEY = "ehpeek:back-to-top:position";
const GALLERY_COLUMNS_BACK_TO_TOP_POSITION_KEY =
  "ehpeek:gallery-columns-back-to-top:position";

export function clearBackToTopPosition(): void {
  GM_deleteValue(BACK_TO_TOP_POSITION_KEY);
  GM_deleteValue(GALLERY_COLUMNS_BACK_TO_TOP_POSITION_KEY);
}

type ButtonPosition = {
  bottom: number;
  right: number;
};

type BackToTopBounds = {
  bottom: number;
  height: number;
  left: number;
  right: number;
  width: number;
};

export type BackToTopScope = {
  bounds: () => BackToTopBounds | null;
  listen: (callbacks: {
    onBoundsChange: () => void;
    onScroll: () => void;
  }) => () => void;
  scrollToTop: () => void;
  scrollTop: () => number;
};

export function BackToTop(props: { leftHanded: Accessor<boolean> }) {
  return (
    <MovableBackToTop
      leftHanded={props.leftHanded}
      positionKey={BACK_TO_TOP_POSITION_KEY}
    />
  );
}

export function GalleryColumnsBackToTop(props: {
  leftHanded: Accessor<boolean>;
  scope: BackToTopScope;
}) {
  return (
    <MovableBackToTop
      leftHanded={props.leftHanded}
      positionKey={GALLERY_COLUMNS_BACK_TO_TOP_POSITION_KEY}
      scope={props.scope}
    />
  );
}

function MovableBackToTop(props: {
  leftHanded: Accessor<boolean>;
  positionKey: string;
  scope?: BackToTopScope;
}) {
  let button!: HTMLButtonElement;
  let drag: { bottom: number; pointerId: number; right: number; x: number; y: number } | null = null;
  let dragged = false;
  let scopedBounds: BackToTopBounds | null = null;
  const [visible, setVisible] = createSignal(false);
  const [position, setPosition] = createSignal<ButtonPosition | null>(null);
  const [boundsVersion, setBoundsVersion] = createSignal(0);
  const bounds = (): BackToTopBounds | null => props.scope
    ? scopedBounds
    : {
        bottom: window.innerHeight,
        height: window.innerHeight,
        left: 0,
        right: window.innerWidth,
        width: window.innerWidth,
      };
  const positionStyle = (): JSX.CSSProperties | undefined => {
    boundsVersion();
    const currentBounds = bounds();
    if (!currentBounds) {
      return { display: "none" };
    }
    const current = position();
    if (!props.scope) {
      return current
        ? { bottom: `${current.bottom}px`, right: `${current.right}px` }
        : undefined;
    }
    const viewportBottom = window.innerHeight - currentBounds.bottom;
    if (current) {
      const clamped = button
        ? clampPosition(current, button, currentBounds)
        : current;
      return {
        bottom: `${viewportBottom + clamped.bottom}px`,
        right: `${window.innerWidth - currentBounds.right + clamped.right}px`,
      };
    }
    return props.leftHanded()
      ? {
        bottom: `calc(${viewportBottom}px + var(--ui-space-lg))`,
        left: `calc(${currentBounds.left}px + var(--ui-space-lg))`,
        right: "auto",
      }
      : {
        bottom: `calc(${viewportBottom}px + var(--ui-space-lg))`,
        right: `calc(${window.innerWidth - currentBounds.right}px + var(--ui-space-lg))`,
      };
  };

  onMount(() => {
    const updateVisibility = () => {
      const currentBounds = bounds();
      setVisible(
        currentBounds !== null &&
        (props.scope?.scrollTop() ?? window.scrollY) >
          Math.max(320, currentBounds.height * 0.5),
      );
    };
    const updateBounds = () => {
      scopedBounds = props.scope?.bounds() ?? null;
      setBoundsVersion((version) => version + 1);
      updateVisibility();
    };

    if (props.scope) {
      updateBounds();
    } else {
      updateVisibility();
    }
    const savedPosition = GM_getValue<ButtonPosition | null>(props.positionKey, null);

    if (savedPosition) {
      setPosition(savedPosition);
    }
    if (props.scope) {
      const stopListening = props.scope.listen({
        onBoundsChange: updateBounds,
        onScroll: updateVisibility,
      });
      onCleanup(stopListening);
    } else {
      window.addEventListener("scroll", updateVisibility, { passive: true });
      onCleanup(() => window.removeEventListener("scroll", updateVisibility));
    }
  });

  return (
    <Show when={visible()}>
      <button
        ref={button}
        type="button"
        class="fixed z-ui inline-flex ui-hit-square-lg items-center justify-center rounded-full border-0 bg-[var(--color-site-elevated)] ehp-color-site-accent shadow-[0_4px_14px_var(--color-shadow-floating)] cursor-pointer [touch-action:none] active:scale-96"
        classList={{
          "safe-right-lg bottom-[calc(max(16px,env(safe-area-inset-bottom,0px))_+_var(--ui-hit-size-lg)_+_var(--ui-space-md))]":
            !props.scope,
          "!right-auto safe-left-lg":
            !props.scope && props.leftHanded() && position() === null,
        }}
        style={positionStyle()}
        onPointerDown={(event) => {
          const currentBounds = bounds();
          if (!currentBounds) {
            return;
          }
          const buttonRect = button.getBoundingClientRect();
          dragged = false;
          drag = {
            bottom: currentBounds.bottom - buttonRect.bottom,
            pointerId: event.pointerId,
            right: currentBounds.right - buttonRect.right,
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
          const currentBounds = bounds();
          if (currentBounds) {
            setPosition(clampPosition(
              { bottom: drag.bottom - dy, right: drag.right - dx },
              button,
              currentBounds,
            ));
          }
        }}
        onPointerUp={(event) => {
          if (!drag || drag.pointerId !== event.pointerId) {
            return;
          }

          button.releasePointerCapture(event.pointerId);
          drag = null;
          const current = position();
          if (dragged && current) {
            GM_setValue(props.positionKey, current);
          }
        }}
        onClick={(event) => {
          if (dragged) {
            event.preventDefault();
            dragged = false;
            return;
          }
          if (props.scope) {
            props.scope.scrollToTop();
          } else {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
      >
        <Icon name="arrow-up" size="var(--ui-icon-size-lg)" />
      </button>
    </Show>
  );
}

function clampPosition(
  position: ButtonPosition,
  button: HTMLButtonElement,
  bounds: BackToTopBounds,
): ButtonPosition {
  return {
    bottom: Math.min(
      Math.max(0, position.bottom),
      Math.max(0, bounds.height - button.offsetHeight),
    ),
    right: Math.min(
      Math.max(0, position.right),
      Math.max(0, bounds.width - button.offsetWidth),
    ),
  };
}
