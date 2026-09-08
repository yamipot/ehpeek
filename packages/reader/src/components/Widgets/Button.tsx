import { splitProps, type JSX } from "solid-js";
import { widgetClass } from "./classes";

const BUTTON_VARIANTS = {
  control:
    "inline-flex ui-hit-min-w-md ui-hit-h-md items-center justify-center ui-px-md py-0 ui-rounded-md border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer font-sans textsize-md font-700 leading-1 disabled:(opacity-40 cursor-default)",
  option:
    "flex w-full ui-hit-min-h-lg flex-col items-start justify-center ui-gap-xs ui-px-lg ui-py-md ui-rounded-md border border-[var(--color-border)] bg-[var(--color-control)] text-[var(--color-text)] cursor-pointer text-left hover:bg-[var(--color-badge)] disabled:(opacity-40 cursor-default)",
} as const;

export type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof BUTTON_VARIANTS;
};

export function Button(props: ButtonProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "class",
    "classList",
    "type",
  ]);
  return (
    <button
      {...rest}
      type={local.type ?? "button"}
      class={widgetClass(BUTTON_VARIANTS[local.variant ?? "control"], local)}
    />
  );
}

const ICON_BUTTON_VARIANTS = {
  ghost:
    "ui-rounded-md border-0 bg-transparent text-[var(--color-icon-button-text)] cursor-pointer hover:bg-[var(--color-icon-button-hover)] disabled:opacity-35 disabled:cursor-default disabled:hover:bg-transparent",
  subtle:
    "ui-rounded-md border-0 bg-transparent text-[var(--color-site-text)] cursor-pointer font-sans textsize-sm font-700 leading-1 opacity-90 hover:(opacity-100 bg-[var(--color-site-page)]) focus-visible:opacity-100 disabled:(opacity-40 cursor-default) transition-[opacity,background-color] duration-160",
  surface:
    "ui-rounded-sm border-0 bg-[var(--color-site-surface)] ehp-color-site-text cursor-pointer disabled:(opacity-40 cursor-default) enabled:active:scale-96",
} as const;
const ICON_BUTTON_SIZES = {
  sm: "w-[var(--ui-control-size-sm)] h-[var(--ui-control-size-sm)]",
  md: "w-[var(--ui-control-size-md)] h-[var(--ui-control-size-md)]",
  xl: "w-[var(--ui-control-size-xl)] h-[var(--ui-control-size-xl)]",
} as const;

export type IconButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant: keyof typeof ICON_BUTTON_VARIANTS;
  size: keyof typeof ICON_BUTTON_SIZES;
};

export function IconButton(props: IconButtonProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "class",
    "classList",
    "type",
  ]);
  return (
    <button
      {...rest}
      type={local.type ?? "button"}
      class={widgetClass(
        `inline-flex items-center justify-center p-0 ${ICON_BUTTON_SIZES[local.size]} ${ICON_BUTTON_VARIANTS[local.variant]}`,
        local,
      )}
    />
  );
}

export type IconLinkProps = JSX.AnchorHTMLAttributes<HTMLAnchorElement> & {
  variant: keyof typeof ICON_BUTTON_VARIANTS;
  size: keyof typeof ICON_BUTTON_SIZES;
};

export function IconLink(props: IconLinkProps) {
  const [local, rest] = splitProps(props, [
    "variant",
    "size",
    "class",
    "classList",
  ]);
  return (
    <a
      {...rest}
      class={widgetClass(
        `inline-flex items-center justify-center p-0 ${ICON_BUTTON_SIZES[local.size]} ${ICON_BUTTON_VARIANTS[local.variant]}`,
        local,
      )}
    />
  );
}
