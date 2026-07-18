import { createSignal, type JSX } from "solid-js";
import { EnhanceSearchGrids } from "../components/Enhance/EnhanceSearchGrids";
import { EnhanceThumbsGrids } from "../components/Enhance/EnhanceThumbsGrids";
import { loadReadHistory, ReadButton, type ReadButtonInfo, ReadHistorySession } from "../components/Enhance/ReadHistory";
import { SearchHistory } from "../components/Enhance/SearchHistory";
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
  TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS,
  TOUCH_TOP_BAR_MENU_ITEM_CLASS,
  GalleryInfoPanel,
  FavoritesCategorySelect,
  TouchSearchAction,
  TouchSearchAdvancedToggle,
  TouchSearchCategoryToggle,
  TouchSearchFileToggle,
  TouchSearchPanel,
  TouchTopBar,
} from "../components/TouchUI";
import * as eh from "../eh";
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
import { SinglePage } from "./SinglePage";

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
    singlePageAppEnabled: state.app.singlePage.value,
    readerEnabled: state.reader.enabled.value,
    readerFullscreenEnabled: state.reader.fullscreen.value,
    enhanceThumbsGridsEnabled: state.gallery.enhanceThumbs.value,
    enhanceSearchGridsEnabled: state.search.enhance.value,
    readHistoryEnabled: state.gallery.readHistory.value,
    searchHistoryEnabled: state.search.history.value,
    touchUiEnabled: state.touch.enabled.value,
  };
}

function defaultSettingsMenuState(): ReturnType<typeof settingsMenuState> {
  return {
    singlePageAppEnabled: state.app.singlePage.defaultValue,
    readerEnabled: state.reader.enabled.defaultValue,
    readerFullscreenEnabled: state.reader.fullscreen.defaultValue,
    enhanceThumbsGridsEnabled: state.gallery.enhanceThumbs.defaultValue,
    enhanceSearchGridsEnabled: state.search.enhance.defaultValue,
    readHistoryEnabled: state.gallery.readHistory.defaultValue,
    searchHistoryEnabled: state.search.history.defaultValue,
    touchUiEnabled: state.touch.enabled.defaultValue,
  };
}

function applySettingsMenuState(next: ReturnType<typeof settingsMenuState>): void {
  state.app.singlePage.set(next.singlePageAppEnabled);
  state.reader.enabled.set(next.readerEnabled);
  state.reader.fullscreen.set(next.readerFullscreenEnabled);
  state.gallery.enhanceThumbs.set(next.enhanceThumbsGridsEnabled);
  state.search.enhance.set(next.enhanceSearchGridsEnabled);
  state.gallery.readHistory.set(next.readHistoryEnabled);
  state.search.history.set(next.searchHistoryEnabled);
  state.touch.enabled.set(next.touchUiEnabled);
  window.location.reload();
}

function readButtonState(): { info: ReadButtonInfo; onClick: () => void } | null {
  if (!settingsState.readHistoryEnabled || pageType.type !== "gallery") {
    return null;
  }

  const record = loadReadHistory(pageType.galleryId, pageType.token);
  const pageNum = record?.pageNum && record.pageNum > 0 ? record.pageNum : 1;
  const totalPages = record?.totalPages ?? eh.readShowingRange()?.total;
  const detail = record && totalPages ? `${pageNum}/${totalPages}` : totalPages ? `${totalPages} ${texts.reader.pages}` : String(pageNum);

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
let touchFavoritesCategorySelect: eh.TouchFavoritesCategorySelectInfo | null = null;
let pageGeneration = 0;
let pageRoots = new Set<HTMLElement>();
let pageOwnedHosts = new Set<HTMLElement>();

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
      window.location.assign(new URL("/?inline_set=dm_e", window.location.href).href);
    },
    () => {
      state.search.grid.set(false);
    },
  );
}

function renderPageInto(host: HTMLElement, view: () => JSX.Element, owned = false): void {
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

  if (settingsState.touchUiEnabled) {
    resetTouchUiPage();
  }

  for (const root of pageRoots) {
    unmountFrom(root);
  }

  for (const host of pageOwnedHosts) {
    host.remove();
  }

  pageRoots = new Set();
  pageOwnedHosts = new Set();
  galleryReadButtonMount = undefined;
  touchGalleryReadButtonMount = undefined;
  touchFavoritesCategorySelect = null;
}

function installSettingsMenu(): void {
  renderInto(
    settingsMenuHost,
    () => (
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
    ),
  );
}

function replaceGalleryPageBar(currentIndex: number, maxIndex: number | null): void {
  const mounts = eh.replaceGalleryPageBarMounts(SCROLL_PAGE_BAR_TOP_CLASS, SCROLL_PAGE_BAR_BOTTOM_CLASS);

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
      renderPageInto(
        touchGalleryReadButtonMount,
        () => (
          readButton ? (
            <ReadButton info={readButton.info} onClick={readButton.onClick} variant="touchGallery" />
          ) : (
            <></>
          )
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
    renderPageInto(
      galleryReadButtonMount,
      () => (
        readButton ? (
          <ReadButton info={readButton.info} onClick={readButton.onClick} variant="gallery" />
        ) : (
          <></>
        )
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

  if (target) {
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
}

function installTouchTopBar(): void {
  if (document.querySelector(".ehpeek-touch-top-bar")) {
    return;
  }

  const info = eh.readTouchTopBarInfo(TOUCH_TOP_BAR_MENU_ITEM_CLASS);

  if (info.available) {
    const mount = document.createElement("div");
    if (!eh.insertTouchTopBar(mount)) {
      document.body.prepend(mount);
    }

    renderPageInto(
      mount,
      () => (
        <TouchTopBar
          info={info}
          onSettingsMenuOpen={() => {
            setSettingsMenuOpenSignal(true);
          }}
        />
      ),
      true,
    );
  }
}

function installBackToTop(): void {
  const host = document.createElement("div");
  host.className = "ehpeek-back-to-top-host";
  document.body.append(host);
  renderPageInto(host, () => <BackToTop />, true);
}

function installGalleryInfoPanel(): void {
  if (document.querySelector(".ehpeek-touch-gallery")) {
    return;
  }

  const touchGalleryInfo = eh.readGalleryInfo(TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS);

  if (touchGalleryInfo.available) {
    prepareTouchGalleryPage();
    const mount = document.createElement("div");

    if (!eh.insertTouchGalleryPanel(mount)) {
      document.body.prepend(mount);
    }

    renderPageInto(
      mount,
      () => (
        <GalleryInfoPanel
          source={touchGalleryInfo}
          onPrimaryActionMount={(mount) => {
            if (touchGalleryReadButtonMount && touchGalleryReadButtonMount !== mount) {
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
      ),
      true,
    );
  }
}

function installTouchSearchPanel(): void {
  if (document.querySelector(".ehpeek-touch-search-panel")) {
    return;
  }

  const touchSearchInfo = eh.readTouchSearchPanelInfo();

  if (!touchSearchInfo) {
    return;
  }

  const mount = document.createElement("div");

  if (!eh.insertTouchSearchPanel(mount)) {
    return;
  }

  prepareSearchPanel(touchSearchInfo);
  renderPageInto(
    mount,
    () => (
      <TouchSearchPanel
        source={touchSearchInfo}
        after={
          touchFavoritesCategorySelect ? (
            <FavoritesCategorySelect info={touchFavoritesCategorySelect} />
          ) : undefined
        }
      />
    ),
    true,
  );
  if (touchSearchInfo.categories && touchSearchInfo.categoryToggleMount) {
    const categories = touchSearchInfo.categories;
    renderPageInto(
      touchSearchInfo.categoryToggleMount,
      () => <TouchSearchCategoryToggle categories={categories} />,
      true,
    );
  }
  if (touchSearchInfo.advancedToggle && touchSearchInfo.advancedToggleMount) {
    const advancedToggle = touchSearchInfo.advancedToggle;
    renderPageInto(
      touchSearchInfo.advancedToggleMount,
      () => <TouchSearchAdvancedToggle toggle={advancedToggle} />,
      true,
    );
  }
  if (touchSearchInfo.fileSearchToggle && touchSearchInfo.fileSearchToggleMount) {
    const fileSearchToggle = touchSearchInfo.fileSearchToggle;
    renderPageInto(
      touchSearchInfo.fileSearchToggleMount,
      () => <TouchSearchFileToggle toggle={fileSearchToggle} />,
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
  if (touchSearchInfo.clearActionMount && touchSearchInfo.clearButton && touchSearchInfo.clearLabel) {
    const clearButton = touchSearchInfo.clearButton;
    const clearLabel = touchSearchInfo.clearLabel;
    renderPageInto(
      touchSearchInfo.clearActionMount,
      () => <TouchSearchAction action="clear" label={clearLabel} original={clearButton} source={touchSearchInfo} />,
      true,
    );
  }
}


async function activatePage(nextPage: eh.PageType): Promise<void> {
  pageType = nextPage;
  const resultsPage = pageType.type === "search" || pageType.type === "favorites";
  const generation = ++pageGeneration;
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

  if (pageType.type === "gallery" && state.reader.enabled.value && pageType.peekPage !== null) {
    void openReaderFromHash(readerCallbacks);
  }

  if (!settingsState.touchUiEnabled) {
    return;
  }

  if (!settingsState.singlePageAppEnabled) {
    await EhSyringe.waitForInitialUi();
  }

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
    if (!settingsState.singlePageAppEnabled && pageType.type === "search") {
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

document.addEventListener("click", (event) => onReaderDocumentClick(event, readerCallbacks), true);

const singlePageInitialRoute = settingsState.singlePageAppEnabled ? eh.singlePageRoute(window.location.href) : null;

if (singlePageInitialRoute) {
  void startSinglePageApp(singlePageInitialRoute);
} else {
  void activatePage(pageType);
}

async function startSinglePageApp(initialPage: eh.PageType): Promise<void> {
  await EhSyringe.waitForInitialUi();
  const initialNodes = eh.singlePageContentNodes();
  const host = document.createElement("div");
  host.className = "isolate";
  host.dataset.ehpeekPersistent = "true";
  document.body.append(host);
  renderInto(
    host,
    () => (
      <SinglePage
        initialNodes={initialNodes}
        initialPage={initialPage}
        onPageActivate={activatePage}
        onPageDeactivate={deactivatePage}
      />
    ),
  );
}
