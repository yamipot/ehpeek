import type { ReaderSettings, ReaderSettingsState, SettingCallbacks, SettingItem, OrientationSettings, OrientationSettingsState, ReaderOrientation } from "../kit/interfaces";
import { createSignal, untrack } from "solid-js";

const defaultControls: OrientationSettings = {
  navigationMode: "scroll",
  scrollDirection: "ttb",
  pagedDirection: "rtl",
  pageLayout: "single",
  rightTapAction: "previous",
};

export function createReaderSettings(
  initial: Partial<ReaderSettings> = {},
  callbacks: SettingCallbacks = {},
): ReaderSettingsState {
  return {
    portraitControls: createOrientationSettings(initial.portraitControls, callbacks.portraitControls),
    landscapeControls: createOrientationSettings(initial.landscapeControls, callbacks.landscapeControls),
    scrollTtbScale: createSettingItem(
      initial.scrollTtbScale === undefined ? "fill" : initial.scrollTtbScale,
      callbacks.scrollTtbScale,
    ),
    scrollHorizontalScale: createSettingItem(
      initial.scrollHorizontalScale === undefined ? "fill" : initial.scrollHorizontalScale,
      callbacks.scrollHorizontalScale,
    ),
    leftHandedControls: createSettingItem(initial.leftHandedControls ?? false, callbacks.leftHandedControls),
    previewDirection: createSettingItem(initial.previewDirection ?? "ttb", callbacks.previewDirection),
    embeddedPreviewDirection: createSettingItem(initial.embeddedPreviewDirection ?? "rtl", callbacks.embeddedPreviewDirection),
  };
}

function createOrientationSettings(
  initial: OrientationSettings = defaultControls,
  onChange?: (value: OrientationSettings) => void,
): OrientationSettingsState {
  // Persistence still uses an orientation snapshot; UI updates remain per preference.
  const notify = () => onChange?.(untrack(() => ({
    navigationMode: settings.navigationMode.value(),
    scrollDirection: settings.scrollDirection.value(),
    pagedDirection: settings.pagedDirection.value(),
    pageLayout: settings.pageLayout.value(),
    rightTapAction: settings.rightTapAction.value(),
  })));
  const settings: OrientationSettingsState = {
    navigationMode: createSettingItem(initial.navigationMode, notify),
    scrollDirection: createSettingItem(initial.scrollDirection, notify),
    pagedDirection: createSettingItem(initial.pagedDirection, notify),
    pageLayout: createSettingItem(initial.pageLayout, notify),
    rightTapAction: createSettingItem(initial.rightTapAction, notify),
  };
  return settings;
}

function createSettingItem<T extends string | number | boolean | null>(
  initial: T,
  onChange?: (value: T) => void,
): SettingItem<T> {
  const [value, setValue] = createSignal(initial);
  return {
    value,
    set(next) {
      if (Object.is(untrack(value), next)) return;
      setValue(() => next);
      onChange?.(next);
    },
  };
}

export function currentReaderOrientation(): ReaderOrientation {
  return window.matchMedia("(orientation: landscape)").matches
    ? "landscape"
    : "portrait";
}

export function normalizeReaderScrollSizeScale(scale: number): number {
  return Number.isFinite(scale) ? Math.min(100, Math.max(0.001, scale)) : 1;
}
