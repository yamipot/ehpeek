export type ImagePageInfo = {
  imageUrl: string;
  originalImageUrl: string | null;
  width: number | null;
  height: number | null;
};

export type GalleryTagData = {
  appearance: GalleryTagAppearance;
  definitionHref: string;
  href: string;
  label: string;
  myTag: { id: string; tagSet: string } | null;
  name: string;
  vote: "down" | "up" | null;
};

export type GalleryTagAction = "voteDown" | "voteUp" | "withdrawVote";

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
