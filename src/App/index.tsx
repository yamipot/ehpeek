import { createSignal } from "solid-js";
import { EnhanceSearchGrids } from "../components/Enhance/EnhanceSearchGrids";
import {
  ThumbsGrids,
  type ThumbsGridsActions,
} from "../components/Enhance/EnhanceThumbsGrids";
import { ReadButton } from "../components/Enhance/ReadHistory";
import { loadReadHistory, ReadHistorySession } from "../state/readHistory";
import { SearchHistory } from "../components/Enhance/SearchHistory";
import { loadMyTagAppearances, refreshMyTags } from "../components/Enhance/MyTags";
import { SettingsMenu } from "../components/SettingsMenu";
import { BackToTop } from "../components/Widgets/BackToTop";
import {
  touchSearchPanelClasses,
  GalleryInfoPanel,
  TOUCH_GALLERY_INFO_CLASSES,
  TOUCH_TOP_BAR_NAV_ITEM_CLASS,
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
import { registerGlobalStyle } from "../utils";
import galleryRearrange from "../eh/galleryRearrange.css";
import unoCss from "ehpeek:uno.css";
import themeCss from "../theme.css";
import {
  openReaderFromHash,
  openReaderFromUserAction,
  openOriginalReader,
  reportReaderOpenError,
  type ReaderCallbacks,
} from "./Reader";
import {
  createGalleryPreviewCache,
  type GalleryPreviewCache,
} from "./GalleryPreviewCache";
import { SinglePage } from "./SinglePage";
import { createAppMount } from "./host";
import { readerViewport } from "./viewport";

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

const settingsState = settingsMenuState();
document.documentElement.setAttribute("data-ehpeek-site", eh.ehSiteTheme());
registerGlobalStyle("ehpeek-uno-style", unoCss);
registerGlobalStyle("ehpeek-theme-style", themeCss);
const settingsMenuMount = createAppMount(
  "fixed inset-0 z-[1150] pointer-events-none",
  true,
);
const [settingsMenuOpen, setSettingsMenuOpenSignal] = createSignal(false);
const [readProgress, setReadProgress] = createSignal({
  currentPage: 1,
  totalPages: null as number | null,
});
let thumbsGridsActions: ThumbsGridsActions | undefined;
const readerCallbacks: ReaderCallbacks = {
  enhanceThumbsGridsEnabled: settingsState.enhanceThumbsGridsEnabled,
  readHistoryEnabled: settingsState.readHistoryEnabled,
  onGotoPreviewIndex: (previewIndex) => {
    thumbsGridsActions?.gotoPreview(previewIndex);
  },
  onReaderClosed: (currentPage, totalPages) => {
    setReadProgress({ currentPage, totalPages });
  },
};
let pageGeneration = 0;
const pageManagedHosts = new Set<eh.ManagedDomNode>();
const pageCleanups = new Set<() => void>();

function deactivatePage(): void {
  pageGeneration += 1;
  for (const cleanup of pageCleanups) {
    cleanup();
  }
  pageCleanups.clear();
  thumbsGridsActions = undefined;

  for (const host of pageManagedHosts) {
    host.remove();
  }

  pageManagedHosts.clear();
}

function openGalleryPage(
  previewCache: GalleryPreviewCache,
  startPageUrl: string,
  preferredPageNum?: number,
): void {
  if (state.reader.enabled.value) {
    openReaderFromUserAction(
      startPageUrl,
      readerCallbacks,
      previewCache,
      readerViewport,
      preferredPageNum,
    );
  } else if (preferredPageNum !== undefined) {
    void openOriginalReader(preferredPageNum, previewCache).catch(reportReaderOpenError);
  }
}

function openFromReadButton(previewCache: GalleryPreviewCache): void {
  const pageNum = readProgress().currentPage;
  const source = previewCache.current();
  const firstPage = source.data.pages[0];
  if (firstPage) {
    openGalleryPage(previewCache, firstPage.url, pageNum);
  }
}

function GalleryReadButton(props: {
  previewCache: GalleryPreviewCache;
  variant: "gallery" | "touchGallery";
}) {
  return (
    <ReadButton
      currentPage={readProgress().currentPage}
      totalPages={readProgress().totalPages}
      onClick={() => openFromReadButton(props.previewCache)}
      variant={props.variant}
    />
  );
}

if (typeof GM_registerMenuCommand === "function") {
  GM_registerMenuCommand(texts.settings.openSettings, () => {
    setSettingsMenuOpenSignal(true);
  });
}

settingsMenuMount.mount(() => (
  <SettingsMenu
    open={settingsMenuOpen()}
    defaultState={defaultSettingsMenuState()}
    initState={settingsState}
    onApply={(next) => {
      applySettingsMenuState(next);
    }}
    onOpenChange={setSettingsMenuOpenSignal}
  />
));

function injectEnhanceUI(
  page: eh.PageType,
  previewCache: GalleryPreviewCache | null,
  searchTextInput: eh.SearchTextInputDom | null,
  searchResultsDom: eh.SearchResultsDom | null,
  touchResultsDom: eh.TouchResultsPageDom | null,
): void {
  const galleryPage = page.type === "gallery";
  const resultsPage = page.type === "search" || page.type === "favorites";
  const preview = previewCache?.current() ?? null;

  if (galleryPage && preview && previewCache && settingsState.readerEnabled) {
    pageCleanups.add(preview.handle.connectImageOpen((pageUrl) => {
      openGalleryPage(previewCache, pageUrl);
    }));
  }

  if (searchTextInput) {
    eh.EhSyringe.reuseTagTipInput(searchTextInput.elems.input);
  }

  if (resultsPage) {
    eh.mutateSearchGridModeSelect(
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
  const refreshSearchGrid = resultsPage && state.search.grid.value
    ? eh.mutateSearchGrid()
    : null;

  if (settingsState.openGalleryInNewTab && searchResultsDom) {
    searchResultsDom.handle.transformGalleryLinksToNewTab();
  }

  if (!settingsState.touchUiEnabled) {
    const settingsMount = eh.manageSettingsMenuMount();
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
    galleryPage &&
    preview &&
    previewCache
  ) {
    const galleryReadButtonMount = eh.manageGalleryContinueReadingButtonMount();
    pageManagedHosts.add(galleryReadButtonMount);
    galleryReadButtonMount.mount(() => (
      <GalleryReadButton previewCache={previewCache} variant="gallery" />
    ));
  }

  if (
    galleryPage &&
    settingsState.enhanceThumbsGridsEnabled &&
    previewCache &&
    preview?.elems.mount
  ) {
    const previewMount = preview.elems.mount;
    previewMount.mount(() => (
      <ThumbsGrids
        actionsRef={(actions) => {
          thumbsGridsActions = actions;
        }}
        onLoadError={reportReaderOpenError}
        previewCache={previewCache}
      />
    ));
    pageManagedHosts.add(previewMount);
  } else if (galleryPage && preview && previewCache) {
    preview.elems.mount?.remove();
  }

  if (
    settingsState.enhanceSearchGridsEnabled &&
    searchResultsDom &&
    (searchResultsDom.data.previousUrl || searchResultsDom.data.nextUrl)
  ) {
    const host = createAppMount();
    host.mount(() => (
      <EnhanceSearchGrids
        source={searchResultsDom}
        onPageChange={(source) => {
          if (settingsState.openGalleryInNewTab) {
            source.handle.transformGalleryLinksToNewTab();
          }
          touchResultsDom?.handle.refresh();
          refreshSearchGrid?.();
        }}
      />
    ));
    pageManagedHosts.add(host);
  }

  if (settingsState.searchHistoryEnabled && searchTextInput) {
    const host = createAppMount();
    host.mount(() => <SearchHistory source={searchTextInput} />);
    pageManagedHosts.add(host);
  }
}

function injectTouchUI(
  page: eh.PageType,
  previewCache: GalleryPreviewCache | null,
): eh.TouchResultsPageDom | null {
  const galleryPage = page.type === "gallery";
  const resultsPage = page.type === "search" || page.type === "favorites";
  const preview = previewCache?.current() ?? null;
  const resultsDom = resultsPage
    ? eh.manageTouchResultsPage(page, singlePageInitialRoute)
    : null;
  if (resultsDom) {
    pageCleanups.add(resultsDom.handle.reset);
  }

  const topBarDom = eh.manageTopBar();
  if (topBarDom) {
    topBarDom.handle.transformNavItems(TOUCH_TOP_BAR_NAV_ITEM_CLASS);
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
    const host = createAppMount("ehpeek-back-to-top-host");
    host.mount(() => <BackToTop />);
    pageManagedHosts.add(host);
  }

  if (galleryPage) {
    registerGlobalStyle(
      "ehpeek-touch-gallery-page-rearrange-style",
      galleryRearrange,
    );
    const galleryInfoDom = eh.manageGalleryInfo(preview?.data ?? null);
    if (galleryInfoDom) {
      galleryInfoDom.handle.transformCover(TOUCH_GALLERY_INFO_CLASSES.cover);
      galleryInfoDom.handle.transformActionItems(TOUCH_GALLERY_INFO_CLASSES.actionItems);
      galleryInfoDom.handle.transformNewTag(TOUCH_GALLERY_INFO_CLASSES.newTag);
      galleryInfoDom.handle.transformHost(TOUCH_GALLERY_INFO_CLASSES.host);
      galleryInfoDom.elems.mount.mount(() => (
        <GalleryInfoPanel
          source={galleryInfoDom}
          primaryAction={
            settingsState.readHistoryEnabled && preview && previewCache ? (
              <GalleryReadButton
                previewCache={previewCache}
                variant="touchGallery"
              />
            ) : undefined
          }
        />
      ));
      pageManagedHosts.add(galleryInfoDom.elems.mount);
    }

    eh.mutateGalleryCommentsTouch();
  }

  if (resultsPage) {
    const searchPanelDom = eh.manageSearchPanel();
    if (searchPanelDom) {
      searchPanelDom.handle.transformPresentation(
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

  return resultsDom;
}

async function injectPage(nextPage: eh.PageType): Promise<void> {
  const pageType = nextPage;
  const galleryPage = pageType.type === "gallery";
  const resultsPage =
    pageType.type === "search" || pageType.type === "favorites";
  const generation = ++pageGeneration;
  if (galleryPage) {
    eh.manageGalleryApiSession();
  }
  const galleryPreview = galleryPage ? eh.manageGalleryPreview() : null;
  const galleryPreviewCache = galleryPreview
    ? createGalleryPreviewCache(galleryPreview)
    : null;
  if (pageType.type === "gallery" && galleryPreview) {
    const record = loadReadHistory(pageType.galleryId, pageType.token);
    setReadProgress({
      currentPage: record?.pageNum && record.pageNum > 0 ? record.pageNum : 1,
      totalPages: record?.totalPages ?? galleryPreview.data.totalImages,
    });
  }
  const searchTextInput = resultsPage
    ? eh.manageSearchTextInput()
    : null;
  const searchResultsSource = resultsPage
    ? eh.manageSearchResults()
    : null;

  let myTagAppearances: Awaited<ReturnType<typeof loadMyTagAppearances>> = null;

  if (settingsState.myTagsEnabled) {
    if (pageType.type === "myTags") {
      const currentMyTags = eh.extractMyTagsPageData();
      if (currentMyTags) {
        await refreshMyTags(currentMyTags);
      }
    } else if (galleryPage) {
      myTagAppearances = await loadMyTagAppearances();
    }
  }

  if (generation !== pageGeneration) {
    return;
  }

  if (myTagAppearances) {
    pageCleanups.add(eh.mutateGalleryMyTags(myTagAppearances));
  }

  if (settingsState.readHistoryEnabled && pageType.type === "image") {
    const gallery = eh.extractImageGalleryPage();
    if (gallery?.galleryId === pageType.galleryId) {
      const previous = loadReadHistory(gallery.galleryId, gallery.token);
      const historySession = new ReadHistorySession({
        galleryId: gallery.galleryId,
        token: gallery.token,
        galleryUrl: gallery.url,
        totalPages: previous?.totalPages,
      });
      historySession.update(pageType.pageNum, previous?.totalPages);
      pageCleanups.add(() => historySession.dispose());
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

  const touchResultsDom = settingsState.touchUiEnabled
    ? injectTouchUI(pageType, galleryPreviewCache)
    : null;
  injectEnhanceUI(
    pageType,
    galleryPreviewCache,
    searchTextInput,
    searchResultsSource,
    touchResultsDom,
  );

  if (
    pageType.type === "gallery" &&
    state.reader.enabled.value &&
    pageType.peekPage !== null
  ) {
    if (galleryPreviewCache) {
      void openReaderFromHash(
        readerCallbacks,
        galleryPreviewCache,
        readerViewport,
      );
    }
  }
}

const initialPage = eh.extractPageType();
const singlePageInitialRoute =
  settingsState.touchUiEnabled &&
  settingsState.singlePageAppEnabled &&
  eh.supportsSinglePageRoute(window.location.href);

if (singlePageInitialRoute) {
  const host = createAppMount("isolate", true);
  host.mount(() => (
    <SinglePage
      onPageActivate={(page) => injectPage(page)}
      onPageDeactivate={deactivatePage}
    />
  ));
} else {
  void injectPage(initialPage);
}
