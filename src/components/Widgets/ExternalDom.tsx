import { createMemo, Show, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import type { ManagedDomNode } from "../../eh";

export function DomNode(props: { node: ManagedDomNode | null }) {
  const Component = createMemo(() => props.node?.Component);
  return <Show when={Component()}>{(Current) => <Dynamic component={Current()} />}</Show>;
}

export function DomNodes(props: { nodes: ManagedDomNode[] }) {
  return (
    <>
      <For each={props.nodes}>{(node) => {
        const Component = node.Component;
        return <Component />;
      }}</For>
    </>
  );
}
