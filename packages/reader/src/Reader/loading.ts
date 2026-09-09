import type { ContentSource, ReaderPage, LoadedReaderPage } from "../kit/interfaces";
import type { ReaderTexts } from "../kit/i18n";
import type { PagesViewportActions, PagesViewportWindowOptions } from "./Viewport";
import type { ReaderOptions } from "./session";
import { normalizedAspectRatio, positiveNumber } from "../kit/helpers";
import { ReaderImages, imageFileExtension, type ReaderLoadTarget } from "./images";
import { pageWindowNumbers } from "./layout";

const DEFAULT_WINDOW_SIZE = 10;
const FALLBACK_ASPECT_RATIO = 1.42;
const PROGRESSIVE_IMAGE_SIZE_THRESHOLD = 2 * 1024 * 1024;

/** One mount's metadata window and image pipeline; navigation and rendering remain callers. */
export class ReaderPageLoader {
  // Connected by the viewport actionsRef before loading starts.
  viewport!: PagesViewportActions;
  readonly images: ReaderImages;
  readonly pages = new Map<number, ReaderPage>();
  private readonly controller = new AbortController();
  private readonly renderWindowSize: number;
  private readonly preloadWindowSize: number;
  private readonly totalPages: number | undefined;
  private revision = 0;
  private direction: -1 | 1 = 1;
  private directionEdgePageNum: number;

  constructor(
    private readonly source: ContentSource,
    options: ReaderOptions,
    private readonly position: { pageNum: () => number; doublePage: () => boolean; closed: () => boolean },
    private readonly callbacks: {
      onWindow: (window: PagesViewportWindowOptions) => void;
      onImagesChanged: () => void;
      onPagesReady: () => void;
      onImageSize: (pageNum: number, width: number | null, height: number | null) => void;
    },
    private readonly texts: ReaderTexts,
  ) {
    this.images = new ReaderImages(source, options.concurrentLoads);
    this.renderWindowSize = options.renderWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.preloadWindowSize = options.preloadWindowSize ?? DEFAULT_WINDOW_SIZE;
    this.totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
    this.directionEdgePageNum = position.pageNum();
    this.wireImageQueue();
  }

  invalidate(): number { return ++this.revision; }

  sync(afterWindow: () => void): void {
    const token = this.invalidate();
    const missing = pageWindowNumbers(this.position.pageNum(), this.renderWindowSize)
      .filter(number => number >= 1 && (!this.totalPages || number <= this.totalPages) && !this.pages.has(number));
    this.syncViewportWindow();
    this.maintainLoadQueue();
    afterWindow();
    if (missing.length) void this.loadMissingPages(missing, token);
  }

  dispose(): void {
    this.controller.abort();
    this.images.dispose();
  }

  async loadMissingPages(pageNums: number[], token: number): Promise<void> {
    await Promise.all(pageNums.map(async (pageNum) => {
      const groupPageNums = [pageNum];
      const loadingTokens = new Map(groupPageNums.flatMap((pageNum) => {
        const loadingToken = this.viewport.markPageLoading(pageNum);
        return loadingToken === null ? [] : [[pageNum, loadingToken] as const];
      }));
      let incoming: ReaderPage[];
      try {
        incoming = await this.source.getPages(groupPageNums, this.controller.signal);
      }
      catch (error) {
        console.error("[ehpeek]", error);
        const message = error instanceof Error ? error.message : this.texts.errors.loadFailed;
        for (const [pageNum, loadingToken] of loadingTokens) {
          this.viewport.setPageError(pageNum, loadingToken, message);
        }
        return;
      }

      if (this.position.closed()) {
        return;
      }
      this.addPages(incoming);
      const loadedPageNums = new Set(incoming.flatMap((page) =>
        page.pageNum && page.pageNum > 0 ? [page.pageNum] : []
      ));
      for (const [pageNum, loadingToken] of loadingTokens) {
        if (loadedPageNums.has(pageNum)) {
          this.viewport.resetPageLoading(pageNum, loadingToken);
        } else {
          this.viewport.setPageError(
            pageNum,
            loadingToken,
            this.texts.errors.imageNotFound,
          );
        }
      }
    }));

    if (this.position.closed() || token !== this.revision) {
      return;
    }
    this.syncViewportWindow();
    this.maintainLoadQueue();
    this.callbacks.onPagesReady();
  }

  private addPages(incomingPages: ReaderPage[]): void {
    for (const [index, page] of incomingPages.entries()) {
      const pageNum = pageNumForPage(page, index);
      if (pageNum > 0) {
        this.pages.set(pageNum, {
          ...page,
          aspectRatio: normalizedAspectRatio(page.aspectRatio, FALLBACK_ASPECT_RATIO),
          pageNum,
        });
      }
    }
  }

  syncViewportWindow(): void {
    this.callbacks.onWindow({
      currentPageNum: this.position.pageNum(),
      windowSize: this.renderWindowSize,
      totalPages: this.totalPages,
      pages: this.pageMetaForViewport(),
    });
    this.callbacks.onImagesChanged();
  }

  maintainLoadQueue(): void {
    const firstVisiblePageNum =
      this.viewport.firstVisiblePageNum() ?? this.position.pageNum();
    // Keep two pages of hysteresis before reversing prefetch priority; small
    // viewport shifts during layout should not repeatedly flip the queue.
    const movement = (firstVisiblePageNum - this.directionEdgePageNum) *
      this.direction;
    if (movement >= 0) {
      this.directionEdgePageNum = firstVisiblePageNum;
    } else if (-movement > 2) {
      this.direction = this.direction === 1 ? -1 : 1;
      this.directionEdgePageNum = firstVisiblePageNum;
    }
    const pageNums = [firstVisiblePageNum];
    for (let offset = 1; offset <= this.preloadWindowSize; offset += 1) {
      pageNums.push(firstVisiblePageNum + offset * this.direction);
    }
    pageNums.push(firstVisiblePageNum - this.direction);
    this.images.queue.sync(Array.from(new Set(pageNums)).flatMap((pageNum, priority) => {
      const target = this.loadTargetFor(pageNum);
      return target ? [{ key: pageNum, priority, target }] : [];
    }));
  }

  private pageMetaForViewport(): Map<number, {
    aspectRatio: number;
  }> {
    return new Map(Array.from(this.pages, ([pageNum, page]) => [pageNum, { aspectRatio: page.aspectRatio }]));
  }

  private loadTargetFor(pageNum: number): ReaderLoadTarget | null {
    const page = this.pages.get(pageNum);
    return page ? { pageNum, page } : null;
  }

  private wireImageQueue(): void {
    const installImage = async (
      target: ReaderLoadTarget,
      loaded: LoadedReaderPage,
      token: number,
    ): Promise<void> => {
      const imageUrl = loaded.imageUrl;
      const width = positiveNumber(loaded.width);
      const height = positiveNumber(loaded.height);
      let installed = false;
      try {
        installed = await this.viewport.loadPageImage(target.pageNum, token, {
          displayWhileLoading: loaded.displayWhileLoading ?? (
            imageFileExtension(imageUrl) === "gif" ||
            imageFileExtension(loaded.originalImageUrl ?? "") === "gif" ||
            (loaded.byteSize ?? 0) > PROGRESSIVE_IMAGE_SIZE_THRESHOLD
          ),
          imageUrl,
          highPriority: target.pageNum === this.position.pageNum() || (
            this.position.doublePage() &&
            target.pageNum === this.position.pageNum() + 1
          ),
          width,
          height,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : this.texts.errors.imageLoadFailed;
        this.viewport.setPageError(target.pageNum, token, message);
        return;
      }
      if (installed) this.callbacks.onImageSize(
        target.pageNum,
        this.viewport.pageImageWidth(target.pageNum),
        this.viewport.pageImageHeight(target.pageNum),
      );
      if (!this.position.closed()) {
        const currentPageNum = this.position.pageNum();
        if (target.pageNum === currentPageNum || (
          this.position.doublePage() &&
          target.pageNum === currentPageNum + 1
        )) {
          this.callbacks.onImagesChanged();
        }
      }
    };

    this.images.queue.updateCallbacks({
      loadTarget: (target) => this.images.load(target),
      markLoading: (target) => this.viewport.markPageLoading(target.pageNum),
      onLoaded: async (target, loaded, token) => {
        const image = this.images.remember(target.pageNum, loaded);
        this.callbacks.onImageSize(target.pageNum, image.width, image.height);
        if (!pageWindowNumbers(this.position.pageNum(), this.renderWindowSize).includes(target.pageNum)) {
          return;
        }
        const releaseBudget = await this.images.reserveDecode(image.byteSize);
        try {
          if (!pageWindowNumbers(this.position.pageNum(), this.renderWindowSize).includes(target.pageNum)) {
            return;
          }
          await installImage(target, image, token);
        } finally {
          releaseBudget();
        }
      },
      onError: (target, error, token) => {
        const message = error instanceof Error ? error.message : this.texts.errors.loadFailed;
        this.viewport.setPageError(target.pageNum, token, message);
      },
    });
  }

}

function pageNumForPage(page: ReaderPage | undefined, index: number): number {
  const pageNum = page?.pageNum;
  return typeof pageNum === "number" && Number.isFinite(pageNum) && pageNum > 0 ? pageNum : index + 1;
}
