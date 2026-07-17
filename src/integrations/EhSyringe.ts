const ROOT_CLASS = "ehs-injected";
const TRANSLATED_LANGUAGE = "zh-hans";
const INITIALIZED_SELECTOR = "#eh-syringe-popup-button";
const SEARCH_SUBMIT_SELECTOR = "#searchbox button[ehs-input][type='submit']";
const CLEAR_BUTTON_SELECTOR = "#searchbox button[ehs-input][type='button']";
const DETECTED_KEY = "ehpeek:ehsyringe:detected";
const INJECTION_TIMEOUT_MS = 3_000;
let initialUiReady: Promise<void> | null = null;

export function waitForInitialUi(): Promise<void> {
  initialUiReady ??= waitForExpectedInitialUi();
  return initialUiReady;
}

export async function waitForSearchUi(): Promise<void> {
  await waitForInitialUi();

  if (isTranslatingUi()) {
    await waitFor(searchUiReady);
  }
}

async function waitForExpectedInitialUi(): Promise<void> {
  if (initialUiLoaded()) {
    setDetected(true);
    return;
  }

  if (!isInjected() && !wasDetected()) {
    return;
  }

  const loaded = await waitFor(initialUiLoaded, INJECTION_TIMEOUT_MS);
  setDetected(loaded);
}

function waitFor(ready: () => boolean, timeoutMs?: number): Promise<boolean> {
  if (ready()) {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let timer: number | null = null;
    const observer = new MutationObserver(() => {
      if (!ready()) {
        return;
      }

      finish(true);
    });
    const finish = (value: boolean) => {
      observer.disconnect();

      if (timer !== null) {
        window.clearTimeout(timer);
      }

      resolve(value);
    };

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
    });

    if (timeoutMs !== undefined) {
      timer = window.setTimeout(() => finish(false), timeoutMs);
    }
  });
}

function watchForSuccessfulInjection(): void {
  if (initialUiLoaded()) {
    setDetected(true);
    return;
  }

  const observer = new MutationObserver(() => {
    if (!initialUiLoaded()) {
      return;
    }

    observer.disconnect();
    setDetected(true);
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

function initialUiLoaded(): boolean {
  return isInjected() && Boolean(document.querySelector(INITIALIZED_SELECTOR));
}

function wasDetected(): boolean {
  return GM_getValue<number>(DETECTED_KEY, 0) === 1;
}

function setDetected(detected: boolean): void {
  GM_setValue(DETECTED_KEY, detected ? 1 : 0);
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

watchForSuccessfulInjection();
