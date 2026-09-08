import type { ReaderSettings, ReaderSettingsState, SettingCallbacks, OrientationSettings, ReaderOrientation } from "../kit/interfaces";
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
  const [value, update] = createSignal<ReaderSettings>({
    portraitControls: { ...defaultControls },
    landscapeControls: { ...defaultControls },
    scrollTtbScale: "fill",
    scrollHorizontalScale: "fill",
    leftHandedControls: false,
    previewDirection: "ttb",
    embeddedPreviewDirection: "rtl",
    ...initial,
  });
  const set: ReaderSettingsState["set"] = (key, next) => {
    if (Object.is(untrack(value)[key], next)) return;
    update((current) => ({ ...current, [key]: next }));
    callbacks[key]?.(next);
  };
  const controlsKey = () =>
    currentReaderOrientation() === "landscape"
      ? "landscapeControls"
      : "portraitControls";
  return {
    value,
    set,
    controls: () => value()[controlsKey()],
    updateControls: (controls) => set(controlsKey(), controls),
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
