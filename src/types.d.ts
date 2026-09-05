declare module "*.css" {
  const css: string;
  export default css;
}

declare module "ehpeek:uno.css" {
  const css: string;
  export default css;
}

declare module "ehpeek:spectrum-ui-sizes" {
  type UiSizeScale = import("./ui").UiSizeScale;

  const sizes: {
    control: UiSizeScale;
    font: UiSizeScale;
    icon: UiSizeScale;
    space: UiSizeScale;
    radius: UiSizeScale;
  };
  export default sizes;
}

declare const __EHPEEK_DEBUG__: boolean;
declare const __EHPEEK_NAME__: string;
declare const __EHPEEK_VERSION__: string;

type GmDownloadDetails = {
  url: string;
  name?: string;
  onerror?: (error: { error: string; details?: string }) => void;
};

declare const GM: {
  getValue: <T>(key: string, defaultValue: T) => Promise<T>;
  setValue: <T>(key: string, value: T) => Promise<void>;
  deleteValue: (key: string) => Promise<void>;
  listValues: () => Promise<string[]>;
  registerMenuCommand?: (
    caption: string,
    commandFunc: () => void,
    accessKey?: string,
  ) => Promise<number | string>;
  download?: (details: GmDownloadDetails) => Promise<{ abort: () => void }>;
};

declare const GM_download:
  | undefined
  | ((details: GmDownloadDetails) => { abort: () => void });
