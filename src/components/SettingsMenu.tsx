import { createEffect, createSignal, For, onCleanup, onMount, Show, untrack } from "solid-js";
import { createStore } from "solid-js/store";
import texts from "../texts.json";
import { InteractionHelp } from "./InteractionHelp";

type SettingsMenuState = {
  openGalleryInNewTab: boolean;
  readerEnabled: boolean;
  readerFullscreenEnabled: boolean;
  enhanceThumbsGridsEnabled: boolean;
  enhanceSearchGridsEnabled: boolean;
  myTagsEnabled: boolean;
  readHistoryEnabled: boolean;
  includeUnreadHistoryEnabled: boolean;
  landscapeColumnsEnabled: boolean;
  searchHistoryEnabled: boolean;
  touchUiEnabled: boolean;
};

type SettingsTab = "general" | "enhance" | "options" | "about";

const SETTINGS_SECTIONS: ReadonlyArray<readonly [SettingsTab, string]> = [
  ["general", texts.settings.general],
  ["enhance", texts.settings.enhance],
  ["options", texts.settings.options],
  ["about", texts.settings.about],
];

const SETTINGS_ACTION_BUTTON_CLASS =
  "block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98";
const SETTINGS_APPLY_BUTTON_COLOR =
  "border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108";
const SETTINGS_CLOSE_BUTTON_COLOR =
  "border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]";
const SETTINGS_DOT_CLASS =
  "block flex-none w-10px h-10px coarse:w-18px coarse:h-18px rounded-full";

function SwitchButton(props: {
  checked: boolean;
  description: string;
  label: string;
  onChange: (value: boolean) => void;
}) {
  const [helpOpen, setHelpOpen] = createSignal(false);

  return (
    <div class="border-0 border-b ehp-color-site-border-subtle-b">
      <div class="flex items-stretch">
        <button
          type="button"
          class="flex min-w-0 flex-1 min-h-md coarse:min-h-88px items-center justify-between gap-md coarse:gap-xl py-sm coarse:py-lg pl-md pr-sm rounded-xs border-0 !bg-transparent hover:!bg-transparent active:!bg-transparent ehp-color-site-text font-inherit text-left textsize-md cursor-pointer [-webkit-tap-highlight-color:transparent]"
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            props.onChange(!props.checked);
          }}
        >
          <span>{props.label}</span>
          <span class="flex flex-none items-center gap-sm">
            <span class="textsize-sm opacity-70">{props.checked ? texts.settings.on : texts.settings.off}</span>
            <span class={`${SETTINGS_DOT_CLASS} ${props.checked ? "bg-[var(--color-state-on)]" : "bg-[var(--color-state-off)]"}`} />
          </span>
        </button>
        <button
          type="button"
          class="flex flex-none w-32px coarse:w-48px min-h-md coarse:min-h-88px items-center justify-center p-0 rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text cursor-pointer font-inherit textsize-md font-700 [-webkit-tap-highlight-color:transparent]"
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            setHelpOpen((open) => !open);
          }}
        >
          <span class="flex w-20px h-20px items-center justify-center rounded-full border border-[var(--color-site-border-subtle)] leading-none">?</span>
        </button>
      </div>
      <Show when={helpOpen()}>
        <p
          class="box-border w-full m-0 px-md pb-md text-left whitespace-normal [overflow-wrap:anywhere] [contain:inline-size] textsize-sm leading-[1.35] opacity-75"
        >
          {props.description}
        </p>
      </Show>
    </div>
  );
}

export function SettingsMenu(props: {
  historyHref: string;
  open: boolean;
  defaultState: SettingsMenuState;
  initState: SettingsMenuState;
  onApply: (state: SettingsMenuState) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = createStore<SettingsMenuState>(
    untrack(() => ({ ...props.initState })),
  );
  const [activeTab, setActiveTab] = createSignal<SettingsTab>("general");
  const [categoryOpen, setCategoryOpen] = createSignal(false);
  const [helpOpen, setHelpOpen] = createSignal(false);
  const [changed, setChanged] = createSignal(false);
  let menu!: HTMLDivElement;
  const close = () => {
    if (changed() && !window.confirm(texts.settings.discardChanges)) {
      return false;
    }

    props.onOpenChange(false);
    return true;
  };
  const updateDraft = (key: keyof SettingsMenuState, value: boolean) => {
    setChanged(true);
    setDraft(key, value);
  };

  createEffect(() => {
    if (props.open) {
      setDraft({ ...props.initState });
      setActiveTab("general");
      setCategoryOpen(false);
      setHelpOpen(false);
      setChanged(false);
    }
  });

  onMount(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!props.open) {
        return;
      }

      if (event.target instanceof Element && menu.contains(event.target)) {
        return;
      }

      if (!close()) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!props.open) {
        return;
      }

      if (event.key === "Escape") {
        if (categoryOpen()) {
          setCategoryOpen(false);
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if (!close()) {
          event.preventDefault();
          event.stopImmediatePropagation();
        }
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);

    onCleanup(() => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    });
  });

  return (
    <Show when={props.open}>
      <div ref={menu} class="ehpeek-settings-menu pointer-events-auto fixed top-24px right-24px coarse:top-8px coarse:right-8px z-overlay box-border flex w-320px coarse:w-[calc(100vw-16px)] max-w-[calc(100vw-48px)] coarse:max-w-480px max-h-[calc(100vh-48px)] coarse:max-h-[calc(100dvh-16px)] flex-col overflow-hidden p-sm coarse:p-md border ehp-color-site-border rounded-sm ehp-color-site-elevated ehp-color-site-text textsize-md leading-[1.2]">
        <div class="relative flex flex-none justify-end mb-sm">
          <button
            type="button"
            class="flex w-160px coarse:w-180px min-h-md coarse:min-h-64px items-center justify-between gap-md px-md rounded-md border ehp-color-site-border !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text font-inherit text-left textsize-md font-700 cursor-pointer [-webkit-tap-highlight-color:transparent]"
            aria-haspopup="menu"
            aria-expanded={categoryOpen()}
            onClick={() => setCategoryOpen((open) => !open)}
          >
            <span>{SETTINGS_SECTIONS.find(([tab]) => tab === activeTab())?.[1]}</span>
            <span aria-hidden="true">{categoryOpen() ? "▴" : "▾"}</span>
          </button>
          <Show when={categoryOpen()}>
            <div class="absolute top-full right-0 z-2 mt-xs w-160px coarse:w-180px overflow-hidden rounded-md border ehp-color-site-border ehp-color-site-elevated shadow-xl" role="menu">
              <For each={SETTINGS_SECTIONS}>{([tab, label]) => (
                <button
                  type="button"
                  class={`flex w-full min-h-md coarse:min-h-64px items-center px-md border-0 border-b last:border-b-0 ehp-color-site-border-subtle-b ehp-color-site-text font-inherit text-left textsize-md cursor-pointer [-webkit-tap-highlight-color:transparent] ${activeTab() === tab ? "bg-[var(--color-site-item-hover)] font-700" : "!bg-transparent hover:!bg-[var(--color-site-item-hover)]"}`}
                  role="menuitemradio"
                  aria-checked={activeTab() === tab}
                  onClick={() => {
                    setActiveTab(tab);
                    setCategoryOpen(false);
                  }}
                >
                  {label}
                </button>
              )}</For>
            </div>
          </Show>
        </div>
        <div class="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain">
          <Show when={activeTab() === "general"}>
            <SwitchButton
              checked={draft.readerEnabled}
              description={texts.settings.readerHelp}
              label={texts.settings.readerLabel}
              onChange={(value) => updateDraft("readerEnabled", value)}
            />
            <SwitchButton
              checked={draft.touchUiEnabled}
              description={texts.settings.touchUiHelp}
              label={texts.settings.touchUiLabel}
              onChange={(value) => updateDraft("touchUiEnabled", value)}
            />
            <a
              class="flex w-full min-h-md coarse:min-h-64px items-center gap-md px-md border-0 border-b ehp-color-site-border-subtle-b !bg-transparent hover:!bg-[var(--color-site-item-hover)] ehp-color-site-text no-underline text-left textsize-md cursor-pointer"
              href={props.historyHref}
            >
              {texts.settings.historyLabel}
            </a>
            <button
              type="button"
              class="flex w-full min-h-md coarse:min-h-64px items-center gap-md px-md border-0 border-b ehp-color-site-border-subtle-b !bg-transparent hover:!bg-[var(--color-site-item-hover)] ehp-color-site-text font-inherit text-left textsize-md cursor-pointer"
              onClick={() => setHelpOpen(true)}
            >
              <span>{texts.help.title}</span>
            </button>
          </Show>
          <Show when={activeTab() === "enhance"}>
            <SwitchButton
              checked={draft.enhanceSearchGridsEnabled}
              description={texts.settings.enhanceSearchHelp}
              label={texts.settings.enhanceSearchLabel}
              onChange={(value) => updateDraft("enhanceSearchGridsEnabled", value)}
            />
            <SwitchButton
              checked={draft.enhanceThumbsGridsEnabled}
              description={texts.settings.enhanceThumbsHelp}
              label={texts.settings.enhanceThumbsLabel}
              onChange={(value) => updateDraft("enhanceThumbsGridsEnabled", value)}
            />
            <SwitchButton
              checked={draft.myTagsEnabled}
              description={texts.settings.myTagsHelp}
              label={texts.settings.myTagsLabel}
              onChange={(value) => updateDraft("myTagsEnabled", value)}
            />
            <SwitchButton
              checked={draft.readHistoryEnabled}
              description={texts.settings.readHistoryHelp}
              label={texts.settings.readHistoryLabel}
              onChange={(value) => updateDraft("readHistoryEnabled", value)}
            />
            <SwitchButton
              checked={draft.searchHistoryEnabled}
              description={texts.settings.searchHistoryHelp}
              label={texts.settings.searchHistoryLabel}
              onChange={(value) => updateDraft("searchHistoryEnabled", value)}
            />
          </Show>
          <Show when={activeTab() === "options"}>
            <SwitchButton
              checked={draft.readerFullscreenEnabled}
              description={texts.settings.readerFullscreenHelp}
              label={texts.settings.readerFullscreenLabel}
              onChange={(value) => updateDraft("readerFullscreenEnabled", value)}
            />
            <SwitchButton
              checked={draft.openGalleryInNewTab}
              description={texts.settings.openGalleryInNewTabHelp}
              label={texts.settings.openGalleryInNewTabLabel}
              onChange={(value) => updateDraft("openGalleryInNewTab", value)}
            />
            <SwitchButton
              checked={draft.landscapeColumnsEnabled}
              description={texts.settings.landscapeColumnsHelp}
              label={texts.settings.landscapeColumnsLabel}
              onChange={(value) => updateDraft("landscapeColumnsEnabled", value)}
            />
            <SwitchButton
              checked={draft.includeUnreadHistoryEnabled}
              description={texts.settings.includeUnreadHistoryHelp}
              label={texts.settings.includeUnreadHistoryLabel}
              onChange={(value) => updateDraft("includeUnreadHistoryEnabled", value)}
            />
          </Show>
          <Show when={activeTab() === "about"}>
            <div class="flex w-full min-h-md coarse:min-h-64px items-center px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text textsize-md font-700">
              Ehpeek
            </div>
            <a
              class="flex w-full min-h-md coarse:min-h-88px items-center overflow-hidden text-ellipsis whitespace-nowrap px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text no-underline textsize-md font-700 hover:bg-[var(--color-site-item-hover)]"
              href="https://github.com/yamipot/ehpeek"
              target="_blank"
              rel="noopener noreferrer"
            >
              v{__EHPEEK_VERSION__}
            </a>
          </Show>
        </div>
        <div class="ehpeek-settings-actions grid grid-cols-3 flex-none gap-sm mt-md pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]">
          <button
            type="button"
            class={`ehpeek-settings-apply ${SETTINGS_ACTION_BUTTON_CLASS} ${SETTINGS_APPLY_BUTTON_COLOR}`}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              props.onApply({ ...draft });
            }}
          >
            {texts.button.apply}
          </button>
          <button
            type="button"
            class={`ehpeek-settings-default ${SETTINGS_ACTION_BUTTON_CLASS} ${SETTINGS_CLOSE_BUTTON_COLOR}`}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              setChanged(true);
              setDraft({ ...props.defaultState });
            }}
          >
            {texts.button.default}
          </button>
          <button
            type="button"
            class={`ehpeek-settings-close ${SETTINGS_ACTION_BUTTON_CLASS} ${SETTINGS_CLOSE_BUTTON_COLOR}`}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              close();
            }}
          >
            {texts.button.close}
          </button>
        </div>
        <Show when={helpOpen()}>
          <InteractionHelp variant="site" onClose={() => setHelpOpen(false)} />
        </Show>
      </div>
    </Show>
  );
}
