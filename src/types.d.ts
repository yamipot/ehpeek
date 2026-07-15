declare module "*.css" {
  const css: string;
  export default css;
}

declare module "ehpeek:uno.css" {
  const css: string;
  export default css;
}

declare const __EHPEEK_DEBUG__: boolean;
declare const GM_getValue: <T>(key: string, defaultValue: T) => T;
declare const GM_setValue: <T>(key: string, value: T) => void;
declare const GM_deleteValue: (key: string) => void;
declare const GM_listValues: () => string[];
declare const GM_registerMenuCommand:
  | undefined
  | ((caption: string, commandFunc: () => void, accessKey?: string) => number | string);

declare namespace JSX {
  type Element = HTMLElement | DocumentFragment;

  interface IntrinsicElements {
    [tagName: string]: Record<string, unknown>;
  }
}
