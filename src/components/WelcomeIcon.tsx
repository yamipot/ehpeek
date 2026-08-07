import texts from "../i18n";
import { Icon } from "./Widgets/Icon";

export function WelcomeIcon(props: {
  embedded?: boolean;
  label?: string;
  showIcon?: boolean;
}) {
  const label = () => props.label ?? texts.common.status.loading;
  const placementClass = () => props.embedded
    ? "relative box-border w-full border-0 bg-transparent ui-px-lg ui-py-md"
    : "fixed left-1/2 top-1/2 z-[1200] -translate-x-1/2 -translate-y-1/2 ui-rounded-lg border ehp-color-site-border bg-[var(--color-loading)] ui-px-xl ui-py-lg shadow-[0_6px_20px_var(--color-shadow-floating)]";

  return (
    <div
      class={`${placementClass()} flex select-none flex-col items-center ui-gap-lg ehp-color-site-accent pointer-events-none`}
      role="status"
      aria-live="polite"
      aria-label={label()}
    >
      {props.showIcon !== false
        ? <Icon name="panda-peek" size="var(--ui-control-size-xl)" strokeWidth={1.6} />
        : null}
      <span class="inline-flex items-center justify-center ui-gap-md ehp-color-site-text">
        <span
          class="inline-block box-border w-[var(--ui-icon-size-xl)] h-[var(--ui-icon-size-xl)] animate-spin rounded-full border-4 border-solid ehp-color-spinner"
          aria-hidden="true"
        />
        <span>{label()}</span>
      </span>
    </div>
  );
}
