import { createSignal, untrack, type Accessor } from "solid-js";

export type NavigationMode = "scroll" | "paged";
export type ReadDirection = "ltr" | "rtl" | "ttb";
export type PageLayout = "single" | "double";
export type RightTapAction = "previous" | "next";
export type ReaderScrollSizeScale = number | "fill" | "one-to-one" | null;
export type ReaderOrientation = "portrait" | "landscape";
export type OrientationSettings = {
  navigationMode: NavigationMode;
  scrollDirection: ReadDirection;
  pagedDirection: ReadDirection;
  pageLayout: PageLayout;
  rightTapAction: RightTapAction;
};
export type ReaderSettings = {
  portraitControls: OrientationSettings;
  landscapeControls: OrientationSettings;
  scrollTtbScale: ReaderScrollSizeScale;
  scrollHorizontalScale: ReaderScrollSizeScale;
  leftHandedControls: boolean;
  previewDirection: ReadDirection;
  embeddedPreviewDirection: ReadDirection;
};
export type SettingCallbacks = {
  [K in keyof ReaderSettings]?: (value: ReaderSettings[K]) => void;
};
export type ReaderSettingsState = {
  value: Accessor<ReaderSettings>;
  set: <K extends keyof ReaderSettings>(
    key: K,
    value: ReaderSettings[K],
  ) => void;
  controls: () => OrientationSettings;
  updateControls: (controls: OrientationSettings) => void;
};
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
