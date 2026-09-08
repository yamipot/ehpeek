import type { JSX } from "solid-js";

// A dynamic class assignment can erase Solid's separately applied classList.
// Resolve both together so changes to either preserve the caller's toggles.
export function widgetClass(
  base: string,
  props: Pick<JSX.HTMLAttributes<HTMLElement>, "class" | "classList">,
): string {
  const toggles = Object.entries(props.classList ?? {})
    .filter(([, enabled]) => enabled)
    .map(([name]) => name);
  return [base, props.class ?? "", ...toggles].join(" ");
}
