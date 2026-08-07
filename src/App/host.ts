import { createManagedElement } from "../eh";

export function createAppMount(
  className = "",
  host = document.body,
) {
  const mount = createManagedElement("div");
  if (className) {
    mount.replaceClasses(className);
  }
  host.append(mount.Component());
  return mount;
}
