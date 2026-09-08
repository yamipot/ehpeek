export type ReaderPage = {
  url: string;
  aspectRatio: number;
  pageNum?: number;
};

export type LoadedReaderPage = {
  imageUrl: string;
  fileName?: string;
  originalFileName?: string;
  byteSize?: number | null;
  displayWhileLoading?: boolean;
  originalImageUrl?: string | null;
  width?: number | null;
  height?: number | null;
};
