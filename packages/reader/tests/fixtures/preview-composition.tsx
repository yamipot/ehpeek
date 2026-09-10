import { Show } from "solid-js";
import { ScrollPreview, type ScrollPreviewProps } from "../../src/ScrollPreview";
import { useScrollPreviewContext } from "../../src/ScrollPreview/Context";

function LocateButton() {
  const ctx = useScrollPreviewContext();
  return (
    <button aria-label="Locate custom highlight" onClick={() => ctx.locateHighlightedPage()}>
      Locate
    </button>
  );
}

export function ComposedPreview(props: ScrollPreviewProps & {
  accent: string;
  viewportVisible: boolean;
}) {
  return (
    <ScrollPreview.Root {...props} class="custom-panel" style={{ color: props.accent }}>
      <div class="custom-body" style={{ display: "flex", flex: "1", "min-height": "0" }}>
        <Show when={props.viewportVisible}>
          <ScrollPreview.Viewport class="custom-viewport" style={{ "border-color": props.accent }} />
        </Show>
      </div>
      <header class="custom-header">
        <ScrollPreview.Toolbar class="custom-toolbar" style={{ color: props.accent }} />
        <LocateButton />
      </header>
    </ScrollPreview.Root>
  );
}
