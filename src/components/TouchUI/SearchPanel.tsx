import { createEffect, createSignal, untrack, type JSX } from "solid-js";
import type { SearchPanelDom } from "../../eh";
import texts from "../../texts.json";
import { DomNode } from "../Widgets/ExternalDom";
import { Icon } from "../Widgets/Icon";

const TOUCH_SEARCH_OPTION_CLASS =
  "appearance-none inline-flex min-h-md items-center px-md border-0 rounded-md bg-transparent ehp-color-site-accent text-left textsize-md font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]";
const TOUCH_SEARCH_ACTION_CLASS =
  "appearance-none inline-flex box-border w-60px h-60px items-center justify-center p-0 rounded-md border-0 bg-transparent cursor-pointer transition-[background-color,transform] duration-120 [touch-action:manipulation] active:(scale-96 bg-[var(--color-site-item-hover)])";

export function TouchSearchPanel(props: { after?: JSX.Element; source: SearchPanelDom }) {
  return (
    <section class="ehpeek-touch-search-panel box-border flex w-[calc(100%_-_32px)] max-w-960px flex-col gap-md mx-auto mb-lg p-lg border ehp-color-site-border rounded-lg ehp-color-site-surface ehp-color-site-text shadow-[0_8px_24px_var(--color-shadow-panel)] font-sans">
      <DomNode node={props.source.elems.searchBox} />
      <DomNode node={props.source.elems.fileSearch} />
      {props.after}
    </section>
  );
}

export function TouchSearchCategoryToggle(props: { source: SearchPanelDom }) {
  const [open, setOpen] = createSignal(false);
  createEffect(() => props.source.handle.updateCategoryVisibility(open()));
  return <ToggleButton expanded={open()} label={texts.search.categories} onClick={() => setOpen((value) => !value)} />;
}

export function TouchSearchOptionToggle(props: {
  option: "advancedOptions" | "fileSearch";
  source: SearchPanelDom;
}) {
  const [open, setOpen] = createSignal(false);
  const toggle = () => {
    if (props.option === "advancedOptions") {
      props.source.handle.toggleAdvancedOptions();
    } else {
      props.source.handle.toggleFileSearch();
    }
    setOpen((value) => !value);
  };
  return <ToggleButton expanded={open()} label={texts.search[props.option]} onClick={toggle} />;
}

function ToggleButton(props: { expanded: boolean; label: string; onClick: () => void }) {
  return (
    <button type="button" class={TOUCH_SEARCH_OPTION_CLASS} aria-expanded={props.expanded} onClick={() => props.onClick()}>
      {props.label}
    </button>
  );
}

export function TouchSearchAction(props: { action: "search" | "clear"; source: SearchPanelDom }) {
  const source = untrack(() => props.source);
  const search = untrack(() => props.action === "search");
  const label = search ? source.data.searchLabel : source.data.clearLabel ?? "";
  const original = search ? source.elems.searchSubmit : source.elems.clearButton;
  return (
    <>
      <button
        type={search ? "submit" : "button"}
        class={search
          ? `${TOUCH_SEARCH_ACTION_CLASS} z-1 ${source.data.hasClear ? "col-start-3" : "col-start-2"} row-start-1 ehp-color-site-accent`
          : `${TOUCH_SEARCH_ACTION_CLASS} z-1 col-start-2 row-start-1 ehp-color-site-text`}
        aria-label={label}
        title={label}
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          if (search) {
            source.handle.activateSearch();
          } else {
            source.handle.clearSearchText();
          }
        }}
      >
        <Icon name={search ? "search" : "close"} size={32} />
      </button>
      <span class="contents [&>*:not([hidden])]:col-span-full"><DomNode node={original} /></span>
    </>
  );
}
