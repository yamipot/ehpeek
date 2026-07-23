import {
  createSignal,
  onCleanup,
  onMount,
  Show,
  For,
  type Accessor,
} from "solid-js";
import type { TopBarDom } from "../../eh";
import type { UiScale } from "../../state";
import texts from "../../texts.json";
import { Icon } from "../Widgets/Icon";

const TOUCH_TOP_BAR_ICON_SIZE = "var(--ehpeek-touch-top-bar-icon-size)";
const TOUCH_TOP_BAR_PROJECT_ICON_SIZE =
  "var(--ehpeek-touch-top-bar-project-icon-size)";
const TOUCH_TOP_BAR_SINGLE_COLUMN_ICON_SIZE =
  "calc(var(--ehpeek-touch-top-bar-icon-size) * 1.1)";
const TOUCH_ICON_BUTTON_CLASS =
  "inline-flex w-[var(--ui-control-size-xl)] h-[var(--ui-control-size-xl)] items-center justify-center rounded-md border-0 bg-transparent ehp-color-site-text no-underline [touch-action:manipulation] active:bg-[var(--color-site-item-hover)] [--ehpeek-touch-top-bar-icon-size:var(--ui-control-size-xs)]";
const NEXT_UI_SCALE: Record<UiScale, UiScale> = {
  small: "medium",
  medium: "large",
  large: "small",
};

function TouchTopBarUiMenu(props: {
  uiScale: {
    value: Accessor<UiScale>;
    onChange: (scale: UiScale) => void;
  };
  columns?: {
    enabled: Accessor<boolean>;
    onChange: (enabled: boolean) => void;
  };
}) {
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;

  onMount(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element && root.contains(event.target))) {
        setOpen(false);
      }
    };

    document.addEventListener("click", onClick);
    onCleanup(() => document.removeEventListener("click", onClick));
  });

  return (
    <div ref={root} class="ehpeek-touch-top-bar-ui-menu relative">
      <button
        type="button"
        class={`ehpeek-touch-top-bar-ui-menu-button ${TOUCH_ICON_BUTTON_CLASS}`}
        aria-label={texts.settings.uiControlsLabel}
        aria-haspopup="menu"
        aria-expanded={open()}
        title={texts.settings.uiControlsLabel}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icon name="viewport" size={TOUCH_TOP_BAR_ICON_SIZE} />
      </button>
      <Show when={open()}>
        <div
          class="absolute top-[calc(100%+4px)] left-0 z-overlay flex gap-xs p-xs overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated"
          role="menu"
        >
          <button
            type="button"
            class={TOUCH_ICON_BUTTON_CLASS}
            aria-label={`${texts.settings.uiScaleLabel}: ${props.uiScale.value()}`}
            title={`${texts.settings.uiScaleLabel}: ${props.uiScale.value()}`}
            onClick={() =>
              props.uiScale.onChange(NEXT_UI_SCALE[props.uiScale.value()])}
          >
            <Icon name="viewport" size={TOUCH_TOP_BAR_ICON_SIZE} />
          </button>
          <Show when={props.columns}>
            {(columns) => (
              <button
                type="button"
                class={TOUCH_ICON_BUTTON_CLASS}
                aria-label={texts.settings.columnsLabel}
                aria-pressed={columns().enabled()}
                title={texts.settings.columnsLabel}
                onClick={() => columns().onChange(!columns().enabled())}
              >
                <Icon
                  name="pages"
                  size={columns().enabled()
                    ? TOUCH_TOP_BAR_ICON_SIZE
                    : TOUCH_TOP_BAR_SINGLE_COLUMN_ICON_SIZE}
                />
              </button>
            )}
          </Show>
        </div>
      </Show>
    </div>
  );
}

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
        <div class="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+4px)] right-0 z-overlay flex w-180px coarse:w-[calc(100vw-32px)] max-w-[calc(100vw-12px)] coarse:max-w-360px flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
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
  historyHref?: string;
  uiScale: {
    value: Accessor<UiScale>;
    onChange: (scale: UiScale) => void;
  };
  columns?: {
    enabled: Accessor<boolean>;
    onChange: (enabled: boolean) => void;
  };
  source: TopBarDom;
  onSettingsMenuOpen: () => void;
}) {
  return (
    <nav class="ehpeek-touch-top-bar relative z-ui flex box-border w-full h-[var(--ui-control-size-xl)] items-center justify-between pl-[max(12px,env(safe-area-inset-left,0px))] pr-[max(12px,env(safe-area-inset-right,0px))] ehp-color-site-surface ehp-color-site-text font-sans">
      <div class="flex items-center gap-xs">
        <a
          class={`ehpeek-touch-top-bar-project ${TOUCH_ICON_BUTTON_CLASS} [--ehpeek-touch-top-bar-project-icon-size:var(--ui-control-size-sm)]`}
          href={props.source.data.homeHref}
        >
          <Icon name="panda-peek" size={TOUCH_TOP_BAR_PROJECT_ICON_SIZE} strokeWidth={1.8} />
        </a>
        <TouchTopBarUiMenu uiScale={props.uiScale} columns={props.columns} />
      </div>
      <div class="flex items-center gap-xs">
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
        <Show when={props.historyHref}>
          {(historyHref) => (
            <a
              class={`ehpeek-touch-top-bar-history ${TOUCH_ICON_BUTTON_CLASS}`}
              href={historyHref()}
            >
              <Icon name="history" size={TOUCH_TOP_BAR_ICON_SIZE} />
            </a>
          )}
        </Show>
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
