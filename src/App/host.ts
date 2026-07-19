import { createManagedElement } from "../eh";

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
