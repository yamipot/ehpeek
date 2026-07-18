import { createEffect, createSignal, onMount } from "solid-js";
import * as eh from "../../eh";
import type { TouchSearchPanelInfo } from "../../eh";
import texts from "../../texts.json";
import { Icon } from "../Widgets/Icon";

export const TOUCH_SEARCH_OPTION_CLASS =
  "appearance-none inline-flex min-h-md items-center px-md border-0 rounded-md bg-transparent ehp-color-site-accent text-left textsize-md font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]";

const TOUCH_SEARCH_ACTION_CLASS =
  "appearance-none inline-flex box-border w-60px h-60px items-center justify-center p-0 rounded-md border-0 bg-transparent cursor-pointer transition-[background-color,transform] duration-120 [touch-action:manipulation] active:(scale-96 bg-[var(--color-site-item-hover)])";

export function prepareSearchPanel(source: TouchSearchPanelInfo): void {
  eh.prepareTouchSearchPanel(source, TOUCH_SEARCH_OPTION_CLASS);
}

export function TouchSearchPanel(props: { source: TouchSearchPanelInfo }) {
  let searchBoxHost!: HTMLDivElement;
  let fileSearchHost!: HTMLDivElement;

  onMount(() => {
    searchBoxHost.replaceChildren(props.source.searchBox);

    if (props.source.fileSearch) {
      fileSearchHost.replaceChildren(props.source.fileSearch);
    }
  });

  return (
    <section class="ehpeek-touch-search-panel box-border flex w-[calc(100%_-_32px)] max-w-960px flex-col gap-md mx-auto mb-lg p-lg border ehp-color-site-border rounded-lg ehp-color-site-surface ehp-color-site-text shadow-[0_8px_24px_var(--color-shadow-panel)] font-sans">
      <div ref={searchBoxHost} class="contents" />
      <div ref={fileSearchHost} class="contents" />
    </section>
  );
}

export function TouchSearchCategoryToggle(props: { source: TouchSearchPanelInfo }) {
  const [categoriesOpen, setCategoriesOpen] = createSignal(false);

  createEffect(() => {
    const open = categoriesOpen();
    props.source.categories.classList.toggle("hidden", !open);
    props.source.categories.hidden = !open;
    props.source.categories.setAttribute("aria-hidden", String(!open));
  });

  return (
    <button
      type="button"
      class={TOUCH_SEARCH_OPTION_CLASS}
      aria-expanded={categoriesOpen()}
      aria-label={categoriesOpen() ? texts.search.hideCategories : texts.search.showCategories}
      onClick={() => {
        setCategoriesOpen((open) => !open);
      }}
    >
      {categoriesOpen() ? texts.search.hideCategories : texts.search.showCategories}
    </button>
  );
}

export function TouchSearchAction(props: { action: "search" | "clear"; source: TouchSearchPanelInfo }) {
  let originalHost!: HTMLSpanElement;
  const search = props.action === "search";
  const original = search ? props.source.searchSubmit : props.source.clearButton;

  onMount(() => {
    original.hidden = true;
    originalHost.replaceChildren(original);
  });

  return (
    <>
      <button
        type={search ? "submit" : "button"}
        class={
          search
            ? `${TOUCH_SEARCH_ACTION_CLASS} z-1 col-start-3 row-start-1 ehp-color-site-accent`
            : `${TOUCH_SEARCH_ACTION_CLASS} z-1 col-start-2 row-start-1 ehp-color-site-text`
        }
        aria-label={search ? props.source.searchLabel : props.source.clearLabel}
        title={search ? props.source.searchLabel : props.source.clearLabel}
        onClick={(event: MouseEvent) => {
          if (search) {
            event.preventDefault();
            original.click();
            return;
          }

          props.source.searchInput.value = "";
          props.source.searchInput.dispatchEvent(new Event("input", { bubbles: true }));
          props.source.searchInput.focus();
        }}
      >
        <Icon name={search ? "search" : "close"} size={32} />
      </button>
      <span ref={originalHost} class="contents [&>*:not([hidden])]:col-span-full" />
    </>
  );
}
