import type { GalleryTagApiInfo } from "./request";
import type { ManagedDomNode } from "./transform/core";

export type PreviewSnapshot = {
  description: Node | null;
  thumbs: Node | null;
};

export type ImagePageInfo = {
  imageUrl: string;
  originalImageUrl: string | null;
  width: number | null;
  height: number | null;
};

export type GalleryPageBarMount = {
  descriptionElement: HTMLDivElement | null;
  descriptionText: string | null;
  element: HTMLDivElement;
  top: boolean;
};

export type PageViewportSnapshot = {
  content: string | null;
  created: boolean;
  meta: HTMLMetaElement;
  scale: number;
  scrollX: number;
  scrollY: number;
};

export type GallerySummaryItem = { value: string };

export type GalleryTagGroup = {
  namespace: string;
  tags: GalleryTag[];
};

export type GalleryTag = {
  appearance: GalleryTagAppearance;
  contentSource: HTMLElement;
  definitionHref: string;
  href: string;
  label: string;
  myTag: { id: string; tagSet: string } | null;
  name: string;
  vote: "down" | "up" | null;
};

export type GalleryTagData = Omit<GalleryTag, "contentSource">;

export type GalleryTagAction = "voteDown" | "voteUp" | "withdrawVote";

export type GalleryNewTagInfo = {
  button: HTMLInputElement | HTMLButtonElement;
  container: HTMLElement;
  field: HTMLInputElement;
  form: HTMLFormElement;
};

export type GalleryTagAppearance = {
  backgroundColor: string;
  borderColor: string;
  color: string;
};

export type MyTagAppearance = {
  backgroundColor: string;
  color: string;
  id: string;
  name: string;
  tagSet: string;
};

export type MyTagSetOption = {
  label: string;
  selected: boolean;
  value: string;
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

export type GalleryInfo = {
  available: boolean;
  titleMain: string;
  titleSub: string;
  category: string;
  categoryAppearance: GalleryCategoryAppearance;
  cover: HTMLElement | null;
  favorite: GalleryFavoriteInfo;
  newTag: GalleryNewTagInfo | null;
  tagApi: GalleryTagApiInfo | null;
  summary: GallerySummaryItem[];
  actions: HTMLElement[];
  rating: GalleryRatingInfo | null;
  tagGroups: GalleryTagGroup[];
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

export type TouchTopBarInfo = {
  available: boolean;
  navItems: ManagedDomNode<HTMLAnchorElement>[];
  homeHref: string;
  favoritesHref: string;
};

export type TouchSearchPanelInfo = {
  advancedPanel: HTMLElement | null;
  advancedToggle: HTMLAnchorElement | null;
  advancedToggleMount: HTMLSpanElement | null;
  categories: HTMLTableElement | null;
  categoryToggleMount: HTMLSpanElement | null;
  clearActionMount: HTMLSpanElement | null;
  clearButton: HTMLInputElement | HTMLButtonElement | null;
  clearLabel: string | null;
  fileSearch: HTMLElement | null;
  fileSearchToggle: HTMLAnchorElement | null;
  fileSearchToggleMount: HTMLSpanElement | null;
  form: HTMLFormElement;
  optionLinks: HTMLElement | null;
  searchActionMount: HTMLSpanElement;
  searchBox: HTMLElement;
  searchControls: HTMLDivElement;
  searchInput: HTMLInputElement;
  searchLabel: string;
  searchSubmit: HTMLInputElement | HTMLButtonElement;
};

export type TouchFavoritesCategory = {
  appearance: TouchFavoritesCategoryAppearance | null;
  count: number;
  href: string;
  label: string;
  selected: boolean;
};

export type TouchFavoritesCategoryAppearance = {
  backgroundImage: string;
  backgroundPosition: string;
  backgroundSize: string;
};

export type TouchFavoritesCategorySelectInfo = {
  categories: TouchFavoritesCategory[];
};

export type SearchHistorySource = {
  searchInput: HTMLInputElement;
  searchSubmit: HTMLInputElement | HTMLButtonElement;
};
