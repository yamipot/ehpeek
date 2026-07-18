import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { SearchHistorySource } from "../../eh";
import texts from "../../texts.json";

const SEARCH_HISTORY_KEY = "ehpeek:search:history";

export function SearchHistory(props: { source: SearchHistorySource }) {
  let dropdown: HTMLElement | undefined;
  const [searchValue, setSearchValue] = createSignal(props.source.searchInput.value);
  const [history, setHistory] = createSignal<string[]>(loadSearchHistory());
  const [open, setOpen] = createSignal(false);
  const [position, setPosition] = createSignal<{ left: number; top: number; width: number } | null>(null);
  const visiblePosition = () => open() && !searchValue().trim() && history().length > 0 ? position() : null;

  onMount(() => {
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

      const next = [value, ...loadSearchHistory().filter((item) => item !== value)];
      saveSearchHistory(next);
      setHistory(next);
    };
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;

      if (target === input || (target instanceof Node && dropdown?.contains(target))) {
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

    onCleanup(() => {
      input.removeEventListener("input", updateSearchValue);
      input.removeEventListener("focus", showHistory);
      input.removeEventListener("pointerdown", showHistory);
      form?.removeEventListener("submit", recordSearch);
      props.source.searchSubmit.removeEventListener("click", recordSearch);
      document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
      document.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    });
  });

  return (
    <Show when={visiblePosition()} keyed>
      {(currentPosition) => (
        <section
          ref={dropdown}
          class="absolute z-ui flex box-border max-h-[50vh] min-w-0 flex-col overflow-hidden overflow-y-auto overscroll-contain rounded-md border ehp-color-site-border ehp-color-site-elevated ehp-color-site-text font-sans"
          style={{ left: `${currentPosition.left}px`, top: `${currentPosition.top}px`, width: `${currentPosition.width}px` }}
          aria-label={texts.search.history}
          role="list"
        >
          <For each={history()}>{(item) => (
            <div
              class="flex min-w-0 flex-none items-stretch border-0 border-b ehp-color-site-border-subtle-b last:border-b-0"
              role="listitem"
            >
              <button
                type="button"
                class="appearance-none block min-w-0 min-h-md flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-md border-0 bg-transparent ehp-color-site-text text-left textsize-md font-inherit cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"
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
                class="appearance-none inline-flex w-40px min-h-md flex-none items-center justify-center border-0 border-l ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-24px font-inherit leading-1 cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"
                aria-label={`${texts.search.deleteHistory}: ${item}`}
                title={texts.search.deleteHistory}
                onClick={() => {
                  const next = history().filter((candidate) => candidate !== item);
                  saveSearchHistory(next);
                  setHistory(next);
                }}
              >
                ×
              </button>
            </div>
          )}</For>
        </section>
      )}
    </Show>
  );
}

function loadSearchHistory(): string[] {
  return GM_getValue<string[]>(SEARCH_HISTORY_KEY, []);
}

function saveSearchHistory(history: string[]): void {
  GM_setValue(SEARCH_HISTORY_KEY, history);
}
