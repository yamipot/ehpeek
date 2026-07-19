import type { JSX } from "solid-js";
import { render } from "solid-js/web";
import { createManagedElement } from "../eh";

export function installAppStyle(id: string, content: string): void {
  if (!content || document.getElementById(id)) {
    return;
  }

  const style = document.createElement("style");
  style.id = id;
  style.textContent = content;
  document.head.append(style);
}

export function createAppMount(className = "", persistent = false) {
  const mount = createManagedElement("div");
  if (className) {
    mount.transform({ classes: { replace: className } });
  }
  if (persistent) {
    mount.attribute("data-ehpeek-persistent", "true");
  }
  document.body.append(mount.Component());
  return mount;
}

const mountedRoots = new WeakMap<HTMLElement, () => void>();

export function renderInto(host: HTMLElement, view: () => JSX.Element): void {
  mountedRoots.get(host)?.();
  host.replaceChildren();
  mountedRoots.set(host, render(view, host));
}

export function unmountFrom(host: HTMLElement): void {
  mountedRoots.get(host)?.();
  mountedRoots.delete(host);
  host.replaceChildren();
}
