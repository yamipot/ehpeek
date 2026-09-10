import type { Accessor, JSX } from "solid-js";
import type { OverlayHost } from "./Widgets/OverlayHost";
import type { ReaderTexts } from "./i18n";
import type { UiScale } from "./ui";

export type { OverlayHost } from "./Widgets/OverlayHost";
export type { ReaderTexts } from "./i18n";
export type { UiScale, UiSizeScale } from "./ui";

export type ReaderPage = {
  url: string;
  aspectRatio: number;
  pageNum?: number;
};

export type LoadedReaderPage = {
  imageUrl: string;
  fileName?: string;
  originalFileName?: string;
  byteSize?: number | null;
  displayWhileLoading?: boolean;
  originalImageUrl?: string | null;
  width?: number | null;
  height?: number | null;
};

export type PreviewItem = {
  aspectRatio: number;
  pageNum: number;
  pageUrl: string;
  thumbnail: {
    backgroundPosition: string;
    backgroundRepeat: string;
    backgroundSize: string;
    height: number;
    kind: "background" | "image";
    url: string;
    width: number;
  };
};

/** Logical reading pages only; client pagination and request caching stay behind this interface. */
export type ContentSource = {
  totalPages: number;
  initialPageNum: number;
  aspectRatio: number;
  initialPreviewItems: PreviewItem[];
  getPages: (pageNums: number[], signal?: AbortSignal) => Promise<ReaderPage[]>;
  getPreviewItems: (
    pageNums: number[],
    signal?: AbortSignal,
  ) => Promise<PreviewItem[]>;
  loadImage: (
    page: ReaderPage,
    signal?: AbortSignal,
  ) => Promise<LoadedReaderPage>;
};

export type ReaderCustomization = {
  download?: (url: string, name: string) => boolean;
  downloadHelp?: () => JSX.Element;
  onOpenOriginalPage?: (url: string, pageNum: number) => void;
};

export type ReaderContainer = {
  available: () => boolean;
  bounds: () => {
    height: number;
    left: number;
    top: number;
    width: number;
  } | null;
  listen: (callbacks: { onBoundsChange: () => void }) => () => void;
};

export type ReaderPlacement = {
  container: ReaderContainer;
  coversPreview: boolean;
};

export type ReadingSurface = "reader" | "preview";
export type SurfaceHistory = {
  push: (depth: number, surface: ReadingSurface) => void;
  back: (count: number) => void;
  subscribe: (listener: (depth: number) => void) => () => void;
};

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
/** Independently reactive preference; changed values also notify onSettingChange. */
export type SettingItem<T> = {
  value: Accessor<T>;
  set(value: T): void;
};
export type OrientationSettingsState = {
  navigationMode: SettingItem<NavigationMode>;
  scrollDirection: SettingItem<ReadDirection>;
  pagedDirection: SettingItem<ReadDirection>;
  pageLayout: SettingItem<PageLayout>;
  rightTapAction: SettingItem<RightTapAction>;
};
export type ReaderSettingsState = {
  portraitControls: OrientationSettingsState;
  landscapeControls: OrientationSettingsState;
  scrollTtbScale: SettingItem<ReaderScrollSizeScale>;
  scrollHorizontalScale: SettingItem<ReaderScrollSizeScale>;
  leftHandedControls: SettingItem<boolean>;
  previewDirection: SettingItem<ReadDirection>;
  embeddedPreviewDirection: SettingItem<ReadDirection>;
};

export type ReadingViewOptions = {
  source: ContentSource;
  /** Initial preferences; use instance.settings for later changes. */
  settings?: Partial<ReaderSettings>;
  /** Reports changed values, including programmatic and prop-driven updates. */
  onSettingChange?: SettingCallbacks;
  /** Injected hosts remain caller-owned; otherwise ReadingView creates and removes its host. */
  host?: OverlayHost;
  texts?: ReaderTexts;
  uiScale?: UiScale;
  initialProgress?: number | null;
  customization?: ReaderCustomization;
  placement?: () => ReaderPlacement | null;
  fullscreenOnOpen?: boolean;
  exitOnFullscreenExit?: boolean;
  history?: SurfaceHistory;
  beforeOpen?: (pageNum: number) => Promise<boolean> | boolean;
  onProgress?: (page: ReaderPage) => void;
  onError?: (error: unknown) => void;
  onEnd?: () => void;
  onReaderOpen?: (pageNum: number, embedded: boolean) => void;
  /** Reports whether Reader is being mounted; open() separately waits for child mount completion. */
  onReaderMount?: (mounted: boolean) => void;
  onReaderClosed?: () => Promise<void> | void;
  /** A return from Preview, not page selection or dismissal of the whole reader. */
  onPreviewClosed?: (pageNum: number) => void;
};
export type ReaderInstance = {
  settings: ReaderSettingsState;
  progress: Accessor<number | null>;
  /** Snapshot for lifecycle callbacks, not reactive view state. */
  readonly activeView: ReadingSurface | null;
  open: (pageNum?: number, fullscreen?: boolean) => Promise<void>;
  openPreview: (pageNum?: number) => void;
};

export type ReadingViewProps = {
  /** Suspend user input without stopping loading or programmatic progress updates. */
  disabled?: boolean;
  /** Configuration for this mount; remount to replace the content source or host. */
  options: ReadingViewOptions;
  embeddedPreview?: boolean;
  fillPreviewContainer?: Accessor<boolean>;
  /** Changes write into instance settings; these props do not continuously enforce a controlled value. */
  embeddedDirection?: ReadDirection;
  leftHandedControls?: boolean;
  /** Navigation/settings access; Solid owns lifetime and clears the ref on unmount. */
  instanceRef?: (instance: ReaderInstance | null) => void;
};
