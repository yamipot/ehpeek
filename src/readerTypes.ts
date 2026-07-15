export type ReaderPage = {
  url: string;
  aspectRatio: number;
  pageNum?: number;
};

export type LoadedReaderPage = {
  imageUrl: string;
  width?: number | null;
  height?: number | null;
};
