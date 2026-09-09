import type { ContentSource, LoadedReaderPage, ReaderPage } from "../kit/interfaces";
import { positiveNumber } from "../kit/helpers";
import { PriorityLoadQueue } from "../features/PriorityLoadQueue";

const LOADED_IMAGE_INFO_CACHE_LIMIT = 160;
const CONCURRENT_IMAGE_BYTE_LIMIT = 6 * 1024 * 1024;
const MIN_CONCURRENT_IMAGE_LOADS = 3;

export type ReaderLoadTarget = { pageNum: number; page: ReaderPage };
export type LoadedReaderImage = LoadedReaderPage & {
  pageNum: number;
  width: number | null;
  height: number | null;
  originalImageUrl: string | null;
};

/**
 * One Reader mount owns source-image requests, metadata retention and decode admission.
 * Decoded DOM images remain owned by PagesViewport.
 */
export class ReaderImages {
  readonly queue: PriorityLoadQueue<ReaderLoadTarget, LoadedReaderPage>;
  private readonly controller = new AbortController();
  private readonly loaded = new Map<number, LoadedReaderImage>();
  private readonly acquireBudget = createImageLoadBudget(
    CONCURRENT_IMAGE_BYTE_LIMIT,
    MIN_CONCURRENT_IMAGE_LOADS,
  );

  constructor(private readonly source: ContentSource, concurrentLoads?: number) {
    this.queue = new PriorityLoadQueue(concurrentLoads);
  }

  get(pageNum: number): LoadedReaderImage | undefined {
    return this.loaded.get(pageNum);
  }

  touch(pageNum: number): void {
    const image = this.loaded.get(pageNum);
    if (!image) return;
    this.loaded.delete(pageNum);
    this.loaded.set(pageNum, image);
  }

  load(target: ReaderLoadTarget): Promise<LoadedReaderPage> {
    return Promise.resolve(
      this.loaded.get(target.pageNum) ??
      this.source.loadImage(target.page, this.controller.signal),
    );
  }

  remember(pageNum: number, loaded: LoadedReaderPage): LoadedReaderImage {
    const image = {
      ...loaded,
      pageNum,
      imageUrl: loaded.imageUrl,
      originalImageUrl: loaded.originalImageUrl ?? null,
      width: positiveNumber(loaded.width),
      height: positiveNumber(loaded.height),
    };
    this.loaded.delete(pageNum);
    this.loaded.set(pageNum, image);
    while (this.loaded.size > LOADED_IMAGE_INFO_CACHE_LIMIT) {
      const oldest = this.loaded.keys().next().value;
      if (oldest === undefined) break;
      this.loaded.delete(oldest);
    }
    return image;
  }

  reserveDecode(byteSize: number | null | undefined): Promise<() => void> {
    return this.acquireBudget(byteSize ?? CONCURRENT_IMAGE_BYTE_LIMIT);
  }

  dispose(): void {
    this.controller.abort();
    this.queue.dispose();
  }
}

export function imageFileExtension(imageUrl: string): string {
  try {
    const fileName = decodeURIComponent(new URL(imageUrl).pathname.split("/").pop() ?? "");
    const extension = fileName.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();

    if (extension && ["avif", "bmp", "gif", "jpeg", "jpg", "png", "webp"].includes(extension)) {
      return extension;
    }
  } catch {
    return "";
  }
  return "";
}

function createImageLoadBudget(maxBytes: number, minConcurrentLoads: number) {
  type Waiter = {
    bytes: number;
    resolve: (release: () => void) => void;
  };
  const waiters: Waiter[] = [];
  let activeBytes = 0;
  let activeLoads = 0;

  const drain = (): void => {
    const next = waiters[0];
    if (
      !next ||
      (activeLoads >= minConcurrentLoads && activeBytes + next.bytes > maxBytes)
    ) {
      return;
    }
    waiters.shift();
    activeBytes += next.bytes;
    activeLoads += 1;
    let released = false;
    next.resolve(() => {
      if (released) {
        return;
      }
      released = true;
      activeBytes = Math.max(0, activeBytes - next.bytes);
      activeLoads = Math.max(0, activeLoads - 1);
      drain();
    });
    drain();
  };

  return (bytes: number): Promise<() => void> =>
    new Promise((resolve) => {
      waiters.push({ bytes, resolve });
      drain();
    });
}
