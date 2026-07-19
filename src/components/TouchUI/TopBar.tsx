import { createSignal, onCleanup, onMount, Show, For } from "solid-js";
import type { TopBarDom } from "../../eh";
import { Icon } from "../Widgets/Icon";

const TOUCH_TOP_BAR_ICON_SIZE = 41;
const TOUCH_ICON_BUTTON_CLASS =
  "inline-flex w-68px h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]";
const TOUCH_TOP_BAR_MENU_ITEM_CLASS =
  "ehpeek-touch-top-bar-menu-item block box-border w-full min-h-lg coarse:min-h-88px py-md coarse:py-xl px-lg coarse:px-xl border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline textsize-md leading-[1.2]";
export const TOUCH_TOP_BAR_TRANSFORMS = {
  navItems: TOUCH_TOP_BAR_MENU_ITEM_CLASS,
};

function TouchTopBarMenu(props: { navItems: TopBarDom["elems"]["navItems"] }) {
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;

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
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icon name="menu" size={TOUCH_TOP_BAR_ICON_SIZE} />
      </button>
      <Show when={open()}>
        <div class="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-overlay flex w-240px coarse:w-[calc(100vw-32px)] max-w-[calc(100vw-24px)] coarse:max-w-360px flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
          <For each={props.navItems}>{(item) => {
            const Component = item.Component;
            return <Component />;
          }}</For>
        </div>
      </Show>
    </div>
  );
}

export function TouchTopBar(props: {
  source: TopBarDom;
  onSettingsMenuOpen: () => void;
}) {
  return (
    <nav class="ehpeek-touch-top-bar relative z-ui flex box-border w-full min-h-xl items-center justify-between py-lg pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] ehp-color-site-surface ehp-color-site-text font-sans">
      <a
        class={`ehpeek-touch-top-bar-project ${TOUCH_ICON_BUTTON_CLASS}`}
        href={props.source.data.homeHref}
      >
        <Icon name="panda-peek" size={58} strokeWidth={1.8} />
      </a>
      <div class="flex items-center gap-sm">
        <a
          class={`ehpeek-touch-top-bar-home ${TOUCH_ICON_BUTTON_CLASS}`}
          href={props.source.data.homeHref}
        >
          <Icon name="home" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </a>
        <a
          class={`ehpeek-touch-top-bar-favorites ${TOUCH_ICON_BUTTON_CLASS}`}
          href={props.source.data.favoritesHref}
        >
          <Icon name="heart" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </a>
        <button
          type="button"
          class={`ehpeek-touch-top-bar-settings ${TOUCH_ICON_BUTTON_CLASS}`}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            props.onSettingsMenuOpen();
          }}
        >
          <Icon name="settings" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </button>
        <TouchTopBarMenu navItems={props.source.elems.navItems} />
      </div>
    </nav>
  );
}
