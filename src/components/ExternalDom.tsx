import { h } from "preact";
import { useLayoutEffect, useRef } from "preact/hooks";

export function ExternalDomNode(props: { node: HTMLElement | null }) {
  const root = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!root.current || !props.node) {
      return;
    }

    root.current.replaceChildren(props.node);
    return () => {
      root.current?.replaceChildren();
    };
  }, [props.node]);

  return <span ref={root} className="contents" />;
}

export function ExternalDomNodes(props: { clone?: boolean; nodes: HTMLElement[] }) {
  const root = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    if (!root.current) {
      return;
    }

    root.current.replaceChildren(...props.nodes.map((node) => (props.clone ? node.cloneNode(true) : node)));
    return () => {
      root.current?.replaceChildren();
    };
  }, [props.nodes, props.clone]);

  return <span ref={root} className="contents" />;
}
