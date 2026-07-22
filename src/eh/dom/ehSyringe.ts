import { DomNode } from "./core";
import { domClass } from "./domClass";
import { state } from "../../state";

const INJECTION_TIMEOUT_MS = 3_000;

/** Detects EhSyringe without delaying EhPeek's own page injection. */
export function initialize(): void {
  void detect();
}

async function detect(): Promise<boolean> {
  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }

  let detected = isInjected();
  if (!detected && state.app.ehSyringeDetected.value) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, INJECTION_TIMEOUT_MS);
    });
    detected = isInjected();
  }

  if (state.app.ehSyringeDetected.value !== detected) {
    state.app.ehSyringeDetected.set(detected);
  }
  return detected;
}

function isInjected(): boolean {
  return DomNode.from(document.documentElement).matches(domClass.ehSyringe.root);
}
