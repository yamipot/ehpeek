import { normalizeUrl } from "../../utils";
import { createAnchor, DomNode, type ManagedDomElements, type ManagedDomNode } from "./core";

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
  const advancedToggle = optionLinks?.one<HTMLAnchorElement>("a[onclick*='toggle_advsearch'], a[data-ehpeek-search-advanced-toggle='true']") ?? null;
  const fileSearchToggle = optionLinks?.one<HTMLAnchorElement>("a[onclick*='toggle_filesearch'], a[data-ehpeek-search-file-toggle='true']") ?? null;
  const fileSearch = page.one<HTMLElement>("#fsdiv");
  const fileSearchAction = readFileSearchAction(page);
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
  const advancedToggleMount = advancedToggle ? createAnchor("search-advanced-toggle") : null;
  const fileSearchToggleMount = fileSearchToggle ? createAnchor("search-file-toggle") : null;
  const searchActionMount = createAnchor("search-action");
  const clearActionMount = clearButton ? createAnchor("search-clear-action") : null;
  if (!mount || !searchActionMount || (clearButton && !clearActionMount)) {
    return null;
  }

  const categoryRows = categories?.all<HTMLTableRowElement>("tr") ?? [];
  const categoryCells = categories?.all<HTMLTableCellElement>("td") ?? [];
  const categoryItems = categories?.all<HTMLElement>("[id^='cat_']") ?? [];
  const categoryMask = form.one<HTMLInputElement>("input[name='f_cats']");
  const categoryBits = categoryItems.map((item) => Number(item.attribute("id")?.match(/^cat_(\d+)$/)?.[1]));
  const optionLinkItems = optionLinks?.all<HTMLAnchorElement>("a") ?? [];

  const sourceSearchBoxElem = standardSearchBox?.inplace() ?? null;
  const formElem = form.inplace();
  const searchInputElem = searchInput.inplace();
  const searchSubmitElem = searchSubmit.inplace();
  const clearButtonElem = clearButton?.inplace() ?? null;
  const categoriesElem = categories?.inplace() ?? null;
  const advancedPanelElem = advancedPanel?.inplace() ?? null;
  const optionLinksElem = optionLinks?.inplace() ?? null;
  const advancedToggleElem = advancedToggle?.inplace() ?? null;
  const fileSearchToggleElem = fileSearchToggle?.inplace() ?? null;
  const fileSearchElem = fileSearch?.inplace() ?? null;
  const categoryRowElems = categoryRows.map((row) => row.inplace());
  const categoryCellElems = categoryCells.map((cell) => cell.inplace());
  const categoryItemElems = categoryItems.map((item) => item.inplace());
  const categoryMaskElem = categoryMask?.inplace() ?? null;
  const optionLinkElems = optionLinkItems.map((link) => link.inplace());
  const searchControlsElem = DomNode.from(document.createElement("div")).inplace();
  const searchBoxElem = sourceSearchBoxElem ?? searchControlsElem;

  const targetElem = sourceSearchBoxElem ?? formElem;
  targetElem.before(mount);
  if (sourceSearchBoxElem) {
    searchBoxElem.remove();
  }
  searchInputElem.before(searchControlsElem);
  searchInputElem.remove();
  searchControlsElem.append(searchInputElem);
  searchSubmitElem.replaceWith(searchActionMount);
  searchSubmitElem.remove();
  if (clearButtonElem && clearActionMount) {
    clearButtonElem.replaceWith(clearActionMount);
    clearButtonElem.remove();
    searchControlsElem.append(clearActionMount);
  }
  searchControlsElem.append(searchActionMount);
  if (categoriesElem && optionLinksElem && categoryToggleMount) {
    categoriesElem.remove();
    optionLinksElem.after(categoriesElem);
    optionLinksElem.prepend(categoryToggleMount);
  }
  if (advancedToggleElem && advancedToggleMount) {
    advancedToggleElem.replaceWith(advancedToggleMount);
    advancedToggleElem.remove();
  }
  if (fileSearchToggleElem && fileSearchToggleMount) {
    fileSearchToggleElem.replaceWith(fileSearchToggleMount);
    fileSearchToggleElem.remove();
  }
  fileSearchElem?.remove();

  const formInsideSearchBox = standardSearchBox?.one<HTMLFormElement>("form")?.sameNode(form) ?? false;
  const categoryColors = categoryItems.map((item) =>
    ["ct1", "ct2", "ct3", "ct4", "ct5", "ct6", "ct7", "ct8", "ct9", "cta"].find((name) => item.hasClass(name)) ?? null,
  );
  const data = {
    clearLabel: clearButton ? actionLabel(clearButton) : null,
    hasClear: clearButtonElem !== null && clearActionMount !== null,
    searchLabel: actionLabel(searchSubmit),
  };
  populateEmptyPanels(
    advancedPanelElem,
    advancedPanel?.childElementCount() === 0,
    fileSearchElem,
    fileSearch?.childElementCount() === 0,
    fileSearchAction,
  );
  attachCategoryActions(categoryItemElems, categoryMaskElem, categoryBits);
  const elems = {
    advancedPanel: advancedPanelElem,
    advancedToggleMount,
    categories: categoriesElem,
    categoryCells: categoryCellElems,
    categoryItems: categoryItemElems,
    categoryMask: categoryMaskElem,
    categoryRows: categoryRowElems,
    categoryToggleMount,
    clearActionMount,
    clearButton: clearButtonElem,
    fileSearch: fileSearchElem,
    fileSearchToggleMount,
    form: formElem,
    mount,
    optionLinks: optionLinksElem,
    optionLinkItems: optionLinkElems,
    searchActionMount,
    searchBox: searchBoxElem,
    searchControls: searchControlsElem,
    searchInput: searchInputElem,
    searchSubmit: searchSubmitElem,
  } satisfies ManagedDomElements;

  const handle = {
    transformPresentation(classes: SearchPanelClasses) {
      searchActionMount.transform({ classes: { replace: classes.actionMount } });
      clearActionMount?.transform({ classes: { replace: classes.actionMount } });
      searchBoxElem.transform({ classes: { replace: standardSearchBox ? classes.searchBox : classes.controls } });
      if (formInsideSearchBox) {
        formElem.transform({ attributes: { remove: ["style"] }, classes: { replace: classes.form } });
      } else {
        formElem.transform({ attributes: { set: { id: form.attribute("id") || "ehpeek-search-form" } } });
        const formId = form.attribute("id") || "ehpeek-search-form";
        searchInputElem.transform({ attributes: { set: { form: formId } } });
        searchSubmitElem.transform({ attributes: { set: { form: formId } } });
        clearButtonElem?.transform({ attributes: { set: { form: formId } } });
      }
      searchControlsElem.transform({ classes: { replace: classes.controls } });
      searchInputElem.transform({ attributes: { remove: ["style"] }, classes: { replace: classes.input } });
      categoriesElem?.transform({ hidden: true, classes: { replace: classes.categoryTable } });
      categoryRowElems.forEach((row) => row.transform({ classes: { replace: classes.categoryRow } }));
      categoryCellElems.forEach((cell) => cell.transform({ classes: { replace: classes.categoryCell } }));
      categoryItemElems.forEach((item, index) => item.transform({
        attributes: { remove: ["onclick"] },
        classes: { replace: `${categoryColors[index] ? `${categoryColors[index]} ` : ""}${classes.category}` },
      }));
      optionLinksElem?.transform({ classes: { replace: classes.optionLinks } });
      optionLinkElems.forEach((link) => link.transform({ classes: { replace: classes.optionLink } }));
      advancedPanelElem?.transform({ styles: { remove: ["display"] }, classes: { replace: classes.advancedPanel } });
      fileSearchElem?.transform({ styles: { remove: ["display", "margin-top"] }, classes: { replace: classes.fileSearch } });
      searchSubmitElem.setHidden(true);
      clearButtonElem?.setHidden(true);
    },
    transformCategories(open: boolean) {
      categoriesElem?.setHidden(!open);
      categoriesElem?.transform({ attributes: { set: { "aria-hidden": String(!open) } } });
    },
    transformAdvanced(open: boolean) {
      advancedPanelElem?.setHidden(!open);
    },
    transformFileSearch(open: boolean) {
      fileSearchElem?.setHidden(!open);
    },
    submit() {
      formElem.requestSubmit(searchSubmitElem);
    },
    clear() {
      searchInputElem.setInputValue("");
      searchInputElem.dispatchInput();
      searchInputElem.focus();
    },
  };

  return { data, elems, handle };
}

function actionLabel(element: DomNode<HTMLInputElement | HTMLButtonElement>): string {
  return element.attribute("value") ?? element.text();
}

function readFileSearchAction(page: DomNode<Document>): string {
  const preserved = page.one<HTMLElement>("#fsdiv")?.attribute("data-ehpeek-file-search-action");
  if (preserved) {
    return preserved;
  }
  const script = page.all<HTMLScriptElement>("script").map((item) => item.text()).find((text) => text.includes("ulhost")) ?? "";
  const uploadBase = script.match(/\bulhost\s*=\s*["']([^"']+)["']/)?.[1];
  return uploadBase ? new URL("image_lookup.php", normalizeUrl(uploadBase, window.location.href)).href : "";
}

function populateEmptyPanels(
  advancedPanel: ManagedDomNode<HTMLElement> | null,
  advancedPanelEmpty: boolean,
  fileSearch: ManagedDomNode<HTMLElement> | null,
  fileSearchEmpty: boolean,
  fileSearchAction: string,
): void {
  if (advancedPanel && advancedPanelEmpty) {
    const template = document.createElement("template");
    template.innerHTML = `<input type="hidden" id="advsearch" name="advsearch" value="1"><div class="searchadv"><div><div><label class="lc"><input type="checkbox" name="f_sh"><span></span> Browse Expunged Galleries</label></div><div><label class="lc"><input type="checkbox" name="f_sto"><span></span> Require Gallery Torrent</label></div></div><div><div>Between <input type="text" id="f_spf" name="f_spf" size="4" maxlength="4"> and <input type="text" id="f_spt" name="f_spt" size="4" maxlength="4"> pages</div><div>Minimum Rating: <select id="f_srdd" name="f_srdd"><option value="0">Any Rating</option><option value="2">2 Stars</option><option value="3">3 Stars</option><option value="4">4 Stars</option><option value="5">5 Stars</option></select></div></div><div><div>Disable custom filters for:</div><div><label class="lc"><input type="checkbox" name="f_sfl"><span></span> Language</label></div><div><label class="lc"><input type="checkbox" name="f_sfu"><span></span> Uploader</label></div><div><label class="lc"><input type="checkbox" name="f_sft"><span></span> Tags</label></div></div></div>`;
    advancedPanel.replaceChildren(template.content);
  }
  if (fileSearch && fileSearchEmpty && fileSearchAction) {
    const form = document.createElement("form");
    form.action = fileSearchAction;
    form.method = "post";
    form.enctype = "multipart/form-data";
    form.innerHTML = `<div>Select a file to upload, then hit File Search. All public galleries containing this exact file will be displayed.</div><div><input type="file" name="sfile"> <input type="submit" name="f_sfile" value="File Search"></div><div>For color images, the system can also perform a similarity lookup to find resampled images.</div><div class="searchadv"><div><div><label class="lc"><input type="checkbox" name="fs_similar" checked><span></span> Use Similarity Scan</label></div><div><label class="lc"><input type="checkbox" name="fs_covers"><span></span> Only Search Covers</label></div></div></div>`;
    fileSearch.replaceChildren(form);
  }
}

function attachCategoryActions(
  categories: ManagedDomNode<HTMLElement>[],
  mask: ManagedDomNode<HTMLInputElement> | null,
  bits: number[],
): void {
  categories.forEach((category, index) => {
    const categoryBit = bits[index];
    if (!mask || !Number.isInteger(categoryBit) || categoryBit <= 0) {
      return;
    }
    const update = () => category.transform({
      attributes: (Number(mask.inputValue()) & categoryBit) !== 0
        ? { set: { "data-disabled": "" } }
        : { remove: ["data-disabled"] },
    });
    update();
    category.listen("click", () => {
      mask.setDisabled(false);
      mask.setInputValue(String(Number(mask.inputValue()) ^ categoryBit));
      update();
    });
  });
}

export type SearchPanelDom = NonNullable<ReturnType<typeof manageSearchPanel>>;
