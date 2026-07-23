import { createSignal, For, onCleanup, onMount, Show } from "solid-js";
import type { TouchResultsPageDom } from "../../eh";

export function FavoritesCategorySelect(props: { source: TouchResultsPageDom }) {
  let container!: HTMLDivElement;
  const [open, setOpen] = createSignal(false);
  const selected = () => props.source.data.favoritesCategory?.categories.find((category) => category.selected)
    ?? props.source.data.favoritesCategory?.categories[0]
    ?? null;

  onMount(() => {
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", closeOnOutsidePointer, true);
    onCleanup(() => document.removeEventListener("pointerdown", closeOnOutsidePointer, true));
  });

  return (
    <div ref={container} class="box-border w-full min-w-0 overflow-hidden rounded-xs coarse:rounded-md border ehp-color-site-border bg-[var(--color-site-elevated)]">
      <button
        type="button"
        class="flex box-border w-full min-h-xs coarse:min-h-md items-center justify-between gap-sm coarse:gap-md px-sm coarse:px-md py-xs coarse:py-sm rounded-xs border-0 !bg-transparent ehp-color-site-text text-left textsize-sm coarse:textsize-md font-700 font-inherit cursor-pointer hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)]"
        aria-expanded={open()}
        onClick={() => setOpen((value) => !value)}
      >
        <span class="flex min-w-0 items-center gap-sm overflow-hidden">
          {categoryIndicator(selected()?.appearance)}
          <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
          {selected()?.label} [{selected()?.count}]
          </span>
        </span>
        <span class="flex h-20px w-20px flex-none items-center justify-center leading-none" aria-hidden="true">
          {open() ? "−" : "+"}
        </span>
      </button>
      <Show when={open()}>
        <div class="border-0 border-t border-t-[var(--color-site-border-subtle)]">
          <For each={props.source.data.favoritesCategory?.categories}>{(category, index) => (
            <button
              type="button"
              class={`flex box-border w-full min-h-xs coarse:min-h-md items-center px-sm coarse:px-md py-xs coarse:py-sm border-0 border-b ehp-color-site-border-subtle-b last:border-b-0 text-left textsize-sm coarse:textsize-md font-inherit no-underline cursor-pointer ${category.selected ? "bg-[var(--color-site-accent-hover)] ehp-color-site-accent font-700" : "!bg-transparent ehp-color-site-text hover:!bg-[var(--color-site-item-hover)]"}`}
              onClick={() => props.source.handle.activateFavoriteCategory(index())}
            >
              <span class="flex min-w-0 items-center gap-sm">
                {categoryIndicator(category.appearance)}
                <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                  {category.label} [{category.count}]
                </span>
              </span>
            </button>
          )}</For>
        </div>
      </Show>
    </div>
  );
}

function categoryIndicator(
  appearance: NonNullable<TouchResultsPageDom["data"]["favoritesCategory"]>["categories"][number]["appearance"] | undefined,
) {
  return (
    <span
      class="block h-15px w-15px flex-none bg-no-repeat"
      style={appearance ? {
        "background-image": appearance.backgroundImage,
        "background-position": appearance.backgroundPosition,
        "background-size": appearance.backgroundSize,
      } : undefined}
      aria-hidden="true"
    />
  );
}
