import { normalizeUrl } from "../../utils";
import {
  createAnchor,
  createManagedElement,
  DomNode,
  type ManagedDomElements,
  type ManagedDomNode,
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

  const searchControls = createManagedElement("div");
  const elems = {
    advancedPanel: advancedPanel?.inplace() ?? null,
    advancedToggle: advancedToggle?.inplace() ?? null,
    advancedToggleMount,
    categories: categories?.inplace() ?? null,
    categoryCells: categoryCells.map((cell) => cell.inplace()),
    categoryItems: categoryItems.map((item) => item.inplace()),
    categoryMask: categoryMask?.inplace() ?? null,
    categoryRows: categoryRows.map((row) => row.inplace()),
    categoryToggleMount,
    clearActionMount,
    clearButton: clearButton?.inplace() ?? null,
    fileSearch: fileSearch?.inplace() ?? null,
    fileSearchToggle: fileSearchToggle?.inplace() ?? null,
    fileSearchToggleMount,
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
  if (elems.advancedToggle && elems.advancedToggleMount) {
    elems.advancedToggle.replaceWith(elems.advancedToggleMount);
  }
  if (elems.fileSearchToggle && elems.fileSearchToggleMount) {
    elems.fileSearchToggle.replaceWith(elems.fileSearchToggleMount);
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
  populateEmptyPanels(
    elems.advancedPanel,
    advancedPanel?.childElementCount() === 0,
    elems.fileSearch,
    fileSearch?.childElementCount() === 0,
    fileSearchAction,
  );
  attachCategoryActions(elems.categoryItems, elems.categoryMask, categoryBits);

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
      elems.categoryItems.forEach((item, index) => item.removeAttributes("onclick").replaceClasses(`${categoryColors[index] ? `${categoryColors[index]} ` : ""}${classes.category}`));
      elems.optionLinks?.replaceClasses(classes.optionLinks);
      elems.optionLinkItems.forEach((link) => link.replaceClasses(classes.optionLink));
      elems.advancedPanel?.replaceClasses(classes.advancedPanel).removeStyles("display");
      elems.fileSearch?.replaceClasses(classes.fileSearch).removeStyles("display", "margin-top");
      elems.searchSubmit.setHidden(true);
      elems.clearButton?.setHidden(true);
    },
    /** Controls the original category table from EhPeek's category toggle. */
    updateCategoryVisibility(open: boolean) {
      elems.categories?.setHidden(!open);
      elems.categories?.setAttributes({ "aria-hidden": String(!open) });
    },
    /** Controls the original advanced-search fields from EhPeek's toggle. */
    updateAdvancedOptionsVisibility(open: boolean) {
      elems.advancedPanel?.setHidden(!open);
    },
    /** Controls the original file-search fields from EhPeek's toggle. */
    updateFileSearchVisibility(open: boolean) {
      elems.fileSearch?.setHidden(!open);
    },
    /** Submits through the original Search form and its preserved parameters. */
    submitSearchForm() {
      elems.form.requestSubmit(elems.searchSubmit);
    },
    /** Clears the original input and emits the event consumed by Search history. */
    clearSearchInput() {
      elems.searchInput.setInputValue("");
      elems.searchInput.dispatchInput();
      elems.searchInput.focus();
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
    if (!mask || categoryBit === undefined || !Number.isInteger(categoryBit) || categoryBit <= 0) {
      return;
    }
    const update = () => {
      if ((Number(mask.inputValue()) & categoryBit) !== 0) {
        category.setAttributes({ "data-disabled": "" });
      } else {
        category.removeAttributes("data-disabled");
      }
    };
    update();
    category.listen("click", () => {
      mask.setDisabled(false);
      mask.setInputValue(String(Number(mask.inputValue()) ^ categoryBit));
      update();
    });
  });
}

export type SearchPanelDom = NonNullable<ReturnType<typeof manageSearchPanel>>;
