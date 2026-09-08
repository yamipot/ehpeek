export function listenForOutsidePress(options: {
  document: Document;
  contains: (target: Node) => boolean;
  event: "click" | "pointerdown";
  onOutsidePress: (event: MouseEvent | PointerEvent) => void;
}): () => void {
  const listener = (event: MouseEvent | PointerEvent) => {
    if (event.target instanceof Node && options.contains(event.target)) {
      return;
    }
    options.onOutsidePress(event);
  };
  options.document.addEventListener(options.event, listener);
  return () => options.document.removeEventListener(options.event, listener);
}
