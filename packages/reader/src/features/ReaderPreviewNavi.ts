import type { Accessor } from "solid-js";

export type ReaderPreviewPanel = "reader" | "overlay-preview" | "embedded-preview" | null;

interface ReaderPreviewViews {
  top: Accessor<ReaderPreviewPanel>;
  previewMode: Accessor<"overlay" | "embedded">;
  openReader(pageNum: number, configuredFullscreen: boolean): Promise<void>;
  openPreview(pageNum: number, mode: "overlay" | "embedded"): void;
  focusPreview(pageNum: number): void;
  closePreview(notifyReturn: boolean): Promise<void>;
  closeReader(): Promise<void>;
  onError(error: unknown): void;
}

/** Navigation between Reader and Preview. */
export interface ReaderPreviewNavi {
  /** Read a page, leaving temporary Preview; configuredFullscreen honors the fullscreen preference. */
  openReader(pageNum: number, configuredFullscreen?: boolean): Promise<void>;
  /** Browse in overlay Preview, or reveal the covered embedded preview when requested from Reader. */
  openPreview(pageNum: number, fromReader?: boolean): void;
  /** Leave the top panel. Returns whether there was a panel to leave, not whether closure has finished. */
  back(): boolean;
  /** Leave both Reader and temporary Preview, rather than return from Preview to Reader. */
  closeAll(): void;
}

export function ReaderPreviewNavi(views: ReaderPreviewViews): ReaderPreviewNavi {
  return {
    async openReader(pageNum, configuredFullscreen = false) {
      const top = views.top();
      if (top === "overlay-preview" || top === "embedded-preview") await views.closePreview(false);
      await views.openReader(pageNum, configuredFullscreen);
    },
    openPreview(pageNum, fromReader = false) {
      if (fromReader) views.focusPreview(pageNum);
      views.openPreview(pageNum, fromReader ? views.previewMode() : "overlay");
    },
    back() {
      const top = views.top();
      if (!top) return false;
      void (top === "reader" ? views.closeReader() : views.closePreview(true)).catch(views.onError);
      return true;
    },
    closeAll() {
      void views.closeReader().catch(views.onError);
    },
  };
}
