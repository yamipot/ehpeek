export type ViewMode = "scroll" | "paged";
export type ReadDirection = "ltr" | "rtl";
export type RightTapAction = "previous" | "next";
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

export const state = {
  app: {
    ehSyringeDetected: persisted("ehpeek:ehsyringe:detected", false),
    openGalleryInNewTab: persisted("ehpeek:open-gallery-in-new-tab", false),
    welcomeIcon: persisted("ehpeek:welcome-icon:enabled", true),
  },
  reader: {
    enabled: persisted("ehpeek:reader:enabled", true),
    fullscreen: persisted("ehpeek:reader:fullscreen", prefersTouchFullscreen()),
    viewMode: persisted<ViewMode>("ehpeek:reader:view-mode", "scroll"),
    readDirection: persisted<ReadDirection>("ehpeek:reader:read-direction", "rtl"),
    rightTapAction: persisted<RightTapAction>("ehpeek:reader:right-tap-action", "previous"),
  },
  gallery: {
    enhanceThumbs: persisted("ehpeek:enhance-thumbs:enabled", true),
    myTags: persisted("ehpeek:my-tags:enabled", true),
    myTagAppearances: localJson("ehpeek:my-tags", [], isMyTagAppearance),
    myTagSets: localJson("ehpeek:my-tag-sets", [], isMyTagSetOption),
    readHistory: persisted("ehpeek:read-history:enabled", true),
    readHistoryCount: persisted("ehpeek:history-count", 0),
  },
  search: {
    enhance: persisted("ehpeek:enhance-search:enabled", true),
    grid: localSelection("ehpeek:search-grid", "ehpeek"),
    history: persisted("ehpeek:search-history:enabled", true),
    searchHistory: persisted<string[]>("ehpeek:search:history", []),
  },
  touch: {
    enabled: persisted("ehpeek:touch-ui:enabled", touchUiDefault),
  },
} as const;

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

function prefersTouchFullscreen(): boolean {
  return window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;
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

function localSelection(key: string, selectedValue: string): StateValue<boolean> {
  const read = () => window.localStorage.getItem(key) === selectedValue;
  const item: StateValue<boolean> = {
    defaultValue: false,
    value: read(),
    set(value) {
      item.value = value;
      if (value) {
        window.localStorage.setItem(key, selectedValue);
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
