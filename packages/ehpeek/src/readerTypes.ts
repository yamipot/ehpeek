export type ReaderPage = {
  url: string;
  aspectRatio: number;
  pageNum?: number;
};

export type LoadedReaderPage = {
  imageUrl: string;
  originalImageUrl?: string | null;
  width?: number | null;
  height?: number | null;
};
