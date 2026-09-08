import type { LoadedReaderPage, ReaderPage } from "./readerTypes";

export type PreviewItem = {
  aspectRatio: number;
  pageNum: number;
  pageUrl: string;
  thumbnail: {
    backgroundPosition: string;
    backgroundRepeat: string;
    backgroundSize: string;
    height: number;
    kind: "background" | "image";
    url: string;
    width: number;
  };
};

/** Logical reading pages only; client pagination and request caching stay behind this interface. */
export type ContentSource = {
  totalPages: number;
  initialPageNum: number;
  aspectRatio: number;
  initialPreviewItems: PreviewItem[];
  getPages: (pageNums: number[], signal?: AbortSignal) => Promise<ReaderPage[]>;
  getPreviewItems: (
    pageNums: number[],
    signal?: AbortSignal,
  ) => Promise<PreviewItem[]>;
  loadImage: (
    page: ReaderPage,
    signal?: AbortSignal,
  ) => Promise<LoadedReaderPage>;
};
