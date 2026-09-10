import { createContext, type Accessor, useContext } from "solid-js";
import type { PreviewCache } from "../features/PreviewCache";
import type { ReadProgressPort } from "../features/ReadProgressSyncer";
import type { PreviewDecodeCache } from "../ScrollPreview/DecodeCache";
import type { PreviewSettingsStore } from "./ScrollPreview";

export interface ScrollPreviewContext {
  previewCache: PreviewCache;
  decodeCache: PreviewDecodeCache;
  progress: ReadProgressPort;
  settings: PreviewSettingsStore;
  disabled: Accessor<boolean>;
  leftHanded: Accessor<boolean>;
  selectPage(pageNum: number): void;
  resize?(): void;
  close?(): void;
}

export const ScrollPreviewContextKey = createContext<ScrollPreviewContext>();

export function useScrollPreview(): ScrollPreviewContext {
  const preview = useContext(ScrollPreviewContextKey);
  if (!preview) throw new Error("ScrollPreview context is unavailable.");
  return preview;
}
