import { createSignal, For, onCleanup, onMount, Show, untrack } from "solid-js";
import type { SearchTextInputDom } from "../../eh";
import { addSearchHistory, loadSearchHistory, removeSearchHistory } from "../../state";

export function SearchHistory(props: { source: SearchTextInputDom }) {
  let dropdown: HTMLElement | undefined;
  const [searchValue, setSearchValue] = createSignal(
    untrack(() => props.source.data.value),
  );
  const [history, setHistory] = createSignal<string[]>(loadSearchHistory());
  const [open, setOpen] = createSignal(false);
  const [activeIndex, setActiveIndex] = createSignal(-1);
  const [position, setPosition] = createSignal<{ left: number; top: number; width: number } | null>(null);
  const itemButtons: HTMLButtonElement[] = [];
  const visiblePosition = () => open() && !searchValue().trim() && history().length > 0 ? position() : null;
  const selectHistory = (item: string) => {
    props.source.handle.select(item);
    setOpen(false);
  };

  onMount(() => {
    const updatePosition = () => {
      setPosition(props.source.handle.position());
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
        const item = history()[activeIndex()];
        if (item !== undefined) {
          selectHistory(item);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    const updateSearchValue = (value: string, focused: boolean) => {
      setSearchValue(value);
      if (!value.trim() && focused) {
        showHistory();
      }
    };
    const recordSearch = (sourceValue: string) => {
      const value = sourceValue.trim();

      if (!value) {
        return;
      }

      setHistory(addSearchHistory(value));
    };
    const disconnect = props.source.handle.connect({
      onFocus: showHistory,
      onInput: updateSearchValue,
      onKeyDown: onInputKeyDown,
      onOutsidePointer: () => setOpen(false),
      onPositionChange: updatePosition,
      onSubmit: recordSearch,
    }, () => dropdown ?? null);
    updateSearchValue(props.source.data.value, false);

    onCleanup(disconnect);
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
                  setHistory(removeSearchHistory(item));
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
