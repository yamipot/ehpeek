import texts from "../../i18n";
import { galleryIdentityFromUrl, type PageType } from "../url";
import { requestPage } from "../request";
import type {
  ReadHistoryPageItem,
  TouchFavoritesCategorySelectInfo,
} from "../types";
import type { GalleryTitlePreference, SearchGridMode } from "../../state";
import {
  anyDomNode,
  createAnchor,
  createManagedElement,
  DomNode,
  type ManagedDomElements,
  ManagedDomNode,
} from "./core";
import { domClass, sharedApply } from "./domClass";

type EhPeekGridRow = {
  coverImage: ManagedDomNode<HTMLImageElement> | null;
  detail: ManagedDomNode<HTMLElement>;
  galleryHref: string | null;
  galleryLink: ManagedDomNode<HTMLElement> | null;
  metadata: ManagedDomNode<HTMLElement>;
  row: ManagedDomNode<HTMLTableRowElement>;
  stackTags: boolean;
  tags: ManagedDomNode<HTMLElement>[];
  title: ManagedDomNode<HTMLElement> | null;
  titleText: string;
  withoutCover: boolean;
};

type ReadHistoryGridsOptions = {
  items: ReadHistoryPageItem[];
  mode: SearchGridMode;
  source: DomNode<HTMLElement>;
  titlePreference: GalleryTitlePreference;
};

type ManagedReadHistoryGrids = {
  elems: { resultList: ManagedDomNode<HTMLTableElement> };
  handle: {
    listenForItemRemoval: (callback: (item: ReadHistoryPageItem) => void) => () => void;
    updateItems: (items: ReadHistoryPageItem[]) => void;
  };
};

function listenGalleryLinksOpenInNewTab(
  host: ManagedDomNode<HTMLElement>,
): () => void {
  const handleClick = (event: MouseEvent) => {
    const link = event.target instanceof Element
      ? DomNode.from(event.target).closest(domClass.search.results.galleryLinks)
      : null;
    if (!link?.closest(domClass.search.results)) {
      return;
    }
    link.inplace().setAttributes({ target: "_blank", rel: "noopener noreferrer" });
  };

  return host.listen("click", handleClick, true);
}

function createReadHistoryGridRow(
  item: ReadHistoryPageItem,
  titlePreference: GalleryTitlePreference,
): EhPeekGridRow {
  const info = item.info;
  const metadataItems: ManagedDomNode<HTMLElement>[] = [];
  const appendMetadata = (value: string | undefined, className: string) => {
    if (!value) {
      return;
    }
    const element = createManagedElement("div").replaceClasses(className);
    element.setTextUnlessInput(value);
    metadataItems.push(element);
  };

  if (info?.category && info.categoryClass) {
    const category = createManagedElement("div")
      .replaceClasses(`cn ${info.categoryClass} ehpeek-search-meta-category`);
    category.setTextUnlessInput(info.category);
    metadataItems.push(category);
  }
  appendMetadata(info?.postedAt === undefined
    ? undefined
    : new Date(info.postedAt).toISOString().slice(0, 16).replace("T", " "),
  "ehpeek-search-meta-posted");
  if (info?.rating !== undefined) {
    const rounded = Math.round(info.rating * 2) / 2;
    const rating = createManagedElement("div")
      .replaceClasses("ir ehpeek-search-meta-rating")
      .styles({
        "background-position": `${-16 * (5 - Math.ceil(rounded))}px ${Number.isInteger(rounded) ? -1 : -21}px`,
        opacity: "1",
      });
    metadataItems.push(rating);
  }
  appendMetadata(info?.uploader, "ehpeek-search-meta-uploader");
  appendMetadata(
    item.totalPages
      ? `${item.totalPages} ${texts.gallery.pages.toLowerCase()}`
      : undefined,
    "ehpeek-search-meta-pages",
  );

  const historyLabel = item.currentPage > 0
    ? `${item.currentPage} / ${item.totalPages ?? "?"}`
    : texts.history.visitedLabel;
  const removeButton = createManagedElement("button")
    .setAttributes({ type: "button", "data-ehpeek-remove-history": "true" })
    .replaceClasses(
      "relative z-2 ui-hit-min-h-lg ui-py-xs ui-px-lg ui-rounded-md border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] ehp-color-site-text font-inherit textsize-md font-700 text-center cursor-pointer [touch-action:manipulation] hover:bg-[var(--color-site-item-hover)]",
    );
  removeButton.setTextUnlessInput(texts.history.actions.remove);
  const historyActions = createManagedElement("div")
    .replaceClasses("ehpeek-read-history-actions box-border flex items-center justify-end ui-gap-md ui-pr-sm ui-pb-xs")
    .append(removeButton);
  const titleText = titlePreference === "sub"
    ? info?.titleSub || info?.title
    : info?.title || info?.titleSub;
  const galleryHref = new URL(
    `/g/${item.galleryId}/${item.token}/`,
    window.location.href,
  ).href;
  const row = createManagedElement("tr").setAttributes({
    "data-ehpeek-read-history": item.currentPage > 0 ? "reading" : "visited",
  });
  const thumbnailCell = createManagedElement("td").replaceClasses("gl1e");
  const thumbnail = createManagedElement("div");
  const image = info?.coverUrl
    ? createManagedElement("img").setAttributes({
      alt: titleText ?? "",
      loading: "lazy",
      src: info.coverUrl,
    })
    : null;
  if (image) {
    thumbnail.append(
      createManagedElement("a").attribute("href", galleryHref).append(image),
    );
  } else {
    thumbnailCell.setHidden(true);
  }
  thumbnailCell.append(thumbnail);

  const contentCell = createManagedElement("td").replaceClasses("gl2e");
  const galleryLink = createManagedElement("a").attribute("href", galleryHref);
  const detail = createManagedElement("div").replaceClasses("gl4e h-full");
  const title = createManagedElement("div")
    .replaceClasses(`glink ${sharedApply.historyLabel}`)
    .setAttributes({ "data-ehpeek-history-label": historyLabel });
  title.setTextUnlessInput(titleText ?? "");
  title.setHidden(!titleText);
  const metadata = createManagedElement("div").replaceClasses("gl3e");
  metadata.append(...metadataItems);
  galleryLink.append(detail.append(title));
  contentCell.append(
    createManagedElement("div").replaceClasses("h-full").append(metadata, galleryLink),
  );
  row.append(thumbnailCell, contentCell);

  return {
    coverImage: image,
    detail,
    galleryHref,
    galleryLink,
    metadata,
    row,
    stackTags: false,
    tags: [historyActions],
    title,
    titleText: titleText ?? "",
    withoutCover: !image,
  };
}

/** Replaces Popular results with locally stored History rows managed by the shared EhPeek grid. */
export function manageReadHistoryPage(
  items: ReadHistoryPageItem[],
  titlePreference: GalleryTitlePreference,
  mode: SearchGridMode = "ehpeek-lite",
) {
  const page = DomNode.from(document);
  const source = page.use(domClass.search);
  const resultList = source.results.one();
  const navigationTopMount = createAnchor("read-history-navigation-top");
  const navigationBottomMount = createAnchor("read-history-navigation-bottom");
  if (!resultList || !navigationTopMount || !navigationBottomMount) {
    return null;
  }

  const grids = manageReadHistoryGrids({
    items,
    mode,
    source: resultList,
    titlePreference,
  });
  grids.elems.resultList.before(navigationTopMount);
  grids.elems.resultList.after(navigationBottomMount);
  for (const control of page.all(domClass.search.controls, anyDomNode)) {
    control.inplace().remove();
  }

  const handle = {
    /** Applies new-tab semantics to History gallery links at activation time. */
    listenGalleryLinksOpenInNewTab: () =>
      listenGalleryLinksOpenInNewTab(grids.elems.resultList),
    /** Replaces the visible History rows without navigating away from the current document. */
    updateReadHistoryItems: grids.handle.updateItems,
    /** Reports explicit removal requests without exposing History rows. */
    listenForReadHistoryRemoval: grids.handle.listenForItemRemoval,
    /** Keeps navigation anchored to the corresponding edge after an in-page page change. */
    scrollReadHistoryPage(position: "bottom" | "top"): void {
      const target = position === "bottom" ? navigationBottomMount : navigationTopMount;
      target.scrollIntoView({
        behavior: "smooth",
        block: position === "bottom" ? "end" : "start",
      });
    },
    /** Switches the History result list between one and two result columns. */
    updateResultColumns(enabled: boolean): void {
      if (enabled) {
        grids.elems.resultList.addClasses(sharedApply.searchResultColumns);
      } else {
        grids.elems.resultList.removeClasses(sharedApply.searchResultColumns);
      }
    },
  };
  return {
    elems: {
      navigationBottomMount,
      navigationTopMount,
      resultList: grids.elems.resultList,
    },
    handle,
  };
}

export type ReadHistoryPageDom = NonNullable<ReturnType<typeof manageReadHistoryPage>>;

/** Owns Search results and pagination for the enhanced navigation lifecycle. */
export function manageSearchResults() {
  const page = DomNode.from(document);
  const source = page.use(domClass.search);
  const resultSource = source.results.one();
  if (!resultSource) {
    return null;
  }
  const data = {
    nextUrl: source.navigation.next.one()?.attribute("href") ?? null,
    previousUrl: source.navigation.previous.one()?.attribute("href") ?? null,
  };
  const resultHost = resultSource.parent()?.inplace() ?? null;
  const elems = {
    resultList: resultSource.inplace(domClass.search.results.apply),
    searchInput: source.input.inplace(),
  };
  const handle = {
    /** Routes the original pagination controls through the active page owner. */
    interceptSearchNavigation(onNavigate: (url: string) => void): () => void {
      const handleClick = (event: MouseEvent) => {
        const link = event.target instanceof Element
          ? DomNode.from(event.target).closest(domClass.search.navigationLink)
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
    /** Switches the EhPeek result list between one and two result columns. */
    updateResultColumns(enabled: boolean): void {
      if (enabled) {
        elems.resultList.apply("columns");
      } else {
        elems.resultList.removeClasses(sharedApply.searchResultColumns);
      }
    },
    /** Prevents result content from stealing a horizontal swipe gesture. */
    ensureSearchSwipeInput(): void {
      elems.resultList.apply("swipe");
    },
    /** Applies new-tab semantics at activation time so replaced result pages need no rebinding. */
    listenGalleryLinksOpenInNewTab: () => resultHost
      ? listenGalleryLinksOpenInNewTab(resultHost)
      : () => undefined,
    /** Reports rows appended by third-party infinite-scroll integrations. */
    listenResultRowsAdded(callback: () => void): () => void {
      const observer = new MutationObserver((records) => {
        const addedRow = records.some((record) =>
          Array.from(record.addedNodes).some((node) =>
            node instanceof HTMLTableRowElement ||
            (node instanceof Element && node.querySelector("tr"))));
        if (addedRow) {
          callback();
        }
      });
      observer.observe(elems.resultList.Component(), {
        childList: true,
        subtree: true,
      });
      return () => observer.disconnect();
    },
  };
  return { data, elems, handle };
}

export type SearchResultsDom = NonNullable<ReturnType<typeof manageSearchResults>>;

/** Owns one original Search text input, its form, submit control, and their events. */
function manageSearchTextInput(inputSource: DomNode<HTMLInputElement>) {
  const formSource = inputSource?.form() ?? null;
  const submitSource = formSource?.one(domClass.search.submit)
    ?? inputSource?.parent()?.one(domClass.search.submitFallback)
    ?? null;
  if (!submitSource) {
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
      const positionChange = (event: Event) => {
        const target = event.target;
        if (target instanceof Node && overlay()?.contains(target)) {
          return;
        }
        callbacks.onPositionChange();
      };
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
      document.addEventListener("scroll", positionChange, true);
      window.addEventListener("resize", callbacks.onPositionChange);
      return () => {
        disconnect.forEach((cleanup) => cleanup());
        document.removeEventListener("pointerdown", outsidePointer, true);
        document.removeEventListener("scroll", positionChange, true);
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

/** Observes the original Search bar so consumers also receive asynchronously inserted inputs. */
export function observeSearchBar(
  onManaged: (source: SearchTextInputDom) => void | (() => void),
): () => void {
  return DomNode.from(document).observe(
    domClass.search.panel.box,
    (searchBar) => {
      const input = searchBar.one(domClass.search.input);
      if (!input) {
        return;
      }
      const source = manageSearchTextInput(input);
      if (!source) {
        return;
      }
      return onManaged(source);
    },
  );
}

function manageReadHistoryGrids(
  options: ReadHistoryGridsOptions,
): ManagedReadHistoryGrids {
  const resultList = createManagedElement("table").replaceClasses("itg");
  const body = createManagedElement("tbody");
  let visibleRows: Array<{ item: ReadHistoryPageItem; row: EhPeekGridRow }> = [];
  resultList.append(body).addClasses(
    "overscroll-x-contain",
    "touch-pan-y",
    "[&[data-dragging=true]]:select-none",
  );
  options.source.inplace().replaceWith(resultList);

  const updateItems = (items: ReadHistoryPageItem[]) => {
    visibleRows = items.map((item) => ({
      item,
      row: createReadHistoryGridRow(item, options.titlePreference),
    }));
    body.replaceChildren(...visibleRows.map(({ row }) => row.row));
    manageEhPeekGrid(
      resultList,
      visibleRows.map(({ row }) => row),
      options.mode,
    );
  };
  updateItems(options.items);

  return {
    elems: { resultList },
    handle: {
      updateItems,
      listenForItemRemoval(callback): () => void {
        const itemForTarget = (target: EventTarget | null) => {
          if (!(target instanceof Node)) {
            return null;
          }
          return visibleRows.find(({ row }) => row.row.contains(target))?.item ?? null;
        };
        const stopButton = resultList.listen("click", (event) => {
          const button = event.target instanceof Element
            ? DomNode.from(event.target).closest(domClass.search.removeHistory)
            : null;
          const item = button ? itemForTarget(event.target) : null;
          if (!item) {
            return;
          }
          event.preventDefault();
          event.stopPropagation();
          callback(item);
        });
        return stopButton;
      },
    },
  };
}

/** Manages the original Search rows with the EhPeek result layout. */
export function manageSearchGrids(mode: SearchGridMode): void {
  const managedAttribute = "data-ehpeek-search-grid-managed";
  const page = DomNode.from(document);
  const source = page.use(domClass.search);
  const resultList = source.results.one();

  if (!resultList) {
    return;
  }

  const rows = source.results.rows
    .all()
    .map(manageSearchGridRow)
    .filter((row): row is EhPeekGridRow => row !== null);
  manageEhPeekGrid(
    resultList.inplace(),
    rows,
    mode,
  );

  function manageSearchGridRow(row: DomNode<HTMLTableRowElement>): EhPeekGridRow | null {
    if (row.hasAttribute(managedAttribute)) {
      return null;
    }
    const thumbnailCell = row.one(domClass.search.results.rows.cover);
    const contentCell = row.one(domClass.search.results.rows.content);
    const detail = contentCell?.one(domClass.search.results.rows.content.detail);
    const metadata = contentCell?.one(domClass.search.results.rows.content.metadata);

    if (!thumbnailCell || !contentCell || !detail || !metadata) {
      return null;
    }

    const title = detail.one(domClass.search.results.rows.content.detail.title);
    const parent = detail.parent();
    const galleryLink = parent?.matches(domClass.common.links) ? parent : null;
    const tags = detail.children().filter((element) => !title?.sameNode(element));
    const coverImage = thumbnailCell.one(domClass.common.image);
    const metadataItems = metadata.children();
    const category = metadataItems.find((item) =>
      item.matches(':is(.cn, .cs, [class*="ct"])'));
    const posted = metadataItems.find((item) => item.matches('[id^="posted_"]'));
    const rating = metadataItems.find((item) => item.matches(".ir"));
    const uploader = metadataItems.find((item) =>
      item.one('a[href*="/uploader/"]') !== null);
    const download = metadataItems.find((item) => item.matches(".gldown"));
    // E-H keeps the page count immediately before the torrent control, including on Favorites.
    const pages = download?.previous();
    const knownMetadata = [category, posted, rating, uploader, pages, download];
    const extraMetadata = metadataItems.filter((item) =>
      !knownMetadata.some((known) => known?.sameNode(item)));
    const metadataFields = [
      [category, "ehpeek-search-meta-category"],
      [pages, "ehpeek-search-meta-pages"],
      [posted, "ehpeek-search-meta-posted"],
      [rating, "ehpeek-search-meta-rating"],
      [uploader, "ehpeek-search-meta-uploader"],
      [download, "ehpeek-search-meta-download"],
    ] as const;
    for (const [field, className] of metadataFields) {
      field?.inplace().addClasses(className);
    }
    for (const field of extraMetadata) {
      field.inplace().addClasses("ehpeek-search-meta-extra");
    }

    const managedRow = row.inplace();
    managedRow.attribute(managedAttribute, "true");
    return {
      coverImage: coverImage?.inplace() ?? null,
      detail: detail.inplace(),
      galleryHref: galleryLink?.attribute("href") ?? null,
      galleryLink: galleryLink?.inplace() ?? null,
      metadata: metadata.inplace(),
      row: managedRow,
      stackTags: true,
      tags: tags.map((item) => item.inplace()),
      title: title?.inplace() ?? null,
      titleText: title?.text() ?? "",
      withoutCover: false,
    };
  }
}

/** Applies the shared EhPeek result layout without depending on the rows' source. */
function manageEhPeekGrid(
  resultList: ManagedDomNode<HTMLElement>,
  rows: EhPeekGridRow[],
  mode: SearchGridMode = "ehpeek",
): void {
  const liteTagPrefixes: Record<string, string> = {
    female: "f",
    male: "m",
    mixed: "x",
  };
  resultList.addClasses(sharedApply.searchGrid);
  DomNode.from(resultList.Component())
    .parent()
    ?.inplace()
    .addClasses("[container-type:inline-size]");
  if (mode === "ehpeek-lite") {
    resultList.addClasses(sharedApply.liteSearchGrid);
  }

  for (const row of rows) {
    row.row.addClasses(
      ...(row.withoutCover ? [sharedApply.coverlessSearchGrid] : []),
    );
    manageSearchGridCover(row);
    manageEhPeekGridContent(row);
  }

  function manageSearchGridCover(source: EhPeekGridRow): void {
    if (!source.coverImage) {
      return;
    }
    const update = () => {
      const size = source.coverImage?.imageSize();
      const tall = Boolean(size && size.width > 0 && size.height / size.width > 4);
      if (tall) {
        source.row.addClasses(sharedApply.tallSearchGridCover);
      } else {
        source.row.removeClasses(sharedApply.tallSearchGridCover);
      }
    };
    update();
    source.coverImage.listen("load", update, { once: true });
  }

  function manageEhPeekGridContent(source: EhPeekGridRow): void {
    const { detail, galleryLink, metadata, row, tags, title } = source;

    if (galleryLink && title && source.galleryHref) {
      const titleLink = createManagedElement("a")
        .attribute("href", source.galleryHref).replaceClasses("block min-w-0 ehp-color-site-text no-underline");
      titleLink.append(title);
      galleryLink.before(detail);
      galleryLink.remove();
      detail.replaceChildren(titleLink, metadata, ...tags);
      ensureEhPeekGridRowNavigation(
        row,
        titleLink,
        source.galleryHref,
        source.titleText,
      );
    } else if (title) {
      title.after(metadata);
    }
    if (source.stackTags) {
      for (const tag of tags) {
        tag.addClasses(sharedApply.stackSearchGridTags);
        if (mode === "ehpeek-lite") {
          markLiteSearchTags(tag);
        }
      }
    }
  }

  function markLiteSearchTags(container: ManagedDomNode): void {
    for (const tag of container.all(
      ':is(.gt, .gtl, .gtw)[title*=":"]',
    )) {
      const namespace = tag.readAttribute("title")?.split(":", 1)[0]?.trim();
      const prefix = namespace
        ? liteTagPrefixes[namespace.toLowerCase()]
        : null;
      if (prefix) {
        tag.attribute("data-ehpeek-lite-prefix", prefix);
      }
    }
  }
  
  function ensureEhPeekGridRowNavigation(
    row: ManagedDomNode,
    galleryLink: ManagedDomNode<HTMLAnchorElement>,
    galleryHref: string,
    title: string,
  ): void {
    row.attribute("data-ehpeek-pressable", "true");
    const overlay = createManagedElement("a", {
      cover: "ehpeek-cover-search-grid-row",
    })
      .attribute("href", galleryHref)
      .attribute("aria-label", title || "Open gallery")
      .replaceClasses("hidden search-panel-compact:block absolute inset-0 z-1")
      .apply("cover");
    row
      .append(overlay)
      .listen("click", (event) => {
        const target = event.target instanceof Element ? DomNode.from(event.target) : null;
        if (!target?.closest(domClass.common.interactive)) {
          galleryLink.click();
        }
      });
  }
}

/** Tints Search result surfaces according to their stored reading progress across display modes. */
export function mutateSearchReadHistoryAppearance(
  readProgressForGallery: (
    galleryId: number,
    token: string,
  ) => { pageNum: number; totalPages?: number } | null,
): void {
  const source = DomNode.from(document).use(domClass.search);
  const resultList = source.results.one();
  if (!resultList) {
    return;
  }

  const items = (resultList.one(domClass.search.results.body) ?? resultList).children();
  for (const item of items) {
    const galleryLinks = item.all(domClass.search.results.galleryLinks);
    const galleryLink = galleryLinks.find((link) => Boolean(link.text())) ?? galleryLinks[0];
    if (!galleryLink) {
      continue;
    }
    const identity = galleryIdentityFromUrl(galleryLink.attribute("href") ?? "");
    if (!identity) {
      continue;
    }

    const progress = readProgressForGallery(identity.galleryId, identity.token);
    if (!progress) {
      continue;
    }

    const title = item.one(domClass.search.results.titles) ?? galleryLink;
    title
      .inplace(domClass.search.results.titles.apply)
      .setAttributes({
        "data-ehpeek-history-label": progress.pageNum > 0
          ? `${progress.pageNum} / ${progress.totalPages ?? "?"}`
          : texts.history.visitedLabel,
      })
      .apply("history");
    item.inplace().setAttributes({
      "data-ehpeek-read-history": progress.pageNum > 0 ? "reading" : "visited",
    });
  }
}

/** Adds the local EhPeek grid choice to Search's original display-mode selector. */
export function mutateSearchGridModeSelect(
  selected: SearchGridMode | null,
  onEhPeekSelect: (mode: SearchGridMode) => void,
  onOriginalSelect: () => void,
) {
  const selects = DomNode.from(document).use(domClass.search).displayMode.all();

  for (const source of selects) {
    const select = source.inplace();
    for (const { label, value } of [
      { label: "EhPeek", value: "ehpeek" },
      { label: "EhPeekLite", value: "ehpeek-lite" },
    ] satisfies Array<{ label: string; value: SearchGridMode }>) {
      let option = source.all(domClass.search.displayMode.options)
        .find((item) => item.inputValue() === value)?.inplace() ?? null;
      if (!option) {
        option = createManagedElement("option").attribute("value", value);
        option.setTextUnlessInput(label);
        select.append(option);
      }
      option.setSelected(selected === value);
    }

    if (source.attribute("data-ehpeek-grid-mode") === "true") {
      continue;
    }

    select.attribute("data-ehpeek-grid-mode", "true");
    select.listen("change", (event) => {
      const value = select.inputValue();
      if (value !== "ehpeek" && value !== "ehpeek-lite") {
        onOriginalSelect();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      onEhPeekSelect(value);
    }, true);
  }
}

function replaceSearchPageContent(doc: Document): boolean {
  const currentList = DomNode.from(document).use(domClass.search).results.one();
  const incomingList = DomNode.from(doc).use(domClass.search).results.one();

  if (!currentList || !incomingList) {
    return false;
  }

  if (!refreshSearchRangeBar(doc)) {
    return false;
  }
  replaceSearchResultText(doc);
  replaceSearchNavigationBars(doc);

  const current = currentList.inplace();
  const importedList = incomingList.clone();
  current.replaceWith(importedList);
  return true;
}

/** Rebuilds the original range bar because scripts in fetched documents are not executed. */
function refreshSearchRangeBar(doc: Document): boolean {
  const current = DomNode.from(document).use(domClass.search).rangeBar.one();
  const incomingPage = DomNode.from(doc);
  const incoming = incomingPage.use(domClass.search).rangeBar.one();
  if (!current && !incoming) {
    return true;
  }
  if (!current || !incoming) {
    return false;
  }

  const script = incomingPage
    .all(domClass.common.scripts)
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
  const currentBars = DomNode.from(document).use(domClass.search).navigation.all();
  const incomingBars = DomNode.from(doc).use(domClass.search).navigation.all();
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

function replaceSearchResultText(doc: Document): void {
  const current = DomNode.from(document).use(domClass.search).resultText.one();
  const incoming = DomNode.from(doc).use(domClass.search).resultText.one();

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
  const page = DomNode.from(document);
  const pageSource = page.use(domClass.page);
  const source = page.use(domClass.search);
  pageSource.html.inplace()?.apply("constrainResults");
  pageSource.body.inplace()?.apply(
    "constrainResults",
    "constrainFavoritesNavigation",
  );

  const categories = source.favorites.categories.one();
  const categorySelect = categories ? manageFavoritesCategories(categories) : null;
  const searchHostApply = { expand: "ehpeek-expand-favorites-search" } as const;
  source.favorites.input.one()
    ?.form()
    ?.parent()
    ?.inplace(searchHostApply)
    .apply("expand");

  const resultSource = source.results.one();
  if (!resultSource) {
    return categorySelect;
  }

  const allSelected = categorySelect?.info.categories[0]?.selected === true;
  const resultList = resultSource.inplace(domClass.search.results.apply)
    .apply("containFavorites");

  if (allSelected) {
    resultList.apply("compactFavorites");
  }
  return categorySelect;
}

function manageFavoritesCategories(
  container: DomNode<HTMLElement>,
): FavoritesCategoriesDom | null {
  const nodes = container.all(domClass.search.favorites.categories.items);

  if (nodes.length === 0) {
    return null;
  }

  const parsed = nodes.map((node) => {
    const children = node.children();
    const countText = children[0]?.text() ?? "0";
    const label = children[children.length - 1]?.text() || node.text();
    const count = Number(countText.replace(/,/g, ""));
    const indicator = node.one(domClass.search.favorites.categories.items.indicator);
    const indicatorStyle = indicator?.computedStyle() ?? null;
    return {
      appearance: indicatorStyle ? {
        backgroundImage: indicatorStyle.backgroundImage,
        backgroundPosition: indicatorStyle.backgroundPosition,
        backgroundSize: indicatorStyle.backgroundSize,
      } : null,
      count: Number.isFinite(count) ? count : 0,
      label,
      selected: node.matches(domClass.search.favorites.selectedCategory),
      source: node,
    };
  });
  const all = parsed.find((category) => category.source.childElementCount() === 0);
  const favorites = parsed.filter((category) => category !== all);
  const total = favorites.reduce((sum, category) => sum + category.count, 0);
  container.inplace(domClass.search.favorites.categories.apply).apply("hide");

  const categories = [
    ...(all ? [{ ...all, count: total }] : []),
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
  const page = DomNode.from(document);
  const pageSource = page.use(domClass.page);
  const source = page.use(domClass.search);
  pageSource.html.inplace()?.apply("constrainResults");
  pageSource.body.inplace()?.apply("constrainResults");

  const resultSource = source.results.one();
  if (!resultSource) {
    return;
  }

  resultSource.inplace(domClass.search.results.apply).apply("containSearch");
}

/** Owns the TouchUI layout lifecycle for one Search or Favorites results page. */
export function manageTouchResultsPage(page: PageType) {
  const apply = () => {
    if (page.type === "favorites") {
      return favoritesPageTouch();
    }
    if (page.type === "search" || page.type === "readHistory") {
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
