export type NavigationMode = "scroll" | "paged";
export type ReadDirection = "ltr" | "rtl" | "ttb";
export type PageLayout = "single" | "double";
export type RightTapAction = "previous" | "next";
export type ReaderScrollSizeScale = number | "one-to-one" | null;
export type ReaderOrientation = "portrait" | "landscape";
export type GalleryTitlePreference = "main" | "sub";
export type UiScale = "small" | "medium" | "large";
export type SearchGridMode = "ehpeek" | "ehpeek-lite";
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
  set: (value: T) => void;
  reload: () => T;
};

const touchUiDefault = window.matchMedia("(pointer: coarse)").matches;
const portraitUiScaleDefault: UiScale = touchUiDefault ? "large" : "small";
const landscapeUiScaleDefault: UiScale = touchUiDefault &&
    Math.min(window.screen.width, window.screen.height) >= 600
  ? "medium"
  : portraitUiScaleDefault;

export const state = {
  app: {
    ehSyringeDetected: persisted("ehpeek:ehsyringe:detected", false),
    leftHandedControls: persisted("ehpeek:left-handed-controls", false),
    openGalleryInNewTab: persisted("ehpeek:open-gallery-in-new-tab", false),
    portraitUiScale: persisted<UiScale>("ehpeek:ui-scale:portrait", portraitUiScaleDefault),
    landscapeUiScale: persisted<UiScale>("ehpeek:ui-scale:landscape", landscapeUiScaleDefault),
  },
  reader: {
    enabled: persisted("ehpeek:reader:enabled", true),
    exitOnFullscreenExit: persisted("ehpeek:reader:exit-on-fullscreen-exit", false),
    fullscreen: persisted("ehpeek:reader:fullscreen", false),
    portraitControls: readerControls("portrait"),
    landscapeControls: readerControls("landscape"),
    scrollTtbScale: persisted<ReaderScrollSizeScale>("ehpeek:reader:scroll-ttb-scale", null),
    scrollHorizontalScale: persisted<ReaderScrollSizeScale>("ehpeek:reader:scroll-horizontal-scale", null),
  },
  gallery: {
    enhanceThumbs: persisted("ehpeek:enhance-thumbs:enabled", true),
    floatingReadButton: persisted("ehpeek:gallery:floating-read-button", false),
    replacePreviewWithScroll: persisted("ehpeek:scroll-preview:replace-original", false),
    embeddedScrollPreviewSingleDirection: persisted<ReadDirection>(
      "ehpeek:gallery-scroll-preview:single-direction",
      "rtl",
    ),
    embeddedScrollPreviewColumnsDirection: persisted<ReadDirection>(
      "ehpeek:gallery-scroll-preview:columns-direction",
      "ttb",
    ),
    scrollPreviewDirection: persisted<ReadDirection>(
      "ehpeek:scroll-preview:direction",
      "ttb",
    ),
    myTags: persisted("ehpeek:my-tags:enabled", true),
    myTagAppearances: localJson("ehpeek:my-tags", [], isMyTagAppearance),
    myTagSets: localJson("ehpeek:my-tag-sets", [], isMyTagSetOption),
    readHistory: persisted("ehpeek:read-history:enabled", true),
    includeUnreadHistory: persisted("ehpeek:read-history:include-unread", true),
    readHistoryCount: persisted("ehpeek:history-count", 0),
    titlePreference: localEnum<GalleryTitlePreference>(
      "ehpeek:gallery-title-preference",
      "main",
      ["main", "sub"],
    ),
  },
  search: {
    enhance: persisted("ehpeek:enhance-search:enabled", true),
    grid: localOptionalEnum<SearchGridMode>(
      "ehpeek:search-grid",
      ["ehpeek", "ehpeek-lite"],
    ),
    history: persisted("ehpeek:search-history:enabled", true),
    searchHistory: persisted<string[]>("ehpeek:search:history", []),
  },
  touch: {
    enabled: persisted("ehpeek:touch-ui:enabled", touchUiDefault),
    portraitColumns: persisted("ehpeek:touch-ui:portrait-columns", false),
    landscapeColumns: persisted("ehpeek:touch-ui:landscape-columns", true),
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

export function loadSearchHistory(): string[] {
  const history = state.search.searchHistory.reload();
  return Array.isArray(history) ? history.filter((item): item is string => typeof item === "string") : [];
}

export function addSearchHistory(value: string): string[] {
  const normalized = value.trim();

  if (!normalized) {
    return loadSearchHistory();
  }

  const history = [normalized, ...loadSearchHistory().filter((item) => item !== normalized)];
  state.search.searchHistory.set(history);
  return history;
}

export function removeSearchHistory(value: string): string[] {
  const history = loadSearchHistory().filter((item) => item !== value);
  state.search.searchHistory.set(history);
  return history;
}

function persisted<T>(key: string, defaultValue: T): StateValue<T> {
  const item: StateValue<T> = {
    defaultValue,
    value: GM_getValue(key, defaultValue),
    set(value) {
      item.value = value;
      GM_setValue(key, value);
    },
    reload() {
      item.value = GM_getValue(key, defaultValue);
      return item.value;
    },
  };

  return item;
}

function readerControls(orientation: ReaderOrientation) {
  return {
    navigationMode: persisted<NavigationMode>(`ehpeek:reader:navigation-mode:${orientation}`, "scroll"),
    scrollDirection: persisted<ReadDirection>(`ehpeek:reader:scroll-direction:${orientation}`, "ttb"),
    pagedDirection: persisted<ReadDirection>(`ehpeek:reader:paged-direction:${orientation}`, "rtl"),
    pageLayout: persisted<PageLayout>(`ehpeek:reader:page-layout:${orientation}`, "single"),
    rightTapAction: persisted<RightTapAction>(`ehpeek:reader:right-tap-action:${orientation}`, "previous"),
  } as const;
}

export function normalizeReaderScrollSizeScale(scale: number): number {
  return Number.isFinite(scale) ? Math.min(100, Math.max(0.001, scale)) : 1;
}

function localOptionalEnum<T extends string>(
  key: string,
  values: readonly T[],
): StateValue<T | null> {
  const read = () => {
    const value = window.localStorage.getItem(key);
    return values.includes(value as T) ? value as T : null;
  };
  const item: StateValue<T | null> = {
    defaultValue: null,
    value: read(),
    set(value) {
      item.value = value;
      if (value !== null) {
        window.localStorage.setItem(key, value);
      } else {
        window.localStorage.removeItem(key);
      }
    },
    reload() {
      item.value = read();
      return item.value;
    },
  };
  return item;
}

function localEnum<T extends string>(
  key: string,
  defaultValue: T,
  values: readonly T[],
): StateValue<T> {
  const read = () => {
    const value = window.localStorage.getItem(key);
    return values.includes(value as T) ? value as T : defaultValue;
  };
  const item: StateValue<T> = {
    defaultValue,
    value: read(),
    set(value) {
      item.value = value;
      window.localStorage.setItem(key, value);
    },
    reload() {
      item.value = read();
      return item.value;
    },
  };
  return item;
}

function localJson<T>(key: string, defaultValue: T[], valid: (value: unknown) => value is T): StateValue<T[]> & {
  clear: () => void;
  stored: () => boolean;
} {
  const read = () => {
    try {
      const value: unknown = JSON.parse(window.localStorage.getItem(key) ?? "null");
      return Array.isArray(value) ? value.filter(valid) : defaultValue;
    } catch {
      return defaultValue;
    }
  };
  const item = {
    defaultValue,
    value: read(),
    set(value: T[]) {
      item.value = value;
      window.localStorage.setItem(key, JSON.stringify(value));
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
