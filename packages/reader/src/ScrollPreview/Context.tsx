import { createContext, type Accessor, useContext } from "solid-js";
import type { PreviewCache } from "../features/PreviewCache";
import type { ReadProgressPort } from "../features/ReadProgressSyncer";
import type { PreviewDecodeCache } from "./DecodeCache";
import type { PreviewSettingsStore } from "./index";
import type { createPreviewLoading } from "./loading";

export interface ScrollPreviewContext {
  previewCache: PreviewCache;
  decodeCache: PreviewDecodeCache;
  progress: ReadProgressPort;
  settings: PreviewSettingsStore;
  loading: ReturnType<typeof createPreviewLoading>;
  visible: Accessor<boolean>;
  disabled: Accessor<boolean>;
  leftHanded: Accessor<boolean>;
  selectPage(pageNum: number): void;
  resize?(): void;
  close?(): void;
}

export const ScrollPreviewContextKey = createContext<ScrollPreviewContext>();

export function useScrollPreviewContext(): ScrollPreviewContext {
  const ctx = useContext(ScrollPreviewContextKey);
  if (!ctx) throw new Error("ScrollPreview context is unavailable.");
  return ctx;
}
