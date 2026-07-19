import { createSignal } from "solid-js";
import { EnhanceSearchGrids } from "../components/Enhance/EnhanceSearchGrids";
import { EnhanceThumbsGrids } from "../components/Enhance/EnhanceThumbsGrids";
import { ReadButton } from "../components/Enhance/ReadHistory";
import { loadReadHistory, ReadHistorySession } from "../state/readHistory";
import { SearchHistory } from "../components/Enhance/SearchHistory";
import { loadMyTagAppearances, refreshMyTags } from "../components/Enhance/MyTags";
import {
  GalleryPageDescription,
  SCROLL_PAGE_BAR_BOTTOM_CLASS,
  SCROLL_PAGE_BAR_TOP_CLASS,
  ScrollPageBar,
} from "../components/Enhance/ScrollPageBar";
import { SettingsMenu } from "../components/SettingsMenu";
import { BackToTop } from "../components/Widgets/BackToTop";
import {
  touchSearchPanelClasses,
  GalleryInfoPanel,
  TOUCH_GALLERY_INFO_TRANSFORMS,
  TOUCH_TOP_BAR_TRANSFORMS,
  FavoritesCategorySelect,
  TouchSearchAction,
  TouchSearchAdvancedToggle,
  TouchSearchCategoryToggle,
  TouchSearchFileToggle,
  TouchSearchPanel,
  TouchTopBar,
} from "../components/TouchUI";
import * as eh from "../eh";
import { state } from "../state";
import texts from "../texts.json";
import unoCss from "ehpeek:uno.css";
import themeCss from "../theme.css";
import {
  onReaderDocumentClick,
  openReaderFromHash,
  openReaderFromUserAction,
  openOriginalReader,
  reportReaderOpenError,
  type ReaderCallbacks,
} from "./Reader";
import { SinglePage } from "./SinglePage";
import { createReaderViewport, type ReaderViewport } from "./viewport";

function settingsMenuState() {
  return {
    openGalleryInNewTab: state.app.openGalleryInNewTab.value,
    singlePageAppEnabled: state.app.singlePage.value,
    readerEnabled: state.reader.enabled.value,
    readerFullscreenEnabled: state.reader.fullscreen.value,
    enhanceThumbsGridsEnabled: state.gallery.enhanceThumbs.value,
    enhanceSearchGridsEnabled: state.search.enhance.value,
    myTagsEnabled: state.gallery.myTags.value,
    readHistoryEnabled: state.gallery.readHistory.value,
    searchHistoryEnabled: state.search.history.value,
    touchUiEnabled: state.touch.enabled.value,
  };
}

function defaultSettingsMenuState(): ReturnType<typeof settingsMenuState> {
  return {
    openGalleryInNewTab: state.app.openGalleryInNewTab.defaultValue,
    singlePageAppEnabled: state.app.singlePage.defaultValue,
    readerEnabled: state.reader.enabled.defaultValue,
    readerFullscreenEnabled: state.reader.fullscreen.defaultValue,
    enhanceThumbsGridsEnabled: state.gallery.enhanceThumbs.defaultValue,
    enhanceSearchGridsEnabled: state.search.enhance.defaultValue,
    myTagsEnabled: state.gallery.myTags.defaultValue,
    readHistoryEnabled: state.gallery.readHistory.defaultValue,
    searchHistoryEnabled: state.search.history.defaultValue,
    touchUiEnabled: state.touch.enabled.defaultValue,
  };
}

function applySettingsMenuState(
  next: ReturnType<typeof settingsMenuState>,
): void {
  state.app.openGalleryInNewTab.set(next.openGalleryInNewTab);
  state.app.singlePage.set(next.singlePageAppEnabled);
  state.reader.enabled.set(next.readerEnabled);
  state.reader.fullscreen.set(next.readerFullscreenEnabled);
  state.gallery.enhanceThumbs.set(next.enhanceThumbsGridsEnabled);
  state.search.enhance.set(next.enhanceSearchGridsEnabled);
  state.gallery.myTags.set(next.myTagsEnabled);
  state.gallery.readHistory.set(next.readHistoryEnabled);
  state.search.history.set(next.searchHistoryEnabled);
  state.touch.enabled.set(next.touchUiEnabled);
  window.location.reload();
}

let pageType = eh.extractPageType();
let galleryPreviewSource: eh.GalleryPreviewDom | null = null;
let pageViewportSource: ReaderViewport | null = null;
let settingsState = settingsMenuState();
const shell = eh.extractAppShell({ theme: themeCss, uno: unoCss }, settingsState.touchUiEnabled);
const [settingsMenuOpen, setSettingsMenuOpenSignal] = createSignal(false);
const [readProgress, setReadProgress] = createSignal({
  currentPage: 1,
  totalPages: null as number | null,
});
const readerCallbacks: ReaderCallbacks = {
  enhanceThumbsGridsEnabled: () => settingsState.enhanceThumbsGridsEnabled,
  readHistoryEnabled: () => settingsState.readHistoryEnabled,
  onPageBarChange: replaceGalleryPageBar,
  onReaderClosed: (currentPage, totalPages) => {
    setReadProgress({ currentPage, totalPages });
  },
};
let galleryReadButtonMount: eh.ManagedDomNode | undefined;
let originalReadHistorySession: ReadHistorySession | undefined;
let stopMyTagsEnhance: (() => void) | undefined;
let resetTouchResultsPage: (() => void) | undefined;
let refreshTouchResultsPage: (() => void) | undefined;
let activeSearchResultsSource: eh.SearchResultsDom | null = null;
let pageGeneration = 0;
let pageManagedHosts = new Set<eh.ManagedDomNode>();

function deactivatePage(): void {
  pageGeneration += 1;
  originalReadHistorySession?.dispose();
  originalReadHistorySession = undefined;
  stopMyTagsEnhance?.();
  stopMyTagsEnhance = undefined;
  resetTouchResultsPage?.();
  resetTouchResultsPage = undefined;
  refreshTouchResultsPage = undefined;
  galleryPreviewSource = null;
  pageViewportSource = null;

  for (const host of pageManagedHosts) {
    host.remove();
  }

  pageManagedHosts = new Set();
  galleryReadButtonMount = undefined;
  activeSearchResultsSource = null;
}

function replaceGalleryPageBar(
  currentIndex: number,
  maxIndex: number | null,
): void {
  const mounts = galleryPreviewSource?.actions.pageBarMounts(
    SCROLL_PAGE_BAR_TOP_CLASS,
    SCROLL_PAGE_BAR_BOTTOM_CLASS,
  ) ?? [];

  for (const mount of mounts) {
    if (mount.descriptionElement && mount.descriptionText) {
      const descriptionText = mount.descriptionText;
      mount.descriptionElement.mount(() => <GalleryPageDescription text={descriptionText} />);
      pageManagedHosts.add(mount.descriptionElement);
    }

    mount.element.mount(() => (
        <ScrollPageBar
          currentIndex={currentIndex}
          element={mount.element}
          maxIndex={maxIndex}
          top={mount.top}
          urlForIndex={eh.previewUrlForIndex}
        />
      ));
    pageManagedHosts.add(mount.element);
  }
}

function openFromReadButton(): void {
  const preview = galleryPreviewSource;
  const viewport = pageViewportSource;
  const firstPage = preview?.data.pages[0];

  if (!preview || !viewport || !firstPage) {
    return;
  }

  const currentPage = readProgress().currentPage;

  if (state.reader.enabled.value) {
    openReaderFromUserAction(
      firstPage.url,
      readerCallbacks,
      preview,
      viewport,
      currentPage,
    );
  } else {
    void openOriginalReader(currentPage, preview).catch(reportReaderOpenError);
  }
}

function GalleryReadButton(props: { variant: "gallery" | "touchGallery" }) {
  return (
    <ReadButton
      currentPage={readProgress().currentPage}
      totalPages={readProgress().totalPages}
      onClick={openFromReadButton}
      variant={props.variant}
    />
  );
}

if (typeof GM_registerMenuCommand === "function") {
  GM_registerMenuCommand(texts.settings.openSettings, () => {
    setSettingsMenuOpenSignal(true);
  });
}

shell.elems.settingsMenu.mount(() => (
  <SettingsMenu
    open={settingsMenuOpen()}
    defaultState={defaultSettingsMenuState()}
    initState={settingsState}
    onApply={(next) => {
      settingsState = next;
      applySettingsMenuState(next);
    }}
    onOpenChange={setSettingsMenuOpenSignal}
  />
));

function injectEnhanceUI(
  page: eh.PageType,
  preview: eh.GalleryPreviewDom | null,
  searchHistoryDom: eh.SearchHistoryDom | null,
  searchResultsDom: eh.SearchResultsDom | null,
): void {
  const galleryPage = page.type === "gallery";
  const resultsPage = page.type === "search" || page.type === "favorites";

  if (searchHistoryDom) {
    eh.EhSyringe.reuseTagTipInput(searchHistoryDom.elems.input);
  }

  if (resultsPage) {
    eh.extractSearchGridModeSelect(
      state.search.grid.value,
      () => {
        state.search.grid.set(true);
        window.location.assign(
          new URL("/?inline_set=dm_e", window.location.href).href,
        );
      },
      (value) => {
        state.search.grid.set(false);
        window.location.assign(
          new URL(`/?inline_set=dm_${value}`, window.location.href).href,
        );
      },
    );
  }
  const searchGridDom = resultsPage && state.search.grid.value
    ? eh.extractSearchGrid()
    : null;

  if (!settingsState.touchUiEnabled) {
    const settingsMount = eh.extractSettingsMenuMount();
    if (settingsMount) {
      settingsMount.mount(() => (
        <a
          href="#"
          onClick={(event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            setSettingsMenuOpenSignal(true);
          }}
        >
          {texts.settings.menuLabel}
        </a>
      ));
      pageManagedHosts.add(settingsMount);
    }
  }

  if (
    !settingsState.touchUiEnabled &&
    settingsState.readHistoryEnabled &&
    galleryPage
  ) {
    galleryReadButtonMount = eh.extractGalleryContinueReadingButtonMount();
    pageManagedHosts.add(galleryReadButtonMount);
    galleryReadButtonMount.mount(() => (
      <GalleryReadButton variant="gallery" />
    ));
  }

  if (galleryPage && preview) {
    const host = shell.actions.createMount();
    host.mount(() => (
      <EnhanceThumbsGrids
        enabled={settingsState.enhanceThumbsGridsEnabled}
        galleryPreview={preview}
        onGalleryPreviewChange={(source) => {
          galleryPreviewSource = source;
        }}
        onError={reportReaderOpenError}
        replaceGalleryPageBar={replaceGalleryPageBar}
      />
    ));
    pageManagedHosts.add(host);
  }

  if (
    settingsState.enhanceSearchGridsEnabled &&
    searchResultsDom &&
    (searchResultsDom.data.previousUrl || searchResultsDom.data.nextUrl)
  ) {
    const host = shell.actions.createMount();
    host.mount(() => (
      <EnhanceSearchGrids
        source={searchResultsDom}
        onPageChange={() => {
          refreshTouchResultsPage?.();
          searchGridDom?.actions.refresh();
        }}
      />
    ));
    pageManagedHosts.add(host);
  }

  if (settingsState.searchHistoryEnabled && searchHistoryDom) {
    const host = shell.actions.createMount();
    host.mount(() => <SearchHistory source={searchHistoryDom} />);
    pageManagedHosts.add(host);
  }
}

function injectTouchUI(
  page: eh.PageType,
  preview: eh.GalleryPreviewDom | null,
): void {
  const galleryPage = page.type === "gallery";
  const resultsPage = page.type === "search" || page.type === "favorites";
  const resultsDom = resultsPage ? eh.extractTouchResultsPage(page) : null;
  if (resultsDom) {
    resetTouchResultsPage = resultsDom.actions.reset;
    refreshTouchResultsPage = resultsDom.actions.refresh;
  }

  const topBarDom = eh.extractTopBar();
  if (topBarDom) {
    topBarDom.transforms.navItems(TOUCH_TOP_BAR_TRANSFORMS.navItems);
    topBarDom.elems.mount.mount(() => (
      <TouchTopBar
        source={topBarDom}
        onSettingsMenuOpen={() => {
          setSettingsMenuOpenSignal(true);
        }}
      />
    ));
    pageManagedHosts.add(topBarDom.elems.mount);
  }

  if (galleryPage || resultsPage) {
    const host = shell.actions.createMount("ehpeek-back-to-top-host");
    host.mount(() => <BackToTop />);
    pageManagedHosts.add(host);
  }

  if (galleryPage) {
    const galleryOperations = eh.extractGalleryOperations();
    const galleryInfoDom = eh.extractGalleryInfo(
      preview?.data ?? null,
      galleryOperations,
    );
    if (galleryInfoDom) {
      galleryInfoDom.transforms.cover(TOUCH_GALLERY_INFO_TRANSFORMS.cover);
      galleryInfoDom.transforms.actions(TOUCH_GALLERY_INFO_TRANSFORMS.actions);
      galleryInfoDom.transforms.newTag(TOUCH_GALLERY_INFO_TRANSFORMS.newTag);
      galleryInfoDom.transforms.host(TOUCH_GALLERY_INFO_TRANSFORMS.host);
      galleryInfoDom.elems.mount.mount(() => (
        <GalleryInfoPanel
          source={galleryInfoDom}
          primaryAction={
            settingsState.readHistoryEnabled ? (
              <GalleryReadButton variant="touchGallery" />
            ) : undefined
          }
        />
      ));
      pageManagedHosts.add(galleryInfoDom.elems.mount);
    }

    eh.extractGalleryCommentsTouch();
  }

  if (resultsPage) {
    const searchPanelDom = eh.extractSearchPanel();
    if (searchPanelDom) {
      searchPanelDom.transforms.presentation(
        touchSearchPanelClasses(searchPanelDom.data.hasClear),
      );
      searchPanelDom.elems.mount.mount(() => (
        <TouchSearchPanel
          source={searchPanelDom}
          after={
            resultsDom?.data.favoritesCategory ? (
              <FavoritesCategorySelect
                info={resultsDom.data.favoritesCategory}
              />
            ) : undefined
          }
        />
      ));
      pageManagedHosts.add(searchPanelDom.elems.mount);
      if (searchPanelDom.elems.categoryToggleMount) {
        searchPanelDom.elems.categoryToggleMount.mount(() => (
          <TouchSearchCategoryToggle source={searchPanelDom} />
        ));
        pageManagedHosts.add(searchPanelDom.elems.categoryToggleMount);
      }
      if (searchPanelDom.elems.advancedToggleMount) {
        searchPanelDom.elems.advancedToggleMount.mount(() => (
          <TouchSearchAdvancedToggle source={searchPanelDom} />
        ));
        pageManagedHosts.add(searchPanelDom.elems.advancedToggleMount);
      }
      if (searchPanelDom.elems.fileSearchToggleMount) {
        searchPanelDom.elems.fileSearchToggleMount.mount(() => (
          <TouchSearchFileToggle source={searchPanelDom} />
        ));
        pageManagedHosts.add(searchPanelDom.elems.fileSearchToggleMount);
      }
      searchPanelDom.elems.searchActionMount.mount(() => (
        <TouchSearchAction action="search" source={searchPanelDom} />
      ));
      pageManagedHosts.add(searchPanelDom.elems.searchActionMount);
      if (searchPanelDom.elems.clearActionMount) {
        searchPanelDom.elems.clearActionMount.mount(() => (
          <TouchSearchAction action="clear" source={searchPanelDom} />
        ));
        pageManagedHosts.add(searchPanelDom.elems.clearActionMount);
      }
    }
  }
}

async function injectPage(nextPage: eh.PageType): Promise<void> {
  pageType = nextPage;
  const galleryPage = pageType.type === "gallery";
  const resultsPage =
    pageType.type === "search" || pageType.type === "favorites";
  const generation = ++pageGeneration;
  galleryPreviewSource = galleryPage ? eh.extractGalleryPreview() : null;
  pageViewportSource = galleryPage ? createReaderViewport() : null;
  if (pageType.type === "gallery" && galleryPreviewSource) {
    const record = loadReadHistory(pageType.galleryId, pageType.token);
    setReadProgress({
      currentPage: record?.pageNum && record.pageNum > 0 ? record.pageNum : 1,
      totalPages: record?.totalPages ?? galleryPreviewSource.data.totalImages,
    });
  }
  const searchHistorySource = resultsPage
    ? eh.extractSearchHistory()
    : null;
  const searchResultsSource = resultsPage
    ? eh.extractSearchResults()
    : null;
  activeSearchResultsSource = searchResultsSource;

  if (settingsState.myTagsEnabled) {
    if (pageType.type === "myTags") {
      const currentMyTags = eh.extractMyTagsPageData();
      if (currentMyTags) {
        await refreshMyTags(currentMyTags);
      }
    } else if (galleryPage) {
      const appearances = await loadMyTagAppearances();
      if (appearances) {
        stopMyTagsEnhance = eh.extractGalleryMyTags(
          appearances,
        ).actions.dispose;
      }
    }
  }

  if (generation !== pageGeneration) {
    return;
  }

  originalReadHistorySession?.dispose();
  originalReadHistorySession = undefined;
  if (settingsState.readHistoryEnabled && pageType.type === "image") {
    const gallery = eh.extractImageGalleryPage();
    if (gallery?.galleryId === pageType.galleryId) {
      const previous = loadReadHistory(gallery.galleryId, gallery.token);
      originalReadHistorySession = new ReadHistorySession({
        galleryId: gallery.galleryId,
        token: gallery.token,
        galleryUrl: gallery.url,
        totalPages: previous?.totalPages,
      });
      originalReadHistorySession.update(pageType.pageNum, previous?.totalPages);
    }
  }

  if (settingsState.touchUiEnabled) {
    await eh.EhSyringe.waitForInitialUi();
    if (pageType.type === "search") {
      await eh.EhSyringe.waitForSearchUi();
    }
    if (generation !== pageGeneration) {
      return;
    }
  }

  if (settingsState.touchUiEnabled) {
    injectTouchUI(pageType, galleryPreviewSource);
  }
  injectEnhanceUI(
    pageType,
    galleryPreviewSource,
    searchHistorySource,
    searchResultsSource,
  );

  if (
    pageType.type === "gallery" &&
    state.reader.enabled.value &&
    pageType.peekPage !== null
  ) {
    if (galleryPreviewSource && pageViewportSource) {
      void openReaderFromHash(
        readerCallbacks,
        galleryPreviewSource,
        pageViewportSource,
      );
    }
  }
}

document.addEventListener(
  "click",
  (event) =>
    onReaderDocumentClick(
      event,
      readerCallbacks,
      galleryPreviewSource,
      pageViewportSource,
    ),
  true,
);
document.addEventListener(
  "click",
  (event) => {
    if (!settingsState.openGalleryInNewTab) {
      return;
    }

    activeSearchResultsSource?.actions.openGalleryInNewTab(event.target);
  },
  true,
);

const singlePageInitialRoute =
  settingsState.touchUiEnabled &&
  settingsState.singlePageAppEnabled &&
  eh.supportsSinglePageRoute(window.location.href);

if (singlePageInitialRoute) {
  const host = shell.actions.createMount("isolate", true);
  host.mount(() => (
    <SinglePage
      onPageActivate={injectPage}
      onPageDeactivate={deactivatePage}
    />
  ));
} else {
  void injectPage(pageType);
}
