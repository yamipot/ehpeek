import type { JSX } from "solid-js";

export type ReaderCustomization = {
  download?: (url: string, name: string) => boolean;
  downloadHelp?: () => JSX.Element;
  onOpenOriginalPage?: (url: string, pageNum: number) => void;
};
