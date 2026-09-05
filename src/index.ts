import { setAppLocale } from "./i18n";
import { loadState, state } from "./state";

async function start(): Promise<void> {
  await loadState();
  setAppLocale(state.app.locale.value);
  await import("./App/index");
}

void start().catch((error: unknown) => {
  console.error("[ehpeek] App startup failed", error);
});
