import { DomNode, ManagedDomNode } from "./core";

const ROOT_CLASS = "ehs-injected";
const TRANSLATED_LANGUAGE = "zh-hans";
const INITIALIZED_SELECTOR = "#eh-syringe-popup-button";
const SEARCH_SUBMIT_SELECTOR = "#searchbox button[ehs-input][type='submit']";
const CLEAR_BUTTON_SELECTOR = "#searchbox button[ehs-input][type='button']";
const TAG_TIP_INPUT_SELECTOR = "#f_search, #newtagfield, [name='f_search']";
const TAG_TIP_LIST_SELECTOR = ".eh-syringe-lite-auto-complete-list";
const TAG_TIP_LIST_CLASS_NAME =
  "!max-h-[60dvh] !py-sm [&_.auto-complete-item]:box-border [&_.auto-complete-item]:min-h-lg [&_.auto-complete-item]:!py-sm [&_.auto-complete-item]:!px-lg [&_.auto-complete-item]:!text-[length:var(--font-size-lg)] [&_.auto-complete-item]:!leading-[1.25] [&_.auto-complete-text]:!text-inherit [&_.auto-complete-text]:!leading-inherit";
const DETECTED_KEY = "ehpeek:ehsyringe:detected";
const INJECTION_TIMEOUT_MS = 3_000;
const ROUTE_TRANSLATION_TIMEOUT_MS = 450;
const ROUTE_TRANSLATION_QUIET_MS = 48;
let initialUiReady: Promise<void> | null = null;
let tagTipInput: ManagedDomNode<HTMLInputElement> | null = null;

/** Waits for EhSyringe's initial translation pass before EhPeek transforms the page. */
export function waitForInitialUi(): Promise<void> {
  initialUiReady ??= waitForExpectedInitialUi();
  return initialUiReady;
}

/** Waits for EhSyringe's Search controls and translated results before Search transforms run. */
export async function waitForSearchUi(): Promise<void> {
  await waitForInitialUi();

  if (isTranslatingUi()) {
    await waitFor(searchUiReady);
  }
}

/** Waits for EhSyringe to translate content inserted by a SinglePage route. */
export async function waitForRouteTranslation(
  root: HTMLElement,
): Promise<void> {
  await waitForInitialUi();

  if (!isInjected()) {
    return;
  }

  const probe = translationProbe();
  root.append(probe);

  try {
    const observed = await waitFor(
      () => probe.hasAttribute("ehs-tag"),
      ROUTE_TRANSLATION_TIMEOUT_MS,
      {
        attributes: true,
        childList: true,
        subtree: true,
      },
      root,
    );

    if (observed) {
      await waitForMutationQuiet(
        root,
        ROUTE_TRANSLATION_QUIET_MS,
        ROUTE_TRANSLATION_TIMEOUT_MS,
      );
    }
  } finally {
    probe.remove();
  }
}

/** Rebinds EhSyringe tag suggestions to TouchUI's component-owned search input. */
export function reuseTagTipInput(
  target: ManagedDomNode<HTMLInputElement>,
): ManagedDomNode<HTMLInputElement>;
export function reuseTagTipInput(
  target: ManagedDomNode<HTMLInputElement>,
): ManagedDomNode<HTMLInputElement> {
  captureTagTipInput();

  if (!tagTipInput || tagTipInput.Component().isConnected) {
    return target;
  }

  if (target === tagTipInput) {
    return target;
  }

  target.copyAttributesTo(tagTipInput.Component());
  tagTipInput.setInputValue(target.inputValue());
  target.replaceWith(tagTipInput);
  return tagTipInput;
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

function waitFor(
  ready: () => boolean,
  timeoutMs?: number,
  observe: MutationObserverInit = { childList: true, subtree: true },
  root: Node = document.documentElement,
): Promise<boolean> {
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

    observer.observe(root, observe);

    if (timeoutMs !== undefined) {
      timer = window.setTimeout(() => finish(false), timeoutMs);
    }
  });
}

function waitForMutationQuiet(
  root: Node,
  quietMs: number,
  timeoutMs: number,
): Promise<void> {
  return new Promise((resolve) => {
    let finished = false;
    let quietTimer = window.setTimeout(finish, quietMs);
    const timeoutTimer = window.setTimeout(finish, timeoutMs);
    const observer = new MutationObserver(() => {
      window.clearTimeout(quietTimer);
      quietTimer = window.setTimeout(finish, quietMs);
    });

    function finish(): void {
      if (finished) {
        return;
      }

      finished = true;
      observer.disconnect();
      window.clearTimeout(quietTimer);
      window.clearTimeout(timeoutTimer);
      resolve();
    }

    observer.observe(root, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });
  });
}

function translationProbe(): HTMLSpanElement {
  const probe = document.createElement("span");
  probe.className = "gt";
  probe.hidden = true;
  probe.lang = "en";
  probe.setAttribute("translate", "yes");
  probe.title = "ehpeek:translation probe";
  probe.textContent = "ehpeek:translation probe";
  return probe;
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
  return isInjected() && Boolean(DomNode.from(document).one(INITIALIZED_SELECTOR));
}

function wasDetected(): boolean {
  return GM_getValue<number>(DETECTED_KEY, 0) === 1;
}

function setDetected(detected: boolean): void {
  GM_setValue(DETECTED_KEY, detected ? 1 : 0);
}

function isInjected(): boolean {
  return DomNode.from(document.documentElement).hasClass(ROOT_CLASS);
}

function isTranslatingUi(): boolean {
  const root = document.documentElement;
  return isInjected() && root.lang.toLowerCase() === TRANSLATED_LANGUAGE;
}

function searchUiReady(): boolean {
  const page = DomNode.from(document);
  return Boolean(
    page.one(SEARCH_SUBMIT_SELECTOR) && page.one(CLEAR_BUTTON_SELECTOR),
  );
}

function captureTagTipInput(): boolean {
  if (tagTipInput) {
    return true;
  }

  const page = DomNode.from(document);
  const listSource = page.one<HTMLElement>(TAG_TIP_LIST_SELECTOR);
  const list = listSource?.owned() ?? listSource?.inplace();
  if (!list) {
    return false;
  }

  list.transform({ classes: { add: TAG_TIP_LIST_CLASS_NAME.split(" ") } });

  const input = page.one<HTMLInputElement>(TAG_TIP_INPUT_SELECTOR);
  tagTipInput = input?.owned() ?? input?.inplace() ?? null;
  return tagTipInput !== null;
}

function watchForTagTipInput(): void {
  if (captureTagTipInput()) {
    return;
  }

  const observer = new MutationObserver(() => {
    if (!captureTagTipInput()) {
      return;
    }

    observer.disconnect();
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}

watchForSuccessfulInjection();
watchForTagTipInput();
