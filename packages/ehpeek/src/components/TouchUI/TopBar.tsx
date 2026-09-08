import {
  createSignal,
  Show,
  For,
  type Accessor,
} from "solid-js";
import type { TopBarDom, TopBarNavigationItem } from "../../eh";
import {
  nextUiScale,
  type UiScale,
  uiScaleLevel,
} from "../../ui";
import texts from "../../i18n";
import { Icon, IconButton, IconLink, Popover } from "@ehpeek/reader/kit/Widgets";

const TOUCH_TOP_BAR_ICON_SIZE = "var(--ehpeek-touch-top-bar-icon-size)";
const TOUCH_TOP_BAR_PROJECT_ICON_SIZE =
  "var(--ehpeek-touch-top-bar-project-icon-size)";
const TOUCH_TOP_BAR_SINGLE_COLUMN_ICON_SIZE =
  "calc(var(--ehpeek-touch-top-bar-icon-size) * 1.1)";
const TOUCH_ICON_ACTION_CLASS =
  "no-underline [touch-action:manipulation] [--ehpeek-touch-top-bar-icon-size:var(--ui-control-size-xs)]";
function TouchTopBarUiMenu(props: {
  uiScale: {
    value: Accessor<UiScale>;
    onChange: (scale: UiScale) => void;
  };
  leftHandedControls: {
    enabled: Accessor<boolean>;
    onChange: (enabled: boolean) => void;
  };
  columns: {
    available: boolean;
    enabled: Accessor<boolean>;
    onChange: (enabled: boolean) => void;
    resizeHandle?: {
      visible: Accessor<boolean>;
      onChange: (visible: boolean) => void;
    };
  };
}) {
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;

  return (
    <div ref={root} class="relative">
      <IconButton
        variant="ghost"
        size="xl"
        class={TOUCH_ICON_ACTION_CLASS}
        aria-label={texts.settings.uiControlsLabel}
        aria-haspopup="menu"
        aria-expanded={open()}
        title={texts.settings.uiControlsLabel}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icon name="palette" size={TOUCH_TOP_BAR_ICON_SIZE} strokeWidth={1.75} />
      </IconButton>
      <Show when={open()}>
        <Popover
          contains={target => root.contains(target)}
          onOutsidePress={() => setOpen(false)}
          class="absolute top-[calc(100%+var(--ui-space-xs))] left-0 flex ui-gap-xs ui-p-xs"
          classList={{
            "!left-auto right-0 flex-row-reverse": props.leftHandedControls.enabled(),
          }}
          role="menu"
        >
          <IconButton
            variant="ghost"
            size="xl"
            class={TOUCH_ICON_ACTION_CLASS}
            aria-label={`${texts.settings.uiScaleLabel}: ${uiScaleLevel(props.uiScale.value())}`}
            title={`${texts.settings.uiScaleLabel}: ${uiScaleLevel(props.uiScale.value())}`}
            onClick={() =>
          props.uiScale.onChange(nextUiScale(props.uiScale.value()))}
          >
            <Icon name="viewport" size={TOUCH_TOP_BAR_ICON_SIZE} />
          </IconButton>
          <IconButton
            variant="ghost"
            size="xl"
            class={TOUCH_ICON_ACTION_CLASS}
            aria-label={texts.settings.leftHandedControlsLabel}
            aria-pressed={props.leftHandedControls.enabled()}
            title={texts.settings.leftHandedControlsLabel}
            onClick={() =>
              props.leftHandedControls.onChange(!props.leftHandedControls.enabled())}
          >
            <span classList={{ "-scale-x-100": props.leftHandedControls.enabled() }}>
              <Icon name="hand" size={TOUCH_TOP_BAR_ICON_SIZE} />
            </span>
          </IconButton>
          <IconButton
            variant="ghost"
            size="xl"
            class={TOUCH_ICON_ACTION_CLASS}
            aria-label={texts.settings.columnsLabel}
            aria-pressed={props.columns.available && props.columns.enabled()}
            disabled={!props.columns.available}
            title={texts.settings.columnsLabel}
            onClick={() =>
              props.columns.onChange(!props.columns.enabled())}
          >
            <Icon
              name="pages"
              size={props.columns.enabled()
                ? TOUCH_TOP_BAR_ICON_SIZE
                : TOUCH_TOP_BAR_SINGLE_COLUMN_ICON_SIZE}
            />
          </IconButton>
          <IconButton
            variant="ghost"
            size="xl"
            class={TOUCH_ICON_ACTION_CLASS}
            aria-label={props.columns.resizeHandle?.visible()
              ? texts.settings.hideColumnsResizeHandle
              : texts.settings.showColumnsResizeHandle}
            aria-pressed={props.columns.resizeHandle?.visible() ?? false}
            disabled={!props.columns.available ||
              !props.columns.enabled() ||
              !props.columns.resizeHandle}
            title={props.columns.resizeHandle?.visible()
              ? texts.settings.hideColumnsResizeHandle
              : texts.settings.showColumnsResizeHandle}
            onClick={() => {
              const resizeHandle = props.columns.resizeHandle;
              if (resizeHandle) {
                resizeHandle.onChange(!resizeHandle.visible());
              }
            }}
          >
            <span class="flex items-center justify-center ui-gap-xs">
              <span class="block h-[var(--ui-icon-size-md)] w-2px rounded-full bg-current opacity-70" />
              <span class="block h-[var(--ui-icon-size-md)] w-2px rounded-full bg-current opacity-70" />
              <span class="block h-[var(--ui-icon-size-md)] w-2px rounded-full bg-current opacity-70" />
            </span>
          </IconButton>
        </Popover>
      </Show>
    </div>
  );
}

function TouchTopBarMenu(props: {
  leftHanded: Accessor<boolean>;
  source: TopBarDom;
}) {
  const [open, setOpen] = createSignal(false);
  const [navItems, setNavItems] = createSignal<TopBarNavigationItem[]>([]);
  let root!: HTMLDivElement;

  const toggleMenu = () => {
    setOpen((value) => {
      const next = !value;
      if (next) {
        setNavItems(props.source.handle.readNavigationItems());
      }
      return next;
    });
  };

  return (
    <div ref={root} class="relative">
      <IconButton
        variant="ghost"
        size="xl"
        class={TOUCH_ICON_ACTION_CLASS}
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          toggleMenu();
        }}
      >
        <Icon name="menu" size={TOUCH_TOP_BAR_ICON_SIZE} />
      </IconButton>
      <Show when={open()}>
        <Popover
          contains={target => root.contains(target)}
          onOutsidePress={() => setOpen(false)}
          class="absolute top-[calc(100%+var(--ui-space-xs))] right-0 flex w-max min-w-[calc(var(--ui-control-size-xl)*2.25)] max-w-[calc(100vw-var(--ui-space-md))] flex-col"
          classList={{ "!right-auto left-0": props.leftHanded() }}
        >
          <For each={navItems()}>{(item) => (
            <a
              class="ehpeek-layout-top-bar-menu-item"
              href={item.href}
              target={item.target ?? undefined}
              onClick={(event: MouseEvent) => {
                event.preventDefault();
                setOpen(false);
                props.source.handle.activateNavigationItem(item.index);
              }}
            >
              {item.label}
            </a>
          )}</For>
        </Popover>
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
  leftHandedControls: {
    enabled: Accessor<boolean>;
    onChange: (enabled: boolean) => void;
  };
  columns: {
    available: boolean;
    enabled: Accessor<boolean>;
    onChange: (enabled: boolean) => void;
    resizeHandle?: {
      visible: Accessor<boolean>;
      onChange: (visible: boolean) => void;
    };
  };
  source: TopBarDom;
  onSettingsMenuOpen: () => void;
}) {
  return (
    <nav
      class="relative z-ui flex box-border w-full h-[var(--ui-control-size-xl)] items-center justify-between safe-px-md ehp-color-site-surface ehp-color-site-text font-sans"
      classList={{ "flex-row-reverse": props.leftHandedControls.enabled() }}
    >
      <div
        class="flex items-center ui-gap-xs"
        classList={{ "flex-row-reverse": props.leftHandedControls.enabled() }}
      >
        <IconLink
          variant="ghost"
          size="xl"
          class={`${TOUCH_ICON_ACTION_CLASS} [--ehpeek-touch-top-bar-project-icon-size:var(--ui-control-size-sm)]`}
          href={props.source.data.homeHref}
        >
          <Icon name="panda-peek" size={TOUCH_TOP_BAR_PROJECT_ICON_SIZE} strokeWidth={1.8} />
        </IconLink>
        <TouchTopBarUiMenu
          leftHandedControls={props.leftHandedControls}
          uiScale={props.uiScale}
          columns={props.columns}
        />
      </div>
      <div
        class="flex items-center ui-gap-xs"
        classList={{ "flex-row-reverse": props.leftHandedControls.enabled() }}
      >
        <IconLink
          variant="ghost"
          size="xl"
          class={TOUCH_ICON_ACTION_CLASS}
          href={props.source.data.homeHref}
        >
          <Icon name="search" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </IconLink>
        <IconLink
          variant="ghost"
          size="xl"
          class={TOUCH_ICON_ACTION_CLASS}
          href={props.source.data.favoritesHref}
        >
          <Icon name="heart" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </IconLink>
        <Show when={props.historyHref}>
          {(historyHref) => (
            <IconLink
              variant="ghost"
              size="xl"
              class={TOUCH_ICON_ACTION_CLASS}
              href={historyHref()}
            >
              <Icon name="history" size={TOUCH_TOP_BAR_ICON_SIZE} />
            </IconLink>
          )}
        </Show>
        <IconButton
          variant="ghost"
          size="xl"
          class={TOUCH_ICON_ACTION_CLASS}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            props.onSettingsMenuOpen();
          }}
        >
          <Icon name="settings" size={TOUCH_TOP_BAR_ICON_SIZE} />
        </IconButton>
        <TouchTopBarMenu
          leftHanded={props.leftHandedControls.enabled}
          source={props.source}
        />
      </div>
    </nav>
  );
}
