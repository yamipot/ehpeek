const ROOT_CLASS = "ehs-injected";
const TRANSLATED_LANGUAGE = "zh-hans";
const INITIALIZED_SELECTOR = "#eh-syringe-popup-button";
const SEARCH_SUBMIT_SELECTOR = "#searchbox button[ehs-input][type='submit']";
const CLEAR_BUTTON_SELECTOR = "#searchbox button[ehs-input][type='button']";
let initialUiReady: Promise<void> | null = null;

export function waitForInitialUi(): Promise<void> {
  initialUiReady ??= waitFor(() => !isInjected() || Boolean(document.querySelector(INITIALIZED_SELECTOR)));
  return initialUiReady;
}

export function waitForSearchUi(): Promise<void> {
  return waitFor(() => !isTranslatingUi() || searchUiReady());
}

function waitFor(ready: () => boolean): Promise<void> {
  if (ready()) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!ready()) {
        return;
      }

      observer.disconnect();
      resolve();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });
  });
}

function isInjected(): boolean {
  return document.documentElement.classList.contains(ROOT_CLASS);
}

function isTranslatingUi(): boolean {
  const root = document.documentElement;
  return isInjected() && root.lang.toLowerCase() === TRANSLATED_LANGUAGE;
}

function searchUiReady(): boolean {
  return Boolean(document.querySelector(SEARCH_SUBMIT_SELECTOR) && document.querySelector(CLEAR_BUTTON_SELECTOR));
}
