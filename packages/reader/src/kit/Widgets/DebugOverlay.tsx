import { Show } from "solid-js";
import { Portal } from "solid-js/web";
import "../../styles";

export function DebugOverlay(props: { text: string | null | undefined }) {
  return (
    <Show when={props.text}>
      {(text) => (
        <Portal>
          <pre class="ehpeek-debug-overlay">{text()}</pre>
        </Portal>
      )}
    </Show>
  );
}
