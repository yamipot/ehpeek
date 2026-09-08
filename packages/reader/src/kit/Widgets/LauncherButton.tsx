import { Icon, type IconName } from "./Icon";
import "../../styles";

export function LauncherButton(props: {
  icon: IconName;
  label: string;
  onClick: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      class="ehpeek-launcher-button"
      title={props.title}
      onClick={() => props.onClick()}
    >
      <Icon name={props.icon} size="var(--ui-icon-size-sm)" />
      {props.label}
    </button>
  );
}
