import {
  createEffect,
  createSignal,
  For,
  onCleanup,
  onMount,
  Show,
  untrack,
  type Accessor,
} from "solid-js";
import { createStore } from "solid-js/store";
import texts, {
  APP_LOCALE_OPTIONS,
  type AppLocale,
} from "../i18n";
import {
  UI_SCALE_NAMES,
  type UiScale,
  uiScaleLevel,
} from "../ui";
import { InteractionHelp } from "./InteractionHelp";
import { Dialog } from "./Widgets/Dialog";
import { Icon, type IconName } from "./Widgets/Icon";

type SettingsMenuState = {
  locale: AppLocale;
  openGalleryInNewTab: boolean;
  readerEnabled: boolean;
  exitReaderOnFullscreenExit: boolean;
  readerFullscreenEnabled: boolean;
  replacePreviewWithScroll: boolean;
  enhanceThumbsGridsEnabled: boolean;
  enhanceSearchGridsEnabled: boolean;
  myTagsEnabled: boolean;
  readHistoryEnabled: boolean;
  includeUnreadHistoryEnabled: boolean;
  searchHistoryEnabled: boolean;
  touchUiEnabled: boolean;
  uiScale: UiScale;
};

type SettingsTab = "general" | "enhance" | "options" | "about";

const SETTINGS_SECTIONS: ReadonlyArray<readonly [SettingsTab, string, IconName]> = [
  ["general", texts.settings.general, "book-open"],
  ["enhance", texts.settings.enhance, "sparkles"],
  ["options", texts.settings.options, "settings"],
  ["about", texts.settings.about, "info"],
];

const SETTINGS_ACTION_BUTTON_CLASS =
  "block w-full min-h-[var(--ui-control-size-md)] ui-py-xs ui-px-md ui-rounded-md border cursor-pointer font-inherit text-center [font-size:var(--ui-font-size-md)] font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98";
const SETTINGS_APPLY_BUTTON_COLOR =
  "border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108";
const SETTINGS_CLOSE_BUTTON_COLOR =
  "border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]";
const SETTINGS_DOT_CLASS =
  "block flex-none ui-w-md ui-h-md rounded-full";
const UI_SCALE_OPTIONS = UI_SCALE_NAMES.map((value) => ({
  label: String(uiScaleLevel(value)),
  value,
}));
const LICENSES = [
  {
    href: "https://github.com/yamipot/ehpeek/blob/master/LICENSE",
    license: "MIT",
    name: "EhPeek",
  },
  {
    href: "https://github.com/solidjs/solid/blob/main/LICENSE",
    license: "MIT",
    name: "SolidJS",
  },
  {
    href: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
    license: "ISC",
    name: "Lucide Icons",
  },
  {
    href: "https://github.com/adobe/spectrum-design-data/blob/main/LICENSE",
    license: "Apache-2.0",
    name: "Adobe Spectrum Tokens",
  },
] as const;

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
          class="flex min-w-0 flex-1 min-h-[var(--ui-control-size-lg)] items-center justify-between ui-gap-md ui-py-sm ui-pl-md ui-pr-sm ui-rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text font-inherit text-left [font-size:var(--ui-font-size-md)] cursor-pointer [-webkit-tap-highlight-color:transparent]"
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            props.onChange(!props.checked);
          }}
        >
          <span>{props.label}</span>
          <span class="flex flex-none items-center ui-gap-sm">
            <span class="[font-size:var(--ui-font-size-sm)] opacity-70">{props.checked ? texts.settings.on : texts.settings.off}</span>
            <span class={`${SETTINGS_DOT_CLASS} ${props.checked ? "bg-[var(--color-state-on)]" : "bg-[var(--color-state-off)]"}`} />
          </span>
        </button>
        <button
          type="button"
          class="flex flex-none w-[var(--ui-control-size-sm)] min-h-[var(--ui-control-size-lg)] items-center justify-center p-0 ui-rounded-xs border-0 !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text cursor-pointer font-inherit [font-size:var(--ui-font-size-md)] font-700 [-webkit-tap-highlight-color:transparent]"
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            setHelpOpen((open) => !open);
          }}
        >
          <span class="flex w-[var(--ui-icon-size-md)] h-[var(--ui-icon-size-md)] items-center justify-center rounded-full border border-[var(--color-site-border-subtle)] leading-none">?</span>
        </button>
      </div>
      <Show when={helpOpen()}>
        <p
          class="box-border w-full m-0 ui-px-md ui-pb-md text-left whitespace-normal [overflow-wrap:anywhere] [contain:inline-size] [font-size:var(--ui-font-size-sm)] leading-[1.35] opacity-75"
        >
          {props.description}
        </p>
      </Show>
    </div>
  );
}

function SelectSetting<T extends string>(props: {
  label: string;
  noTranslate?: boolean;
  onChange: (value: T) => void;
  options: ReadonlyArray<{ label: string; value: T }>;
  value: T;
}) {
  return (
    <label
      class="flex box-border w-full min-h-[var(--ui-control-size-lg)] items-center justify-between ui-gap-md ui-px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text [font-size:var(--ui-font-size-md)] cursor-pointer"
      translate={props.noTranslate ? "no" : undefined}
    >
      <span>{props.label}</span>
      <select
        class="box-border min-h-[var(--ui-control-size-sm)] min-w-[calc(var(--ui-control-size-xl)*2)] ui-px-sm ui-rounded-xs border ehp-color-site-border bg-[var(--color-site-surface)] ehp-color-site-text font-inherit [font-size:var(--ui-font-size-sm)] cursor-pointer"
        value={props.value}
        onChange={(event) => {
          const value = props.options.find(
            (option) => option.value === event.currentTarget.value,
          )?.value;
          if (value) {
            props.onChange(value);
          }
        }}
      >
        <For each={props.options}>{(option) => (
          <option value={option.value}>{option.label}</option>
        )}</For>
      </select>
    </label>
  );
}

export function SettingsMenu(props: {
  historyHref: string;
  leftHandedControls: Accessor<boolean>;
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
  const [helpOpen, setHelpOpen] = createSignal(false);
  const [licensesOpen, setLicensesOpen] = createSignal(false);
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
      setDraft(untrack(() => ({ ...props.initState })));
      setActiveTab("general");
      setHelpOpen(false);
      setLicensesOpen(false);
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
      <div
        ref={menu}
        class="pointer-events-auto fixed safe-top-sm safe-right-sm z-overlay box-border flex w-[calc(var(--ui-control-size-xl)*6)] max-w-[calc(100vw-16px)] max-h-[calc(100dvh-16px)] flex-col overflow-hidden ui-p-md border ehp-color-site-border ui-rounded-sm ehp-color-site-elevated ehp-color-site-text [font-size:var(--ui-font-size-md)] leading-[1.2]"
        classList={{
          "!right-auto safe-left-sm": props.leftHandedControls(),
        }}
      >
        <div
          class="grid grid-cols-4 flex-none ui-gap-xs ui-mb-sm ui-rounded-md border ehp-color-site-border overflow-hidden"
          role="tablist"
          aria-label={texts.settings.openSettings}
        >
          <For each={SETTINGS_SECTIONS}>{([tab, label, icon]) => (
            <button
              type="button"
              class={`flex min-w-0 min-h-[var(--ui-control-size-md)] items-center justify-center ui-gap-sm ui-px-sm border-0 ehp-color-site-text font-inherit [font-size:var(--ui-font-size-sm)] cursor-pointer ${activeTab() === tab ? "bg-[var(--color-site-item-hover)] font-700" : "bg-transparent hover:bg-[var(--color-site-item-hover)]"}`}
              role="tab"
              aria-selected={activeTab() === tab}
              aria-controls={`ehpeek-settings-panel-${tab}`}
              title={label}
              onClick={() => setActiveTab(tab)}
            >
              <Icon name={icon} size="var(--ui-icon-size-md)" />
            </button>
          )}</For>
        </div>
        <div class="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain">
          <h2 class="m-0 ui-px-md ui-py-sm border-0 border-b ehp-color-site-border-subtle-b [font-size:var(--ui-font-size-md)] font-700">
            {SETTINGS_SECTIONS.find(([tab]) => tab === activeTab())?.[1]}
          </h2>
          <div
            id="ehpeek-settings-panel-general"
            data-ehpeek-settings-tab="general"
            role="tabpanel"
            hidden={activeTab() !== "general"}
          >
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
            <Show when={draft.readHistoryEnabled}>
              <a
                class="flex w-full min-h-[var(--ui-control-size-lg)] items-center ui-gap-md ui-px-md border-0 border-b ehp-color-site-border-subtle-b !bg-transparent hover:!bg-[var(--color-site-item-hover)] ehp-color-site-text no-underline text-left [font-size:var(--ui-font-size-md)] cursor-pointer"
                href={props.historyHref}
              >
                {texts.settings.historyLabel}
              </a>
            </Show>
          </div>
          <div
            id="ehpeek-settings-panel-enhance"
            data-ehpeek-settings-tab="enhance"
            role="tabpanel"
            hidden={activeTab() !== "enhance"}
          >
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
              checked={draft.replacePreviewWithScroll}
              description={texts.settings.replacePreviewWithScrollHelp}
              label={texts.settings.replacePreviewWithScrollLabel}
              onChange={(value) => updateDraft("replacePreviewWithScroll", value)}
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
          </div>
          <div
            id="ehpeek-settings-panel-options"
            data-ehpeek-settings-tab="options"
            role="tabpanel"
            hidden={activeTab() !== "options"}
          >
            <SwitchButton
              checked={draft.readerFullscreenEnabled}
              description={texts.settings.readerFullscreenHelp}
              label={texts.settings.readerFullscreenLabel}
              onChange={(value) => updateDraft("readerFullscreenEnabled", value)}
            />
            <SwitchButton
              checked={draft.exitReaderOnFullscreenExit}
              description={texts.settings.exitReaderOnFullscreenExitHelp}
              label={texts.settings.exitReaderOnFullscreenExitLabel}
              onChange={(value) => updateDraft("exitReaderOnFullscreenExit", value)}
            />
            <SwitchButton
              checked={draft.openGalleryInNewTab}
              description={texts.settings.openGalleryInNewTabHelp}
              label={texts.settings.openGalleryInNewTabLabel}
              onChange={(value) => updateDraft("openGalleryInNewTab", value)}
            />
            <SwitchButton
              checked={draft.includeUnreadHistoryEnabled}
              description={texts.settings.includeUnreadHistoryHelp}
              label={texts.settings.includeUnreadHistoryLabel}
              onChange={(value) => updateDraft("includeUnreadHistoryEnabled", value)}
            />
            <SelectSetting
              label={texts.settings.uiScaleLabel}
              options={UI_SCALE_OPTIONS}
              value={draft.uiScale}
              onChange={(value) => {
                setChanged(true);
                setDraft("uiScale", value);
              }}
            />
            <SelectSetting
              label="Language"
              noTranslate
              options={APP_LOCALE_OPTIONS}
              value={draft.locale}
              onChange={(value) => {
                setChanged(true);
                setDraft("locale", value);
              }}
            />
          </div>
          <div
            id="ehpeek-settings-panel-about"
            data-ehpeek-settings-tab="about"
            role="tabpanel"
            hidden={activeTab() !== "about"}
          >
            <div class="flex w-full min-h-[var(--ui-control-size-lg)] items-center ui-px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text [font-size:var(--ui-font-size-md)] font-700">
              {__EHPEEK_NAME__}
            </div>
            <a
              class="flex w-full min-h-[var(--ui-control-size-lg)] items-center overflow-hidden text-ellipsis whitespace-nowrap ui-px-md border-0 border-b ehp-color-site-border-subtle-b ehp-color-site-text no-underline [font-size:var(--ui-font-size-md)] font-700 hover:bg-[var(--color-site-item-hover)]"
              href="https://github.com/yamipot/ehpeek"
              target="_blank"
              rel="noopener noreferrer"
            >
              v{__EHPEEK_VERSION__}
            </a>
            <button
              type="button"
              class="flex w-full min-h-[var(--ui-control-size-lg)] items-center ui-gap-md ui-px-md border-0 border-b ehp-color-site-border-subtle-b !bg-transparent hover:!bg-[var(--color-site-item-hover)] ehp-color-site-text font-inherit text-left [font-size:var(--ui-font-size-md)] cursor-pointer"
              onClick={() => setHelpOpen(true)}
            >
              <span>{texts.help.title}</span>
            </button>
            <button
              type="button"
              class="flex w-full min-h-[var(--ui-control-size-lg)] items-center justify-between ui-gap-md ui-px-md border-0 border-b ehp-color-site-border-subtle-b !bg-transparent hover:!bg-[var(--color-site-item-hover)] ehp-color-site-text font-inherit text-left [font-size:var(--ui-font-size-md)] cursor-pointer"
              onClick={() => setLicensesOpen(true)}
            >
              <span>{texts.settings.licenses}</span>
              <span class="flex flex-none" aria-hidden="true">
                <Icon name="chevron-right" size="var(--ui-icon-size-sm)" />
              </span>
            </button>
          </div>
        </div>
        <div class="grid grid-cols-3 flex-none ui-gap-sm ui-mt-md ui-pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]">
          <button
            type="button"
            class={`${SETTINGS_ACTION_BUTTON_CLASS} ${SETTINGS_APPLY_BUTTON_COLOR}`}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              props.onApply({ ...draft });
            }}
          >
            {texts.common.actions.apply}
          </button>
          <button
            type="button"
            class={`${SETTINGS_ACTION_BUTTON_CLASS} ${SETTINGS_CLOSE_BUTTON_COLOR}`}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              setChanged(true);
              setDraft({ ...props.defaultState });
            }}
          >
            {texts.common.actions.default}
          </button>
          <button
            type="button"
            class={`${SETTINGS_ACTION_BUTTON_CLASS} ${SETTINGS_CLOSE_BUTTON_COLOR}`}
            onClick={(event: MouseEvent) => {
              event.stopPropagation();
              close();
            }}
          >
            {texts.common.actions.close}
          </button>
        </div>
        <Show when={helpOpen()}>
          <InteractionHelp variant="site" onClose={() => setHelpOpen(false)} />
        </Show>
      </div>
      <Show when={licensesOpen()}>
        <Dialog
          label={texts.settings.licenses}
          onClose={() => setLicensesOpen(false)}
          title={texts.settings.licenses}
          variant="site"
          width="lg"
        >
          <For each={LICENSES}>{(license) => (
            <a
              class="flex min-h-[var(--ui-control-size-lg)] items-center justify-between ui-gap-md ui-px-md ui-py-sm border-0 border-b last:border-b-0 ehp-color-site-border-subtle-b !bg-transparent hover:!bg-[var(--color-site-item-hover)] ehp-color-site-text no-underline text-left"
              href={license.href}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span class="min-w-0 [font-size:var(--ui-font-size-md)] font-700">
                {license.name}
              </span>
              <span class="flex flex-none items-center ui-gap-sm [font-size:var(--ui-font-size-sm)]">
                {license.license}
                <Icon name="external-link" size="var(--ui-icon-size-sm)" />
              </span>
            </a>
          )}</For>
        </Dialog>
      </Show>
    </Show>
  );
}
