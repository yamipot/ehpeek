import { createEffect, onCleanup, type Accessor } from "solid-js";

/** DOM input is blocked locally; document listeners and ongoing gestures remain their owner's responsibility. */
export function bindInteractionGate(element: Accessor<HTMLElement>, disabled: Accessor<boolean>) {
  createEffect(() => {
    const root = element();
    if (!disabled()) return;
    root.inert = true;
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && root.contains(focused)) focused.blur();
    const block = (event: Event) => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const events = ["click", "dblclick", "pointerdown", "pointermove", "pointerup", "pointercancel",
      "mousedown", "mouseup", "touchstart", "touchmove", "wheel", "keydown", "input", "change", "contextmenu"];
    for (const event of events) root.addEventListener(event, block, { capture: true, passive: false });
    onCleanup(() => {
      root.inert = false;
      for (const event of events) root.removeEventListener(event, block, true);
    });
  });
}
