import {
  FullscreenReader,
  removePreviousReaderRoot,
  type FullscreenReaderHandle,
  type FullscreenReaderOptions,
} from "./components/Reader";
import { Fragment, h, render } from "preact";
import { SettingsMenu } from "./components/SettingsMenu";
import { TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS, TOUCH_GALLERY_TAG_CLASS, TouchGalleryPanel } from "./components/Enhance/TouchGalleryPanel";
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
import unoCss from "ehpeek:uno.css";

const READER_WINDOW_SIZE = 10;
const UNO_STYLE_ID = "ehpeek-uno-style";

if (unoCss && !document.getElementById(UNO_STYLE_ID)) {
  const style = document.createElement("style");
  style.id = UNO_STYLE_ID;
  style.textContent = unoCss;
  document.head.append(style);
}

function settingsMenuState() {
  return {
    readerEnabled: state.reader.enabled.value,
    enhanceThumbsGridsEnabled: enhanceThumbsGridsEnabled(),
    enhanceSearchGridsEnabled: state.search.enhance.value,
    touchUiEnabled: state.touch.enabled.value,
  };
}

function applySettingsMenuState(next: ReturnType<typeof settingsMenuState>): void {
  state.reader.enabled.set(next.readerEnabled);
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

      void openReader(page.url, pageNum).catch(reportOpenError);
    },
  };
}

const pageType = eh.extractPageType();
const initialSettingsState = settingsMenuState();
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

function openFullscreenReader(options: FullscreenReaderOptions): void {
  activeReader?.close();
  removePreviousReaderRoot();

  const host = document.createElement("div");
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

  host.dataset.ehpeekReaderContainer = "true";
  document.body.append(host);
  activeReader = { close };
  render(
    <FullscreenReader
      options={options}
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
        className="textsize-sm font-inherit"
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

if (settingsState.touchUiEnabled && !document.querySelector(".ehpeek-touch-top-bar")) {
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

if (settingsState.touchUiEnabled && pageType.type === "gallery") {
  const touchGalleryInfo = eh.readGalleryInfo(TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS, TOUCH_GALLERY_TAG_CLASS);

  if (touchGalleryInfo.available) {
    eh.applyTouchGalleryPanelPageStyle();
    let mount: HTMLElement | null = null;

    if (!document.querySelector(".ehpeek-touch-gallery")) {
      mount = document.createElement("div");

      if (!eh.insertTouchGalleryPanel(mount)) {
        document.body.prepend(mount);
      }
    }

    if (mount) {
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

if (pageType.type === "search" && settingsState.enhanceSearchGridsEnabled) {
  const resultList = eh.searchResultList();

  if (resultList && eh.searchPageNavigation()) {
    const host = document.createElement("div");
    document.body.append(host);
    render(<EnhanceSearchGrids resultList={resultList} />, host);
  }
}

async function openReader(startPageUrl: string, preferredPageNum?: number): Promise<void> {
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

  const seedPage = landingPages.find((page) => page.pageNum === startPageNum || page.url === startUrl) ?? {
    url: startUrl,
    aspectRatio: 1.42,
    pageNum: startPageNum,
  };
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

  openFullscreenReader({
    pages,
    startIndex,
    renderWindowSize: READER_WINDOW_SIZE,
    preloadWindowSize: READER_WINDOW_SIZE,
    nearConcurrentLoads: 3,
    farConcurrentLoads: 6,
    totalPages,
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
    onDisableReader: () => {
      historySession.dispose();
      state.reader.enabled.set(false);
      installContinueReadingButton();
    },
  });
}

function reportOpenError(error: unknown): void {
  const message = error instanceof Error ? error.message : texts.errors.loadFailed;
  console.error("[ehpeek]", error);
  window.alert(message);
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
  void openReader(link.href).catch(reportOpenError);
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
