import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import * as eh from "../../eh";
import texts from "../../texts.json";
import { Icon } from "../Widgets/Icon";

const TOUCH_TOP_BAR_ICON_SIZE = 34;
const TOUCH_ICON_BUTTON_CLASS =
  "inline-flex w-56px h-56px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]";
export const TOUCH_TOP_BAR_MENU_ITEM_CLASS =
  "ehpeek-touch-top-bar-menu-item block box-border w-full min-h-lg coarse:min-h-88px py-md coarse:py-xl px-lg coarse:px-xl border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline text-20px coarse:text-32px leading-[1.2]";

function TouchTopBarMenu(props: { navItems: HTMLElement[] }) {
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;
  let navItemsHost: HTMLDivElement | undefined;

  createEffect(() => {
    if (!open() || !navItemsHost) {
      return;
    }

    navItemsHost.replaceChildren(...props.navItems.map((item) => item.cloneNode(true)));
  });

  onMount(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && root.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("click", onClick);

    onCleanup(() => {
      document.removeEventListener("click", onClick);
    });
  });

  return (
    <div ref={root} class="ehpeek-touch-top-bar-menu relative">
      <button
        type="button"
        class={`ehpeek-touch-top-bar-menu-button ${TOUCH_ICON_BUTTON_CLASS}`}
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label={texts.navigation.menu}
        title={texts.navigation.menu}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icon name="menu" size={TOUCH_TOP_BAR_ICON_SIZE} />
      </button>
      <Show when={open()}>
        <div
          class="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-overlay flex w-240px coarse:w-[calc(100vw-32px)] max-w-[calc(100vw-24px)] coarse:max-w-360px flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated"
        >
          <div ref={navItemsHost} class="contents" />
        </div>
      </Show>
    </div>
  );
}

export function TouchTopBar(props: { info: eh.TouchTopBarInfo; onSettingsMenuOpen: () => void }) {
  return (
    <nav class="ehpeek-touch-top-bar relative z-ui flex box-border w-full min-h-xl items-center justify-between py-lg pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] ehp-color-site-surface ehp-color-site-text font-sans">
      <a
        class={`ehpeek-touch-top-bar-project ${TOUCH_ICON_BUTTON_CLASS}`}
        href="https://github.com/yamipot/ehpeek"
        target="_blank"
        rel="noopener noreferrer"
        aria-label={texts.navigation.github}
        title={texts.navigation.github}
      >
        <Icon name="panda-peek" size={48} strokeWidth={1.8} />
      </a>
      <div class="flex items-center gap-xs">
        <a
          class={`ehpeek-touch-top-bar-home ${TOUCH_ICON_BUTTON_CLASS}`}
          href={props.info.homeHref}
          aria-label={texts.navigation.home}
          title={texts.navigation.home}
        >
          <Icon name="home" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </a>
        <a
          class={`ehpeek-touch-top-bar-favorites ${TOUCH_ICON_BUTTON_CLASS}`}
          href={props.info.favoritesHref}
          aria-label={texts.navigation.favorites}
          title={texts.navigation.favorites}
        >
          <Icon name="heart" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </a>
        <button
          type="button"
          class={`ehpeek-touch-top-bar-settings ${TOUCH_ICON_BUTTON_CLASS}`}
          aria-label={texts.settings.openSettings}
          title={texts.settings.openSettings}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            props.onSettingsMenuOpen();
          }}
        >
          <Icon name="settings" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </button>
        <TouchTopBarMenu navItems={props.info.navItems} />
      </div>
    </nav>
  );
}
