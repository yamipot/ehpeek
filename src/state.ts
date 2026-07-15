export type ViewMode = "scroll" | "paged";
export type ReadDirection = "ltr" | "rtl";
export type RightTapAction = "previous" | "next";

type StateValue<T> = {
  key: string;
  defaultValue: T;
  value: T;
  set: (value: T) => void;
  reload: () => T;
};

export const state = {
  reader: {
    enabled: persisted("ehpeek:reader:enabled", true),
    viewMode: persisted<ViewMode>("ehpeek:reader:view-mode", "scroll"),
    readDirection: persisted<ReadDirection>("ehpeek:reader:read-direction", "rtl"),
    rightTapAction: persisted<RightTapAction>("ehpeek:reader:right-tap-action", "previous"),
  },
  gallery: {
    enhanceThumbs: persisted("ehpeek:enhance-thumbs:enabled", true),
  },
  search: {
    enhance: persisted("ehpeek:enhance-search:enabled", true),
  },
  touch: {
    enabled: persisted("ehpeek:touch-ui:enabled", true),
  },
} as const;

function persisted<T>(key: string, defaultValue: T): StateValue<T> {
  const item: StateValue<T> = {
    key,
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
