import texts from "../../texts.json";
import { extractPageType, type PageType } from "../url";
import { requestPage } from "../request";
import type { TouchFavoritesCategorySelectInfo } from "../types";
import {
  createManagedElement,
  documentBody,
  documentElement,
  DomNode,
  type ManagedDomElements,
  ManagedDomNode,
} from "./core";

const TOUCH_FAVORITES_PAGE_CLASS_NAME = "!min-w-0 !max-w-full !overflow-x-hidden";
const TOUCH_FAVORITES_CONTENT_CLASS_NAME = "box-border !min-w-0 !w-full !max-w-full !overflow-x-hidden";
const TOUCH_FAVORITES_NAV_CLASS_NAME = "box-border !max-w-full overflow-x-auto";
const TOUCH_FAVORITES_RESULTS_CLASS_NAME = "ehpeek-touch-favorites-results box-border !min-w-0 !w-full !max-w-full overflow-x-auto";
const TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME = "!min-w-0 !w-full !max-w-full";
const TOUCH_FAVORITES_ALL_RESULTS_CLASS_NAME = "!overflow-x-hidden";
const TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME = "!min-w-0 !max-w-full !overflow-x-hidden";
const TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME = "box-border !min-w-0 !w-full !max-w-full !overflow-x-hidden";
const TOUCH_SEARCH_RESULTS_WRAPPER_CLASS_NAME =
  "ehpeek-touch-search-results box-border !min-w-0 !w-full !max-w-full overflow-x-auto";
const TOUCH_SEARCH_RESULT_LIST_CLASS_NAME = "!min-w-0 !w-full !max-w-full";

/** Owns Search results and pagination for the enhanced navigation lifecycle. */
export function manageSearchResults() {
  const page = DomNode.from(document);
  const resultSource = page.one<HTMLElement>(".itg");
  if (!resultSource) {
    return null;
  }
  const data = {
    nextUrl: page.one<HTMLAnchorElement>(".searchnav a[id$='next'][href]")?.attribute("href") ?? null,
    previousUrl: page.one<HTMLAnchorElement>(".searchnav a[id$='prev'][href]")?.attribute("href") ?? null,
  };
  const elems = {
    resultList: resultSource.inplace(),
    searchInput: page.one<HTMLInputElement>("#f_search, input[name='f_search']")?.inplace() ?? null,
  };
  const handle = {
    /** Routes the original pagination controls through the active page owner. */
    interceptSearchNavigation(onNavigate: (url: string) => void): () => void {
      const handleClick = (event: MouseEvent) => {
        const link = event.target instanceof Element
          ? DomNode.from(event.target).closest<HTMLAnchorElement>(
              ".searchnav a[id$='first'][href], .searchnav a[id$='prev'][href], .searchnav a[id$='next'][href], .searchnav a[id$='last'][href]",
            )
          : null;
        const url = link?.attribute("href") ?? null;
        if (!url) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onNavigate(url);
      };

      document.addEventListener("click", handleClick, true);
      return () => document.removeEventListener("click", handleClick, true);
    },
    /** Replaces the current result page for enhanced swipe navigation. */
    async loadSearchPage(url: string): Promise<void> {
      const response = await requestPage(url);
      if (!replaceSearchPageContent(response.document)) {
        throw new Error(texts.errors.searchPageContentNotFound);
      }
      window.history.pushState(window.history.state, "", url);
    },
    /** Returns enhanced Search navigation to its input, or the page top when absent. */
    scrollSearchPageToInput(): void {
      if (elems.searchInput) {
        elems.searchInput.scrollIntoView({ block: "start", behavior: "auto" });
      } else {
        window.scrollTo({ top: 0, behavior: "auto" });
      }
    },
    /** Exposes result loading state without removing the current result list. */
    updateSearchLoading(busy: boolean): void {
      if (busy) {
        elems.resultList.setAttributes({ "aria-busy": "true" });
      } else {
        elems.resultList.removeAttributes("aria-busy");
      }
    },
    /** Prevents result content from stealing a horizontal swipe gesture. */
    ensureSearchSwipeInput(): void {
      elems.resultList.addClasses("overscroll-x-contain", "touch-pan-y", "[&[data-dragging=true]]:select-none");
    },
    /** Applies the user setting to gallery links already owned by the result list. */
    ensureGalleryLinksOpenInNewTab(): void {
      for (const link of elems.resultList.all<HTMLAnchorElement>("a[href]")) {
        if (extractPageType(link.readAttribute("href") ?? "").type !== "gallery") {
          continue;
        }
        link.setAttributes({ target: "_blank", rel: "noopener noreferrer" });
      }
    },
  };
  return { data, elems, handle };
}

export type SearchResultsDom = NonNullable<ReturnType<typeof manageSearchResults>>;

/** Owns the original Search text input, form, submit control, and their events. */
export function manageSearchTextInput() {
  const page = DomNode.from(document);
  const inputSource = page.one<HTMLInputElement>("#f_search, input[name='f_search']");
  const formSource = inputSource?.form() ?? null;
  const submitSource = formSource?.one<HTMLInputElement | HTMLButtonElement>(
    "input[name='f_apply'], button[name='f_apply']",
  ) ?? inputSource?.parent()?.one<HTMLInputElement | HTMLButtonElement>(
    "input[type='submit'], button[type='submit']",
  ) ?? null;
  if (!inputSource || !submitSource) {
    return null;
  }
  const elems = {
    form: formSource?.inplace() ?? null,
    input: inputSource.inplace(),
    submit: submitSource.inplace(),
  };
  const data = { value: elems.input.inputValue() };
  const handle = {
    /** Connects the original input to EhPeek's history and suggestion overlay. */
    listenSearchHistoryOverlay(callbacks: {
      onFocus: () => void;
      onInput: (value: string, focused: boolean) => void;
      onKeyDown: (event: KeyboardEvent) => void;
      onOutsidePointer: () => void;
      onPositionChange: () => void;
      onSubmit: (value: string) => void;
    }, overlay: () => HTMLElement | null): () => void {
      const update = () => callbacks.onInput(
        elems.input.inputValue(),
        document.activeElement === elems.input.Component(),
      );
      const submitValue = () => callbacks.onSubmit(elems.input.inputValue());
      const outsidePointer = (event: PointerEvent) => {
        const target = event.target;
        if (
          target instanceof Node &&
          (elems.input.isNode(target) || overlay()?.contains(target))
        ) {
          return;
        }
        callbacks.onOutsidePointer();
      };
      const disconnect = [
        elems.input.listen("input", update),
        elems.input.listen("focus", callbacks.onFocus),
        elems.input.listen("pointerdown", callbacks.onFocus),
        elems.input.listen("keydown", callbacks.onKeyDown),
        elems.submit.listen("click", submitValue),
        ...(elems.form ? [elems.form.listen("submit", submitValue)] : []),
      ];
      document.addEventListener("pointerdown", outsidePointer, true);
      document.addEventListener("scroll", callbacks.onPositionChange, true);
      window.addEventListener("resize", callbacks.onPositionChange);
      return () => {
        disconnect.forEach((cleanup) => cleanup());
        document.removeEventListener("pointerdown", outsidePointer, true);
        document.removeEventListener("scroll", callbacks.onPositionChange, true);
        window.removeEventListener("resize", callbacks.onPositionChange);
      };
    },
    /** Locates the overlay directly below the original search input. */
    readSearchOverlayPosition(): { left: number; top: number; width: number } {
      const rect = elems.input.rect();
      return { left: rect.left, top: rect.bottom, width: rect.width };
    },
    /** Commits a history or suggestion choice through the original input events. */
    applySearchSelection(value: string): void {
      elems.input.setInputValue(value);
      elems.input.dispatchInput();
      elems.input.focus();
      elems.input.Component().setSelectionRange(value.length, value.length);
    },
  };
  return { data, elems, handle };
}

export type SearchTextInputDom = NonNullable<ReturnType<typeof manageSearchTextInput>>;

/** Rebuilds Search's extended table layout as the touch-readable EhPeek grid. */
export function mutateSearchGrid(): void {
  const page = DomNode.from(document);
  page.one<HTMLElement>(".ehpeek-search-grid-host")?.inplace().remove();
  const resultList = page.one<HTMLElement>(".itg");

  if (!resultList) {
    return;
  }

  const rows = resultList
    .all<HTMLTableRowElement>("tbody > tr")
    .map(resolveSearchGridRow)
    .filter((row): row is SearchGridRow => row !== null);
  const resultListElem = resultList.inplace();
  const bodyElem = resultList.one<HTMLElement>("tbody")?.inplace() ?? null;

  resultListElem.setHidden(false)
    .styles({
      display: "block",
      width: "100%",
      "table-layout": "auto",
    }, "important");
  bodyElem?.styles({ display: "block" }, "important");

  for (const row of rows) {
    applySearchGridRow(row);
  }

  type SearchGridRow = NonNullable<ReturnType<typeof resolveSearchGridRow>>;

  function resolveSearchGridRow(row: DomNode<HTMLTableRowElement>) {
    const thumbnailCell = row.one<HTMLElement>(":scope > .gl1e");
    const contentCell = row.one<HTMLElement>(":scope > .gl2e");
    const detail = contentCell?.one<HTMLElement>(".gl4e");
    const metadata = contentCell?.one<HTMLElement>(".gl3e");

    if (!thumbnailCell || !contentCell || !detail || !metadata) {
      return null;
    }

    const title = detail.one<HTMLElement>(":scope > .glink");
    const parent = detail.parent();
    const galleryLink = parent?.matches("a[href]") ? parent : null;
    const tags = detail.children().filter((element) => !title?.sameNode(element));
    const thumbnail = thumbnailCell.one<HTMLElement>(":scope > div");
  
    return {
      contentCell,
      detail,
      galleryHref: galleryLink?.attribute("href") ?? null,
      galleryLink,
      image: thumbnail?.one<HTMLImageElement>("img") ?? null,
      metadata,
      metadataItems: metadata.children(),
      row,
      selectionCell: row.one<HTMLElement>(":scope > .glfe"),
      tagCells: tags.flatMap((container) => container.all<HTMLElement>("td")),
      tagElements: detail.all<HTMLElement>(".gt, .gtl, .gtw, td.tc"),
      tagTables: tags.flatMap((container) => container.all<HTMLElement>("table, tbody, tr")),
      tags,
      thumbnail,
      thumbnailCell,
      title,
      titleText: title?.text() ?? "",
    };
  }
  
  function applySearchGridRow(source: SearchGridRow): void {
    const row = source.row.inplace();
    const thumbnailCell = source.thumbnailCell.inplace();
    const contentCell = source.contentCell.inplace();
    const detail = source.detail.inplace();
    const metadata = source.metadata.inplace();

    row.styles({
      display: "grid",
      "grid-template-columns": source.selectionCell
        ? "clamp(112px, 34%, 250px) minmax(0, 1fr) auto"
        : "clamp(112px, 34%, 250px) minmax(0, 1fr)",
      "align-items": "start",
      "column-gap": "0",
      width: "100%",
    }, "important");
    thumbnailCell.styles({ width: "auto" }, "important");
    contentCell.styles({
      width: "auto",
      "min-width": "0",
      "align-self": "stretch",
      height: "100%",
      "box-sizing": "border-box",
      "padding-left": "0",
    }, "important");
    source.selectionCell?.inplace().styles({ width: "auto", "margin-left": "6px" }, "important");
    source.thumbnail?.inplace().styles({ width: "100%", height: "auto" }, "important");
    source.image?.inplace().styles({ width: "100%", height: "auto" }, "important");
    applySearchGridContent(source, row, contentCell, detail, metadata);
  }

  function applySearchGridContent(
    source: SearchGridRow,
    row: ManagedDomNode,
    contentCell: ManagedDomNode,
    detail: ManagedDomNode,
    metadata: ManagedDomNode,
  ): void {
    const tags = source.tags.map((node) => node.inplace());
    const title = source.title?.inplace() ?? null;
    const galleryLink = source.galleryLink?.inplace() ?? null;

    if (galleryLink && title && source.galleryHref) {
      const titleLink = createManagedElement("a")
        .attribute("href", source.galleryHref).replaceClasses("block min-w-0 ehp-color-site-text no-underline");
      titleLink.append(title);
      galleryLink.before(detail);
      galleryLink.remove();
      detail.replaceChildren(titleLink, metadata, ...tags);
      makeSearchGridContentClickable(
        row,
        titleLink,
        source.galleryHref,
        source.titleText,
      );
    } else if (title) {
      title.after(metadata);
    }

    title?.styles({
      height: "auto",
      "min-height": "0",
      overflow: "visible",
      "overflow-wrap": "anywhere",
      "white-space": "normal",
      "word-break": "normal",
      "text-align": "left",
      "font-size": "var(--font-size-md)",
      "font-weight": "700",
      "line-height": "1.35",
    }, "important");
  
    detail.styles({
        display: "flex",
        "flex-direction": "column",
        "justify-content": "flex-start",
        "align-items": "stretch",
        gap: "var(--space-md, 12px)",
        "min-height": "0",
        width: "100%",
        "box-sizing": "border-box",
        "padding-left": "6px",
      }, "important");
    metadata.styles({
      display: "flex",
      "flex-direction": "row",
      "flex-wrap": "wrap",
      "align-items": "center",
      "align-content": "flex-start",
      "justify-content": "flex-start",
      gap: "8px 12px",
      float: "none",
      position: "static",
      width: "100%",
      height: "auto",
      "min-height": "0",
      margin: "0",
      padding: "0",
      "font-weight": "600",
    }, "important");
  
    for (const tag of tags) {
      tag.styles({
        position: "static",
        width: "100%",
        height: "auto",
        "min-height": "0",
        flex: "0 0 auto",
        margin: "0",
        padding: "0",
      }, "important");
    }
    for (const table of source.tagTables) {
      table.inplace().styles({ height: "auto", "min-height": "0", margin: "0" }, "important");
    }
    for (const cell of source.tagCells) {
      cell.inplace().styles({ height: "auto", "min-height": "0", "vertical-align": "top" }, "important");
    }
    for (const tag of source.tagElements) {
      tag.inplace().styles({ "font-size": "var(--font-size-sm)", "line-height": "1.2" }, "important");
    }
    for (const itemSource of source.metadataItems) {
      const item = itemSource.inplace();
      item.styles({
        float: "none",
        position: "static",
        flex: "0 0 auto",
        "min-width": "0",
        margin: "0",
        "font-size": "var(--font-size-sm)",
        "font-weight": "600",
      }, "important");

      if (itemSource.matches(".ir, .gldown")) {
        item.removeStyles("width", "height");
        continue;
      }
  
      item.styles({ width: "auto", height: "auto", padding: "0", "line-height": "1.3" }, "important");
      if (itemSource.matches(".cn, .cs, [class*='ct']")) {
        item.styles({
          display: "inline-flex",
          "align-items": "center",
          "justify-content": "center",
          "box-sizing": "border-box",
          width: "max(72px, 6em)",
          height: "max(32px, 2.2em)",
          padding: "0 0.6em",
        }, "important");
      }
    }
  }
  
  function makeSearchGridContentClickable(
    row: ManagedDomNode,
    galleryLink: ManagedDomNode<HTMLAnchorElement>,
    galleryHref: string,
    title: string,
  ): void {
    const overlay = createManagedElement("a")
      .attribute("href", galleryHref)
      .attribute("aria-label", title || "Open gallery")
      .replaceClasses("hidden coarse:block absolute inset-0 z-1")
      .styles({ "grid-column": "1 / 3", "grid-row": "1" });
    row
      .styles({ position: "relative", cursor: "pointer" }, "important")
      .append(overlay)
      .listen("click", (event) => {
        const target = event.target instanceof Element ? DomNode.from(event.target) : null;
        if (!target?.closest("a[href], button, input, select, textarea, label, [onclick]")) {
          galleryLink.click();
        }
      });
  }
}

/** Adds the local EhPeek grid choice to Search's original display-mode selector. */
export function mutateSearchGridModeSelect(
  selected: boolean,
  onEhPeekSelect: () => void,
  onOriginalSelect: () => void,
) {
  const selects = DomNode.from(document).all<HTMLSelectElement>(
    "select[onchange*='inline_set=dm_']",
  );

  for (const source of selects) {
    const select = source.inplace();
    let option = source.all<HTMLOptionElement>("option").find((item) => item.inputValue() === "ehpeek")?.inplace() ?? null;

    if (!option) {
      option = createManagedElement("option")
        .attribute("value", "ehpeek");
      option.setTextUnlessInput("EhPeek");
      select.append(option);
    }

    option.setSelected(selected);

    if (source.attribute("data-ehpeek-grid-mode") === "true") {
      continue;
    }

    select.attribute("data-ehpeek-grid-mode", "true");
    select.listen("change", (event) => {
      if (select.inputValue() !== "ehpeek") {
        onOriginalSelect();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      onEhPeekSelect();
    }, true);
  }
}

function replaceSearchPageContent(doc: Document): boolean {
  const currentList = DomNode.from(document).one<HTMLElement>(".itg");
  const incomingList = DomNode.from(doc).one<HTMLElement>(".itg");

  if (!currentList || !incomingList) {
    return false;
  }

  if (!refreshSearchRangeBar(doc)) {
    return false;
  }
  replaceFirstElement(".searchtext", doc);
  replaceSearchNavigationBars(doc);

  const current = currentList.inplace();
  const importedList = incomingList.clone();
  current.replaceWith(importedList);
  return true;
}

/** Rebuilds the original range bar because scripts in fetched documents are not executed. */
function refreshSearchRangeBar(doc: Document): boolean {
  const current = DomNode.from(document).one<HTMLElement>("#rangebar");
  const incomingPage = DomNode.from(doc);
  const incoming = incomingPage.one<HTMLElement>("#rangebar");
  if (!current && !incoming) {
    return true;
  }
  if (!current || !incoming) {
    return false;
  }

  const script = incomingPage
    .all<HTMLScriptElement>("script")
    .map((item) => item.text())
    .find((item) => item.includes("build_rangebar()"));
  const rangeUrl = script?.match(/\brangeurl\s*=\s*["']([^"']*)["']/)?.[1];
  const rangeMin = Number(script?.match(/\brangemin\s*=\s*(-?\d+)/)?.[1]);
  const rangeMax = Number(script?.match(/\brangemax\s*=\s*(-?\d+)/)?.[1]);
  const rangeSpan = Number(script?.match(/\brangespan\s*=\s*(-?\d+)/)?.[1]);
  if (
    rangeUrl === undefined ||
    !Number.isFinite(rangeMin) ||
    !Number.isFinite(rangeMax) ||
    !Number.isFinite(rangeSpan)
  ) {
    return false;
  }

  const items: ManagedDomNode[] = [];
  if (rangeSpan > 0) {
    for (let index = 0; index < 99; index += rangeSpan) {
      const marker = createManagedElement("div");
      if (
        (index === 98 && rangeMin === 99) ||
        (index >= rangeMin && index <= rangeMax)
      ) {
        marker.attribute("data-inrange", "1");
      }
      if (!rangeUrl) {
        items.push(marker);
        continue;
      }
      const href = index === 0
        ? rangeUrl
        : `${rangeUrl}${rangeUrl.includes("?") ? "&" : "?"}range=${index}`;
      items.push(createManagedElement("a").attribute("href", href).append(marker));
    }
  }
  current.inplace().replaceChildren(...items);
  return true;
}

function replaceSearchNavigationBars(doc: Document): void {
  const currentBars = DomNode.from(document).all<HTMLElement>(".searchnav");
  const incomingBars = DomNode.from(doc).all<HTMLElement>(".searchnav");
  const count = Math.min(currentBars.length, incomingBars.length);

  for (let index = 0; index < count; index += 1) {
    const currentSource = currentBars[index];
    const incomingSource = incomingBars[index];
    if (!currentSource || !incomingSource) {
      continue;
    }
    const current = currentSource.inplace();
    const incoming = incomingSource.clone();
    current.replaceWith(incoming);
  }
}

function replaceFirstElement(selector: string, doc: Document): void {
  const current = DomNode.from(document).one<HTMLElement>(selector);
  const incoming = DomNode.from(doc).one<HTMLElement>(selector);

  if (!current || !incoming) {
    return;
  }

  const currentElement = current.inplace();
  const incomingElement = incoming.clone();
  currentElement.replaceWith(incomingElement);
}

/** Applies TouchUI layout ownership to Favorites results and extracts its collection selector. */
type FavoritesCategoriesDom = {
  info: TouchFavoritesCategorySelectInfo;
  items: ManagedDomNode[];
};

function favoritesPageTouch(): FavoritesCategoriesDom | null {
  documentElement().addClasses(...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "));
  documentBody().addClasses(...TOUCH_FAVORITES_PAGE_CLASS_NAME.split(" "));

  const page = DomNode.from(document);
  const pageContainer = page.one<HTMLElement>(".ido");
  pageContainer?.inplace()
    .removeStyles("min-width")
    .addClasses(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" "));

  const categories = page.one<HTMLElement>(".ido > .nosel");
  const categorySelect = categories ? manageFavoritesCategories(categories) : null;
  const searchContainer = page.one<HTMLInputElement>("input[name='f_search']")?.form()?.parent();
  searchContainer
    ?.inplace()
    .removeStyles("width").addClasses("box-border", "!w-full", "!min-w-0", "!max-w-full");

  for (const navigation of page.all<HTMLElement>(".searchnav")) {
    navigation.inplace().addClasses(...TOUCH_FAVORITES_NAV_CLASS_NAME.split(" "));
  }

  const resultSource = page.one<HTMLElement>(".itg");
  if (!resultSource) {
    return categorySelect;
  }

  const existingWrapperSource = resultSource.parent();
  const existingWrapper = existingWrapperSource?.hasClass("ehpeek-touch-favorites-results")
    ? existingWrapperSource
    : null;
  const contentSource = existingWrapper?.parent() ?? resultSource.parent();
  const allSelected = categorySelect?.info.categories[0]?.selected === true;

  contentSource?.inplace().addClasses(...TOUCH_FAVORITES_CONTENT_CLASS_NAME.split(" "));
  const resultList = resultSource.inplace();
  resultList.addClasses(...TOUCH_FAVORITES_RESULT_LIST_CLASS_NAME.split(" "));

  if (existingWrapper) {
    return categorySelect;
  }

  if (allSelected || window.innerWidth < 850) {
    compactFavoritesResultList(resultSource);
  }

  const wrapper = createManagedElement("div").replaceClasses(TOUCH_FAVORITES_RESULTS_CLASS_NAME);
  if (allSelected || window.innerWidth < 850) {
    wrapper.addClasses(...TOUCH_FAVORITES_ALL_RESULTS_CLASS_NAME.split(" "));
  }
  resultList.replaceWith(wrapper);
  wrapper.append(resultList);
  return categorySelect;
}

function compactFavoritesResultList(source: DomNode<HTMLElement>): void {
  source.inplace().styles({
    "table-layout": "auto",
    width: "100%",
  }, "important");

  for (const content of source.all<HTMLElement>("tbody > tr > .gl2e")) {
    content.inplace().styles({ width: "auto", "overflow-wrap": "anywhere" }, "important");
  }
  for (const title of source.all<HTMLElement>(".glink")) {
    title.inplace().styles({ "white-space": "normal", "overflow-wrap": "anywhere" }, "important");
  }
  for (const tags of source.all<HTMLElement>(".gl4e table")) {
    tags.inplace().styles({
      "table-layout": "fixed",
      width: "100%",
      "max-width": "100%",
    }, "important");
  }
  for (const cell of source.all<HTMLElement>(".gl4e td")) {
    cell.inplace().styles({ "min-width": "0", "overflow-wrap": "anywhere" }, "important");
  }
  for (const namespace of source.all<HTMLElement>(".gl4e td.tc")) {
    namespace.inplace().styles({ width: "4em", "white-space": "nowrap" }, "important");
  }
  for (const selection of source.all<HTMLElement>("tbody > tr > .glfe")) {
    selection.inplace().styles({ width: "1%", "white-space": "nowrap" }, "important");
  }
}

function manageFavoritesCategories(
  container: DomNode<HTMLElement>,
): FavoritesCategoriesDom | null {
  const nodes = container.all<HTMLElement>(":scope > .fp, :scope > .fps");

  if (nodes.length === 0) {
    return null;
  }

  const parsed = nodes.map((node) => {
    const children = node.children();
    const countText = children[0]?.text() ?? "0";
    const label = children[children.length - 1]?.text() || node.text();
    const count = Number(countText.replace(/,/g, ""));
    const indicator = node.one<HTMLElement>(".i");
    const indicatorStyle = indicator?.computedStyle() ?? null;
    return {
      appearance: indicatorStyle ? {
        backgroundImage: indicatorStyle.backgroundImage,
        backgroundPosition: indicatorStyle.backgroundPosition,
        backgroundSize: indicatorStyle.backgroundSize,
      } : null,
      count: Number.isFinite(count) ? count : 0,
      label,
      selected: node.hasClass("fps"),
      source: node,
    };
  });
  const all = parsed.find((category) => category.source.childElementCount() === 0);
  const favorites = parsed.filter((category) => category !== all);
  const total = favorites.reduce((sum, category) => sum + category.count, 0);
  container.inplace().setHidden(true);

  const categories = [
    ...(all ? [{ ...all, count: total, label: texts.favorites.all }] : []),
    ...favorites,
  ];
  return {
    info: {
      categories: categories.map(({ appearance, count, label, selected }) => ({
        appearance,
        count,
        label,
        selected,
      })),
    },
    items: categories.map(({ source }) => source.inplace()),
  };
}

/** Applies TouchUI layout ownership to Search-like result pages. */
function searchResultsPageTouch(): void {
  documentElement().addClasses(...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" "));
  documentBody().addClasses(...TOUCH_SEARCH_RESULTS_PAGE_CLASS_NAME.split(" "));

  const page = DomNode.from(document);
  const resultSource = page.one<HTMLElement>(".itg");
  if (!resultSource) {
    return;
  }

  const existingWrapperSource = resultSource.parent();
  const existingWrapper = existingWrapperSource?.hasClass("ehpeek-touch-search-results")
    ? existingWrapperSource
    : null;
  const contentSource = existingWrapper?.parent() ?? resultSource.parent();
  const pageContent = resultSource.closest<HTMLElement>(".ido");

  pageContent?.inplace().addClasses(...TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME.split(" "));
  contentSource?.inplace().addClasses(...TOUCH_SEARCH_RESULTS_CONTENT_CLASS_NAME.split(" "));
  const resultList = resultSource.inplace();
  resultList.addClasses(...TOUCH_SEARCH_RESULT_LIST_CLASS_NAME.split(" "));

  if (existingWrapper) {
    return;
  }

  const wrapper = createManagedElement("div").replaceClasses(TOUCH_SEARCH_RESULTS_WRAPPER_CLASS_NAME);
  resultList.replaceWith(wrapper);
  wrapper.append(resultList);
}

/** Owns the TouchUI layout lifecycle for one Search or Favorites results page. */
export function manageTouchResultsPage(page: PageType) {
  const apply = () => {
    if (page.type === "favorites") {
      return favoritesPageTouch();
    }
    if (page.type === "search") {
      searchResultsPageTouch();
    }
    return null;
  };
  const favoritesCategory = apply();
  const data = { favoritesCategory: favoritesCategory?.info ?? null };
  const elems = {
    favoriteCategoryItems: favoritesCategory?.items ?? [],
  } satisfies ManagedDomElements;
  const handle = {
    /** Activates E-H's original Favorites collection control. */
    activateFavoriteCategory(index: number): void {
      elems.favoriteCategoryItems[index]?.click();
    },
    /** Reapplies TouchUI layout after the result list is replaced in place. */
    updateTouchResultsLayout(): void {
      const updated = apply();
      if (updated) {
        elems.favoriteCategoryItems.splice(
          0,
          elems.favoriteCategoryItems.length,
          ...updated.items,
        );
      }
    },
  };
  return { data, elems, handle };
}

export type TouchResultsPageDom = ReturnType<typeof manageTouchResultsPage>;
