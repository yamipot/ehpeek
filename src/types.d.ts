declare module "*.css" {
  const css: string;
  export default css;
}

declare module "ehpeek:uno.css" {
  const css: string;
  export default css;
}

declare module "ehpeek:spectrum-ui-scales" {
  type SizeScale = Record<"xs" | "sm" | "md" | "lg" | "xl", string>;
  type FontScale = SizeScale & Record<"prominent" | "title", string>;
  type IconScale = Record<"sm" | "md" | "lg" | "xl", string>;

  const scales: Record<
    import("./state").UiScale,
    {
      control: SizeScale;
      font: FontScale;
      icon: IconScale;
      statusDot: Record<"md" | "lg", string>;
      space: SizeScale;
      radius: SizeScale;
    }
  >;
  export default scales;
}

declare const __EHPEEK_DEBUG__: boolean;
declare const __EHPEEK_VERSION__: string;
declare const GM_getValue: <T>(key: string, defaultValue: T) => T;
declare const GM_setValue: <T>(key: string, value: T) => void;
declare const GM_deleteValue: (key: string) => void;
declare const GM_listValues: () => string[];
declare const GM_registerMenuCommand:
  | undefined
  | ((caption: string, commandFunc: () => void, accessKey?: string) => number | string);
declare const GM_download: (details: {
  url: string;
  name?: string;
  onerror?: (error: { error: string; details?: string }) => void;
}) => { abort: () => void };
