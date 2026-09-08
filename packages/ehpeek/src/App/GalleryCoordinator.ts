import type { Accessor } from "solid-js";
import type { OverlayHost, ReaderInstance, ReadingViewOptions } from "@ehpeek/reader/interfaces";
import type { ThumbsGridsActions } from "../components/Enhance/EnhanceThumbsGrids";
import * as eh from "../eh";
import type { ReadDirection, TwoColumnsReaderMode } from "../state";
import type { GalleryReadHistory } from "../state/readHistory";
import texts from "../i18n";
import { startUserscriptDownload } from "../userscript";
import {
  ReadingProgressSession,
  type ReadingProgress,
} from "./ReadingProgressSession";
import type { GalleryPreviewCache } from "./GalleryPreviewCache";
import { openOriginalReader, reportReaderOpenError } from "./Reader";
import { createReaderContentSource } from "./ReaderContentSource";
import { readerSettings, readerSettingCallbacks } from "./ReaderSettings";
import { createOverlayHistory } from "./OverlayHistory";

export type GalleryCoordinator = {
  readerOptions: ReadingViewOptions;
  attachReader: (instance: ReaderInstance | null) => void;
  attachThumbs: (actions: ThumbsGridsActions) => void;
  openFromReadButton: () => void;
  openGalleryPage: (pageUrl: string, preferredPageNum?: number) => void;
  openReaderFromHash: () => Promise<void>;
  progress: Accessor<ReadingProgress>;
};

export function createGalleryCoordinator(options: {
  enhanceThumbsGridsEnabled: boolean;
  exitReaderOnFullscreenExit: boolean;
  includeReaderPageInUrl: boolean;
  includeUnreadHistoryEnabled: boolean;
  onReaderPreviewModeChange: (active: boolean) => void;
  onEmbeddedDirectionChange: (direction: ReadDirection) => void;
  overlayHost: OverlayHost;
  previewCache: GalleryPreviewCache;
  readHistory: GalleryReadHistory | null;
  readerEnabled: boolean;
  readerFullscreenEnabled: boolean;
  galleryColumn: (column: eh.GalleryColumn) => eh.GalleryColumnScope | null;
  replacePreviewWithScroll: boolean;
  twoColumnsReaderMode: TwoColumnsReaderMode;
}): GalleryCoordinator {
  const previewCache = options.previewCache;
  const preview = previewCache.current().data;
  const gallery = eh.galleryIdentityFromUrl(preview.currentUrl);
  if (!gallery) throw new Error("Cannot identify Gallery for Reader.");
  const progress = createProgressSession(
    gallery.galleryId,
    gallery.token,
    preview.totalImages,
    options.readHistory,
    options.includeUnreadHistoryEnabled,
  );
  let readerInitialPreviewIndex = preview.currentIndex;
  let readerLastPage = 1;
  let coveredInfo = false;
  let thumbs: ThumbsGridsActions | null = null;
  let reader: ReaderInstance | null = null;
  const mountedReader = (): ReaderInstance => {
    if (!reader) throw new Error("Gallery reader is not mounted.");
    return reader;
  };
  const enhancedPreviewActive = () =>
    options.enhanceThumbsGridsEnabled ||
    options.replacePreviewWithScroll ||
    reader?.activeView === "preview";

  const replaceReaderLocation = (pageNumber: number): void => {
    if (pageNumber <= 0 || !options.includeReaderPageInUrl) return;
    let url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    url = new URL(
      eh.previewUrlForIndex(
        previewCache.previewIndexForPage(pageNumber),
        url.href,
      ),
    );
    hashParams.set("peek_page", String(pageNumber));
    url.hash = hashParams.toString();
    if (url.href !== window.location.href)
      window.history.replaceState(window.history.state, "", url.href);
  };
  const replacePreviewLocation = (previewIndex: number): void => {
    if (options.replacePreviewWithScroll) return;
    const url = new URL(eh.previewUrlForIndex(previewIndex));
    if (url.href !== window.location.href)
      window.history.replaceState(window.history.state, "", url.href);
  };
  const clearReaderLocation = (): void => {
    if (!/(?:^#|&)peek_page(?:=|&|$)/.test(window.location.hash)) return;
    const url = new URL(window.location.href);
    const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
    hashParams.delete("peek_page");
    url.hash = hashParams.toString();
    window.history.replaceState(window.history.state, "", url.href);
  };

  const readerOptions: ReadingViewOptions = {
    source: createReaderContentSource(
      previewCache,
      gallery.galleryId,
      gallery.token,
    ),
    settings: readerSettings(),
    onSettingChange: readerSettingCallbacks(options.onEmbeddedDirectionChange),
    host: options.overlayHost,
    history: createOverlayHistory((count) => {
      if (count > 1 || reader?.activeView === "reader") clearReaderLocation();
    }),
    initialProgress: progress.progress().hasHistory
      ? progress.progress().currentPage
      : null,
    fullscreenOnOpen: options.readerFullscreenEnabled,
    exitOnFullscreenExit: options.exitReaderOnFullscreenExit,
    beforeOpen: options.readerEnabled
      ? undefined
      : async (pageNum) => {
          await openOriginalReader(pageNum, previewCache);
          return false;
        },
    placement: () => {
      const column =
        options.twoColumnsReaderMode === "reader-preview"
          ? "info"
          : options.twoColumnsReaderMode === "on-preview"
            ? "preview"
            : null;
      const container = column === null ? null : options.galleryColumn(column);
      coveredInfo = column === "info" && container !== null;
      return container
        ? {
            container,
            coversPreview:
              column === "preview" && options.replacePreviewWithScroll,
          }
        : null;
    },
    onError: reportReaderOpenError,
    onReaderOpen: (pageNum) => {
      readerLastPage = pageNum;
      readerInitialPreviewIndex = previewCache.current().data.currentIndex;
    },
    onReaderMount: (mounted) =>
      options.onReaderPreviewModeChange(mounted && coveredInfo),
    onProgress: (page) => {
      if (page.pageNum) {
        readerLastPage = page.pageNum;
        if (enhancedPreviewActive())
          thumbs?.gotoPreview(previewCache.previewIndexForPage(page.pageNum));
        replaceReaderLocation(page.pageNum);
      }
      progress.update(page.pageNum, preview.totalImages);
    },
    onEnd: () => progress.update(preview.totalImages, preview.totalImages),
    onReaderClosed: async () => {
      await progress.flush();
      clearReaderLocation();
      const exitIndex = previewCache.previewIndexForPage(readerLastPage);
      if (enhancedPreviewActive()) {
        thumbs?.gotoPreview(exitIndex);
        if (exitIndex !== previewCache.current().data.currentIndex) {
          void previewCache.select(exitIndex).catch(reportReaderOpenError);
        }
        if (reader?.activeView === null)
          replacePreviewLocation(exitIndex);
      } else if (exitIndex !== readerInitialPreviewIndex) {
        window.location.replace(eh.previewUrlForIndex(exitIndex));
      } else {
        replacePreviewLocation(exitIndex);
      }
    },
    onPreviewClosed: (pageNum) => {
      const index = previewCache.previewIndexForPage(pageNum);
      if (
        options.enhanceThumbsGridsEnabled ||
        options.replacePreviewWithScroll
      ) {
        if (index !== previewCache.current().data.currentIndex) {
          void previewCache.select(index).catch(reportReaderOpenError);
        }
        replacePreviewLocation(index);
      } else {
        window.location.assign(
          eh.previewUrlForIndex(index, previewCache.current().data.currentUrl),
        );
      }
    },
    customization: {
      download: (url, name) =>
        startUserscriptDownload({
          url,
          name,
          onerror: (error) => {
            console.error("[ehpeek]", error);
            window.alert(texts.errors.downloadFailed);
          },
        }),
      downloadHelp: () => texts.reader.downloadHelp,
      onOpenOriginalPage: (url) => {
        void progress
          .flush()
          .then(() => window.location.assign(url))
          .catch(reportReaderOpenError);
      },
    },
  };
  return {
    readerOptions,
    attachReader: (instance) => {
      reader = instance;
      if (!instance) progress.dispose();
    },
    attachThumbs: (actions) => {
      thumbs = actions;
    },
    openFromReadButton: () => {
      void mountedReader()
        .open(options.readHistory ? progress.progress().currentPage : 1, true)
        .catch(reportReaderOpenError);
    },
    openGalleryPage: (url, preferredPageNum) => {
      const pageNum =
        preferredPageNum ?? eh.peekPageFromHash() ?? eh.galleryPageNumber(url);
      if (pageNum) void mountedReader().open(pageNum, true).catch(reportReaderOpenError);
      else reportReaderOpenError(new Error(texts.errors.imageNotFound));
    },
    openReaderFromHash: async () => {
      const pageNum = eh.peekPageFromHash();
      if (pageNum !== null)
        await mountedReader().open(pageNum).catch(reportReaderOpenError);
    },
    progress: progress.progress as Accessor<ReadingProgress>,
  };
}

function createProgressSession(
  galleryId: number,
  token: string,
  totalPages: number,
  history: GalleryReadHistory | null,
  includeUnread: boolean,
): ReadingProgressSession {
  if (!history) {
    return new ReadingProgressSession(null, {
      currentPage: 1,
      hasHistory: false,
      totalPages,
    });
  }

  const existing = history.value;
  const galleryInfo = eh.extractGalleryHistoryInfo();
  if (includeUnread) {
    void history
      .recordVisit(totalPages, galleryInfo)
      .catch((error: unknown) => {
        console.error("[ehpeek] Failed to record gallery visit", error);
      });
  } else if (existing) {
    void history.updateGalleryInfo(galleryInfo).catch((error: unknown) => {
      console.error("[ehpeek] Failed to update gallery history info", error);
    });
  }
  return new ReadingProgressSession(
    {
      history,
      record: {
        gallery: galleryInfo,
        galleryId,
        token,
        totalPages,
      },
    },
    {
      currentPage:
        existing?.pageNum && existing.pageNum > 0 ? existing.pageNum : 1,
      hasHistory: Boolean(existing && existing.pageNum > 0),
      totalPages: existing?.totalPages ?? totalPages,
    },
  );
}
