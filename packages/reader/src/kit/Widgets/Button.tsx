import { splitProps, type JSX } from "solid-js";
import { widgetClass } from "../helpers";
import "../../styles";

const BUTTON_VARIANTS = {
  control: "ehpeek-button ehpeek-button--control",
  option: "ehpeek-button ehpeek-button--option",
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
  ghost: "ehpeek-icon-action--ghost",
  subtle: "ehpeek-icon-action--subtle",
  surface: "ehpeek-icon-action--surface",
} as const;
const ICON_BUTTON_SIZES = {
  sm: "ehpeek-icon-action--sm",
  md: "ehpeek-icon-action--md",
  xl: "ehpeek-icon-action--xl",
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
        `ehpeek-icon-action ${ICON_BUTTON_SIZES[local.size]} ${ICON_BUTTON_VARIANTS[local.variant]}`,
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
        `ehpeek-icon-action ${ICON_BUTTON_SIZES[local.size]} ${ICON_BUTTON_VARIANTS[local.variant]}`,
        local,
      )}
    />
  );
}
