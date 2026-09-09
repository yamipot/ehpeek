import { For } from "solid-js";
import { useReaderTexts } from "../i18n";
import { Dialog } from "./Dialog";

export function InteractionHelp(props: {
  onClose: () => void;
  variant: "reader" | "site";
}) {
  const texts = useReaderTexts();
  return (
    <Dialog
      bodyClass="ehpeek-help-body"
      label={texts.help.title}
      onClose={props.onClose}
      title={texts.help.title}
      variant={props.variant}
      width="lg"
    >
      <div class="ehpeek-help">
        <For each={texts.help.sections}>{(section) => (
          <section>
            <h3 class="ehpeek-help-title">{section.title}</h3>
            <ul class="ehpeek-help-list">
              <For each={section.items}>{(item) => (
                <li class="ehpeek-help-item"><HelpText text={item} /></li>
              )}</For>
            </ul>
          </section>
        )}</For>
      </div>
    </Dialog>
  );
}

function HelpText(props: { text: string }) {
  return (
    <For each={props.text.split(/(\*\*[^*]+\*\*)/g)}>{(part) =>
      part.startsWith("**") && part.endsWith("**")
        ? <strong>{part.slice(2, -2)}</strong>
        : part
    }</For>
  );
}
