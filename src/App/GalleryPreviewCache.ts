import { createSignal, type Accessor } from "solid-js";
import * as eh from "../eh";
import type { LoadedReaderPage, ReaderPage } from "../readerTypes";

const PREVIEW_CACHE_LIMIT = 10;

export type GalleryPreviewCache = {
  current: Accessor<eh.GalleryPreviewDom>;
  getPages: (pageNums: number[]) => Promise<ReaderPage[]>;
  load: (previewIndex: number) => Promise<eh.GalleryPreviewDom>;
  loadImage: (page: ReaderPage) => Promise<LoadedReaderPage>;
  loading: Accessor<boolean>;
  previewIndexForPage: (pageNum: number) => number;
  select: (previewIndex: number) => Promise<eh.GalleryPreviewDom>;
};

/** Shares extracted Preview pages between gallery UI, Continue, and Reader. */
export function createGalleryPreviewCache(
  initialPreview: eh.GalleryPreviewDom,
): GalleryPreviewCache {
  const [current, setCurrent] = createSignal(initialPreview);
  const [loading, setLoading] = createSignal(false);
  const previews = new Map<number, eh.GalleryPreviewDom>();
  const pages = new Map<number, ReaderPage>();
  const pending = new Map<number, Promise<eh.GalleryPreviewDom>>();
  const pageSize = initialPreview.data.pageSize;
  const maxPreviewIndex = initialPreview.data.maxIndex;
  let currentPreviewIndex = initialPreview.data.currentIndex;
  let selectionId = 0;

  const remember = (preview: eh.GalleryPreviewDom): void => {
    const index = preview.data.currentIndex;
    previews.delete(index);
    previews.set(index, preview);
    for (const page of preview.data.pages) {
      if (page.pageNum && page.pageNum > 0) {
        pages.set(page.pageNum, page);
      }
    }

    while (previews.size > PREVIEW_CACHE_LIMIT) {
      let removable: number | undefined;
      for (const candidate of previews.keys()) {
        if (candidate !== currentPreviewIndex && candidate !== index) {
          removable = candidate;
          break;
        }
      }
      if (removable === undefined) {
        break;
      }
      previews.delete(removable);
    }
  };

  const previewIndexForPage = (pageNum: number): number => {
    return eh.previewPageIndexForGalleryPage(
      pageNum,
      pageSize,
      maxPreviewIndex,
    );
  };

  const load = (previewIndex: number): Promise<eh.GalleryPreviewDom> => {
    if (
      previewIndex < 0 ||
      previewIndex > maxPreviewIndex
    ) {
      return Promise.reject(new RangeError(`Invalid Preview index: ${previewIndex}`));
    }

    const cached = previews.get(previewIndex);
    if (cached) {
      previews.delete(previewIndex);
      previews.set(previewIndex, cached);
      return Promise.resolve(cached);
    }

    const existing = pending.get(previewIndex);
    if (existing) {
      return existing;
    }

    const request = eh.loadGalleryPreviewPage(
      previewIndex,
      initialPreview.data.currentUrl,
    ).then(
      (preview) => {
        pending.delete(previewIndex);
        remember(preview);
        return preview;
      },
      (error: unknown) => {
        pending.delete(previewIndex);
        throw error;
      },
    );
    pending.set(previewIndex, request);
    return request;
  };

  const getPages = async (pageNums: number[]): Promise<ReaderPage[]> => {
    const requested = Array.from(new Set(pageNums.filter((pageNum) => pageNum > 0)));
    const previewIndexes = Array.from(new Set(requested
      .filter((pageNum) => !pages.has(pageNum))
      .map(previewIndexForPage)));
    await Promise.all(previewIndexes.map(load));
    return requested.flatMap((pageNum) => pages.get(pageNum) ?? []);
  };

  const select = async (previewIndex: number): Promise<eh.GalleryPreviewDom> => {
    if (previewIndex === current().data.currentIndex) {
      return current();
    }

    const activeSelection = ++selectionId;
    setLoading(true);
    try {
      const preview = await load(previewIndex);
      if (activeSelection === selectionId) {
        currentPreviewIndex = preview.data.currentIndex;
        setCurrent(preview);
        window.history.replaceState(
          window.history.state,
          "",
          preview.data.currentUrl,
        );
      }
      return preview;
    } finally {
      if (activeSelection === selectionId) {
        setLoading(false);
      }
    }
  };

  remember(initialPreview);
  return {
    current,
    getPages,
    load,
    loadImage: eh.loadEhImagePage,
    loading,
    previewIndexForPage,
    select,
  };
}
