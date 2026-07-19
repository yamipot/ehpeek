import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { SearchHistorySource } from "../../eh";

const SEARCH_HISTORY_KEY = "ehpeek:search:history";

export function SearchHistory(props: { source: SearchHistorySource }) {
  let dropdown: HTMLElement | undefined;
  const [searchValue, setSearchValue] = createSignal(props.source.searchInput.value);
  const [history, setHistory] = createSignal<string[]>(loadSearchHistory());
  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal(-1);
  const [position, setPosition] = createSignal<{ left: number; top: number; width: number } | null>(null);
  const itemButtons: HTMLButtonElement[] = [];
  const visiblePosition = () => open() && !searchValue().trim() && history().length > 0 ? position() : null;
  const selectHistory = (item: string) => {
    const input = props.source.searchInput;
    input.value = item;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.focus();
    input.setSelectionRange(item.length, item.length);
    setOpen(false);
  };

  onMount(() => {
    const input = props.source.searchInput;
    const form = input.form;
    const updatePosition = () => {
      const rect = input.getBoundingClientRect();
      setPosition({
        left: rect.left,
        top: rect.bottom,
        width: rect.width,
      });
    };
    const showHistory = () => {
      updatePosition();
      setActiveIndex(-1);
      setOpen(true);
    };
    const moveSelection = (offset: number) => {
      const items = history();
      if (items.length === 0) {
        return;
      }

      const current = activeIndex();
      const next = current < 0
        ? (offset > 0 ? 0 : items.length - 1)
        : (current + offset + items.length) % items.length;
      setActiveIndex(next);
      window.requestAnimationFrame(() => itemButtons[next]?.scrollIntoView({ block: "nearest" }));
    };
    const onInputKeyDown = (event: KeyboardEvent) => {
      if (!visiblePosition()) {
        return;
      }

      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        moveSelection(event.key === "ArrowDown" ? 1 : -1);
      } else if (event.key === "Enter" && activeIndex() >= 0) {
        event.preventDefault();
        selectHistory(history()[activeIndex()]);
      } else if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
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
    input.addEventListener("keydown", onInputKeyDown);
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
      input.removeEventListener("keydown", onInputKeyDown);
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
          class="ehpeek-search-history fixed z-ui flex box-border max-h-[60dvh] flex-col overflow-hidden overflow-y-auto overscroll-contain rounded-md border ehp-color-site-border ehp-color-site-elevated ehp-color-site-text font-sans"
          style={{
            left: `${currentPosition.left}px`,
            top: `${currentPosition.top}px`,
            width: `${currentPosition.width}px`,
          }}
          role="list"
        >
          <For each={history()}>{(item, index) => (
            <div
              class="flex min-w-0 flex-none items-stretch border-0 border-b ehp-color-site-border-subtle-b last:border-b-0"
              role="listitem"
            >
              <button
                type="button"
                ref={(button) => { itemButtons[index()] = button; }}
                class={`appearance-none block min-w-0 min-h-lg flex-1 overflow-hidden text-ellipsis whitespace-nowrap px-lg border-0 ehp-color-site-text text-left textsize-lg font-inherit cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)] ${activeIndex() === index() ? "bg-[var(--color-site-item-hover)]" : "bg-transparent"}`}
                title={item}
                onPointerEnter={() => setActiveIndex(index())}
                onClick={() => selectHistory(item)}
              >
                {item}
              </button>
              <button
                type="button"
                class="appearance-none inline-flex w-60px min-h-lg flex-none items-center justify-center border-0 border-l ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text textsize-xl font-inherit leading-1 cursor-pointer [touch-action:manipulation] active:bg-[var(--color-site-item-hover)]"
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
