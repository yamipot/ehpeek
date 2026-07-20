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
import { SinglePage, type SinglePageActions } from "./SinglePage";
import { createAppMount } from "./host";
import { readerViewport } from "./viewport";

function settingsMenuState(defaults = false) {
  const read = <T,>(setting: { defaultValue: T; value: T }): T =>
    defaults ? setting.defaultValue : setting.value;

  return {
    openGalleryInNewTab: read(state.app.openGalleryInNewTab),
    singlePageAppEnabled: read(state.app.singlePage),
    readerEnabled: read(state.reader.enabled),
    readerFullscreenEnabled: read(state.reader.fullscreen),
    enhanceThumbsGridsEnabled: read(state.gallery.enhanceThumbs),
    enhanceSearchGridsEnabled: read(state.search.enhance),
    myTagsEnabled: read(state.gallery.myTags),
    readHistoryEnabled: read(state.gallery.readHistory),
    searchHistoryEnabled: read(state.search.history),
    touchUiEnabled: read(state.touch.enabled),
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

const gState = (() => {
  const [settingsMenuOpen, setSettingsMenuOpen] = createSignal(false);
  const [readProgress, setReadProgress] = createSignal({
    currentPage: 1,
    totalPages: null as number | null,
  });
  return {
    page: {
      cleanups: new Set<() => void>(),
      generation: 0,
      managedHosts: new Set<eh.ManagedDomNode>(),
    },
    readProgress,
    setReadProgress,
    settings: settingsMenuState(),
    settingsMenuOpen,
    setSettingsMenuOpen,
    singlePageActions: undefined as SinglePageActions | undefined,
    thumbsGridsActions: undefined as ThumbsGridsActions | undefined,
  };
})();

document.documentElement.setAttribute("data-ehpeek-site", eh.ehSiteTheme());
registerGlobalStyle("ehpeek-uno-style", unoCss);
registerGlobalStyle("ehpeek-theme-style", themeCss);

const settingsMenuMount = createAppMount(
  "fixed inset-0 z-[1150] pointer-events-none",
  true,
);
const readerCallbacks: ReaderCallbacks = {
  enhanceThumbsGridsEnabled: gState.settings.enhanceThumbsGridsEnabled,
  readHistoryEnabled: gState.settings.readHistoryEnabled,
  onGotoPreviewIndex: (previewIndex) => {
    gState.thumbsGridsActions?.gotoPreview(previewIndex);
  },
  onReaderClosed: (currentPage, totalPages) => {
    gState.setReadProgress({ currentPage, totalPages });
  },
};

function allowFeatureFailure<T>(name: string, run: () => T): T | null {
  try {
    return run();
  } catch (error) {
    console.error(`[ehpeek] ${name} failed`, error);
    return null;
  }
}

async function allowAsyncFeatureFailure<T>(
  name: string,
  run: () => Promise<T>,
): Promise<T | null> {
  try {
    return await run();
  } catch (error) {
    console.error(`[ehpeek] ${name} failed`, error);
    return null;
  }
}

function deactivatePage(): void {
  gState.page.generation += 1;
  for (const cleanup of gState.page.cleanups) {
    cleanup();
  }
  gState.page.cleanups.clear();
  gState.thumbsGridsActions = undefined;

  for (const host of gState.page.managedHosts) {
    host.remove();
  }

  gState.page.managedHosts.clear();
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
  const pageNum = gState.readProgress().currentPage;
  const firstPage = previewCache.current().data.pages[0];
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
      currentPage={gState.readProgress().currentPage}
      totalPages={gState.readProgress().totalPages}
      onClick={() => openFromReadButton(props.previewCache)}
      variant={props.variant}
    />
  );
}

if (typeof GM_registerMenuCommand === "function") {
  GM_registerMenuCommand(texts.settings.openSettings, () => {
    gState.setSettingsMenuOpen(true);
  });
}

settingsMenuMount.mount(() => (
  <SettingsMenu
    open={gState.settingsMenuOpen()}
    defaultState={settingsMenuState(true)}
    initState={gState.settings}
    onApply={(next) => {
      applySettingsMenuState(next);
    }}
    onOpenChange={gState.setSettingsMenuOpen}
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
  const previewMount = preview?.elems.mount ?? null;

  if (galleryPage && preview && previewCache && gState.settings.readerEnabled) {
    allowFeatureFailure("Reader thumbnail links", () => {
      gState.page.cleanups.add(preview.handle.interceptPreviewImageOpen((pageUrl) => {
        openGalleryPage(previewCache, pageUrl);
      }));
    });
  }

  if (searchTextInput) {
    allowFeatureFailure("Search autocomplete", () => {
      eh.EhSyringe.reuseTagTipInput(searchTextInput.elems.input);
    });
  }

  if (resultsPage) {
    allowFeatureFailure("Search grid mode selector", () => {
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
    });
  }
  const searchGridEnabled = Boolean(resultsPage && state.search.grid.value);
  if (searchGridEnabled) {
    allowFeatureFailure("Search grid", () => eh.mutateSearchGrid());
  }

  if (gState.settings.openGalleryInNewTab && searchResultsDom) {
    allowFeatureFailure("Gallery links in new tabs", () => {
      searchResultsDom.handle.ensureGalleryLinksOpenInNewTab();
    });
  }

  if (!gState.settings.touchUiEnabled) {
    allowFeatureFailure("Desktop settings entry", () => {
      const settingsMount = eh.manageSettingsMenuMount();
      if (settingsMount) {
        settingsMount.mount(() => (
          <a
            href="#"
            onClick={(event: MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              gState.setSettingsMenuOpen(true);
            }}
          >
            {texts.settings.menuLabel}
          </a>
        ));
        gState.page.managedHosts.add(settingsMount);
      }
    });
  }

  if (
    !gState.settings.touchUiEnabled &&
    gState.settings.readHistoryEnabled &&
    galleryPage &&
    preview &&
    previewCache
  ) {
    allowFeatureFailure("Desktop Read button", () => {
      const galleryReadButtonMount = eh.manageGalleryContinueReadingButtonMount();
      gState.page.managedHosts.add(galleryReadButtonMount);
      galleryReadButtonMount.mount(() => (
        <GalleryReadButton previewCache={previewCache} variant="gallery" />
      ));
    });
  }

  if (
    galleryPage &&
    gState.settings.enhanceThumbsGridsEnabled &&
    previewCache &&
    previewMount
  ) {
    allowFeatureFailure("Enhanced thumbnail grid", () => {
      previewMount.mount(() => (
        <ThumbsGrids
          actionsRef={(actions) => {
            gState.thumbsGridsActions = actions;
          }}
          onLoadError={reportReaderOpenError}
          previewCache={previewCache}
        />
      ));
      gState.page.managedHosts.add(previewMount);
    });
  } else if (galleryPage && preview && previewCache) {
    allowFeatureFailure("Original thumbnail grid", () => {
      preview.elems.mount?.remove();
    });
  }

  if (
    gState.settings.enhanceSearchGridsEnabled &&
    searchResultsDom &&
    (searchResultsDom.data.previousUrl || searchResultsDom.data.nextUrl)
  ) {
    allowFeatureFailure("Enhanced Search pagination", () => {
      const host = createAppMount();
      host.mount(() => (
        <EnhanceSearchGrids
          source={searchResultsDom}
          onNavigateRequest={(url) => gState.singlePageActions?.navigate(url) ?? false}
          onPageChange={(source) => {
            allowFeatureFailure("Changed Search page", () => {
              if (gState.settings.openGalleryInNewTab) {
                source.handle.ensureGalleryLinksOpenInNewTab();
              }
              touchResultsDom?.handle.updateTouchResultsLayout();
              if (searchGridEnabled) {
                eh.mutateSearchGrid();
              }
            });
          }}
        />
      ));
      gState.page.managedHosts.add(host);
    });
  }

  if (gState.settings.searchHistoryEnabled && searchTextInput) {
    allowFeatureFailure("Search history", () => {
      const host = createAppMount();
      host.mount(() => <SearchHistory source={searchTextInput} />);
      gState.page.managedHosts.add(host);
    });
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
    ? allowFeatureFailure("Touch results layout", () =>
        eh.manageTouchResultsPage(page, singlePageActive))
    : null;
  if (resultsDom) {
    gState.page.cleanups.add(resultsDom.handle.removeTouchResultsLayout);
  }

  allowFeatureFailure("Touch top bar", () => {
    const topBarDom = eh.manageTopBar();
    if (topBarDom) {
      topBarDom.handle.updateNavItemVisual(TOUCH_TOP_BAR_NAV_ITEM_CLASS);
      topBarDom.elems.mount.mount(() => (
        <TouchTopBar
          source={topBarDom}
          onSettingsMenuOpen={() => {
            gState.setSettingsMenuOpen(true);
          }}
        />
      ));
      gState.page.managedHosts.add(topBarDom.elems.mount);
    }
  });

  if (galleryPage || resultsPage) {
    allowFeatureFailure("Back to top", () => {
      const host = createAppMount("ehpeek-back-to-top-host");
      host.mount(() => <BackToTop />);
      gState.page.managedHosts.add(host);
    });
  }

  if (galleryPage) {
    allowFeatureFailure("Touch GalleryInfo", () => {
      registerGlobalStyle(
        "ehpeek-touch-gallery-page-rearrange-style",
        galleryRearrange,
      );
      const galleryInfoDom = eh.manageGalleryInfo(preview?.data ?? null);
      if (galleryInfoDom) {
        galleryInfoDom.handle.updateCoverVisual(TOUCH_GALLERY_INFO_CLASSES.cover);
        galleryInfoDom.handle.updateActionItemsVisual(TOUCH_GALLERY_INFO_CLASSES.actionItems);
        galleryInfoDom.handle.updateNewTagVisual(TOUCH_GALLERY_INFO_CLASSES.newTag);
        galleryInfoDom.handle.installGalleryInfoPanel(TOUCH_GALLERY_INFO_CLASSES.host);
        galleryInfoDom.elems.mount.mount(() => (
          <GalleryInfoPanel
            source={galleryInfoDom}
            primaryAction={
              gState.settings.readHistoryEnabled && preview && previewCache ? (
                <GalleryReadButton
                  previewCache={previewCache}
                  variant="touchGallery"
                />
              ) : undefined
            }
          />
        ));
        gState.page.managedHosts.add(galleryInfoDom.elems.mount);
      }
    });

    allowFeatureFailure("Touch Gallery comments", () => {
      eh.mutateGalleryCommentsTouch();
    });
  }

  if (resultsPage) {
    allowFeatureFailure("Touch Search panel", () => {
      const searchPanelDom = eh.manageSearchPanel();
      if (searchPanelDom) {
        searchPanelDom.handle.updateSearchPanelVisual(
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
        gState.page.managedHosts.add(searchPanelDom.elems.mount);
        if (searchPanelDom.elems.categoryToggleMount) {
          searchPanelDom.elems.categoryToggleMount.mount(() => (
            <TouchSearchCategoryToggle source={searchPanelDom} />
          ));
          gState.page.managedHosts.add(searchPanelDom.elems.categoryToggleMount);
        }
        if (searchPanelDom.elems.advancedToggleMount) {
          searchPanelDom.elems.advancedToggleMount.mount(() => (
            <TouchSearchAdvancedToggle source={searchPanelDom} />
          ));
          gState.page.managedHosts.add(searchPanelDom.elems.advancedToggleMount);
        }
        if (searchPanelDom.elems.fileSearchToggleMount) {
          searchPanelDom.elems.fileSearchToggleMount.mount(() => (
            <TouchSearchFileToggle source={searchPanelDom} />
          ));
          gState.page.managedHosts.add(searchPanelDom.elems.fileSearchToggleMount);
        }
        searchPanelDom.elems.searchActionMount.mount(() => (
          <TouchSearchAction action="search" source={searchPanelDom} />
        ));
        gState.page.managedHosts.add(searchPanelDom.elems.searchActionMount);
        if (searchPanelDom.elems.clearActionMount) {
          searchPanelDom.elems.clearActionMount.mount(() => (
            <TouchSearchAction action="clear" source={searchPanelDom} />
          ));
          gState.page.managedHosts.add(searchPanelDom.elems.clearActionMount);
        }
      }
    });
  }

  return resultsDom;
}

async function injectPage(nextPage: eh.PageType): Promise<void> {
  const galleryPage = nextPage.type === "gallery";
  const resultsPage =
    nextPage.type === "search" || nextPage.type === "favorites";
  const generation = ++gState.page.generation;

  if (gState.settings.touchUiEnabled) {
    await eh.EhSyringe.waitForInitialUi();
    if (nextPage.type === "search") {
      await eh.EhSyringe.waitForSearchUi();
    }
    if (generation !== gState.page.generation) {
      return;
    }
  }

  if (galleryPage) {
    allowFeatureFailure("Gallery API session", () => {
      eh.manageGalleryApiSession();
    });
  }
  const galleryPreview = galleryPage
    ? allowFeatureFailure("Gallery Preview", () => eh.manageGalleryPreview())
    : null;
  const galleryPreviewCache = galleryPreview
    ? allowFeatureFailure("Gallery Preview cache", () =>
        createGalleryPreviewCache(galleryPreview))
    : null;
  if (nextPage.type === "gallery" && galleryPreview) {
    allowFeatureFailure("Gallery Read History", () => {
      const record = loadReadHistory(nextPage.galleryId, nextPage.token);
      gState.setReadProgress({
        currentPage: record?.pageNum && record.pageNum > 0 ? record.pageNum : 1,
        totalPages: record?.totalPages ?? galleryPreview.data.totalImages,
      });
    });
  }
  const searchTextInput = resultsPage
    ? allowFeatureFailure("Search text input", () => eh.manageSearchTextInput())
    : null;
  const searchResultsSource = resultsPage
    ? allowFeatureFailure("Search results", () => eh.manageSearchResults())
    : null;

  let myTagAppearances: Awaited<ReturnType<typeof loadMyTagAppearances>> = null;

  if (gState.settings.myTagsEnabled) {
    if (nextPage.type === "myTags") {
      await allowAsyncFeatureFailure("My Tags refresh", async () => {
        const currentMyTags = eh.extractMyTagsPageData();
        await refreshMyTags(currentMyTags);
      });
    } else if (galleryPage) {
      myTagAppearances = await allowAsyncFeatureFailure(
        "My Tags appearance",
        loadMyTagAppearances,
      );
    }
  }

  if (generation !== gState.page.generation) {
    return;
  }

  if (myTagAppearances) {
    allowFeatureFailure("Gallery My Tags appearance", () => {
      gState.page.cleanups.add(eh.mutateGalleryMyTags(myTagAppearances));
    });
  }

  if (gState.settings.readHistoryEnabled && nextPage.type === "image") {
    allowFeatureFailure("Image Read History", () => {
      const gallery = eh.extractImageGalleryPage();
      if (gallery?.galleryId === nextPage.galleryId) {
        const previous = loadReadHistory(gallery.galleryId, gallery.token);
        const historySession = new ReadHistorySession({
          galleryId: gallery.galleryId,
          token: gallery.token,
          totalPages: previous?.totalPages,
        });
        historySession.update(nextPage.pageNum, previous?.totalPages);
        gState.page.cleanups.add(() => historySession.dispose());
      }
    });
  }

  const touchResultsDom = gState.settings.touchUiEnabled
    ? injectTouchUI(nextPage, galleryPreviewCache)
    : null;
  injectEnhanceUI(
    nextPage,
    galleryPreviewCache,
    searchTextInput,
    searchResultsSource,
    touchResultsDom,
  );

  if (
    nextPage.type === "gallery" &&
    state.reader.enabled.value &&
    nextPage.peekPage !== null
  ) {
    if (galleryPreviewCache) {
      void allowAsyncFeatureFailure(
        "Reader deep link",
        () => openReaderFromHash(
          readerCallbacks,
          galleryPreviewCache,
          readerViewport,
        ),
      );
    }
  }
}

const singlePageActive =
  gState.settings.touchUiEnabled &&
  gState.settings.singlePageAppEnabled &&
  eh.singlePageRoute(window.location.href) !== null;

if (singlePageActive) {
  const host = createAppMount("isolate", true);
  host.mount(() => (
    <SinglePage
      actionsRef={(actions) => {
        gState.singlePageActions = actions;
      }}
      onPageActivate={(page) => injectPage(page)}
      onPageDeactivate={deactivatePage}
    />
  ));
} else {
  void injectPage(eh.extractPageType());
}
