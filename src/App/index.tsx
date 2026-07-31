import { createSignal } from "solid-js";
import { EnhanceSearchGrids } from "../components/Enhance/EnhanceSearchGrids";
import {
  ThumbsGrids,
  type ThumbsGridsActions,
} from "../components/Enhance/EnhanceThumbsGrids";
import {
  ScrollPreview,
  type ScrollPreviewActions,
} from "../components/Enhance/ScrollPreview";
import { ReadButton, ReadHistoryPage } from "../components/Enhance/ReadHistory";
import {
  loadReadHistory,
  loadReadHistoryRecords,
  recordGalleryVisit,
  ReadHistorySession,
  updateReadHistoryGalleryInfo,
} from "../state/readHistory";
import { SearchHistory } from "../components/Enhance/SearchHistory";
import { loadMyTagAppearances, refreshMyTags } from "../components/Enhance/MyTags";
import { SettingsMenu } from "../components/SettingsMenu";
import { BackToTop } from "../components/Widgets/BackToTop";
import {
  GalleryInfoPanel,
  FavoritesCategorySelect,
  TouchSearchAction,
  TouchSearchCategoryToggle,
  TouchSearchOptionToggle,
  TouchSearchPanel,
  TouchTopBar,
} from "../components/TouchUI";
import * as eh from "../eh";
import { state, type UiScale } from "../state";
import { dispatchReady } from "../state/events";
import texts from "../texts.json";
import { registerGlobalStyle } from "../utils";
import ehDomCss from "../eh/dom/styles.css";
import unoCss from "ehpeek:uno.css";
import themeCss from "../theme.css";
import {
  gotoActiveReaderPage,
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
import { createAppMount } from "./host";
import { applyUiScale } from "./uiScale";
import { observeFullscreenUiSizing, readerViewport } from "./viewport";

function settingsMenuState(defaults = false) {
  const read = <T,>(setting: { defaultValue: T; value: T }): T =>
    defaults ? setting.defaultValue : setting.value;

  return {
    openGalleryInNewTab: read(state.app.openGalleryInNewTab),
    readerEnabled: read(state.reader.enabled),
    exitReaderOnFullscreenExit: read(state.reader.exitOnFullscreenExit),
    readerFullscreenEnabled: read(state.reader.fullscreen),
    replacePreviewWithScroll: read(state.gallery.replacePreviewWithScroll),
    enhanceThumbsGridsEnabled: read(state.gallery.enhanceThumbs),
    enhanceSearchGridsEnabled: read(state.search.enhance),
    myTagsEnabled: read(state.gallery.myTags),
    readHistoryEnabled: read(state.gallery.readHistory),
    includeUnreadHistoryEnabled: read(state.gallery.includeUnreadHistory),
    searchHistoryEnabled: read(state.search.history),
    touchUiEnabled: read(state.touch.enabled),
  };
}

function applySettingsMenuState(
  next: ReturnType<typeof settingsMenuState>,
): void {
  state.app.openGalleryInNewTab.set(next.openGalleryInNewTab);
  state.reader.enabled.set(next.readerEnabled);
  state.reader.exitOnFullscreenExit.set(next.exitReaderOnFullscreenExit);
  state.reader.fullscreen.set(next.readerFullscreenEnabled);
  state.gallery.replacePreviewWithScroll.set(next.replacePreviewWithScroll);
  state.gallery.enhanceThumbs.set(next.enhanceThumbsGridsEnabled);
  state.search.enhance.set(next.enhanceSearchGridsEnabled);
  state.gallery.myTags.set(next.myTagsEnabled);
  state.gallery.readHistory.set(next.readHistoryEnabled);
  state.gallery.includeUnreadHistory.set(next.includeUnreadHistoryEnabled);
  state.search.history.set(next.searchHistoryEnabled);
  state.touch.enabled.set(next.touchUiEnabled);
  window.location.reload();
}

const gState = (() => {
  const settings = settingsMenuState();
  const [columnsEnabled, setColumnsEnabled] = createSignal(currentColumnsEnabled());
  const [leftHandedControls, setLeftHandedControls] =
    createSignal(state.app.leftHandedControls.value);
  const [settingsMenuOpen, setSettingsMenuOpen] = createSignal(false);
  const [uiScale, setUiScale] = createSignal(currentUiScale());
  const [readProgress, setReadProgress] = createSignal({
    currentPage: 1,
    hasHistory: false,
    totalPages: null as number | null,
  });
  return {
    galleryWideLayout: null as eh.GalleryWideLayoutHandle | null,
    columnsEnabled,
    leftHandedControls,
    readProgress,
    setReadProgress,
    setLeftHandedControls,
    settings,
    settingsMenuOpen,
    setUiScale,
    setColumnsEnabled,
    setSettingsMenuOpen,
    readHistoryPage: null as eh.ReadHistoryPageDom | null,
    searchResults: null as eh.SearchResultsDom | null,
    scrollPreviewActions: undefined as ScrollPreviewActions | undefined,
    scrollPreviewOpen: false,
    thumbsGridsActions: undefined as ThumbsGridsActions | undefined,
    uiScale,
  };
})();

function currentUiScale(): UiScale {
  return window.matchMedia("(orientation: landscape)").matches
    ? state.app.landscapeUiScale.value
    : state.app.portraitUiScale.value;
}

function currentColumnsEnabled(): boolean {
  return window.matchMedia("(orientation: landscape)").matches
    ? state.touch.landscapeColumns.value
    : state.touch.portraitColumns.value;
}

function updateUiScale(): void {
  const scale = currentUiScale();
  gState.setUiScale(scale);
  applyUiScale(scale);
}

function updateColumnsLayout(): void {
  if (!gState.settings.touchUiEnabled) {
    return;
  }
  const enabled = currentColumnsEnabled();
  gState.galleryWideLayout?.updateEnabled(enabled);
  gState.readHistoryPage?.handle.updateResultColumns(enabled);
  gState.searchResults?.handle.updateResultColumns(enabled);
  gState.setColumnsEnabled(enabled);
}

function setCurrentColumnsEnabled(enabled: boolean): void {
  const setting = window.matchMedia("(orientation: landscape)").matches
    ? state.touch.landscapeColumns
    : state.touch.portraitColumns;
  setting.set(enabled);
  gState.galleryWideLayout?.updateEnabled(enabled);
  gState.readHistoryPage?.handle.updateResultColumns(enabled);
  gState.searchResults?.handle.updateResultColumns(enabled);
  gState.setColumnsEnabled(enabled);
}

function setCurrentUiScale(scale: UiScale): void {
  const setting = window.matchMedia("(orientation: landscape)").matches
    ? state.app.landscapeUiScale
    : state.app.portraitUiScale;
  setting.set(scale);
  gState.setUiScale(scale);
  applyUiScale(scale);
}

function setLeftHandedControls(enabled: boolean): void {
  state.app.leftHandedControls.set(enabled);
  gState.setLeftHandedControls(enabled);
}

document.documentElement.setAttribute("data-ehpeek-site", eh.ehSiteTheme());
updateUiScale();
observeFullscreenUiSizing();
registerGlobalStyle("ehpeek-uno-style", unoCss);
registerGlobalStyle("ehpeek-theme-style", themeCss);
registerGlobalStyle("ehpeek-dom-style", ehDomCss);

const readerCallbacks: ReaderCallbacks = {
  get enhanceThumbsGridsEnabled() {
    return gState.settings.enhanceThumbsGridsEnabled ||
      gState.settings.replacePreviewWithScroll ||
      gState.scrollPreviewOpen;
  },
  exitReaderOnFullscreenExit: gState.settings.exitReaderOnFullscreenExit,
  readHistoryEnabled: gState.settings.readHistoryEnabled,
  onGotoPreviewIndex: (previewIndex) => {
    if (gState.scrollPreviewOpen) {
      gState.scrollPreviewActions?.gotoPreview(previewIndex);
    } else {
      gState.thumbsGridsActions?.gotoPreview(previewIndex);
    }
  },
  onOpenScrollPreview: (pageNum) => {
    gState.scrollPreviewActions?.gotoPage(pageNum);
  },
  onReaderClosed: (currentPage, totalPages) => {
    if (!gState.settings.readHistoryEnabled) {
      return;
    }
    gState.setReadProgress({ currentPage, hasHistory: true, totalPages });
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

function openGalleryPage(
  previewCache: GalleryPreviewCache,
  startPageUrl: string,
  preferredPageNum?: number,
): void {
  if (preferredPageNum !== undefined && gotoActiveReaderPage(preferredPageNum)) {
    return;
  }
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
  const pageNum = gState.settings.readHistoryEnabled
    ? gState.readProgress().currentPage
    : 1;
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
      currentPage={gState.settings.readHistoryEnabled
        ? gState.readProgress().currentPage
        : 1}
      hasHistory={gState.settings.readHistoryEnabled && gState.readProgress().hasHistory}
      totalPages={gState.readProgress().totalPages}
      onClick={() => openFromReadButton(props.previewCache)}
      variant={props.variant}
    />
  );
}

function installSettingsMenu(): void {
  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand(texts.settings.openSettings, () => {
      gState.setSettingsMenuOpen(true);
    });
  }

  const mount = createAppMount(
    "fixed inset-0 z-[1150] pointer-events-none",
  );
  mount.mount(() => (
    <SettingsMenu
      historyHref={eh.readHistoryUrl()}
      leftHandedControls={gState.leftHandedControls}
      open={gState.settingsMenuOpen()}
      defaultState={settingsMenuState(true)}
      initState={gState.settings}
      onApply={(next) => {
        applySettingsMenuState(next);
      }}
      onOpenChange={gState.setSettingsMenuOpen}
    />
  ));
}

function injectEnhanceUI(
  page: eh.PageType,
  previewCache: GalleryPreviewCache | null,
  searchTextInput: eh.SearchTextInputDom | null,
  searchResultsDom: eh.SearchResultsDom | null,
  touchResultsDom: eh.TouchResultsPageDom | null,
): void {
  const galleryPage = page.type === "gallery";
  const searchPage = page.type === "search" || page.type === "favorites";
  const preview = previewCache?.current() ?? null;
  const previewMount = preview?.elems.mount ?? null;
  const updateSearchGridModeSelector = () => {
    eh.mutateSearchGridModeSelect(
      state.search.grid.value,
      (mode) => {
        state.search.grid.set(mode);
        window.location.assign(
          new URL("/?inline_set=dm_e", window.location.href).href,
        );
      },
      () => {
        state.search.grid.set(null);
      },
    );
  };

  if (galleryPage && preview && previewCache && gState.settings.readerEnabled) {
    allowFeatureFailure("Reader thumbnail links", () => {
      preview.handle.interceptPreviewImageOpen((pageUrl) => {
        openGalleryPage(previewCache, pageUrl);
      });
    });
  }

  if (searchPage) {
    allowFeatureFailure("Search grid mode selector", () => {
      updateSearchGridModeSelector();
    });
  }
  const searchGridMode = searchPage ? state.search.grid.value : null;
  if (searchGridMode) {
    allowFeatureFailure(
      "Search grid",
      () => eh.manageSearchGrids(searchGridMode),
    );
  }
  const updateSearchReadHistoryAppearance = () => {
    if (!searchPage || !gState.settings.readHistoryEnabled) {
      return;
    }
    eh.mutateSearchReadHistoryAppearance(loadReadHistory);
  };
  allowFeatureFailure("Search Read History appearance", updateSearchReadHistoryAppearance);

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
      }
    });
  }

  if (
    !gState.settings.touchUiEnabled &&
    galleryPage &&
    preview &&
    previewCache
  ) {
    allowFeatureFailure("Desktop Read button", () => {
      const galleryReadButtonMount = eh.manageGalleryContinueReadingButtonMount();
      galleryReadButtonMount.mount(() => (
        <GalleryReadButton previewCache={previewCache} variant="gallery" />
      ));
    });
  }

  if (
    galleryPage &&
    preview &&
    previewCache &&
    previewMount
  ) {
    allowFeatureFailure("Gallery Preview enhancements", () => {
      if (gState.settings.replacePreviewWithScroll) {
        preview.handle.removeOriginalPreview();
      }
      previewMount.mount(() => (
        <div
          classList={{
            "contents": !gState.settings.replacePreviewWithScroll,
            "relative h-full w-full":
              gState.settings.replacePreviewWithScroll &&
              gState.settings.touchUiEnabled &&
              gState.columnsEnabled(),
            "relative h-[55dvh] [width:calc(100%-(var(--touch-gallery-gutter)*2))] landscape:[width:min(calc(100%-(var(--touch-gallery-gutter)*2)),90dvh)] mx-auto":
              gState.settings.replacePreviewWithScroll &&
              gState.settings.touchUiEnabled &&
              !gState.columnsEnabled(),
            "relative h-[70dvh] w-[min(calc(100%-32px),1212px)] mx-auto":
              gState.settings.replacePreviewWithScroll &&
              !gState.settings.touchUiEnabled,
          }}
        >
          <ScrollPreview
            actionsRef={(actions) => {
              gState.scrollPreviewActions = actions;
            }}
            continuePageNum={gState.settings.readHistoryEnabled &&
                gState.readProgress().hasHistory
              ? gState.readProgress().currentPage
              : null}
            embeddedDirection={gState.columnsEnabled()
              ? state.gallery.embeddedScrollPreviewColumnsDirection.value
              : state.gallery.embeddedScrollPreviewSingleDirection.value}
            leftHandedControls={gState.leftHandedControls}
            onExitPreview={(previewIndex) => {
              if (previewIndex === previewCache.current().data.currentIndex) {
                return;
              }
              if (
                gState.settings.enhanceThumbsGridsEnabled ||
                gState.settings.replacePreviewWithScroll
              ) {
                void previewCache.select(previewIndex).catch(reportReaderOpenError);
              } else {
                window.location.assign(
                  eh.previewUrlForIndex(previewIndex, previewCache.current().data.currentUrl),
                );
              }
            }}
            onLoadError={reportReaderOpenError}
            onOpenChange={(open) => {
              gState.scrollPreviewOpen = open;
            }}
            onOpenPage={(pageUrl, pageNum) => openGalleryPage(previewCache, pageUrl, pageNum)}
            onEmbeddedDirectionChange={(direction) => {
              if (gState.columnsEnabled()) {
                state.gallery.embeddedScrollPreviewColumnsDirection.set(direction);
              } else {
                state.gallery.embeddedScrollPreviewSingleDirection.set(direction);
              }
            }}
            onReadDirectionChange={(direction) => {
              state.gallery.scrollPreviewDirection.set(direction);
            }}
            previewCache={previewCache}
            readDirection={state.gallery.scrollPreviewDirection.value}
            replaceOriginalPreview={gState.settings.replacePreviewWithScroll}
          />
          {gState.settings.enhanceThumbsGridsEnabled &&
          !gState.settings.replacePreviewWithScroll ? (
            <ThumbsGrids
              actionsRef={(actions) => {
                gState.thumbsGridsActions = actions;
              }}
              onLoadError={reportReaderOpenError}
              previewCache={previewCache}
            />
          ) : null}
        </div>
      ));
    });
  } else if (galleryPage && preview && previewCache) {
    allowFeatureFailure("Original thumbnail grid", () => {
      preview.elems.mount?.remove();
    });
  }

  if (
    gState.settings.enhanceSearchGridsEnabled &&
    searchResultsDom
  ) {
    allowFeatureFailure("Enhanced Search pagination", () => {
      const host = createAppMount();
      host.mount(() => (
        <EnhanceSearchGrids
          source={searchResultsDom}
          onPageChange={(source) => {
            allowFeatureFailure("Changed Search page", () => {
              gState.searchResults = source;
              if (gState.settings.touchUiEnabled) {
                source.handle.updateResultColumns(gState.columnsEnabled());
              }
              updateSearchGridModeSelector();
              if (gState.settings.openGalleryInNewTab) {
                source.handle.ensureGalleryLinksOpenInNewTab();
              }
              touchResultsDom?.handle.updateTouchResultsLayout();
              if (searchGridMode) {
                eh.manageSearchGrids(searchGridMode);
              }
              updateSearchReadHistoryAppearance();
            });
          }}
        />
      ));
    });
  }

  if (gState.settings.searchHistoryEnabled && searchTextInput) {
    allowFeatureFailure("Search history", () => {
      const host = createAppMount();
      host.mount(() => <SearchHistory source={searchTextInput} />);
    });
  }
}

function injectTouchUI(
  page: eh.PageType,
  previewCache: GalleryPreviewCache | null,
): eh.TouchResultsPageDom | null {
  const galleryPage = page.type === "gallery";
  const searchPage = page.type === "search" || page.type === "favorites";
  const resultsPage = searchPage || page.type === "readHistory";
  const preview = previewCache?.current() ?? null;
  const columnsAvailable =
    galleryPage ||
    page.type === "readHistory" ||
    (searchPage && state.search.grid.value);
  const resultsDom = resultsPage
    ? allowFeatureFailure("Touch results layout", () =>
        eh.manageTouchResultsPage(page))
    : null;

  allowFeatureFailure("Touch top bar", () => {
    const topBarDom = eh.manageTopBar();
    if (topBarDom) {
      topBarDom.elems.mount.mount(() => (
        <TouchTopBar
          fullscreen={readerViewport.createFullscreen(document.documentElement)}
          historyHref={gState.settings.readHistoryEnabled
            ? eh.readHistoryUrl()
            : undefined}
          leftHandedControls={{
            enabled: gState.leftHandedControls,
            onChange: setLeftHandedControls,
          }}
          uiScale={{
            value: gState.uiScale,
            onChange: setCurrentUiScale,
          }}
          columns={columnsAvailable ? {
            enabled: gState.columnsEnabled,
            onChange: setCurrentColumnsEnabled,
          } : undefined}
          source={topBarDom}
          onSettingsMenuOpen={() => {
            gState.setSettingsMenuOpen(true);
          }}
        />
      ));
    }
  });

  if (galleryPage || resultsPage) {
    allowFeatureFailure("Back to top", () => {
      const host = createAppMount("ehpeek-back-to-top-host");
      host.mount(() => <BackToTop leftHanded={gState.leftHandedControls} />);
    });
  }

  if (galleryPage) {
    allowFeatureFailure("Touch GalleryInfo", () => {
      eh.mutateGalleryTouchLayout();
      const galleryInfoDom = eh.manageGalleryInfo(preview?.data ?? null);
      if (galleryInfoDom) {
        galleryInfoDom.handle.installGalleryInfoPanel();
        galleryInfoDom.elems.mount.mount(() => (
          <GalleryInfoPanel
            leftHandedControls={gState.leftHandedControls}
            source={galleryInfoDom}
            primaryAction={
              preview && previewCache ? (
                <GalleryReadButton
                  previewCache={previewCache}
                  variant="touchGallery"
                />
              ) : undefined
            }
          />
        ));
        if (preview) {
          gState.galleryWideLayout = eh.mutateGalleryWideLayout(
            galleryInfoDom,
            preview,
            gState.columnsEnabled(),
            gState.settings.replacePreviewWithScroll,
          );
        }
      }
    });

    allowFeatureFailure("Touch Gallery comments", () => {
      eh.mutateGalleryCommentsTouch();
    });
  }

  if (searchPage) {
    allowFeatureFailure("Touch Search panel", () => {
      const searchPanelDom = eh.manageSearchPanel();
      if (searchPanelDom) {
        searchPanelDom.elems.mount.mount(() => (
          <TouchSearchPanel
            source={searchPanelDom}
            after={
              resultsDom?.data.favoritesCategory ? (
                <FavoritesCategorySelect
                  source={resultsDom}
                />
              ) : undefined
            }
          />
        ));
        if (searchPanelDom.elems.categoryToggleMount) {
          searchPanelDom.elems.categoryToggleMount.mount(() => (
            <TouchSearchCategoryToggle source={searchPanelDom} />
          ));
        }
        if (searchPanelDom.elems.advancedToggleMount) {
          searchPanelDom.elems.advancedToggleMount.mount(() => (
            <TouchSearchOptionToggle option="advancedOptions" source={searchPanelDom} />
          ));
        }
        if (searchPanelDom.elems.fileSearchToggleMount) {
          searchPanelDom.elems.fileSearchToggleMount.mount(() => (
            <TouchSearchOptionToggle option="fileSearch" source={searchPanelDom} />
          ));
        }
        searchPanelDom.elems.searchActionMount.mount(() => (
          <TouchSearchAction action="search" source={searchPanelDom} />
        ));
        if (searchPanelDom.elems.clearActionMount) {
          searchPanelDom.elems.clearActionMount.mount(() => (
            <TouchSearchAction action="clear" source={searchPanelDom} />
          ));
        }
      }
    });
  }

  return resultsDom;
}

async function injectPage(page: eh.PageType): Promise<void> {
  updateUiScale();
  const galleryPage = page.type === "gallery";
  const searchPage = page.type === "search" || page.type === "favorites";

  if (page.type === "settings") {
    const titlePreference = eh.extractGalleryTitlePreference();
    if (titlePreference) {
      state.gallery.titlePreference.set(titlePreference);
    }
  }

  if (page.type === "readHistory") {
    allowFeatureFailure("Read History page", () => {
      const pageSize = 25;
      const records = loadReadHistoryRecords();
      const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
      const pageIndex = Math.min(page.pageIndex, pageCount - 1);
      const items = records
        .map((record) => ({
          currentPage: record.pageNum,
          galleryId: record.galleryId,
          info: record.gallery,
          token: record.token,
          totalPages: record.totalPages,
          updatedAt: record.updatedAt,
        }));
      const titlePreference = state.gallery.titlePreference.reload();
      const historyDom = eh.manageReadHistoryPage(
        items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
        titlePreference,
        state.search.grid.value ?? "ehpeek-lite",
      );
      gState.readHistoryPage = historyDom;
      if (gState.settings.touchUiEnabled) {
        historyDom?.handle.updateResultColumns(gState.columnsEnabled());
      }
      historyDom?.elems.navigationTopMount.mount(() => (
        <ReadHistoryPage
          initialPageIndex={pageIndex}
          items={items}
          pageSize={pageSize}
          source={historyDom}
        />
      ));
    });
  }

  const galleryPreview = galleryPage
    ? allowFeatureFailure("Gallery Preview", () => eh.manageGalleryPreview())
    : null;
  const galleryPreviewCache = galleryPreview
    ? allowFeatureFailure("Gallery Preview cache", () =>
        createGalleryPreviewCache(galleryPreview))
    : null;
  if (page.type === "gallery" && galleryPreview) {
    allowFeatureFailure("Gallery Read History", () => {
      if (!gState.settings.readHistoryEnabled) {
        gState.setReadProgress({
          currentPage: 1,
          hasHistory: false,
          totalPages: galleryPreview.data.totalImages,
        });
        return;
      }
      const existing = loadReadHistory(page.galleryId, page.token);
      const galleryInfo = eh.extractGalleryHistoryInfo();
      let record = existing;
      if (gState.settings.includeUnreadHistoryEnabled) {
        record = recordGalleryVisit(
          page.galleryId,
          page.token,
          galleryPreview.data.totalImages,
          galleryInfo,
        );
      } else if (existing) {
        record = updateReadHistoryGalleryInfo(page.galleryId, page.token, galleryInfo);
      }
      gState.setReadProgress({
        currentPage: record?.pageNum && record.pageNum > 0 ? record.pageNum : 1,
        hasHistory: Boolean(record && record.pageNum > 0),
        totalPages: record?.totalPages ?? galleryPreview.data.totalImages,
      });
    });
  }
  const searchTextInput = searchPage
    ? allowFeatureFailure("Search text input", () => eh.manageSearchTextInput())
    : null;
  const searchResultsSource = searchPage
    ? allowFeatureFailure("Search results", () => eh.manageSearchResults())
    : null;
  gState.searchResults = searchResultsSource;
  if (gState.settings.touchUiEnabled) {
    searchResultsSource?.handle.updateResultColumns(gState.columnsEnabled());
  }

  if (gState.settings.myTagsEnabled) {
    if (page.type === "myTags") {
      void allowAsyncFeatureFailure("My Tags refresh", async () => {
        const currentMyTags = eh.extractMyTagsPageData();
        await refreshMyTags(currentMyTags);
      });
    } else if (galleryPage) {
      const myTagAppearances = loadMyTagAppearances();
      if (myTagAppearances) {
        allowFeatureFailure("Gallery My Tags appearance", () => {
          eh.mutateGalleryMyTags(myTagAppearances);
        });
      } else {
        void allowAsyncFeatureFailure("My Tags appearance", async () => {
          const appearances = await refreshMyTags();
          if (appearances) {
            eh.mutateGalleryMyTags(appearances);
          }
        });
      }
    }
  }

  if (gState.settings.readHistoryEnabled && page.type === "image") {
    allowFeatureFailure("Image Read History", () => {
      const gallery = eh.extractImageGalleryPage();
      if (gallery?.galleryId === page.galleryId) {
        const previous = loadReadHistory(gallery.galleryId, gallery.token);
        const historySession = new ReadHistorySession({
          gallery: previous?.gallery,
          galleryId: gallery.galleryId,
          token: gallery.token,
          totalPages: previous?.totalPages,
        });
        historySession.update(page.pageNum, previous?.totalPages);
      }
    });
  }

  const touchResultsDom = gState.settings.touchUiEnabled
    ? injectTouchUI(page, galleryPreviewCache)
    : null;
  injectEnhanceUI(
    page,
    galleryPreviewCache,
    searchTextInput,
    searchResultsSource,
    touchResultsDom,
  );

  if (
    page.type === "gallery" &&
    state.reader.enabled.value &&
    page.peekPage !== null
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

eh.EhSyringe.initialize();

let historyRouteActive = eh.extractPageType().type === "readHistory";
window.addEventListener("hashchange", () => {
  const nextHistoryRouteActive = eh.extractPageType().type === "readHistory";
  if (historyRouteActive !== nextHistoryRouteActive) {
    window.location.reload();
  }
  historyRouteActive = nextHistoryRouteActive;
});

async function startApp(): Promise<void> {
  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }

  const page = eh.extractPageType();
  const onViewportResize = () => {
    updateUiScale();
    updateColumnsLayout();
  };
  window.addEventListener("resize", onViewportResize, { passive: true });

  installSettingsMenu();
  await injectPage(page);
  dispatchReady();
}

void startApp().catch((error) => {
  console.error("[ehpeek] App startup failed", error);
});
