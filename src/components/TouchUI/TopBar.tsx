import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  For,
  type Accessor,
} from "solid-js";
import type { TopBarDom } from "../../eh";
import texts from "../../texts.json";
import { Icon } from "../Widgets/Icon";

const TOUCH_TOP_BAR_ICON_SIZE = "var(--ehpeek-touch-top-bar-icon-size)";
const TOUCH_TOP_BAR_PROJECT_ICON_SIZE =
  "var(--ehpeek-touch-top-bar-project-icon-size)";
const TOUCH_ICON_BUTTON_CLASS =
  "inline-flex w-md h-md coarse:w-68px coarse:h-68px items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)] [--ehpeek-touch-top-bar-icon-size:24px] coarse:[--ehpeek-touch-top-bar-icon-size:41px]";
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
        <div class="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+4px)] coarse:top-[calc(100%+8px)] right-0 z-overlay flex w-180px coarse:w-[calc(100vw-32px)] max-w-[calc(100vw-12px)] coarse:max-w-360px flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
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
  historyHref: string;
  landscapeColumns?: {
    enabled: Accessor<boolean>;
    onChange: (enabled: boolean) => void;
  };
  source: TopBarDom;
  onSettingsMenuOpen: () => void;
}) {
  return (
    <nav class="ehpeek-touch-top-bar relative z-ui flex box-border w-full min-h-lg coarse:min-h-xl items-center justify-between py-xs coarse:py-lg pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] ehp-color-site-surface ehp-color-site-text font-sans">
      <div class="flex items-center gap-xs coarse:gap-sm">
        <a
          class={`ehpeek-touch-top-bar-project ${TOUCH_ICON_BUTTON_CLASS} [--ehpeek-touch-top-bar-project-icon-size:32px] coarse:[--ehpeek-touch-top-bar-project-icon-size:58px]`}
          href={props.source.data.homeHref}
        >
          <Icon name="panda-peek" size={TOUCH_TOP_BAR_PROJECT_ICON_SIZE} strokeWidth={1.8} />
        </a>
        <Show when={props.landscapeColumns}>
          {(landscapeColumns) => (
            <span class="hidden landscape:contents">
              <button
                type="button"
                class={`ehpeek-touch-top-bar-landscape-columns ${TOUCH_ICON_BUTTON_CLASS}`}
                aria-label={texts.settings.landscapeColumnsLabel}
                aria-pressed={landscapeColumns().enabled()}
                title={texts.settings.landscapeColumnsLabel}
                onClick={() => {
                  const enabled = !landscapeColumns().enabled();
                  landscapeColumns().onChange(enabled);
                }}
              >
                <Icon
                  name={landscapeColumns().enabled() ? "pages" : "page"}
                  size={TOUCH_TOP_BAR_ICON_SIZE}
                />
              </button>
            </span>
          )}
        </Show>
      </div>
      <div class="flex items-center gap-xs coarse:gap-sm">
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
        <a
          class={`ehpeek-touch-top-bar-history ${TOUCH_ICON_BUTTON_CLASS}`}
          href={props.historyHref}
        >
          <Icon name="history" size={TOUCH_TOP_BAR_ICON_SIZE} />
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
