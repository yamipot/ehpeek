import { createEffect, createSignal, untrack, type JSX } from "solid-js";
import type { SearchPanelClasses, SearchPanelDom } from "../../eh";
import texts from "../../texts.json";
import { DomNode } from "../Widgets/ExternalDom";
import { Icon } from "../Widgets/Icon";

const TOUCH_SEARCH_OPTION_CLASS =
  "appearance-none inline-flex min-h-md items-center px-md border-0 rounded-md bg-transparent ehp-color-site-accent text-left textsize-md font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]";
const TOUCH_SEARCH_ACTION_CLASS =
  "appearance-none inline-flex box-border w-60px h-60px items-center justify-center p-0 rounded-md border-0 bg-transparent cursor-pointer transition-[background-color,transform] duration-120 [touch-action:manipulation] active:(scale-96 bg-[var(--color-site-item-hover)])";

export function touchSearchPanelClasses(hasClear: boolean): SearchPanelClasses {
  return {
    actionMount: "contents",
    advancedPanel: "box-border w-full !p-0 ehp-color-site-text",
    category:
      "flex box-border w-full min-w-0 !h-lg items-center justify-center px-md border rounded-md text-white text-center textsize-md font-700 leading-[1.15] whitespace-nowrap shadow-[0_2px_6px_var(--color-shadow-control)] cursor-pointer select-none transition-opacity [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] active:opacity-70 [&[data-disabled]]:opacity-40",
    categoryCell: "!p-0",
    categoryRow: "contents",
    categoryTable: "!w-full !m-0 border-collapse [&>tbody]:grid [&>tbody]:grid-cols-[repeat(auto-fit,minmax(140px,1fr))] [&>tbody]:gap-xs",
    controls: `${hasClear ? "grid-cols-[minmax(0,1fr)_60px_60px]" : "grid-cols-[minmax(0,1fr)_60px]"} grid w-full items-start gap-0 !p-0`,
    fileSearch:
      "box-border !w-full !m-0 !mt-0 p-lg border ehp-color-site-border rounded-md bg-[var(--color-site-elevated)] ehp-color-site-text !textsize-md text-left [&_form]:flex [&_form]:flex-col [&_form]:gap-sm [&_form>div]:!p-0 [&_.searchadv>div]:!flex-wrap [&_.searchadv>div]:!justify-start [&_.searchadv>div]:!gap-sm [&_.searchadv>div>div]:!p-sm",
    form: "flex w-full flex-col gap-md m-0 p-0",
    input:
      `appearance-none !box-border !w-full !h-60px min-w-0 col-span-full row-start-1 !m-0 !py-0 !pl-lg ${hasClear ? "!pr-[132px]" : "!pr-[72px]"} ` +
      "!border !border-[var(--color-site-border)] rounded-md !bg-[var(--color-site-elevated)] !text-[var(--color-site-text)] !text-[length:var(--font-size-md)] leading-[1.2] outline-none focus:(!border-[var(--color-site-accent)] !bg-[var(--color-site-elevated)] shadow-[0_0_0_3px_var(--color-site-accent-hover)])",
    optionLink: TOUCH_SEARCH_OPTION_CLASS,
    optionLinks: "flex w-full flex-wrap items-center justify-start gap-x-md gap-y-sm !p-0 !text-0",
    searchBox:
      "box-border !w-full !m-0 !p-0 !border-0 !text-left !textsize-md [&_.searchadv]:box-border [&_.searchadv]:!w-full [&_.searchadv]:!pt-md [&_.searchadv]:!textsize-md [&_.searchadv>div]:!flex-wrap [&_.searchadv>div]:!justify-start [&_.searchadv>div]:!gap-sm [&_.searchadv>div>div]:!p-sm",
  };
}

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

export function TouchSearchFileToggle(props: { source: SearchPanelDom }) {
  const [open, setOpen] = createSignal(false);
  createEffect(() => props.source.handle.updateFileSearchVisibility(open()));
  return <ToggleButton expanded={open()} label={texts.search.fileSearch} onClick={() => setOpen((value) => !value)} />;
}

export function TouchSearchAdvancedToggle(props: { source: SearchPanelDom }) {
  const [open, setOpen] = createSignal(false);
  createEffect(() => props.source.handle.updateAdvancedOptionsVisibility(open()));
  return <ToggleButton expanded={open()} label={texts.search.advancedOptions} onClick={() => setOpen((value) => !value)} />;
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
            source.handle.submitSearchForm();
          } else {
            source.handle.clearSearchInput();
          }
        }}
      >
        <Icon name={search ? "search" : "close"} size={32} />
      </button>
      <span class="contents [&>*:not([hidden])]:col-span-full"><DomNode node={original} /></span>
    </>
  );
}
