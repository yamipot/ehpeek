import { Fragment, h } from "preact";
import { createPortal } from "preact/compat";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { TouchSearchPanelInfo } from "../../eh/dom";
import texts from "../../texts.json";

export const TOUCH_SEARCH_OPTION_CLASS =
  "appearance-none inline-flex min-h-sm items-center px-sm border-0 rounded-sm bg-transparent ehp-color-site-accent text-left textsize-sm font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]";

const TOUCH_SEARCH_ACTION_CLASS =
  "appearance-none block box-border w-auto !h-md py-sm px-md rounded-md border cursor-pointer font-inherit text-center textsize-sm font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 [touch-action:manipulation] active:scale-98";

export function TouchSearchPanel(props: { source: TouchSearchPanelInfo }) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const searchBoxHostRef = useRef<HTMLDivElement>(null);
  const fileSearchHostRef = useRef<HTMLDivElement>(null);
  const originalSearchHostRef = useRef<HTMLSpanElement>(null);
  const originalClearHostRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    searchBoxHostRef.current?.replaceChildren(props.source.searchBox);

    if (props.source.fileSearch) {
      fileSearchHostRef.current?.replaceChildren(props.source.fileSearch);
    }
  }, [props.source]);

  useLayoutEffect(() => {
    props.source.searchSubmit.hidden = true;
    props.source.clearButton.hidden = true;
    originalSearchHostRef.current?.replaceChildren(props.source.searchSubmit);
    originalClearHostRef.current?.replaceChildren(props.source.clearButton);
  }, [props.source]);

  useLayoutEffect(() => {
    props.source.categories.classList.toggle("hidden", !categoriesOpen);
    props.source.categories.hidden = !categoriesOpen;
    props.source.categories.setAttribute("aria-hidden", String(!categoriesOpen));
  }, [categoriesOpen, props.source.categories]);

  return (
    <Fragment>
      <section className="ehpeek-touch-search-panel box-border flex w-[calc(100%_-_32px)] max-w-960px flex-col gap-md mx-auto mb-lg p-lg border ehp-color-site-border rounded-lg ehp-color-site-surface ehp-color-site-text shadow-[0_8px_24px_var(--color-shadow-panel)] font-sans">
        <div ref={searchBoxHostRef} className="contents" />
        <div ref={fileSearchHostRef} className="contents" />
      </section>
      {createPortal(
        <button
          type="button"
          className={TOUCH_SEARCH_OPTION_CLASS}
          aria-expanded={categoriesOpen}
          aria-label={categoriesOpen ? texts.search.hideCategories : texts.search.showCategories}
          onClick={() => {
            setCategoriesOpen(!categoriesOpen);
          }}
        >
          {categoriesOpen ? texts.search.hideCategories : texts.search.showCategories}
        </button>,
        props.source.categoryToggleMount,
      )}
      {createPortal(
        <Fragment>
          <button
            type="submit"
            className={`${TOUCH_SEARCH_ACTION_CLASS} col-start-2 row-start-1 border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-background)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108`}
            onClick={(event: MouseEvent) => {
              event.preventDefault();
              props.source.searchSubmit.click();
            }}
          >
            {props.source.searchSubmit.value}
          </button>
          <span ref={originalSearchHostRef} className="contents [&>*:not([hidden])]:col-span-full" />
        </Fragment>,
        props.source.searchActionMount,
      )}
      {createPortal(
        <Fragment>
          <button
            type="button"
            className={`${TOUCH_SEARCH_ACTION_CLASS} col-start-3 row-start-1 border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] ehp-color-site-text hover:bg-[var(--color-site-item-hover)]`}
            onClick={() => {
              props.source.clearButton.click();
            }}
          >
            {props.source.clearButton.value}
          </button>
          <span ref={originalClearHostRef} className="contents [&>*:not([hidden])]:col-span-full" />
        </Fragment>,
        props.source.clearActionMount,
      )}
    </Fragment>
  );
}
