export type ImagePageInfo = {
  imageUrl: string;
  originalImageUrl: string | null;
  width: number | null;
  height: number | null;
};

export type GalleryTagData = {
  appearance: GalleryTagAppearance;
  label: string;
  myTag: { id: string; tagSet: string } | null;
  name: string;
  url: string;
};

type GalleryTagAppearance = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

export type GalleryCategoryAppearance = {
  "background-color": string;
  "background-image": string;
  "border-color": string;
  color: string;
};

export type GalleryRatingInfo = {
  count: string;
  label: string;
  rated: boolean;
  value: number;
};

export type GalleryFavoriteInfo = {
  actionUrl: string;
  color: string | null;
  favorited: boolean;
  label: string;
};

export type GalleryFavoriteOption = {
  color: string | null;
  label: string;
  selected: boolean;
  value: string;
};

export type GalleryHistoryInfo = {
  category?: string;
  categoryClass?: string;
  coverUrl?: string;
  language?: string;
  postedAt?: number;
  rating?: number;
  title?: string;
  titleSub?: string;
  uploader?: string;
};

export type ReadHistoryPageItem = {
  currentPage: number;
  galleryId: number;
  info?: GalleryHistoryInfo;
  token: string;
  totalPages?: number;
  updatedAt: number;
};

type TouchFavoritesCategory = {
  appearance: TouchFavoritesCategoryAppearance | null;
  count: number;
  label: string;
  selected: boolean;
};

type TouchFavoritesCategoryAppearance = {
  backgroundImage: string;
  backgroundPosition: string;
  backgroundSize: string;
};

export type TouchFavoritesCategorySelectInfo = {
  categories: TouchFavoritesCategory[];
};
