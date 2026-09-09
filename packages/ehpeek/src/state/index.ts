import { persisted, local, enumCodec, numberRangeCodec, nullableStateCodec, nullableCodec, arrayCodec, jsonCodec } from "./storage";
import { UI_SCALE_NAMES, type UiScale } from "../ui";
import {
  APP_LOCALES,
  APP_LOCALE_SETTING_KEY,
  DEFAULT_APP_LOCALE,
  type AppLocale,
} from "../i18n";

import type {
  NavigationMode, ReadDirection, PageLayout, RightTapAction,
  ReaderScrollSizeScale, ReaderOrientation,
} from "@ehpeek/reader/interfaces";
export type { ReadDirection } from "@ehpeek/reader/interfaces";
export type TwoColumnsReaderMode =
  | "full-view"
  | "on-preview"
  | "reader-preview";
export type GalleryTitlePreference = "main" | "sub";
export type SearchGridMode = "ehpeek" | "ehpeek-lite";
export type BackToTopPosition = {
  bottom: number;
  right: number;
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

export const GALLERY_COLUMNS_RATIO_DEFAULT = 0.5;
export const GALLERY_COLUMNS_RATIO_MAX = 0.95;
export const GALLERY_COLUMNS_RATIO_MIN = 0.05;

const touchUiDefault = window.matchMedia("(pointer: coarse)").matches;
const portraitUiScaleDefault: UiScale = touchUiDefault ? "large" : "small";
const landscapeUiScaleDefault: UiScale = touchUiDefault &&
    Math.min(window.screen.width, window.screen.height) >= 600
  ? "medium"
  : portraitUiScaleDefault;

export const state = {
  app: {
    locale: persisted(
      APP_LOCALE_SETTING_KEY,
      DEFAULT_APP_LOCALE,
      enumCodec<AppLocale>(APP_LOCALES),
    ).preload(),
    leftHandedControls: persisted("ehpeek:left-handed-controls", false).preload(),
    openGalleryInNewTab: persisted("ehpeek:open-gallery-in-new-tab", false).preload(),
    portraitUiScale: persisted(
      "ehpeek:ui-scale:portrait",
      portraitUiScaleDefault,
      enumCodec<UiScale>(UI_SCALE_NAMES),
    ).preload(),
    landscapeUiScale: persisted(
      "ehpeek:ui-scale:landscape",
      landscapeUiScaleDefault,
      enumCodec<UiScale>(UI_SCALE_NAMES),
    ).preload(),
  },
  reader: {
    twoColumnsMode: persisted<TwoColumnsReaderMode>(
      "ehpeek:reader:two-columns-mode",
      "full-view",
      enumCodec<TwoColumnsReaderMode>([
        "full-view",
        "on-preview",
        "reader-preview",
      ]),
    ).preload(),
    enabled: persisted("ehpeek:reader:enabled", true).preload(),
    exitOnFullscreenExit: persisted(
      "ehpeek:reader:exit-on-fullscreen-exit",
      false,
    ).preload(),
    fullscreen: persisted("ehpeek:reader:fullscreen", false).preload(),
    includePageInUrl: persisted(
      "ehpeek:reader:include-page-in-url",
      false,
    ).preload(),
    portraitControls: readerControls("portrait"),
    landscapeControls: readerControls("landscape"),
    scrollTtbScale: persisted<ReaderScrollSizeScale>(
      "ehpeek:reader:scroll-ttb-scale",
      "fill",
    ).preload(),
    scrollHorizontalScale: persisted<ReaderScrollSizeScale>(
      "ehpeek:reader:scroll-horizontal-scale",
      "fill",
    ).preload(),
  },
  gallery: {
    enhanceThumbs: persisted("ehpeek:enhance-thumbs:enabled", true).preload(),
    replacePreviewWithScroll: persisted(
      "ehpeek:scroll-preview:replace-original",
      false,
    ).preload(),
    embeddedScrollPreviewSingleDirection: persisted<ReadDirection>(
      "ehpeek:gallery-scroll-preview:single-direction",
      "rtl",
    ).preload(),
    embeddedScrollPreviewColumnsDirection: persisted<ReadDirection>(
      "ehpeek:gallery-scroll-preview:columns-direction",
      "ttb",
    ).preload(),
    scrollPreviewDirection: persisted<ReadDirection>(
      "ehpeek:scroll-preview:direction",
      "ttb",
    ).preload(),
    myTags: persisted("ehpeek:my-tags:enabled", true).preload(),
    myTagAppearances: local(
      "ehpeek:my-tags",
      [],
      jsonCodec(arrayCodec(isMyTagAppearance)),
    ),
    myTagSets: local(
      "ehpeek:my-tag-sets",
      [],
      jsonCodec(arrayCodec(isMyTagSetOption)),
    ),
    readHistory: persisted("ehpeek:read-history:enabled", true).preload(),
    includeUnreadHistory: persisted(
      "ehpeek:read-history:include-unread",
      true,
    ).preload(),
    readHistoryCompactEstimate: persisted("ehpeek:history-count", 0).preload(),
    titlePreference: local(
      "ehpeek:gallery-title-preference",
      "main",
      enumCodec<GalleryTitlePreference>(["main", "sub"]),
    ),
  },
  search: {
    enhance: persisted("ehpeek:enhance-search:enabled", true).preload(),
    grid: local<SearchGridMode | null>(
      "ehpeek:search-grid",
      null,
      nullableCodec(enumCodec<SearchGridMode>(["ehpeek", "ehpeek-lite"])),
    ),
    history: persisted("ehpeek:search-history:enabled", true).preload(),
    searchHistory: persisted(
      "ehpeek:search:history",
      [],
      arrayCodec((value): value is string => typeof value === "string"),
    ).preload(),
  },
  touch: {
    enabled: persisted("ehpeek:touch-ui:enabled", touchUiDefault).preload(),
    fitToViewport: persisted("ehpeek:touch-ui:fit-to-viewport", true).preload(),
    portraitColumns: persisted("ehpeek:touch-ui:portrait-columns", false).preload(),
    landscapeColumns: persisted("ehpeek:touch-ui:landscape-columns", true).preload(),
    portraitGalleryColumnsRatio: persisted(
      "ehpeek:touch-ui:portrait-gallery-columns-ratio",
      GALLERY_COLUMNS_RATIO_DEFAULT,
      numberRangeCodec(GALLERY_COLUMNS_RATIO_MIN, GALLERY_COLUMNS_RATIO_MAX),
    ).preload(),
    landscapeGalleryColumnsRatio: persisted(
      "ehpeek:touch-ui:landscape-gallery-columns-ratio",
      GALLERY_COLUMNS_RATIO_DEFAULT,
      numberRangeCodec(GALLERY_COLUMNS_RATIO_MIN, GALLERY_COLUMNS_RATIO_MAX),
    ).preload(),
    portraitReaderPreviewColumnsRatio: persisted<number | null>(
      "ehpeek:touch-ui:portrait-reader-preview-columns-ratio",
      null,
      nullableStateCodec(
        numberRangeCodec(GALLERY_COLUMNS_RATIO_MIN, GALLERY_COLUMNS_RATIO_MAX),
      ),
    ).preload(),
    landscapeReaderPreviewColumnsRatio: persisted<number | null>(
      "ehpeek:touch-ui:landscape-reader-preview-columns-ratio",
      null,
      nullableStateCodec(
        numberRangeCodec(GALLERY_COLUMNS_RATIO_MIN, GALLERY_COLUMNS_RATIO_MAX),
      ),
    ).preload(),
  },
  widgets: {
    backToTopPosition: persisted<BackToTopPosition | null>(
      "ehpeek:back-to-top:position",
      null,
    ).preload(),
    galleryColumnsBackToTopPosition: persisted<BackToTopPosition | null>(
      "ehpeek:gallery-columns-back-to-top:position",
      null,
    ).preload(),
  },
} as const;

export { loadPersistedState as loadState } from "./storage";

export async function clearBackToTopPositions(): Promise<void> {
  await Promise.all([
    state.widgets.backToTopPosition.clear(),
    state.widgets.galleryColumnsBackToTopPosition.clear(),
  ]);
}

export async function loadSearchHistory(): Promise<string[]> {
  return state.search.searchHistory.reload();
}

export async function addSearchHistory(value: string): Promise<string[]> {
  const normalized = value.trim();

  if (!normalized) {
    return loadSearchHistory();
  }

  const history = [
    normalized,
    ...(await loadSearchHistory()).filter((item) => item !== normalized),
  ];
  await state.search.searchHistory.setAsync(history);
  return history;
}

export async function removeSearchHistory(value: string): Promise<string[]> {
  const history = (await loadSearchHistory()).filter((item) => item !== value);
  await state.search.searchHistory.setAsync(history);
  return history;
}

function readerControls(orientation: ReaderOrientation) {
  return {
    navigationMode: persisted<NavigationMode>(
      `ehpeek:reader:navigation-mode:${orientation}`,
      "scroll",
    ).preload(),
    scrollDirection: persisted<ReadDirection>(
      `ehpeek:reader:scroll-direction:${orientation}`,
      "ttb",
    ).preload(),
    pagedDirection: persisted<ReadDirection>(
      `ehpeek:reader:paged-direction:${orientation}`,
      "rtl",
    ).preload(),
    pageLayout: persisted<PageLayout>(
      `ehpeek:reader:page-layout:${orientation}`,
      "single",
    ).preload(),
    rightTapAction: persisted<RightTapAction>(
      `ehpeek:reader:right-tap-action:${orientation}`,
      "previous",
    ).preload(),
  } as const;
}

function isMyTagAppearance(value: unknown): value is MyTagAppearance {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return typeof item.name === "string" &&
    typeof item.backgroundColor === "string" &&
    typeof item.color === "string" &&
    typeof item.id === "string" &&
    typeof item.tagSet === "string";
}

function isMyTagSetOption(value: unknown): value is MyTagSetOption {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const item = value as Record<string, unknown>;
  return typeof item.label === "string" &&
    typeof item.selected === "boolean" &&
    typeof item.value === "string";
}
