import { openFullscreenReader } from "./components/Reader";
import { SettingsMenu } from "./components/SettingsMenu";
import {
  enhanceGalleryThumbsEnabled,
  GalleryPageProvider,
  installContinueReadingButton,
  installGalleryThumbEnhancement,
  navigateGalleryPreview,
  toggleEnhanceGalleryThumbs,
} from "./components/EnhanceGallery";
import { installSearchPageSwipeNavigation } from "./components/EnhanceSearchPage";
import * as eh from "./eh";
import texts from "./texts.json";
import { state } from "./state";
import { loadReaderHistory, ReaderHistorySession } from "./history";
import { normalizeUrl } from "./utils";

const READER_WINDOW_SIZE = 10;

let menuCommandId: number | string | null = null;
let settingsMenu: SettingsMenu | null = null;

function updateReaderEnabled(enabled: boolean): void {
  state.reader.enabled.set(enabled);
  settingsMenu?.update();
  registerUserscriptMenu();
}

function toggleReader(): void {
  updateReaderEnabled(!state.reader.enabled.value);
}

function registerUserscriptMenu(): void {
  if (typeof GM_registerMenuCommand !== "function") {
    return;
  }

  if (menuCommandId !== null && typeof GM_unregisterMenuCommand === "function") {
    GM_unregisterMenuCommand(menuCommandId);
    menuCommandId = null;
  }

  menuCommandId = GM_registerMenuCommand(
    texts.settings.openSettings,
    openSettingsMenu,
  );
}

function toggleEnhanceGalleryThumbsSetting(): void {
  toggleEnhanceGalleryThumbs();
  settingsMenu?.update();
}

function toggleEnhanceSearchPageSetting(): void {
  state.search.enhance.set(!state.search.enhance.value);
  settingsMenu?.update();
}

function settingsMenuState() {
  return {
    readerEnabled: state.reader.enabled.value,
    enhanceGalleryThumbsEnabled: enhanceGalleryThumbsEnabled(),
    enhanceSearchPageEnabled: state.search.enhance.value,
  };
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
  let pages = startPageNum ? await provider.loadDisplayPages(provider.displayWindowAround(startPageNum)) : landingPages;
  let startIndex =
    hashPage !== null ? pages.findIndex((page) => page.pageNum === hashPage) : pages.findIndex((page) => page.url === startUrl);

  if (startIndex < 0) {
    startIndex = 0;
    pages = [{ url: startUrl, aspectRatio: 1.42, pageNum: eh.galleryPageNumber(startUrl) }, ...pages].sort(
      (left, right) => (left.pageNum ?? 0) - (right.pageNum ?? 0),
    );
    startIndex = pages.findIndex((page) => page.url === startUrl);
  }

  let lastPageNum = hashPage ?? eh.galleryPageNumber(startUrl);
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
        if (enhanceGalleryThumbsEnabled()) {
          eh.replaceGalleryPageBar(provider.previewIndexForPage(page.pageNum), maxPreviewIndex);
        }
      }

      historySession.update(page.pageNum, totalPages);
      eh.updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
    },
    onExit: () => {
      historySession.dispose();
      installContinueReading();
      const exitIndex = lastPageNum ? provider.previewIndexForPage(lastPageNum) : landingIndex;
      const galleryUrl = eh.previewUrlForIndex(exitIndex);

      if (enhanceGalleryThumbsEnabled()) {
        eh.replaceGalleryPageBar(exitIndex, maxPreviewIndex);
        void navigateGalleryPreview(galleryUrl, "replace").catch(() => {
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
      updateReaderEnabled(false);
    },
  });
}

function reportOpenError(error: unknown): void {
  const message = error instanceof Error ? error.message : texts.errors.loadFailed;
  console.error("[ehpeek]", error);
  window.alert(message);
}

function openSettingsMenu(): void {
  installSettingsMenu();
  settingsMenu?.open();
}

function installSettingsMenu(): void {
  if (settingsMenu) {
    settingsMenu.update();
    return;
  }

  settingsMenu = new SettingsMenu(eh.settingsMenuTriggerTagName(), settingsMenuState, {
    onReaderToggle: toggleReader,
    onEnhanceGalleryThumbsToggle: toggleEnhanceGalleryThumbsSetting,
    onEnhanceSearchPageToggle: toggleEnhanceSearchPageSetting,
  });

  if (!eh.mountSettingsMenu(settingsMenu)) {
    settingsMenu = null;
  }
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

registerUserscriptMenu();

const pageType = eh.extractPageType();
installSettingsMenu();

if (pageType.type === "gallery") {
  installGalleryThumbEnhancement(reportOpenError, openSettingsMenu);
  installContinueReading();
  document.addEventListener("click", onDocumentClick, true);
  if (state.reader.enabled.value && pageType.peekPage !== null) {
    void openReaderFromHash();
  }
} else if (pageType.type === "search" && state.search.enhance.value) {
  installSearchPageSwipeNavigation(pageType);
}

function installContinueReading(): void {
  if (pageType.type !== "gallery" || !state.reader.enabled.value) {
    return;
  }

  const record = loadReaderHistory(pageType.galleryId, pageType.token);
  const pageNum = record?.pageNum && record.pageNum > 0 ? record.pageNum : 1;
  const totalPages = record?.totalPages ?? eh.readShowingRange()?.total;
  const detail = record && totalPages ? `${pageNum}/${totalPages}` : totalPages ? `${totalPages} ${texts.reader.pages}` : String(pageNum);

  installContinueReadingButton({
    label: record ? texts.reader.continueReading : texts.reader.startReading,
    detail,
  }, () => {
    const page = eh.collectGalleryPages()[0];

    if (!page) {
      return;
    }

    void openReader(page.url, pageNum).catch(reportOpenError);
  });
}
