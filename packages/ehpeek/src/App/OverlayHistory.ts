import type { SurfaceHistory, ReadingSurface } from "@ehpeek/reader/interfaces";

export function createOverlayHistory(onBeforeBack: (count: number) => void): SurfaceHistory {
  const sessionId = crypto.randomUUID();
  return {
    push: (depth: number, surface: ReadingSurface) => {
      const current = window.history.state;
      window.history.pushState(
        {
          ...(current !== null && typeof current === "object" ? current : {}),
          ehpeekOverlay: { depth, sessionId, surface },
        },
        "",
        window.location.href,
      );
    },
    back: (count) => {
      onBeforeBack(count);
      window.history.go(-count);
    },
    subscribe: (listener) => {
      const onPopState = (event: PopStateEvent) => {
        const marker: unknown = event.state?.ehpeekOverlay;
        const own =
          marker !== null &&
          typeof marker === "object" &&
          "sessionId" in marker &&
          marker.sessionId === sessionId &&
          "depth" in marker &&
          typeof marker.depth === "number";
        listener(own ? (marker.depth as number) : 0);
      };
      window.addEventListener("popstate", onPopState);
      return () => window.removeEventListener("popstate", onPopState);
    },
  };
}
