import type { ManagedDomNode } from "../../eh/transform";

export function DomNode(props: { node: ManagedDomNode | null }) {
  const Component = props.node?.Component;
  return Component ? <Component /> : null;
}

export function DomNodes(props: { clone?: boolean; nodes: ManagedDomNode[] }) {
  return (
    <>
      {props.nodes.map((node) => {
        const Component = (props.clone ? node.clone() : node).Component;
        return <Component />;
      })}
    </>
  );
}
