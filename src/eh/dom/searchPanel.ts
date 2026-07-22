import {
  createAnchor,
  createManagedElement,
  DomNode,
  type ManagedDomElements,
} from "./core";
import { domClass } from "./domClass";

/** Manages the original search controls for the TouchUI SearchPanel feature. */
export function manageSearchPanel() {
  const page = DomNode.from(document);
  const search = page.use(domClass.search);
  const source = search.panel;
  const searchInput = search.input.one();
  const form = searchInput?.form() ?? null;
  const standardSearchBox = source.box.one();
  const categories = source.box.categories.one();
  const advancedPanel = source.box.advanced.one();
  const optionLinks = advancedPanel?.previous() ?? null;
  const fileSearch = source.fileSearch.one();
  const searchSubmit = form?.one(domClass.search.submit)
    ?? searchInput?.parent()?.one(domClass.search.submitFallback)
    ?? null;
  const clearButton = form?.one(domClass.search.panel.clear)
    ?? searchInput?.parent()?.one(domClass.search.panel.clearFallback)
    ?? null;
  if (!searchInput || !form || !searchSubmit) {
    return null;
  }

  const mount = createAnchor("search-panel");
  const categoryToggleMount = categories && optionLinks ? createAnchor("search-category-toggle") : null;
  const searchActionMount = createAnchor("search-action");
  const clearActionMount = clearButton ? createAnchor("search-clear-action") : null;
  if (!mount || !searchActionMount || (clearButton && !clearActionMount)) {
    return null;
  }

  const optionLinkItems = optionLinks?.all(domClass.search.panel.optionLinks) ?? [];
  const advancedToggle = advancedPanel ? optionLinkItems[0] ?? null : null;
  const fileSearchToggle = fileSearch ? optionLinkItems[advancedToggle ? 1 : 0] ?? null : null;
  const advancedToggleMount = advancedToggle ? createAnchor("search-advanced-toggle") : null;
  const fileSearchToggleMount = fileSearchToggle ? createAnchor("search-file-toggle") : null;

  const searchControls = createManagedElement("div", {
    overlay: "ehpeek-overlay-search-actions",
  }).apply("overlay");
  const optionLinksApply = { wrap: "ehpeek-wrap-search-options" } as const;
  const elems = {
    advancedPanel: source.box.advanced.inplace()?.apply("expand") ?? null,
    advancedToggle: advancedToggle?.inplace() ?? null,
    advancedToggleMount,
    categories: source.box.categories.inplace()?.apply("layout") ?? null,
    categoryToggleMount,
    clearActionMount,
    clearButton: clearButton?.inplace(domClass.search.panel.clear.apply).apply("hide") ?? null,
    fileSearch: source.fileSearch.inplace()?.apply("expand") ?? null,
    fileSearchToggle: fileSearchToggle?.inplace() ?? null,
    fileSearchToggleMount,
    form: form.inplace(domClass.search.panel.box.form.apply),
    mount,
    optionLinks: optionLinks?.inplace(optionLinksApply).apply("wrap") ?? null,
    searchActionMount,
    searchBox: source.box.inplace()?.apply("reset") ?? searchControls,
    searchControls,
    searchInput: searchInput.inplace(domClass.search.input.apply).apply("expand"),
    searchSubmit: searchSubmit.inplace(domClass.search.panel.submit.apply).apply("hide"),
  } satisfies ManagedDomElements;

  (standardSearchBox ? elems.searchBox : elems.form).before(elems.mount);
  if (standardSearchBox) {
    elems.searchBox.remove();
  }
  elems.searchInput.replaceWith(elems.searchControls);
  elems.searchControls.append(elems.searchInput);
  elems.searchSubmit.remove();
  if (elems.clearButton && elems.clearActionMount) {
    elems.clearButton.remove();
    elems.searchControls.append(elems.clearActionMount);
  }
  elems.searchControls.append(elems.searchActionMount);
  if (elems.categories && elems.optionLinks && elems.categoryToggleMount) {
    elems.optionLinks.after(elems.categories);
    elems.optionLinks.prepend(elems.categoryToggleMount);
  }
  if (elems.optionLinks && elems.advancedToggle && elems.advancedToggleMount) {
    elems.advancedToggle.after(elems.advancedToggleMount);
    elems.advancedToggle.remove();
  }
  if (elems.optionLinks && elems.fileSearchToggle && elems.fileSearchToggleMount) {
    elems.fileSearchToggle.after(elems.fileSearchToggleMount);
    elems.fileSearchToggle.remove();
  }
  elems.fileSearch?.remove();

  const formInsideSearchBox = source.box.form.one()?.sameNode(form) ?? false;
  const formId = form.attribute("id") || "ehpeek-search-form";
  const data = {
    clearLabel: clearButton ? actionLabel(clearButton) : null,
    hasClear: elems.clearButton !== null && elems.clearActionMount !== null,
    searchLabel: actionLabel(searchSubmit),
  };

  elems.searchActionMount.addClasses("contents");
  elems.clearActionMount?.addClasses("contents");
  elems.form.apply("stack");
  elems.searchControls
    .setAttributes({ "data-ehpeek-has-clear": String(data.hasClear) });
  elems.categories?.setAttributes({ "aria-hidden": "true" });

  const handle = {
    /** Controls the original category table from EhPeek's category toggle. */
    updateCategoryVisibility(open: boolean) {
      elems.categories?.setAttributes({ "aria-hidden": String(!open) });
    },
    /** Activates E-H's original Search submit control. */
    activateSearch() {
      elems.searchSubmit.click();
    },
    /** Clears only the Search text without invoking E-H's page-navigation reset. */
    clearSearchText() {
      elems.searchInput.setInputValue("");
      elems.searchInput.dispatchInput();
      elems.searchInput.focus();
    },
    toggleAdvancedOptions() {
      elems.advancedToggle?.click();
    },
    toggleFileSearch() {
      elems.fileSearchToggle?.click();
    },
  };

  if (!formInsideSearchBox) {
    elems.form.setAttributes({ id: formId });
    elems.searchInput.setAttributes({ form: formId });
    elems.searchSubmit.setAttributes({ form: formId });
    elems.clearButton?.setAttributes({ form: formId });
  }

  return { data, elems, handle };
}

function actionLabel(element: DomNode<HTMLInputElement | HTMLButtonElement>): string {
  return element.attribute("value") ?? element.text();
}


export type SearchPanelDom = NonNullable<ReturnType<typeof manageSearchPanel>>;
