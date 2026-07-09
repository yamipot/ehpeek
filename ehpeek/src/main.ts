import { openFullscreenReader } from "./components/Reader";
import { SettingsMenu } from "./components/SettingsMenu";
import {
  enhanceGalleryThumbsEnabled,
  GalleryPageProvider,
  installGalleryThumbEnhancement,
  navigateGalleryPreview,
  toggleEnhanceGalleryThumbs,
} from "./components/EnhanceGallery";
import * as eh from "./eh";
import texts from "./texts.json";
import { state } from "./state";
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

function settingsMenuState() {
  return {
    readerEnabled: state.reader.enabled.value,
    enhanceGalleryThumbsEnabled: enhanceGalleryThumbsEnabled(),
  };
}

async function openReader(startPageUrl: string): Promise<void> {
  if (!state.reader.enabled.value) {
    return;
  }

  const landingIndex = eh.previewPageIndex();
  const landingPages = eh.collectGalleryPages();
  const pageSize = eh.computePreviewPageSize();
  const maxPreviewIndex = eh.maxPreviewPageIndex();
  const provider = new GalleryPageProvider(
    landingIndex,
    landingPages,
    pageSize,
    maxPreviewIndex,
    READER_WINDOW_SIZE,
    eh.pullPreviewPage,
  );
  const startUrl = normalizeUrl(startPageUrl);
  const hashPage = eh.peekPageFromHash();

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

  if (!state.reader.enabled.value) {
    return;
  }

  openFullscreenReader({
    pages,
    startIndex,
    renderWindowSize: READER_WINDOW_SIZE,
    preloadWindowSize: READER_WINDOW_SIZE,
    nearConcurrentLoads: 3,
    farConcurrentLoads: 6,
    totalPages: eh.readShowingRange()?.total,
    loadPage: eh.loadEhImagePage,
    loadPages: (pageNums) => provider.loadDisplayPages(pageNums),
    onActivePageChange: (page) => {
      if (page.pageNum) {
        lastPageNum = page.pageNum;
        eh.replaceGalleryPageBar(provider.previewIndexForPage(page.pageNum), maxPreviewIndex);
      }

      eh.updatePeekLocation(page.pageNum, pageSize, maxPreviewIndex);
    },
    onExit: () => {
      const exitIndex = lastPageNum ? provider.previewIndexForPage(lastPageNum) : landingIndex;
      const galleryUrl = eh.previewUrlForIndex(exitIndex);
      eh.replaceGalleryPageBar(exitIndex, maxPreviewIndex);

      if (enhanceGalleryThumbsEnabled()) {
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
    onDisableReader: () => updateReaderEnabled(false),
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

if (pageType.type === "gallery") {
  installSettingsMenu();
  installGalleryThumbEnhancement(reportOpenError);
  document.addEventListener("click", onDocumentClick, true);
  if (state.reader.enabled.value && pageType.peekPage !== null) {
    void openReaderFromHash();
  }
}
