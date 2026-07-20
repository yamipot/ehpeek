import { anyDomNode, DomNode } from "./core";
import { state } from "../../state";

const ROOT_CLASS = "ehs-injected";
const TRANSLATED_LANGUAGE = "zh-hans";
const INITIALIZED_SELECTOR = "#eh-syringe-popup-button";
const SEARCH_SUBMIT_SELECTOR = "#searchbox button[ehs-input][type='submit']";
const CLEAR_BUTTON_SELECTOR = "#searchbox button[ehs-input][type='button']";
const TAG_TIP_LIST_SELECTOR = ".eh-syringe-lite-auto-complete-list";
const TAG_TIP_LIST_CLASS_NAME =
  "!max-h-[60dvh] !py-sm [&_.auto-complete-item]:box-border [&_.auto-complete-item]:min-h-lg [&_.auto-complete-item]:!py-sm [&_.auto-complete-item]:!px-lg [&_.auto-complete-item]:!text-[length:var(--font-size-lg)] [&_.auto-complete-item]:!leading-[1.25] [&_.auto-complete-text]:!text-inherit [&_.auto-complete-text]:!leading-inherit";
const INJECTION_TIMEOUT_MS = 3_000;

/** Starts compatibility coordination early when history expects EhSyringe, then verifies its presence. */
export function initialize(
  searchPage: boolean,
  onReady: () => void,
): void {
  let completed = false;
  const complete = () => {
    if (completed) {
      return;
    }
    completed = true;
    onReady();
  };
  let stopCoordination = state.app.ehSyringeDetected.value
    ? coordinateEhSyringe(searchPage, complete)
    : null;
  void detect().then((detected) => {
    if (detected) {
      stopCoordination ??= coordinateEhSyringe(searchPage, complete);
      return;
    }

    stopCoordination?.();
    complete();
  });
}

function coordinateEhSyringe(
  searchPage: boolean,
  onReady: () => void,
): () => void {
  let uiReady = false;
  const updateTagTipListVisual = () => {
    DomNode.from(document)
      .all<HTMLElement>(TAG_TIP_LIST_SELECTOR, anyDomNode)
      .forEach((list) => {
        const classes = TAG_TIP_LIST_CLASS_NAME.split(" ");
        if (classes.some((className) => !list.hasClass(className))) {
          list.inplace().addClasses(...classes);
        }
      });
  };

  const updateUiReady = () => {
    if (
      uiReady ||
      document.readyState === "loading" ||
      !initialUiLoaded() ||
      (searchPage && isTranslatingUi() && !searchUiReady())
    ) {
      return;
    }
    uiReady = true;
    uiObserver.disconnect();
    document.removeEventListener("DOMContentLoaded", updateUiReady);
    onReady();
  };

  const uiObserver = new MutationObserver(updateUiReady);
  uiObserver.observe(document.documentElement, {
    attributes: true,
    childList: true,
    subtree: true,
  });
  const tagTipListObserver = new MutationObserver(updateTagTipListVisual);
  tagTipListObserver.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
  document.addEventListener("DOMContentLoaded", updateUiReady, { once: true });
  updateTagTipListVisual();
  updateUiReady();
  return () => {
    uiObserver.disconnect();
    tagTipListObserver.disconnect();
    document.removeEventListener("DOMContentLoaded", updateUiReady);
  };
}

async function detect(): Promise<boolean> {
  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }

  let detected = isInjected();
  if (!detected && state.app.ehSyringeDetected.value) {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, INJECTION_TIMEOUT_MS);
    });
    detected = isInjected();
  }

  if (state.app.ehSyringeDetected.value !== detected) {
    state.app.ehSyringeDetected.set(detected);
  }
  return detected;
}

function initialUiLoaded(): boolean {
  return isInjected() && Boolean(
    DomNode.from(document).one(INITIALIZED_SELECTOR, anyDomNode),
  );
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
    page.one(SEARCH_SUBMIT_SELECTOR, anyDomNode) &&
      page.one(CLEAR_BUTTON_SELECTOR, anyDomNode),
  );
}
