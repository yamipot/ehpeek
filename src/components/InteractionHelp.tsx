import { For } from "solid-js";
import texts from "../texts.json";
import { Dialog } from "./Widgets/Dialog";

const SECTIONS = Object.entries(texts.help.content);

export function InteractionHelp(props: {
  onClose: () => void;
  variant: "reader" | "site";
}) {
  return (
    <Dialog
      bodyClass="ui-p-xl"
      label={texts.help.title}
      onClose={props.onClose}
      title={texts.help.title}
      variant={props.variant}
      width="lg"
    >
      <div class="grid ui-gap-lg text-left textsize-md leading-[1.45]">
        <For each={SECTIONS}>{([title, items]) => (
          <section>
            <h3 class="m-0 ui-mb-sm textsize-md font-700">{title}</h3>
            <ul class="m-0 ui-pl-xl">
              <For each={items}>{(item) => (
                <li class="ui-mb-xs last:mb-0"><HelpText text={item} /></li>
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
