import { onCleanup, onMount, splitProps, type JSX } from "solid-js";
import { widgetClass } from "./classes";
import { listenForOutsidePress } from "./outsidePress";

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
        "z-overlay overflow-hidden border ehp-color-site-border ui-rounded-sm ehp-color-site-elevated",
        local,
      )}
    />
  );
}
