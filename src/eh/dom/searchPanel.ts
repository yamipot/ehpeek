import {
  createAnchor,
  createManagedElement,
  DomNode,
  type ManagedDomElements,
} from "./core";

export type SearchPanelClasses = {
  actionMount: string;
  advancedPanel: string;
  category: string;
  categoryCell: string;
  categoryRow: string;
  categoryTable: string;
  controls: string;
  fileSearch: string;
  form: string;
  input: string;
  optionLink: string;
  optionLinks: string;
  searchBox: string;
};

/** Manages the original search controls for the TouchUI SearchPanel feature. */
export function manageSearchPanel() {
  const page = DomNode.from(document);
  const searchInput = page.one<HTMLInputElement>("#f_search, input[name='f_search']");
  const form = searchInput?.form() ?? null;
  const standardSearchBox = page.one<HTMLElement>("#searchbox");
  const categories = standardSearchBox?.one<HTMLTableElement>("form > table") ?? null;
  const advancedPanel = standardSearchBox?.one<HTMLElement>("#advdiv") ?? null;
  const optionLinks = advancedPanel?.previous() ?? null;
  const fileSearch = page.one<HTMLElement>("#fsdiv");
  const searchSubmit = form?.one<HTMLInputElement | HTMLButtonElement>("input[name='f_apply'], button[name='f_apply']")
    ?? searchInput?.parent()?.one<HTMLInputElement | HTMLButtonElement>("input[type='submit'], button[type='submit']")
    ?? null;
  const clearButton = form?.one<HTMLInputElement | HTMLButtonElement>("input[name='f_clear'], button[name='f_clear']")
    ?? searchInput?.parent()?.one<HTMLInputElement | HTMLButtonElement>("input[type='button'], button[type='button']")
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

  const categoryRows = categories?.all<HTMLTableRowElement>("tr") ?? [];
  const categoryCells = categories?.all<HTMLTableCellElement>("td") ?? [];
  const categoryItems = categories?.all<HTMLElement>("[id^='cat_']") ?? [];
  const optionLinkItems = optionLinks?.all<HTMLAnchorElement>("a") ?? [];

  const searchControls = createManagedElement("div");
  const elems = {
    advancedPanel: advancedPanel?.inplace() ?? null,
    categories: categories?.inplace() ?? null,
    categoryCells: categoryCells.map((cell) => cell.inplace()),
    categoryItems: categoryItems.map((item) => item.inplace()),
    categoryRows: categoryRows.map((row) => row.inplace()),
    categoryToggleMount,
    clearActionMount,
    clearButton: clearButton?.inplace() ?? null,
    fileSearch: fileSearch?.inplace() ?? null,
    form: form.inplace(),
    mount,
    optionLinks: optionLinks?.inplace() ?? null,
    optionLinkItems: optionLinkItems.map((link) => link.inplace()),
    searchActionMount,
    searchBox: standardSearchBox?.inplace() ?? searchControls,
    searchControls,
    searchInput: searchInput.inplace(),
    searchSubmit: searchSubmit.inplace(),
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
  elems.fileSearch?.remove();

  const formInsideSearchBox = standardSearchBox?.one<HTMLFormElement>("form")?.sameNode(form) ?? false;
  const formId = form.attribute("id") || "ehpeek-search-form";
  const categoryColors = categoryItems.map((item) =>
    ["ct1", "ct2", "ct3", "ct4", "ct5", "ct6", "ct7", "ct8", "ct9", "cta"].find((name) => item.hasClass(name)) ?? null,
  );
  const data = {
    clearLabel: clearButton ? actionLabel(clearButton) : null,
    hasClear: elems.clearButton !== null && elems.clearActionMount !== null,
    searchLabel: actionLabel(searchSubmit),
  };

  const handle = {
    /** Reflows original Search controls into EhPeek's shared SearchPanel structure. */
    updateSearchPanelVisual(classes: SearchPanelClasses) {
      elems.searchActionMount.replaceClasses(classes.actionMount);
      elems.clearActionMount?.replaceClasses(classes.actionMount);
      elems.searchBox.replaceClasses(standardSearchBox ? classes.searchBox : classes.controls);
      if (formInsideSearchBox) {
        elems.form.removeAttributes("style").replaceClasses(classes.form);
      } else {
        elems.form.setAttributes({ id: formId });
        elems.searchInput.setAttributes({ form: formId });
        elems.searchSubmit.setAttributes({ form: formId });
        elems.clearButton?.setAttributes({ form: formId });
      }
      elems.searchControls.replaceClasses(classes.controls);
      elems.searchInput.removeAttributes("style").replaceClasses(classes.input);
      elems.categories?.replaceClasses(classes.categoryTable).setHidden(true);
      elems.categoryRows.forEach((row) => row.replaceClasses(classes.categoryRow));
      elems.categoryCells.forEach((cell) => cell.replaceClasses(classes.categoryCell));
      elems.categoryItems.forEach((item, index) => item.replaceClasses(`${categoryColors[index] ? `${categoryColors[index]} ` : ""}${classes.category}`));
      elems.optionLinks?.replaceClasses(classes.optionLinks);
      elems.optionLinkItems.forEach((link) => link.replaceClasses(classes.optionLink));
      elems.advancedPanel?.replaceClasses(classes.advancedPanel);
      elems.fileSearch?.replaceClasses(classes.fileSearch).removeStyles("margin-top");
      elems.searchSubmit.setHidden(true);
      elems.clearButton?.setHidden(true);
    },
    /** Controls the original category table from EhPeek's category toggle. */
    updateCategoryVisibility(open: boolean) {
      elems.categories?.setHidden(!open);
      elems.categories?.setAttributes({ "aria-hidden": String(!open) });
    },
    /** Activates E-H's original Search submit control. */
    activateSearch() {
      elems.searchSubmit.click();
    },
    /** Activates E-H's original Search clear control. */
    activateClear() {
      elems.clearButton?.click();
    },
  };

  return { data, elems, handle };
}

function actionLabel(element: DomNode<HTMLInputElement | HTMLButtonElement>): string {
  return element.attribute("value") ?? element.text();
}


export type SearchPanelDom = NonNullable<ReturnType<typeof manageSearchPanel>>;
