import { createEffect, createSignal, onCleanup, onMount, Show, untrack } from "solid-js";
import { createStore } from "solid-js/store";
import texts from "../texts.json";

type SettingsMenuState = {
  openGalleryInNewTab: boolean;
  singlePageAppEnabled: boolean;
  readerEnabled: boolean;
  readerFullscreenEnabled: boolean;
  enhanceThumbsGridsEnabled: boolean;
  enhanceSearchGridsEnabled: boolean;
  myTagsEnabled: boolean;
  readHistoryEnabled: boolean;
  searchHistoryEnabled: boolean;
  touchUiEnabled: boolean;
};

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
  disabled?: boolean;
  label: string;
  onChange: (value: boolean) => void;
}) {
  const [helpOpen, setHelpOpen] = createSignal(false);

  return (
    <div class="border-0 border-b ehp-color-site-border-subtle-b">
      <div class="flex items-stretch">
        <button
          type="button"
          class={`flex min-w-0 flex-1 min-h-md coarse:min-h-88px items-center justify-between gap-md coarse:gap-xl py-sm coarse:py-lg pl-md pr-sm rounded-xs border-0 !bg-transparent hover:!bg-transparent active:!bg-transparent ehp-color-site-text font-inherit text-left textsize-md [-webkit-tap-highlight-color:transparent] ${props.disabled ? "cursor-not-allowed opacity-45" : "cursor-pointer"}`}
          disabled={props.disabled}
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
  open: boolean;
  defaultState: SettingsMenuState;
  initState: SettingsMenuState;
  onApply: (state: SettingsMenuState) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = createStore<SettingsMenuState>(
    untrack(() => ({ ...props.initState })),
  );
  const [readerOptionsOpen, setReaderOptionsOpen] = createSignal(false);
  const [enhanceOpen, setEnhanceOpen] = createSignal(false);
  let menu!: HTMLDivElement;
  const close = () => {
    props.onOpenChange(false);
  };

  createEffect(() => {
    if (props.open) {
      setDraft({ ...props.initState });
      setReaderOptionsOpen(false);
      setEnhanceOpen(false);
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

      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!props.open) {
        return;
      }

      if (event.key === "Escape") {
        close();
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
      <div ref={menu} class="ehpeek-settings-menu pointer-events-auto fixed top-24px right-24px coarse:top-8px coarse:right-8px z-overlay box-border w-320px coarse:w-[calc(100vw-16px)] max-w-[calc(100vw-48px)] coarse:max-w-480px max-h-[calc(100vh-48px)] coarse:max-h-[calc(100dvh-16px)] overflow-x-hidden overflow-y-auto p-sm coarse:p-md border ehp-color-site-border rounded-sm ehp-color-site-elevated ehp-color-site-text textsize-md leading-[1.2]">
        <SwitchButton
          checked={draft.readerEnabled}
          description={texts.settings.readerHelp}
          label={texts.settings.readerLabel}
          onChange={(value) => setDraft("readerEnabled", value)}
        />
        <SwitchButton
          checked={draft.touchUiEnabled}
          description={texts.settings.touchUiHelp}
          label={texts.settings.touchUiLabel}
          onChange={(value) => setDraft("touchUiEnabled", value)}
        />
        <SwitchButton
          checked={draft.singlePageAppEnabled}
          description={texts.settings.singlePageAppHelp}
          disabled={!draft.touchUiEnabled}
          label={texts.settings.singlePageApp}
          onChange={(value) => setDraft("singlePageAppEnabled", value)}
        />
        <div class="border-0 border-b ehp-color-site-border-subtle-b">
          <button
            type="button"
            class="flex w-full min-h-md coarse:min-h-88px items-center justify-between gap-md coarse:gap-xl py-sm coarse:py-lg px-md rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text cursor-pointer font-inherit text-left textsize-md font-700 [-webkit-tap-highlight-color:transparent]"
            aria-expanded={readerOptionsOpen()}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              setReaderOptionsOpen((open) => !open);
            }}
          >
            <span>{texts.settings.readerOptions}</span>
            <span class="flex w-20px h-20px items-center justify-center leading-none" aria-hidden="true">
              {readerOptionsOpen() ? "−" : "+"}
            </span>
          </button>
          <Show when={readerOptionsOpen()}>
            <div class="ml-md border-0 border-l border-l-[var(--color-site-border-subtle)]">
              <SwitchButton
                checked={draft.readerFullscreenEnabled}
                description={texts.settings.readerFullscreenHelp}
                label={texts.settings.readerFullscreenLabel}
                onChange={(value) => setDraft("readerFullscreenEnabled", value)}
              />
              <SwitchButton
                checked={draft.openGalleryInNewTab}
                description={texts.settings.openGalleryInNewTabHelp}
                label={texts.settings.openGalleryInNewTabLabel}
                onChange={(value) => setDraft("openGalleryInNewTab", value)}
              />
            </div>
          </Show>
        </div>
        <div class="border-0 border-b ehp-color-site-border-subtle-b">
          <button
            type="button"
            class="flex w-full min-h-md coarse:min-h-88px items-center justify-between gap-md coarse:gap-xl py-sm coarse:py-lg px-md rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text cursor-pointer font-inherit text-left textsize-md font-700 [-webkit-tap-highlight-color:transparent]"
            aria-expanded={enhanceOpen()}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              setEnhanceOpen((open) => !open);
            }}
          >
            <span>{texts.settings.enhance}</span>
            <span class="flex w-20px h-20px items-center justify-center leading-none" aria-hidden="true">
              {enhanceOpen() ? "−" : "+"}
            </span>
          </button>
          <Show when={enhanceOpen()}>
            <div class="ml-md border-0 border-l border-l-[var(--color-site-border-subtle)]">
              <SwitchButton
                checked={draft.enhanceSearchGridsEnabled}
                description={texts.settings.enhanceSearchHelp}
                label={texts.settings.enhanceSearchLabel}
                onChange={(value) => setDraft("enhanceSearchGridsEnabled", value)}
              />
              <SwitchButton
                checked={draft.enhanceThumbsGridsEnabled}
                description={texts.settings.enhanceThumbsHelp}
                label={texts.settings.enhanceThumbsLabel}
                onChange={(value) => setDraft("enhanceThumbsGridsEnabled", value)}
              />
              <SwitchButton
                checked={draft.myTagsEnabled}
                description={texts.settings.myTagsHelp}
                label={texts.settings.myTagsLabel}
                onChange={(value) => setDraft("myTagsEnabled", value)}
              />
              <SwitchButton
                checked={draft.readHistoryEnabled}
                description={texts.settings.readHistoryHelp}
                label={texts.settings.readHistoryLabel}
                onChange={(value) => setDraft("readHistoryEnabled", value)}
              />
              <SwitchButton
                checked={draft.searchHistoryEnabled}
                description={texts.settings.searchHistoryHelp}
                label={texts.settings.searchHistoryLabel}
                onChange={(value) => setDraft("searchHistoryEnabled", value)}
              />
            </div>
          </Show>
        </div>
        <a
          class="flex w-full min-h-md coarse:min-h-88px items-center overflow-hidden text-ellipsis whitespace-nowrap px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text no-underline textsize-md font-700 hover:bg-[var(--color-site-item-hover)]"
          href="https://github.com/yamipot/ehpeek"
          target="_blank"
          rel="noopener noreferrer"
        >
          v{__EHPEEK_VERSION__}
        </a>
        <div class="ehpeek-settings-actions grid grid-cols-3 gap-sm mt-md pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]">
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
      </div>
    </Show>
  );
}
