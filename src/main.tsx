import {
  enterReaderFullscreen,
  FullscreenReader,
  removePreviousReaderRoot,
  type FullscreenReaderHandle,
  type FullscreenReaderOptions,
} from "./components/Reader";
import { Fragment, h, render } from "preact";
import { SettingsMenu } from "./components/SettingsMenu";
import { TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS, TouchGalleryPanel } from "./components/Enhance/TouchGalleryPanel";
import {
  TOUCH_SEARCH_OPTION_CLASS,
  TouchSearchAction,
  TouchSearchCategoryToggle,
  TouchSearchHistory,
  TouchSearchPanel,
} from "./components/Enhance/TouchSearchPanel";
import { TOUCH_TOP_BAR_MENU_ITEM_CLASS, TouchTopBar } from "./components/Enhance/TouchTopBar";
import {
  EnhanceThumbsGrids,
  enhanceThumbsGridsEnabled,
  GalleryPageProvider,
  navigateGalleryPreview,
} from "./components/Enhance/EnhanceThumbsGrids";
import { EnhanceSearchGrids } from "./components/Enhance/EnhanceSearchGrids";
import {
  SCROLL_PAGE_BAR_BOTTOM_CLASS,
  SCROLL_PAGE_BAR_TOP_CLASS,
  ScrollPageBar,
} from "./components/Enhance/ScrollPageBar";
import {
  ReadButton,
  type ReadButtonInfo,
} from "./components/Enhance/Misc";
import * as eh from "./eh";
import texts from "./texts.json";
import { state } from "./state";
import { loadReaderHistory, ReaderHistorySession } from "./history";
import { normalizeUrl } from "./utils";
import * as EhSyringe from "./integrations/EhSyringe";
import unoCss from "ehpeek:uno.css";
import themeCss from "./theme.css";

const READER_WINDOW_SIZE = 10;
const THEME_STYLE_ID = "ehpeek-theme-style";
const UNO_STYLE_ID = "ehpeek-uno-style";

type ReaderFullscreenLaunch = {
  host: HTMLDivElement;
  result: Promise<boolean>;
};

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
    readerEnabled: state.reader.enabled.value,
    readerFullscreenEnabled: state.reader.fullscreen.value,
    enhanceThumbsGridsEnabled: enhanceThumbsGridsEnabled(),
    enhanceSearchGridsEnabled: state.search.enhance.value,
    touchUiEnabled: state.touch.enabled.value,
  };
}

function applySettingsMenuState(next: ReturnType<typeof settingsMenuState>): void {
  state.reader.enabled.set(next.readerEnabled);
  state.reader.fullscreen.set(next.readerFullscreenEnabled);
  state.gallery.enhanceThumbs.set(next.enhanceThumbsGridsEnabled);
  state.search.enhance.set(next.enhanceSearchGridsEnabled);
  state.touch.enabled.set(next.touchUiEnabled);
  window.location.reload();
}

function continueReadingState(): { info: ReadButtonInfo; onClick: () => void } | null {
  if (pageType.type !== "gallery" || !state.reader.enabled.value) {
    return null;
  }

  const record = loadReaderHistory(pageType.galleryId, pageType.token);
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

      openReaderFromUserAction(page.url, pageNum);
    },
  };
}

const pageType = eh.extractPageType();
const initialSettingsState = settingsMenuState();
eh.applySiteTheme();
if (initialSettingsState.touchUiEnabled) {
  document.documentElement.dataset.ehpeekTouchUi = "true";
}
let settingsMenuOpen = false;
let settingsState = initialSettingsState;
const settingsMenuHost = document.createElement("div");
document.body.append(settingsMenuHost);
let galleryReadButtonMount: HTMLElement | null | undefined;
let touchGalleryReadButtonMount: HTMLElement | null = null;
let activeReader: FullscreenReaderHandle | null = null;

function setSettingsMenuOpen(open: boolean): void {
  settingsMenuOpen = open;
  installSettingsMenu();
}

function installSettingsMenu(): void {
  render(
    <SettingsMenu
      open={settingsMenuOpen}
      initState={settingsState}
      onApply={(next) => {
        settingsState = next;
        applySettingsMenuState(next);
      }}
      onOpenChange={setSettingsMenuOpen}
    />,
    settingsMenuHost,
  );
}

function createReaderHost(): HTMLDivElement {
  const host = document.createElement("div");
  host.dataset.ehpeekReaderContainer = "true";
  return host;
}

function openFullscreenReader(
  options: Omit<FullscreenReaderOptions, "fullscreenTarget">,
  existingHost?: HTMLDivElement,
): void {
  activeReader?.close();
  removePreviousReaderRoot();

  const host = existingHost ?? createReaderHost();
  let handle: FullscreenReaderHandle | null = null;
  const close = () => {
    if (handle) {
      handle.close();
      return;
    }

    onClosed();
  };
  const onClosed = () => {
    render(<Fragment />, host);
    host.remove();

    if (activeReader?.close === close) {
      activeReader = null;
    }
  };

  if (!host.isConnected) {
    document.body.append(host);
  }
  activeReader = { close };
  render(
    <FullscreenReader
      options={{ ...options, fullscreenTarget: host }}
      handleRef={(nextHandle) => {
        handle = nextHandle;
      }}
      onClosed={onClosed}
    />,
    host,
  );
}

function replaceGalleryPageBar(currentIndex: number, maxIndex: number | null): void {
  const mounts = eh.replaceGalleryPageBarMounts(SCROLL_PAGE_BAR_TOP_CLASS, SCROLL_PAGE_BAR_BOTTOM_CLASS);

  for (const mount of mounts) {
    render(
      <ScrollPageBar
        currentIndex={currentIndex}
        element={mount.element}
        maxIndex={maxIndex}
        top={mount.top}
        urlForIndex={eh.previewUrlForIndex}
      />,
      mount.element,
    );
  }
}

function installContinueReadingButton(): void {
  const continueReading = continueReadingState();

  if (settingsState.touchUiEnabled && pageType.type === "gallery") {
    if (touchGalleryReadButtonMount) {
      render(
        continueReading ? (
          <ReadButton info={continueReading.info} onClick={continueReading.onClick} variant="touchGallery" />
        ) : (
          <Fragment />
        ),
        touchGalleryReadButtonMount,
      );
    }
    return;
  }

  if (!settingsState.touchUiEnabled && pageType.type === "gallery") {
    galleryReadButtonMount ??= eh.galleryContinueReadingButtonMountTarget();
  }

  if (galleryReadButtonMount) {
    render(
      continueReading ? (
        <ReadButton info={continueReading.info} onClick={continueReading.onClick} variant="gallery" />
      ) : (
        <Fragment />
      ),
      galleryReadButtonMount,
    );
  }
}

if (typeof GM_registerMenuCommand === "function") {
  GM_registerMenuCommand(texts.settings.openSettings, () => {
    setSettingsMenuOpen(true);
  });
}

installSettingsMenu();

if (!settingsState.touchUiEnabled) {
  const target = eh.settingsMenuMountTarget();

  if (target) {
    const mount = document.createElement("span");
    target.append(mount);

    render(
      <a
        href="#"
            className="textsize-md font-inherit"
        onClick={(event: MouseEvent) => {
          event.preventDefault();
          event.stopPropagation();
          setSettingsMenuOpen(true);
        }}
      >
        {texts.settings.menuLabel}
      </a>,
      mount,
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

    render(
      <TouchTopBar
        info={info}
        onSettingsMenuOpen={() => {
          setSettingsMenuOpen(true);
        }}
      />,
      mount,
    );
  }
}

async function installTouchTopBarWhenReady(): Promise<void> {
  await EhSyringe.waitForInitialUi();
  installTouchTopBar();
}

if (settingsState.touchUiEnabled) {
  void installTouchTopBarWhenReady();
}

if (settingsState.touchUiEnabled && pageType.type === "favorites") {
  eh.prepareTouchFavoritesPage();
}

function installTouchGalleryPanel(): void {
  if (document.querySelector(".ehpeek-touch-gallery")) {
    return;
  }

  const touchGalleryInfo = eh.readGalleryInfo(TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS);

  if (touchGalleryInfo.available) {
    eh.applyTouchGalleryPanelPageStyle();
    eh.prepareTouchGalleryComments();
    const mount = document.createElement("div");

    if (!eh.insertTouchGalleryPanel(mount)) {
      document.body.prepend(mount);
    }

    render(
      <TouchGalleryPanel
        source={touchGalleryInfo}
        onPrimaryActionMount={(mount) => {
          touchGalleryReadButtonMount = mount;
          installContinueReadingButton();
        }}
      />,
      mount,
    );
  }
}

async function installTouchGalleryPanelWhenReady(): Promise<void> {
  await EhSyringe.waitForInitialUi();
  installTouchGalleryPanel();
}

if (settingsState.touchUiEnabled && pageType.type === "gallery") {
  void installTouchGalleryPanelWhenReady();
}

function installTouchSearchPanel(): boolean {
  if (document.querySelector(".ehpeek-touch-search-panel")) {
    return true;
  }

  const touchSearchInfo = eh.readTouchSearchPanelInfo();

  if (!touchSearchInfo) {
    return false;
  }

  const mount = document.createElement("div");

  if (!eh.insertTouchSearchPanel(mount)) {
    return false;
  }

  eh.prepareTouchSearchPanel(touchSearchInfo, TOUCH_SEARCH_OPTION_CLASS);
  render(<TouchSearchPanel source={touchSearchInfo} />, mount);
  render(<TouchSearchCategoryToggle source={touchSearchInfo} />, touchSearchInfo.categoryToggleMount);
  render(<TouchSearchAction action="search" source={touchSearchInfo} />, touchSearchInfo.searchActionMount);
  render(<TouchSearchAction action="clear" source={touchSearchInfo} />, touchSearchInfo.clearActionMount);
  render(<TouchSearchHistory source={touchSearchInfo} />, touchSearchInfo.historyMount);
  return true;
}

async function installTouchSearchPanelWhenReady(): Promise<void> {
  await EhSyringe.waitForSearchUi();
  installTouchSearchPanel();
}

if (settingsState.touchUiEnabled && pageType.type === "search") {
  void installTouchSearchPanelWhenReady();
}

installContinueReadingButton();

if (pageType.type === "gallery") {
  const host = document.createElement("div");
  document.body.append(host);
  render(
    <EnhanceThumbsGrids
      enabled={settingsState.enhanceThumbsGridsEnabled}
      onError={reportOpenError}
      replaceGalleryPageBar={replaceGalleryPageBar}
    />,
    host,
  );
}

if ((pageType.type === "search" || pageType.type === "favorites") && settingsState.enhanceSearchGridsEnabled) {
  const resultList = eh.searchResultList();

  if (resultList && eh.searchPageNavigation()) {
    const host = document.createElement("div");
    document.body.append(host);
    render(<EnhanceSearchGrids resultList={resultList} />, host);
  }
}

async function openReader(
  startPageUrl: string,
  preferredPageNum?: number,
  fullscreenLaunch?: ReaderFullscreenLaunch,
): Promise<void> {
  if (!state.reader.enabled.value) {
    return;
  }

  const pageType = eh.extractPageType();

  if (pageType.type !== "gallery") {
    return;
  }

  const landingIndex = eh.previewPageIndex();
  const landingPages = eh.collectGalleryPages();
  const pageSize = eh.computePreviewPageSize();
  const maxPreviewIndex = eh.maxPreviewPageIndex();
  const totalPages = eh.readShowingRange()?.total;
  const provider = new GalleryPageProvider(
    landingIndex,
    landingPages,
    pageSize,
    maxPreviewIndex,
    READER_WINDOW_SIZE,
    eh.pullPreviewPage,
  );
  const startUrl = normalizeUrl(startPageUrl);
  const hashPage = preferredPageNum ?? eh.peekPageFromHash();
  const startPageNum = hashPage ?? eh.galleryPageNumber(startUrl);

  if (!startPageNum) {
    throw new Error(texts.errors.imageNotFound);
  }

  const landingPage = landingPages.find((page) => page.pageNum === startPageNum);
  const seedPage = landingPage ?? (await provider.loadDisplayPages([startPageNum]))[0];

  if (!seedPage || seedPage.pageNum !== startPageNum) {
    throw new Error(texts.errors.imageNotFound);
  }

  const pages = [seedPage];
  const startIndex = 0;

  let lastPageNum = startPageNum;
  const historySession = new ReaderHistorySession({
    galleryId: pageType.galleryId,
    token: pageType.token,
    galleryUrl: eh.previewUrlForIndex(landingIndex),
    totalPages,
  });

  if (!state.reader.enabled.value) {
    historySession.dispose();
    return;
  }

  const automaticFullscreen = fullscreenLaunch ? await fullscreenLaunch.result : undefined;

  if (automaticFullscreen && document.fullscreenElement !== fullscreenLaunch?.host) {
    historySession.dispose();
    fullscreenLaunch?.host.remove();
    return;
  }

  openFullscreenReader({
    galleryId: pageType.galleryId,
    pages,
    startIndex,
    renderWindowSize: READER_WINDOW_SIZE,
    preloadWindowSize: READER_WINDOW_SIZE,
    nearConcurrentLoads: 3,
    farConcurrentLoads: 6,
    totalPages,
    initialFullscreenHint: automaticFullscreen === false,
    initialFullscreenOwned: automaticFullscreen === true,
    loadPage: eh.loadEhImagePage,
    loadPages: (pageNums) => provider.loadDisplayPages(pageNums),
    onActivePageChange: (page) => {
      if (page.pageNum) {
        lastPageNum = page.pageNum;
        if (enhanceThumbsGridsEnabled()) {
          replaceGalleryPageBar(provider.previewIndexForPage(page.pageNum), maxPreviewIndex);
        }
      }

      historySession.update(page.pageNum, totalPages);
      eh.updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
    },
    onExit: () => {
      historySession.dispose();
      installContinueReadingButton();
      const exitIndex = lastPageNum ? provider.previewIndexForPage(lastPageNum) : landingIndex;
      const galleryUrl = eh.previewUrlForIndex(exitIndex);

      if (enhanceThumbsGridsEnabled()) {
        replaceGalleryPageBar(exitIndex, maxPreviewIndex);
        void navigateGalleryPreview(galleryUrl).catch(() => {
          window.location.replace(galleryUrl);
        });
        return;
      }

      // If the page underneath already shows this preview page, keep it (just fix the URL);
      // otherwise navigate the gallery to the preview page the reader ended on.
      if (exitIndex === landingIndex) {
        window.history.replaceState(window.history.state, "", galleryUrl);
      } else {
        window.location.replace(galleryUrl);
      }
    },
    onOpenOriginalPage: (page) => {
      historySession.dispose();
      window.location.assign(page.url);
    },
  }, fullscreenLaunch?.host);
}

function reportOpenError(error: unknown): void {
  const message = error instanceof Error ? error.message : texts.errors.loadFailed;
  console.error("[ehpeek]", error);
  window.alert(message);
}

function openReaderFromUserAction(startPageUrl: string, preferredPageNum?: number): void {
  const fullscreenLaunch = requestConfiguredReaderFullscreen();
  void openReader(startPageUrl, preferredPageNum, fullscreenLaunch).catch((error: unknown) => {
    if (fullscreenLaunch) {
      if (document.fullscreenElement === fullscreenLaunch.host) {
        void document.exitFullscreen().catch((fullscreenError: unknown) => {
          console.warn("[ehpeek] Failed to exit fullscreen", fullscreenError);
        });
      }
      fullscreenLaunch.host.remove();
    }
    reportOpenError(error);
  });
}

function requestConfiguredReaderFullscreen(): ReaderFullscreenLaunch | undefined {
  if (!state.reader.enabled.value || !state.reader.fullscreen.value || document.fullscreenElement) {
    return undefined;
  }

  const host = createReaderHost();
  document.body.append(host);

  if (!document.fullscreenEnabled || typeof host.requestFullscreen !== "function") {
    return { host, result: Promise.resolve(false) };
  }

  return {
    host,
    result: enterReaderFullscreen(host).then(
      () => true,
      (error: unknown) => {
        console.warn("[ehpeek] Fullscreen request failed", error);
        return false;
      },
    ),
  };
}

function onDocumentClick(event: MouseEvent): void {
  if (!state.reader.enabled.value) {
    return;
  }

  const link = eh.findClickedImageLink(event.target);

  if (!link) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  openReaderFromUserAction(link.href);
}

async function openReaderFromHash(): Promise<void> {
  const peekPage = eh.peekPageFromHash();

  if (peekPage === null) {
    return;
  }

  const pages = eh.collectGalleryPages();
  const page = pages.find((item) => item.pageNum === peekPage) ?? pages[0];

  if (page) {
    await openReader(page.url).catch(reportOpenError);
  }
}

if (pageType.type === "gallery") {
  document.addEventListener("click", onDocumentClick, true);
  if (state.reader.enabled.value && pageType.peekPage !== null) {
    void openReaderFromHash();
  }
}
