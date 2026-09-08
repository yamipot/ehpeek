import { Icon, type IconName } from "./Icon";

export function LauncherButton(props: {
  icon: IconName;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      class="inline-flex min-h-[var(--ui-control-size-xs)] items-center justify-center ui-gap-sm ui-px-md ui-rounded-xl border-0 bg-[var(--color-site-surface)] ehp-color-site-text font-sans textsize-sm font-700 cursor-pointer transition-[background-color,transform] duration-120 hover:bg-[var(--color-site-item-hover)] active:scale-98"
      title={props.title}
      onClick={() => props.onClick()}
    >
      <Icon name={props.icon} size="var(--ui-icon-size-sm)" />
      {props.label}
    </button>
  );
}
