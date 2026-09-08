import { onCleanup, onMount, splitProps, type JSX } from "solid-js";
import { listenForOutsidePress, widgetClass } from "../helpers";
import "../../styles";

export type PopoverProps = Omit<JSX.HTMLAttributes<HTMLDivElement>, "ref"> & {
  onOutsidePress: (event: MouseEvent | PointerEvent) => void;
  outsideEvent?: "click" | "pointerdown";
  contains?: (target: Node) => boolean;
};

// Placement stays with the owner so anchored menus keep their containing block.
export function Popover(props: PopoverProps) {
  const [local, rest] = splitProps(props, [
    "class",
    "classList",
    "onOutsidePress",
    "outsideEvent",
    "contains",
  ]);
  let panel!: HTMLDivElement;
  onMount(() => {
    const stop = listenForOutsidePress({
      document: panel.ownerDocument,
      contains: (target) =>
        local.contains ? local.contains(target) : panel.contains(target),
      event: local.outsideEvent ?? "click",
      onOutsidePress: (event) => local.onOutsidePress(event),
    });
    onCleanup(stop);
  });

  return (
    <div
      {...rest}
      ref={panel}
      class={widgetClass(
        "ehpeek-popover",
        local,
      )}
    />
  );
}
