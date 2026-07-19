import { createSignal, type JSX } from "solid-js";
import { EnhanceSearchGrids } from "../components/Enhance/EnhanceSearchGrids";
import { EnhanceThumbsGrids } from "../components/Enhance/EnhanceThumbsGrids";
import {
  loadReadHistory,
  ReadButton,
  type ReadButtonInfo,
  ReadHistorySession,
} from "../components/Enhance/ReadHistory";
import { SearchHistory } from "../components/Enhance/SearchHistory";
import { applyMyTagsEnhance } from "../components/Enhance/MyTags";
import {
  GalleryPageDescription,
  SCROLL_PAGE_BAR_BOTTOM_CLASS,
  SCROLL_PAGE_BAR_TOP_CLASS,
  ScrollPageBar,
} from "../components/Enhance/ScrollPageBar";
import { SettingsMenu } from "../components/SettingsMenu";
import { BackToTop } from "../components/Widgets/BackToTop";
import {
  prepareTouchGalleryPage,
  prepareTouchResultsPage,
  prepareSearchPanel,
  resetTouchUiPage,
  GalleryInfoPanel,
  TOUCH_GALLERY_INFO_TRANSFORMS,
  TOUCH_TOP_BAR_TRANSFORM,
  FavoritesCategorySelect,
  TouchSearchAction,
  TouchSearchAdvancedToggle,
  TouchSearchCategoryToggle,
  TouchSearchFileToggle,
  TouchSearchPanel,
  TouchTopBar,
} from "../components/TouchUI";
import * as eh from "../eh";
import * as ehtrans from "../eh/transform";
import * as EhSyringe from "../integrations/EhSyringe";
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
import { renderInto, unmountFrom } from "./render";
import { SinglePage, supportsSinglePageRoute } from "./SinglePage";

const THEME_STYLE_ID = "ehpeek-theme-style";
const UNO_STYLE_ID = "ehpeek-uno-style";

if (unoCss && !document.getElementById(UNO_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = UNO_STYLE_ID;
  style.textContent = unoCss;
  document.head.append(style);
}

if (themeCss && !document.getElementById(THEME_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = THEME_STYLE_ID;
  style.textContent = themeCss;
  document.head.append(style);
}

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

function readButtonState(): {
  info: ReadButtonInfo;
  onClick: () => void;
} | null {
  if (!settingsState.readHistoryEnabled || pageType.type !== "gallery") {
    return null;
  }

  const record = loadReadHistory(pageType.galleryId, pageType.token);
  const pageNum = record?.pageNum && record.pageNum > 0 ? record.pageNum : 1;
  const totalPages = record?.totalPages ?? eh.readShowingRange()?.total;
  const detail =
    record && totalPages
      ? `${pageNum}/${totalPages}`
      : totalPages
        ? `${totalPages} ${texts.reader.pages}`
        : String(pageNum);

  return {
    info: {
      label: record ? texts.reader.continueReading : texts.reader.startReading,
      detail,
    },
    onClick: () => {
      const page = eh.collectGalleryPages()[0];

      if (!page) {
        return;
      }

      if (state.reader.enabled.value) {
        openReaderFromUserAction(page.url, readerCallbacks, pageNum);
      } else {
        void openOriginalReader(pageNum).catch(reportReaderOpenError);
      }
    },
  };
}

let pageType = eh.extractPageType();
let settingsState = settingsMenuState();
eh.applySiteTheme();
if (settingsState.touchUiEnabled) {
  document.documentElement.dataset.ehpeekTouchUi = "true";
}
const [settingsMenuOpen, setSettingsMenuOpenSignal] = createSignal(false);
const readerCallbacks: ReaderCallbacks = {
  enhanceThumbsGridsEnabled: () => settingsState.enhanceThumbsGridsEnabled,
  readHistoryEnabled: () => settingsState.readHistoryEnabled,
  onPageBarChange: replaceGalleryPageBar,
  onReaderClosed: installReadButton,
};
const settingsMenuHost = document.createElement("div");
settingsMenuHost.className = "fixed inset-0 z-[1150] pointer-events-none";
settingsMenuHost.dataset.ehpeekPersistent = "true";
document.body.append(settingsMenuHost);
let galleryReadButtonMount: HTMLElement | null | undefined;
let touchGalleryReadButtonMount: HTMLElement | undefined;
let originalReadHistorySession: ReadHistorySession | undefined;
let touchFavoritesCategorySelect: eh.TouchFavoritesCategorySelectInfo | null =
  null;
let stopMyTagsEnhance: (() => void) | undefined;
let pageGeneration = 0;
let pageRoots = new Set<HTMLElement>();
let pageOwnedHosts = new Set<HTMLElement>();
let pageManagedHosts = new Set<ehtrans.ManagedDomNode>();

function installEhPeekSearchGrid(): void {
  if (!state.search.grid.value) {
    return;
  }

  eh.prepareEhPeekSearchGrid();
}

function installSearchGridModeSelect(): void {
  eh.prepareSearchGridModeSelect(
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

function renderPageInto(
  host: HTMLElement,
  view: () => JSX.Element,
  owned = false,
): void {
  pageRoots.add(host);

  if (owned) {
    pageOwnedHosts.add(host);
  }

  renderInto(host, view);
}

function deactivatePage(): void {
  pageGeneration += 1;
  originalReadHistorySession?.dispose();
  originalReadHistorySession = undefined;
  stopMyTagsEnhance?.();
  stopMyTagsEnhance = undefined;

  if (settingsState.touchUiEnabled) {
    resetTouchUiPage();
  }

  for (const root of pageRoots) {
    unmountFrom(root);
  }

  for (const host of pageOwnedHosts) {
    host.remove();
  }
  for (const host of pageManagedHosts) {
    host.remove();
  }

  pageRoots = new Set();
  pageOwnedHosts = new Set();
  pageManagedHosts = new Set();
  galleryReadButtonMount = undefined;
  touchGalleryReadButtonMount = undefined;
  touchFavoritesCategorySelect = null;
}

function installSettingsMenu(): void {
  renderInto(settingsMenuHost, () => (
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
}

function replaceGalleryPageBar(
  currentIndex: number,
  maxIndex: number | null,
): void {
  const mounts = eh.replaceGalleryPageBarMounts(
    SCROLL_PAGE_BAR_TOP_CLASS,
    SCROLL_PAGE_BAR_BOTTOM_CLASS,
  );

  for (const mount of mounts) {
    if (mount.descriptionElement && mount.descriptionText) {
      renderPageInto(
        mount.descriptionElement,
        () => <GalleryPageDescription text={mount.descriptionText!} />,
        true,
      );
    }

    renderPageInto(
      mount.element,
      () => (
        <ScrollPageBar
          currentIndex={currentIndex}
          element={mount.element}
          maxIndex={maxIndex}
          top={mount.top}
          urlForIndex={eh.previewUrlForIndex}
        />
      ),
      true,
    );
  }
}

function installReadButton(): void {
  const readButton = readButtonState();

  if (settingsState.touchUiEnabled && pageType.type === "gallery") {
    if (touchGalleryReadButtonMount) {
      renderPageInto(touchGalleryReadButtonMount, () =>
        readButton ? (
          <ReadButton
            info={readButton.info}
            onClick={readButton.onClick}
            variant="touchGallery"
          />
        ) : (
          <></>
        ),
      );
    }
    return;
  }

  if (!settingsState.touchUiEnabled && pageType.type === "gallery") {
    galleryReadButtonMount ??= eh.galleryContinueReadingButtonMountTarget();
    pageOwnedHosts.add(galleryReadButtonMount);
  }

  if (galleryReadButtonMount) {
    renderPageInto(galleryReadButtonMount, () =>
      readButton ? (
        <ReadButton
          info={readButton.info}
          onClick={readButton.onClick}
          variant="gallery"
        />
      ) : (
        <></>
      ),
    );
  }
}

if (typeof GM_registerMenuCommand === "function") {
  GM_registerMenuCommand(texts.settings.openSettings, () => {
    setSettingsMenuOpenSignal(true);
  });
}

installSettingsMenu();

function installDesktopSettingsLink(): void {
  const target = eh.settingsMenuMountTarget();

  if (!target) {
    return;
  }

  renderPageInto(
    target,
    () => (
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
    ),
    true,
  );
}

function installTouchTopBar(): void {
  const transformed = ehtrans.topBar(TOUCH_TOP_BAR_TRANSFORM);

  if (!transformed) {
    return;
  }

  transformed.elems.mount.mount(() => (
    <TouchTopBar
      info={{
        ...transformed.data,
        navItems: transformed.elems.navItems,
      }}
      onSettingsMenuOpen={() => {
        setSettingsMenuOpenSignal(true);
      }}
    />
  ));
  pageManagedHosts.add(transformed.elems.mount);
}

function installBackToTop(): void {
  const host = document.createElement("div");
  host.className = "ehpeek-back-to-top-host";
  document.body.append(host);
  renderPageInto(host, () => <BackToTop />, true);
}

function installGalleryInfoPanel(): void {
  const transformed = ehtrans.galleryInfo();

  if (!transformed) {
    return;
  }

  prepareTouchGalleryPage();
  transformed.transforms.cover(TOUCH_GALLERY_INFO_TRANSFORMS.cover);
  transformed.transforms.actions(TOUCH_GALLERY_INFO_TRANSFORMS.actions);
  transformed.transforms.newTag(TOUCH_GALLERY_INFO_TRANSFORMS.newTag);
  transformed.transforms.host(TOUCH_GALLERY_INFO_TRANSFORMS.host);

  transformed.elems.mount.mount(() => (
    <GalleryInfoPanel
      source={transformed}
      onPrimaryActionMount={(mount) => {
        if (
          touchGalleryReadButtonMount &&
          touchGalleryReadButtonMount !== mount
        ) {
          unmountFrom(touchGalleryReadButtonMount);
        }
        touchGalleryReadButtonMount = mount;
        installReadButton();
      }}
      onPrimaryActionUnmount={() => {
        if (touchGalleryReadButtonMount) {
          unmountFrom(touchGalleryReadButtonMount);
          touchGalleryReadButtonMount = undefined;
        }
      }}
    />
  ));
  pageManagedHosts.add(transformed.elems.mount);
}

function installTouchSearchPanel(): void {
  const touchSearchInfo = eh.readTouchSearchPanelInfo();

  if (!touchSearchInfo) {
    return;
  }

  const mount = ehtrans.createAnchor("search-panel");

  if (!mount) {
    return;
  }
  const inserted = mount.place(eh.insertTouchSearchPanel);
  if (!inserted) {
    return;
  }

  prepareSearchPanel(touchSearchInfo);
  mount.mount(() => (
    <TouchSearchPanel
      source={touchSearchInfo}
      after={
        touchFavoritesCategorySelect ? (
          <FavoritesCategorySelect info={touchFavoritesCategorySelect} />
        ) : undefined
      }
    />
  ));
  pageManagedHosts.add(mount);
  if (touchSearchInfo.categories && touchSearchInfo.categoryToggleMount) {
    const categories = touchSearchInfo.categories;
    renderPageInto(
      touchSearchInfo.categoryToggleMount,
      () => <TouchSearchCategoryToggle categories={categories} />,
      true,
    );
  }
  if (touchSearchInfo.advancedPanel && touchSearchInfo.advancedToggleMount) {
    const advancedPanel = touchSearchInfo.advancedPanel;
    renderPageInto(
      touchSearchInfo.advancedToggleMount,
      () => <TouchSearchAdvancedToggle panel={advancedPanel} />,
      true,
    );
  }
  if (touchSearchInfo.fileSearch && touchSearchInfo.fileSearchToggleMount) {
    const fileSearch = touchSearchInfo.fileSearch;
    renderPageInto(
      touchSearchInfo.fileSearchToggleMount,
      () => <TouchSearchFileToggle panel={fileSearch} />,
      true,
    );
  }
  renderPageInto(
    touchSearchInfo.searchActionMount,
    () => (
      <TouchSearchAction
        action="search"
        label={touchSearchInfo.searchLabel}
        original={touchSearchInfo.searchSubmit}
        source={touchSearchInfo}
      />
    ),
    true,
  );
  if (
    touchSearchInfo.clearActionMount &&
    touchSearchInfo.clearButton &&
    touchSearchInfo.clearLabel
  ) {
    const clearButton = touchSearchInfo.clearButton;
    const clearLabel = touchSearchInfo.clearLabel;
    renderPageInto(
      touchSearchInfo.clearActionMount,
      () => (
        <TouchSearchAction
          action="clear"
          label={clearLabel}
          original={clearButton}
          source={touchSearchInfo}
        />
      ),
      true,
    );
  }
}

async function activatePage(nextPage: eh.PageType): Promise<void> {
  pageType = nextPage;
  const resultsPage =
    pageType.type === "search" || pageType.type === "favorites";
  const generation = ++pageGeneration;

  if (settingsState.myTagsEnabled) {
    stopMyTagsEnhance = await applyMyTagsEnhance(pageType.type === "gallery");
  }

  if (generation !== pageGeneration) {
    return;
  }

  if (resultsPage) {
    const searchSource = eh.readSearchHistorySource();

    if (searchSource) {
      EhSyringe.reuseTagTipInput(searchSource.searchInput);
    }
  }

  trackOriginalReadHistory();

  if (resultsPage) {
    installSearchGridModeSelect();
  }

  if (!settingsState.touchUiEnabled) {
    installDesktopSettingsLink();
  } else {
    touchFavoritesCategorySelect = prepareTouchResultsPage(pageType);
  }

  installReadButton();

  if (pageType.type === "gallery") {
    const host = document.createElement("div");
    document.body.append(host);
    renderPageInto(
      host,
      () => (
        <EnhanceThumbsGrids
          enabled={settingsState.enhanceThumbsGridsEnabled}
          onError={reportReaderOpenError}
          replaceGalleryPageBar={replaceGalleryPageBar}
        />
      ),
      true,
    );
  }

  if (resultsPage && settingsState.enhanceSearchGridsEnabled) {
    const resultList = eh.searchResultList();

    if (resultList && eh.searchPageNavigation()) {
      const host = document.createElement("div");
      document.body.append(host);
      renderPageInto(
        host,
        () => (
          <EnhanceSearchGrids
            resultList={resultList}
            onPageChange={() => {
              if (settingsState.touchUiEnabled) {
                prepareTouchResultsPage(eh.extractPageType());
              }
              installEhPeekSearchGrid();
            }}
          />
        ),
        true,
      );
    }
  }

  if (resultsPage && settingsState.searchHistoryEnabled) {
    const source = eh.readSearchHistorySource();

    if (source) {
      const host = document.createElement("div");
      document.body.append(host);
      renderPageInto(host, () => <SearchHistory source={source} />, true);
    }
  }

  if (resultsPage && !settingsState.touchUiEnabled) {
    installEhPeekSearchGrid();
  }

  if (
    pageType.type === "gallery" &&
    state.reader.enabled.value &&
    pageType.peekPage !== null
  ) {
    void openReaderFromHash(readerCallbacks);
  }

  if (!settingsState.touchUiEnabled) {
    return;
  }

  await EhSyringe.waitForInitialUi();

  if (generation !== pageGeneration) {
    return;
  }

  installTouchTopBar();
  if (pageType.type === "gallery" || resultsPage) {
    installBackToTop();
  }

  if (pageType.type === "gallery") {
    installGalleryInfoPanel();
  } else if (resultsPage) {
    if (pageType.type === "search") {
      await EhSyringe.waitForSearchUi();
    }

    if (generation !== pageGeneration) {
      return;
    }

    installSearchGridModeSelect();
    installEhPeekSearchGrid();
    installTouchSearchPanel();
  }
}

function trackOriginalReadHistory(): void {
  originalReadHistorySession?.dispose();
  originalReadHistorySession = undefined;

  if (!settingsState.readHistoryEnabled || pageType.type !== "image") {
    return;
  }

  const gallery = eh.imageGalleryPage();

  if (!gallery || gallery.galleryId !== pageType.galleryId) {
    return;
  }

  const previous = loadReadHistory(gallery.galleryId, gallery.token);
  originalReadHistorySession = new ReadHistorySession({
    galleryId: gallery.galleryId,
    token: gallery.token,
    galleryUrl: gallery.url,
    totalPages: previous?.totalPages,
  });
  originalReadHistorySession.update(pageType.pageNum, previous?.totalPages);
}

document.addEventListener(
  "click",
  (event) => onReaderDocumentClick(event, readerCallbacks),
  true,
);
document.addEventListener(
  "click",
  (event) => {
    if (!settingsState.openGalleryInNewTab) {
      return;
    }

    const link = eh.findClickedGalleryLink(event.target);
    if (link) {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
    }
  },
  true,
);

const singlePageInitialRoute =
  settingsState.touchUiEnabled &&
  settingsState.singlePageAppEnabled &&
  supportsSinglePageRoute(window.location.href);

if (singlePageInitialRoute) {
  startSinglePageApp();
} else {
  void activatePage(pageType);
}

function startSinglePageApp(): void {
  const host = document.createElement("div");
  host.className = "isolate";
  host.dataset.ehpeekPersistent = "true";
  document.body.append(host);
  renderInto(host, () => (
    <SinglePage
      onPageActivate={activatePage}
      onPageDeactivate={deactivatePage}
    />
  ));
}
