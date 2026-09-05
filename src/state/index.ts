import { UI_SCALE_NAMES, type UiScale } from "../ui";
import {
  APP_LOCALES,
  APP_LOCALE_SETTING_KEY,
  DEFAULT_APP_LOCALE,
  type AppLocale,
} from "../i18n";

export type NavigationMode = "scroll" | "paged";
export type ReadDirection = "ltr" | "rtl" | "ttb";
export type PageLayout = "single" | "double";
export type RightTapAction = "previous" | "next";
export type ReaderScrollSizeScale = number | "fill" | "one-to-one" | null;
export type ReaderOrientation = "portrait" | "landscape";
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

type StateValue<T> = {
  defaultValue: T;
  value: T;
};

export type PersistedGMStoreValue<T> = StateValue<T> & {
  clear: () => Promise<void>;
  preload: () => PersistedGMStoreValue<T>;
  set: (value: T) => void;
  setAsync: (value: T) => Promise<void>;
  reload: () => Promise<T>;
};

type PersistedLocalStoreValue<T> = StateValue<T> & {
  clear: () => void;
  set: (value: T) => void;
  reload: () => T;
  stored: () => boolean;
};

type StateCodec<T> = {
  parse: (value: unknown) => T | undefined;
};

type LocalStateCodec<T> = StateCodec<T> & {
  serialize: (value: T) => string | null;
};

const persistedStateValues = new Set<{ reload: () => Promise<unknown> }>();

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

export function currentReaderOrientation(): ReaderOrientation {
  return window.matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait";
}

export function currentReaderControlsState() {
  return currentReaderOrientation() === "landscape"
    ? state.reader.landscapeControls
    : state.reader.portraitControls;
}

export async function loadState(): Promise<void> {
  await Promise.all(Array.from(persistedStateValues, (item) => item.reload()));
}

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

export function persisted<T>(
  key: string,
  defaultValue: T,
  codec: StateCodec<T> = { parse: (value) => value as T },
): PersistedGMStoreValue<T> {
  const item: PersistedGMStoreValue<T> = {
    defaultValue,
    value: defaultValue,
    async clear() {
      item.value = defaultValue;
      await GM.deleteValue(key);
    },
    preload() {
      persistedStateValues.add(item);
      return item;
    },
    set(value) {
      void item.setAsync(value).catch((error: unknown) => {
        console.error(`[ehpeek] Failed to persist ${key}`, error);
      });
    },
    async setAsync(value) {
      item.value = value;
      await GM.setValue(key, value);
    },
    async reload() {
      const stored = await GM.getValue<unknown>(key, defaultValue);
      const parsed = codec.parse(stored);
      item.value = parsed ?? defaultValue;
      if (parsed === undefined) {
        await GM.setValue(key, defaultValue);
      }
      return item.value;
    },
  };
  return item;
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

export function normalizeReaderScrollSizeScale(scale: number): number {
  return Number.isFinite(scale) ? Math.min(100, Math.max(0.001, scale)) : 1;
}

function local<T>(
  key: string,
  defaultValue: T,
  codec: LocalStateCodec<T>,
): PersistedLocalStoreValue<T> {
  const read = () => {
    const stored = window.localStorage.getItem(key);
    return stored === null ? defaultValue : codec.parse(stored) ?? defaultValue;
  };
  const item: PersistedLocalStoreValue<T> = {
    defaultValue,
    value: read(),
    set(value) {
      item.value = value;
      const stored = codec.serialize(value);
      if (stored === null) {
        window.localStorage.removeItem(key);
      } else {
        window.localStorage.setItem(key, stored);
      }
    },
    reload() {
      item.value = read();
      return item.value;
    },
    clear() {
      item.value = defaultValue;
      window.localStorage.removeItem(key);
    },
    stored() {
      return window.localStorage.getItem(key) !== null;
    },
  };
  return item;
}

function enumCodec<T extends string>(values: readonly T[]): LocalStateCodec<T> {
  return {
    parse: (value) => values.includes(value as T) ? value as T : undefined,
    serialize: (value) => value,
  };
}

function nullableCodec<T>(codec: LocalStateCodec<T>): LocalStateCodec<T | null> {
  return {
    parse: codec.parse,
    serialize: (value) => value === null ? null : codec.serialize(value),
  };
}

function arrayCodec<T>(valid: (value: unknown) => value is T): StateCodec<T[]> {
  return {
    parse: (value) => Array.isArray(value) ? value.filter(valid) : undefined,
  };
}

function jsonCodec<T>(codec: StateCodec<T>): LocalStateCodec<T> {
  return {
    parse(value) {
      if (typeof value !== "string") {
        return undefined;
      }
      try {
        return codec.parse(JSON.parse(value) as unknown);
      } catch {
        return undefined;
      }
    },
    serialize: (value) => JSON.stringify(value) ?? null,
  };
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
