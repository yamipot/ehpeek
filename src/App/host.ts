import { createManagedElement } from "../eh";

export function createAppMount(className = "") {
  const mount = createManagedElement("div");
  if (className) {
    mount.replaceClasses(className);
  }
  document.body.append(mount.Component());
  return mount;
}
