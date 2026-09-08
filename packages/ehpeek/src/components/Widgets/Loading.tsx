import { Show } from "solid-js";
import { WelcomeIcon } from "../WelcomeIcon";

export function LoadingOverlay(props: { label: string; visible: boolean }) {
  return (
    <Show when={props.visible}>
      <WelcomeIcon label={props.label} />
    </Show>
  );
}
