const READY_EVENT = "ehpeek:ready";

export function dispatchReady(): void {
  document.dispatchEvent(new Event(READY_EVENT));
}
