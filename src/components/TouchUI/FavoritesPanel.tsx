import type { TouchFavoritesCategorySelectInfo } from "../../eh";
import texts from "../../texts.json";

export function FavoritesCategorySelect(props: { info: TouchFavoritesCategorySelectInfo }) {
  const selectedIndex = Math.max(0, props.info.categories.findIndex((category) => category.selected));

  return (
    <select
      aria-label={texts.favorites.categories}
      class="block h-60px w-full rounded-md border border-solid ehp-color-site-border bg-[var(--color-site-elevated)] px-lg textsize-md ehp-color-site-text outline-none focus:(border-[var(--color-site-accent)] shadow-[0_0_0_3px_var(--color-site-accent-hover)])"
      value={String(selectedIndex)}
      onChange={(event) => props.info.categories[Number(event.currentTarget.value)]?.select()}
    >
      {props.info.categories.map((category, index) => (
        <option value={String(index)}>{category.label} [{category.count}]</option>
      ))}
    </select>
  );
}
