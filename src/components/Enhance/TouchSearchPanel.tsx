import { Fragment, h } from "preact";
import { useLayoutEffect, useRef, useState } from "preact/hooks";
import type { TouchSearchPanelInfo } from "../../eh/dom";
import { state } from "../../state";
import texts from "../../texts.json";
import { Icon } from "../Icon";

export const TOUCH_SEARCH_OPTION_CLASS =
  "appearance-none inline-flex min-h-md items-center px-md border-0 rounded-md bg-transparent ehp-color-site-accent text-left textsize-md font-700 font-inherit leading-[1.2] no-underline cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-accent-hover)]";

const TOUCH_SEARCH_ACTION_CLASS =
  "appearance-none inline-flex box-border w-60px h-60px items-center justify-center p-0 rounded-md border-0 bg-transparent cursor-pointer transition-[background-color,transform] duration-120 [touch-action:manipulation] active:(scale-96 bg-[var(--color-site-item-hover)])";

export function TouchSearchPanel(props: { source: TouchSearchPanelInfo }) {
  const searchBoxHostRef = useRef<HTMLDivElement>(null);
  const fileSearchHostRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    searchBoxHostRef.current?.replaceChildren(props.source.searchBox);

    if (props.source.fileSearch) {
      fileSearchHostRef.current?.replaceChildren(props.source.fileSearch);
    }
  }, [props.source]);

  return (
    <section className="ehpeek-touch-search-panel box-border flex w-[calc(100%_-_32px)] max-w-960px flex-col gap-md mx-auto mb-lg p-lg border ehp-color-site-border rounded-lg ehp-color-site-surface ehp-color-site-text shadow-[0_8px_24px_var(--color-shadow-panel)] font-sans">
      <div ref={searchBoxHostRef} className="contents" />
      <div ref={fileSearchHostRef} className="contents" />
    </section>
  );
}

export function TouchSearchCategoryToggle(props: { source: TouchSearchPanelInfo }) {
  const [categoriesOpen, setCategoriesOpen] = useState(false);

  useLayoutEffect(() => {
    props.source.categories.classList.toggle("hidden", !categoriesOpen);
    props.source.categories.hidden = !categoriesOpen;
    props.source.categories.setAttribute("aria-hidden", String(!categoriesOpen));
  }, [categoriesOpen, props.source.categories]);

  return (
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
    </button>
  );
}

export function TouchSearchAction(props: { action: "search" | "clear"; source: TouchSearchPanelInfo }) {
  const originalHostRef = useRef<HTMLSpanElement>(null);
  const search = props.action === "search";
  const original = search ? props.source.searchSubmit : props.source.clearButton;

  useLayoutEffect(() => {
    original.hidden = true;
    originalHostRef.current?.replaceChildren(original);
  }, [original]);

  return (
    <Fragment>
      <button
        type={search ? "submit" : "button"}
        className={
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
      <span ref={originalHostRef} className="contents [&>*:not([hidden])]:col-span-full" />
    </Fragment>
  );
}

export function TouchSearchHistory(props: { source: TouchSearchPanelInfo }) {
  const dropdownRef = useRef<HTMLElement>(null);
  const [searchValue, setSearchValue] = useState(props.source.searchInput.value);
  const [history, setHistory] = useState<string[]>(() => state.search.history.reload());
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<{ left: number; top: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const input = props.source.searchInput;
    const form = input.form;
    const updatePosition = () => {
      const rect = input.getBoundingClientRect();
      setPosition({
        left: rect.left + window.scrollX,
        top: rect.bottom + window.scrollY,
        width: rect.width,
      });
    };
    const showHistory = () => {
      updatePosition();
      setOpen(true);
    };
    const updateSearchValue = () => {
      setSearchValue(input.value);

      if (!input.value.trim() && document.activeElement === input) {
        showHistory();
      }
    };
    const recordSearch = () => {
      const value = input.value.trim();

      if (!value) {
        return;
      }

      const next = [value, ...state.search.history.value.filter((item) => item !== value)];
      state.search.history.set(next);
      setHistory(next);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (target === input || (target instanceof Node && dropdownRef.current?.contains(target))) {
        return;
      }

      setOpen(false);
    };

    input.addEventListener("input", updateSearchValue);
    input.addEventListener("focus", showHistory);
    input.addEventListener("pointerdown", showHistory);
    form?.addEventListener("submit", recordSearch);
    props.source.searchSubmit.addEventListener("click", recordSearch);
    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    document.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    updateSearchValue();

    return () => {
      input.removeEventListener("input", updateSearchValue);
      input.removeEventListener("focus", showHistory);
      input.removeEventListener("pointerdown", showHistory);
      form?.removeEventListener("submit", recordSearch);
      props.source.searchSubmit.removeEventListener("click", recordSearch);
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [props.source]);

  if (!open || searchValue.trim() || history.length === 0 || !position) {
    return null;
  }

  return (
    <section
      ref={dropdownRef}
      className="absolute z-ui flex box-border max-h-[50vh] min-w-0 flex-col overflow-hidden overflow-y-auto overscroll-contain rounded-md border ehp-color-site-border ehp-color-site-elevated ehp-color-site-text font-sans"
      style={{ left: `${position.left}px`, top: `${position.top}px`, width: `${position.width}px` }}
      aria-label={texts.search.history}
      role="list"
    >
      {history.map((item) => (
        <div
          key={item}
          className="flex min-w-0 flex-none items-stretch border-0 border-b ehp-color-site-border-subtle-b last:border-b-0"
          role="listitem"
        >
          <button
            type="button"
            className="appearance-none block min-w-0 min-h-md flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-md border-0 bg-transparent ehp-color-site-text text-left textsize-md font-inherit cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"
            title={item}
            onClick={() => {
              props.source.searchInput.value = item;
              props.source.searchInput.dispatchEvent(new Event("input", { bubbles: true }));
              props.source.searchInput.focus();
              props.source.searchInput.setSelectionRange(item.length, item.length);
              setOpen(false);
            }}
          >
            {item}
          </button>
          <button
            type="button"
            className="appearance-none inline-flex w-40px min-h-md flex-none items-center justify-center border-0 border-l ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-24px font-inherit leading-1 cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"
            aria-label={`${texts.search.deleteHistory}: ${item}`}
            title={texts.search.deleteHistory}
            onClick={() => {
              const next = history.filter((candidate) => candidate !== item);
              state.search.history.set(next);
              setHistory(next);
            }}
          >
            ×
          </button>
        </div>
      ))}
    </section>
  );
}
