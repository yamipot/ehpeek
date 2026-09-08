const AUTOCOMPLETE_INPUT_SELECTOR = "#f_search, #newtagfield";
const AUTOCOMPLETE_ROOT_CLASS = "ehpeek-external-autocomplete";
const AUTOCOMPLETE_ITEM_CLASS = "ehpeek-external-autocomplete-item";
const AUTOCOMPLETE_TEXT_CLASS = "ehpeek-external-autocomplete-text";

export const externalDom = {
  retainedOriginalPageSelector: ".eh-syringe-ignore",
  tagLabelAttribute: "ehs-tag",
} as const;

const EXTERNAL_AUTOCOMPLETE_SOURCES = [
  {
    items: ".auto-complete-item",
    root: ".eh-syringe-lite-auto-complete-list",
    text: ".auto-complete-text",
  },
  {
    items: ".lolicon-autocomplete-item",
    root: ".lolicon-autocomplete-dropdown",
    text: null,
  },
] as const;

/** Marks external autocomplete DOM while an original Search or Tag input owns focus. */
export function initializeExternalAutocompleteUi(): void {
  let observer: MutationObserver | null = null;
  const mark = () => {
    for (const source of EXTERNAL_AUTOCOMPLETE_SOURCES) {
      document.querySelectorAll<HTMLElement>(source.root).forEach((root) => {
        root.classList.add(AUTOCOMPLETE_ROOT_CLASS);
        root.querySelectorAll<HTMLElement>(source.items).forEach((item) => {
          item.classList.add(AUTOCOMPLETE_ITEM_CLASS);
        });
        if (source.text) {
          root.querySelectorAll<HTMLElement>(source.text).forEach((text) => {
            text.classList.add(AUTOCOMPLETE_TEXT_CLASS);
          });
        }
      });
    }
  };
  const stopObserving = () => {
    observer?.disconnect();
    observer = null;
  };
  const startObserving = (event: FocusEvent) => {
    if (
      !(event.target instanceof Element) ||
      !event.target.matches(AUTOCOMPLETE_INPUT_SELECTOR)
    ) {
      return;
    }
    stopObserving();
    mark();
    observer = new MutationObserver(mark);
    observer.observe(document.body, { childList: true, subtree: true });
  };
  const stopWhenInputBlurs = (event: FocusEvent) => {
    if (
      event.target instanceof Element &&
      event.target.matches(AUTOCOMPLETE_INPUT_SELECTOR)
    ) {
      stopObserving();
    }
  };

  document.addEventListener("focusin", startObserving);
  document.addEventListener("focusout", stopWhenInputBlurs);
}
