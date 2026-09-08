import type { ReaderActions } from "./components/Reader";
import type { ScrollPreviewActions } from "./components/ScrollPreview";
import type { ContentSource } from "./ContentSource";
import type { ReaderPage } from "./readerTypes";
import type { ReaderSettingsState } from "./settings";
import type { ReaderCustomization } from "./customization";
import type { OverlayHost } from "./App/OverlayHost";
import {
  mountReaderSurface,
  type ReaderContainer,
  type ReaderSurface,
} from "./ReaderSurface";
import { SurfaceStack, type SurfaceHistory } from "./SurfaceStack";

export type ReaderPlacement = {
  container: ReaderContainer;
  coversPreview: boolean;
};
export type ReaderPresentationOptions = {
  source: ContentSource;
  settings: ReaderSettingsState;
  host: OverlayHost;
  customization?: ReaderCustomization;
  placement?: () => ReaderPlacement | null;
  fullscreenOnOpen?: boolean;
  exitOnFullscreenExit?: boolean;
  history?: SurfaceHistory;
  beforeOpen?: (pageNum: number) => Promise<boolean> | boolean;
  onReaderActions?: (actions: ReaderActions | null) => void;
  onError: (error: unknown) => void;
  onProgress: (page: ReaderPage) => void;
  onEnd?: () => void;
  onReaderOpen?: (pageNum: number, embedded: boolean) => void;
  onReaderMount?: (mounted: boolean) => void;
  onReaderClosed?: () => Promise<void> | void;
  onPreviewClosed?: (pageNum: number) => void;
};

/** Owns only presentation and surface lifetime, not content, settings or progress synchronization. */
export class ReaderPresentation {
  readonly stack: SurfaceStack;
  private reader: ReaderSurface | null = null;
  private readerActions: ReaderActions | null = null;
  private preview: ScrollPreviewActions | null = null;
  private coversPreview = false;
  private preservingFullscreen = false;
  private readonly stopFullscreen: () => void;
  private disposed = false;
  private opening: Promise<void> | null = null;

  constructor(private readonly options: ReaderPresentationOptions) {
    this.stack = new SurfaceStack(
      (surface) => this.closeSurface(surface),
      options.onError,
      options.history,
    );
    let wasFullscreen = options.host.fullscreen.active();
    this.stopFullscreen = options.host.fullscreen.subscribe((active) => {
      if (
        wasFullscreen &&
        !active &&
        !this.preservingFullscreen &&
        options.exitOnFullscreenExit &&
        this.reader
      ) {
        this.preview?.close();
        this.reader.dispose();
        this.stack.requestCloseAll();
      } else {
        this.reader?.setFullscreenActive(active);
      }
      wasFullscreen = active;
    });
  }
  attachPreview(actions: ScrollPreviewActions | null): void {
    this.preview = actions;
  }
  syncPreview(pageNum: number): void {
    this.preview?.progress.setProgress(pageNum);
  }
  get previewOpen(): boolean {
    return this.stack.top === "preview";
  }
  get readerOpen(): boolean {
    return this.reader !== null;
  }

  openReader(pageNum: number, configuredFullscreen = false): Promise<void> {
    if (this.opening) {
      return this.opening.then(() => {
        if (!this.disposed) this.readerActions?.gotoPage(pageNum);
      });
    }
    const opening = this.mountReader(pageNum, configuredFullscreen);
    this.opening = opening;
    return opening.finally(() => {
      this.opening = null;
    });
  }
  private async mountReader(
    pageNum: number,
    configuredFullscreen: boolean,
  ): Promise<void> {
    if (this.disposed) return;
    if (this.options.beforeOpen && !(await this.options.beforeOpen(pageNum)))
      return;
    if (this.disposed) return;
    if (this.reader) {
      this.readerActions?.gotoPage(pageNum);
      return;
    }
    const placement = this.options.placement?.() ?? null;
    if (
      !placement &&
      configuredFullscreen &&
      this.options.fullscreenOnOpen &&
      !document.fullscreenElement &&
      document.fullscreenEnabled &&
      typeof this.options.host.element.requestFullscreen === "function"
    ) {
      let entered = false;
      try {
        await this.options.host.fullscreen.enter();
        entered = true;
      } catch (error) {
        console.warn("[reader] Fullscreen request failed", error);
      }
      if (this.disposed || (entered && !this.options.host.fullscreen.active()))
        return;
    }
    this.coversPreview = placement?.coversPreview ?? false;
    this.stack.push("reader");
    try {
      this.options.onReaderOpen?.(pageNum, placement !== null);
      this.options.onReaderMount?.(true);
      this.reader = mountReaderSurface({
        cover: placement?.container ?? null,
        options: {
          initialPageNum: pageNum,
          totalPages: this.options.source.totalPages,
        },
        source: this.options.source,
        settings: this.options.settings,
        customization: {
          ...this.options.customization,
          onOpenOriginalPage: this.options.customization?.onOpenOriginalPage
            ? (url, page) => {
                void this.exitFullscreen()
                  .then(() =>
                    this.options.customization?.onOpenOriginalPage?.(url, page),
                  )
                  .catch(this.options.onError);
              }
            : undefined,
        },
        overlayHost: this.options.host,
        actionsRef: (actions) => {
          this.readerActions = actions;
          this.options.onReaderActions?.(actions);
        },
        callbacks: {
          onClose: () => this.stack.requestClose("reader"),
          onProgress: this.options.onProgress,
          onEnd: () => this.options.onEnd?.(),
          onOpenPreview: (page) => this.openReaderPreview(page),
          onToggleFullscreen: () => this.toggleFullscreen(),
        },
      });
    } catch (error) {
      this.options.onReaderMount?.(false);
      this.stack.rollbackPush("reader");
      await this.exitFullscreen();
      throw error;
    }
  }
  openPreview(pageNum: number): void {
    if (!this.previewOpen) this.stack.push("preview");
    this.preview?.gotoPage(pageNum);
  }
  openReaderPreview(pageNum: number): void {
    this.syncPreview(pageNum);
    if (this.coversPreview && this.reader?.embedded()) {
      if (!this.previewOpen) this.stack.push("preview");
      this.reader.setVisible(false);
      this.preview?.showEmbeddedPage(pageNum);
    } else {
      this.openPreview(pageNum);
    }
  }
  selectPage(pageNum: number): void {
    const open = () => {
      void this.openReader(pageNum, true).catch(this.options.onError);
    };
    if (this.previewOpen) this.stack.requestClose("preview", open);
    else open();
  }
  requestClosePreview(pageNum: number): void {
    this.stack.requestClose("preview", () =>
      this.options.onPreviewClosed?.(pageNum),
    );
  }
  private async closeSurface(surface: "reader" | "preview"): Promise<void> {
    if (surface === "preview") {
      this.preview?.close();
      this.reader?.setVisible(true);
      return;
    }
    const reader = this.reader;
    this.reader = null;
    reader?.dispose();
    this.options.onReaderMount?.(false);
    await this.exitFullscreen();
    await this.options.onReaderClosed?.();
  }
  private async exitFullscreen(): Promise<void> {
    this.preservingFullscreen = true;
    try {
      await this.options.host.fullscreen.exit();
    } finally {
      this.preservingFullscreen = false;
    }
  }
  toggleFullscreen(): void {
    const request = this.options.host.fullscreen.active()
      ? this.exitFullscreen()
      : this.options.host.fullscreen.enter();
    void request.catch(this.options.onError);
  }
  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.stopFullscreen();
    this.stack.dispose();
    this.preview?.close();
    this.reader?.dispose();
    this.reader = null;
    this.options.onReaderMount?.(false);
    await this.opening?.catch(this.options.onError);
    await this.exitFullscreen();
  }
}
