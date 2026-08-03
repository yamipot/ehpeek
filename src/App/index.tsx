import { createEffect, createRoot, createSignal } from "solid-js";
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
  gState.setColumnsEnabled(currentColumnsEnabled());
}

function setCurrentColumnsEnabled(enabled: boolean): void {
  const setting = window.matchMedia("(orientation: landscape)").matches
    ? state.touch.landscapeColumns
    : state.touch.portraitColumns;
  setting.set(enabled);
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

function allowFeatureFailure(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`[ehpeek] ${name} failed`, error);
  }
}

async function allowAsyncFeatureFailure(
  name: string,
  run: () => Promise<void>,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.error(`[ehpeek] ${name} failed`, error);
  }
}

function requirePageDependency<T>(name: string, dependency: T | null): T {
  if (dependency === null) {
    throw new Error(`Cannot initialize ${name}.`);
  }
  return dependency;
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

function injectCommon(page: eh.PageType): void {
  if (!gState.settings.touchUiEnabled) {
    allowFeatureFailure("Desktop settings entry", () => {
      const settingsMount = eh.manageSettingsMenuMount();
      if (!settingsMount) {
        return;
      }
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
    });
    return;
  }

  allowFeatureFailure("Touch top bar", () => {
    const topBarDom = eh.manageTopBar();
    if (!topBarDom) {
      return;
    }
    const columnsAvailable =
      page.type === "gallery" ||
      page.type === "readHistory" ||
      ((page.type === "search" || page.type === "favorites") &&
        state.search.grid.value !== null);
    topBarDom.elems.mount.mount(() => (
      <TouchTopBar
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
  });

  if (
    page.type === "gallery" ||
    page.type === "search" ||
    page.type === "favorites" ||
    page.type === "readHistory"
  ) {
    allowFeatureFailure("Back to top", () => {
      const host = createAppMount("ehpeek-back-to-top-host");
      host.mount(() => <BackToTop leftHanded={gState.leftHandedControls} />);
    });
  }
}

function injectGalleryDetails(previewCache: GalleryPreviewCache): void {
  const preview = previewCache.current();
  allowFeatureFailure("Touch GalleryInfo", () => {
    eh.mutateGalleryTouchLayout();
    const galleryInfoDom = requirePageDependency(
      "Touch GalleryInfo",
      eh.manageGalleryInfo(preview.data),
    );
    galleryInfoDom.handle.installGalleryInfoPanel();
    galleryInfoDom.elems.mount.mount(() => (
      <GalleryInfoPanel
        leftHandedControls={gState.leftHandedControls}
        source={galleryInfoDom}
        primaryAction={(
          <GalleryReadButton
            previewCache={previewCache}
            variant="touchGallery"
          />
        )}
      />
    ));
    const wideLayout = requirePageDependency(
      "Touch Gallery layout",
      eh.mutateGalleryWideLayout(
        galleryInfoDom,
        preview,
        gState.columnsEnabled(),
        gState.settings.replacePreviewWithScroll,
      ),
    );
    createEffect(() => wideLayout.updateEnabled(gState.columnsEnabled()));
  });

  allowFeatureFailure("Touch Gallery comments", () => {
    eh.manageGalleryCommentsTouch(reportReaderOpenError);
  });
}

function injectGalleryPreview(previewCache: GalleryPreviewCache): void {
  const preview = previewCache.current();
  const previewMount = preview.elems.mount;

  if (gState.settings.readerEnabled) {
    allowFeatureFailure("Reader thumbnail links", () => {
      preview.handle.interceptPreviewImageOpen((pageUrl) => {
        openGalleryPage(previewCache, pageUrl);
      });
    });
  }

  if (!gState.settings.touchUiEnabled) {
    allowFeatureFailure("Desktop Read button", () => {
      const galleryReadButtonMount = eh.manageGalleryContinueReadingButtonMount();
      galleryReadButtonMount.mount(() => (
        <GalleryReadButton previewCache={previewCache} variant="gallery" />
      ));
    });
  }

  if (!previewMount) {
    return;
  }

  allowFeatureFailure("Gallery Preview enhancements", () => {
    if (gState.settings.replacePreviewWithScroll) {
      preview.handle.removeOriginalPreview();
    }
    previewMount.mount(() => (
      <div
        classList={{
          "contents": !gState.settings.replacePreviewWithScroll,
          "relative h-full w-full [--scroll-preview-height:100%]":
            gState.settings.replacePreviewWithScroll &&
            gState.settings.touchUiEnabled &&
            gState.columnsEnabled(),
          "relative [--scroll-preview-height:55lvh] [width:calc(100%-(var(--touch-gallery-gutter)*2))] landscape:[width:min(calc(100%-(var(--touch-gallery-gutter)*2)),90lvh)] mx-auto":
            gState.settings.replacePreviewWithScroll &&
            gState.settings.touchUiEnabled &&
            !gState.columnsEnabled(),
          "relative [--scroll-preview-height:70svh] w-[min(calc(100%-32px),1212px)] mx-auto":
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
}

function injectGalleryPage(
  page: Extract<eh.PageType, { type: "gallery" }>,
): void {
  const preview = eh.manageGalleryPreview();
  const previewCache = createGalleryPreviewCache(preview);

  allowFeatureFailure("Gallery Read History", () => {
    if (!gState.settings.readHistoryEnabled) {
      gState.setReadProgress({
        currentPage: 1,
        hasHistory: false,
        totalPages: preview.data.totalImages,
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
        preview.data.totalImages,
        galleryInfo,
      );
    } else if (existing) {
      record = updateReadHistoryGalleryInfo(page.galleryId, page.token, galleryInfo);
    }
    gState.setReadProgress({
      currentPage: record?.pageNum && record.pageNum > 0 ? record.pageNum : 1,
      hasHistory: Boolean(record && record.pageNum > 0),
      totalPages: record?.totalPages ?? preview.data.totalImages,
    });
  });

  if (gState.settings.myTagsEnabled) {
    allowFeatureFailure("Gallery My Tags appearance", () => {
      const myTagAppearances = loadMyTagAppearances();
      if (myTagAppearances) {
        eh.mutateGalleryMyTags(myTagAppearances);
        return;
      }
      void allowAsyncFeatureFailure("My Tags appearance", async () => {
        const appearances = await refreshMyTags();
        if (appearances) {
          eh.mutateGalleryMyTags(appearances);
        }
      });
    });
  }

  if (gState.settings.touchUiEnabled) {
    injectGalleryDetails(previewCache);
  }
  injectGalleryPreview(previewCache);

  if (state.reader.enabled.value && page.peekPage !== null) {
    void allowAsyncFeatureFailure("Reader deep link", async () => {
      await openReaderFromHash(readerCallbacks, previewCache, readerViewport);
    });
  }
}

function injectSearchControls(
  page: Extract<eh.PageType, { type: "favorites" | "search" }>,
): eh.TouchResultsPageDom {
  const touchResultsDom = eh.manageTouchResultsPage(page);

  allowFeatureFailure("Touch Search panel", () => {
    const searchPanelDom = eh.manageSearchPanel();
    if (!searchPanelDom) {
      return;
    }
    searchPanelDom.elems.mount.mount(() => (
      <TouchSearchPanel
        source={searchPanelDom}
        after={touchResultsDom.data.favoritesCategory ? (
          <FavoritesCategorySelect source={touchResultsDom} />
        ) : undefined}
      />
    ));
    searchPanelDom.elems.categoryToggleMount?.mount(() => (
      <TouchSearchCategoryToggle source={searchPanelDom} />
    ));
    searchPanelDom.elems.advancedToggleMount?.mount(() => (
      <TouchSearchOptionToggle option="advancedOptions" source={searchPanelDom} />
    ));
    searchPanelDom.elems.fileSearchToggleMount?.mount(() => (
      <TouchSearchOptionToggle option="fileSearch" source={searchPanelDom} />
    ));
    searchPanelDom.elems.searchActionMount.mount(() => (
      <TouchSearchAction action="search" source={searchPanelDom} />
    ));
    searchPanelDom.elems.clearActionMount?.mount(() => (
      <TouchSearchAction action="clear" source={searchPanelDom} />
    ));
  });

  return touchResultsDom;
}

function injectSearchPage(
  page: Extract<eh.PageType, { type: "favorites" | "search" }>,
): void {
  const initialResultsDom = requirePageDependency(
    "Search results",
    eh.manageSearchResults(),
  );
  const [resultsDom, setResultsDom] = createSignal(
    initialResultsDom,
  );

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

  allowFeatureFailure("Search grid mode selector", updateSearchGridModeSelector);
  const searchGridMode = state.search.grid.value;
  if (searchGridMode) {
    allowFeatureFailure(
      "Search grid",
      () => eh.manageSearchGrids(searchGridMode),
    );
  }
  const updateSearchReadHistoryAppearance = () => {
    if (!gState.settings.readHistoryEnabled) {
      return;
    }
    eh.mutateSearchReadHistoryAppearance(loadReadHistory);
  };
  allowFeatureFailure("Search Read History appearance", updateSearchReadHistoryAppearance);

  if (gState.settings.openGalleryInNewTab) {
    allowFeatureFailure("Gallery links in new tabs", () => {
      initialResultsDom.handle.listenGalleryLinksOpenInNewTab();
    });
  }
  const updateSearchPage = (source: eh.SearchResultsDom) => {
    setResultsDom(source);
    updateSearchGridModeSelector();
    if (searchGridMode) {
      eh.manageSearchGrids(searchGridMode);
    }
    updateSearchReadHistoryAppearance();
  };
  const mountSearchPagination = (
    onPageChange: (source: eh.SearchResultsDom) => void,
  ) => {
    if (!gState.settings.enhanceSearchGridsEnabled) {
      return;
    }
    allowFeatureFailure("Enhanced Search pagination", () => {
      const host = createAppMount();
      host.mount(() => (
        <EnhanceSearchGrids
          source={initialResultsDom}
          onPageChange={(source) =>
            allowFeatureFailure("Changed Search page", () => onPageChange(source))}
        />
      ));
    });
  };

  if (gState.settings.touchUiEnabled) {
    const touchResultsDom = injectSearchControls(page);
    createEffect(() => {
      resultsDom().handle.updateResultColumns(gState.columnsEnabled());
    });
    mountSearchPagination((source) => {
      updateSearchPage(source);
      touchResultsDom.handle.updateTouchResultsLayout();
    });
  } else {
    mountSearchPagination(updateSearchPage);
  }

  if (gState.settings.searchHistoryEnabled) {
    allowFeatureFailure("Search history", () => {
      const searchTextInput = eh.manageSearchTextInput();
      if (!searchTextInput) {
        return;
      }
      const host = createAppMount();
      host.mount(() => <SearchHistory source={searchTextInput} />);
    });
  }
}

function injectReadHistoryPage(
  page: Extract<eh.PageType, { type: "readHistory" }>,
): void {
  const pageSize = 25;
  const records = loadReadHistoryRecords();
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const pageIndex = Math.min(page.pageIndex, pageCount - 1);
  const items = records.map((record) => ({
    currentPage: record.pageNum,
    galleryId: record.galleryId,
    info: record.gallery,
    token: record.token,
    totalPages: record.totalPages,
    updatedAt: record.updatedAt,
  }));
  const historyDom = requirePageDependency(
    "Read History page",
    eh.manageReadHistoryPage(
      items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
      state.gallery.titlePreference.reload(),
      state.search.grid.value ?? "ehpeek-lite",
    ),
  );
  if (gState.settings.touchUiEnabled) {
    createEffect(() => {
      historyDom.handle.updateResultColumns(gState.columnsEnabled());
    });
    allowFeatureFailure("Touch Read History layout", () => {
      eh.manageTouchResultsPage(page);
    });
  }
  historyDom.elems.navigationTopMount.mount(() => (
    <ReadHistoryPage
      initialPageIndex={pageIndex}
      items={items}
      pageSize={pageSize}
      source={historyDom}
    />
  ));
}

function injectImagePage(
  page: Extract<eh.PageType, { type: "image" }>,
): void {
  if (!gState.settings.readHistoryEnabled) {
    return;
  }
  const gallery = requirePageDependency(
    "Image Gallery data",
    eh.extractImageGalleryPage(),
  );
  if (gallery.galleryId !== page.galleryId) {
    return;
  }
  const previous = loadReadHistory(gallery.galleryId, gallery.token);
  const historySession = new ReadHistorySession({
    gallery: previous?.gallery,
    galleryId: gallery.galleryId,
    token: gallery.token,
    totalPages: previous?.totalPages,
  });
  historySession.update(page.pageNum, previous?.totalPages);
}

function injectPage(page: eh.PageType): void {
  updateUiScale();
  injectCommon(page);

  switch (page.type) {
    case "gallery":
      allowFeatureFailure("Gallery page", () => injectGalleryPage(page));
      break;
    case "favorites":
    case "search":
      allowFeatureFailure("Search page", () => injectSearchPage(page));
      break;
    case "readHistory":
      allowFeatureFailure("Read History page", () => injectReadHistoryPage(page));
      break;
    case "image":
      allowFeatureFailure("Image page", () => injectImagePage(page));
      break;
    case "myTags":
      if (gState.settings.myTagsEnabled) {
        void allowAsyncFeatureFailure("My Tags refresh", async () => {
          await refreshMyTags(eh.extractMyTagsPageData());
        });
      }
      break;
    case "settings": {
      const titlePreference = eh.extractGalleryTitlePreference();
      if (titlePreference) {
        state.gallery.titlePreference.set(titlePreference);
      }
      break;
    }
    case "other":
      break;
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

  createRoot(() => {
    installSettingsMenu();
    injectPage(page);
  });
  dispatchReady();
}

void startApp().catch((error) => {
  console.error("[ehpeek] App startup failed", error);
});
