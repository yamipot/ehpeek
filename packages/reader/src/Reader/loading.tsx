import { createEffect, createMemo, createSignal, on, onCleanup, untrack, type Accessor } from "solid-js";
import { useReaderTexts } from "../kit/i18n";
import { ReaderImages, imageFileExtension } from "./images";
import { normalizedAspectRatio } from "../kit/helpers";
import { pageWindowNumbers } from "./layout";
import type { ContentSource, LoadedReaderPage, ReaderPage } from "../kit/interfaces";

/** A page's metadata can be available before its image is ready for display. */
export interface ReaderPageResource {
  readonly page: ReaderPage | null;
  readonly image: LoadedReaderPage | null;
  /** Decoded or progressively displayed DOM image; loading owns retention and eviction. */
  readonly element: HTMLImageElement | null;
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly error: string | null;
}

export interface ReaderLoading {
  /** Content, blank and end-screen page numbers needed by the current render window. */
  windowPages: Accessor<readonly number[]>;
  /** Reactive content-page resource; an unrequested page is idle, and non-content slots return undefined. */
  page(pageNum: number): ReaderPageResource | undefined;
  /** Retry either metadata or image loading according to the page's current failure. */
  retry(pageNum: number): void;
}

/** Owns request cancellation, page failures, prefetch direction and decoded-image retention. */
export function createReaderLoading(options: {
  source: ContentSource;
  /** Reading destination used to choose the render window, including tentative progress seeks. */
  requestedPage: Accessor<number>;
  /** Pages of the displayed spread receive high-priority image fetches, including its second page. */
  priorityPages: Accessor<readonly number[]>;
  /** Read-only viewport observation used for prefetch priority; loading does not measure the DOM. */
  firstVisiblePage: Accessor<number | null>;
  /** Seek previews replace the render window without starting new prefetch work until commitment. */
  seeking: Accessor<boolean>;
  /** Closure has been accepted; ignore remaining results before the host finishes unmounting. */
  closing: Accessor<boolean>;
  renderWindowSize?: number;
  preloadWindowSize?: number;
  concurrentLoads?: number;
  decodedImageCacheLimit?: number;
}): ReaderLoading {
  const texts = useReaderTexts();
  const controller = new AbortController();
  const images = new ReaderImages(options.source, options.concurrentLoads);
  const resources = new Map<number, ReturnType<typeof createResource>>();
  const retained = new Map<number, number>();
  const renderSize = options.renderWindowSize ?? 10;
  const preloadSize = options.preloadWindowSize ?? 10;
  const cacheLimit = Math.max(0, Math.floor(options.decodedImageCacheLimit ?? 24));
  let disposed = false;
  let direction: -1 | 1 = 1;
  let directionEdge = options.requestedPage();
  const stopped = () => disposed || options.closing();
  const isContent = (page: number) => page >= 1 && (!options.source.totalPages || page <= options.source.totalPages);
  const windowPages = createMemo(() => pageWindowNumbers(options.requestedPage(), renderSize));
  const entry = (page: number) => {
    let resource = resources.get(page);
    if (!resource) {
      resource = createResource();
      resources.set(page, resource);
    }
    return resource;
  };
  function update(page: number, patch: Partial<ReaderPageResource>): void {
    const resource = entry(page);
    resource.set(value => ({ ...value, ...patch }));
  }

  async function requestPage(pageNum: number): Promise<void> {
    const resource = entry(pageNum);
    if (resource.value().page || resource.value().status !== "idle" || stopped()) return;
    update(pageNum, { status: "loading", error: null });
    try {
      const incoming = await options.source.getPages([pageNum], controller.signal);
      if (stopped()) return;
      const page = incoming.find(page => page.pageNum === pageNum);
      if (!page) throw new Error(texts.errors.imageNotFound);
      update(pageNum, {
        page: { ...page, aspectRatio: normalizedAspectRatio(page.aspectRatio, 1.42) },
        status: "idle",
      });
      if (!options.seeking()) maintainQueue();
    } catch (error) {
      if (!stopped()) update(pageNum, { status: "error", error: error instanceof Error ? error.message : texts.errors.loadFailed });
    }
  }

  // The request window and image priority use reading order, not DOM coordinates.
  function maintainQueue(): void {
    if (stopped() || options.seeking()) return;
    const first = options.firstVisiblePage() ?? options.requestedPage();
    const movement = (first - directionEdge) * direction;
    if (movement >= 0) directionEdge = first;
    else if (-movement > 2) {
      direction = direction === 1 ? -1 : 1;
      directionEdge = first;
    }
    const targets = [...options.priorityPages(), first];
    for (let offset = 1; offset <= preloadSize; offset++) targets.push(first + offset * direction);
    targets.push(first - direction);
    images.queue.sync([...new Set(targets)].flatMap((pageNum, priority) => {
      const resource = resources.get(pageNum)?.value();
      return resource?.page && resource.status === "idle"
        ? [{ key: pageNum, priority, target: { pageNum, page: resource.page } }]
        : [];
    }));
  }

  function retainOffWindow(): void {
    const visible = new Set(windowPages());
    for (const [page, resource] of resources) {
      const element = resource.value().element;
      if (visible.has(page)) retained.delete(page);
      else if (element && resource.value().status === "ready" && !retained.has(page)) {
        retained.set(page, (element.naturalWidth || element.width) * (element.naturalHeight || element.height) * 4);
      }
    }
    let bytes = [...retained.values()].reduce((sum, value) => sum + value, 0);
    while (retained.size > cacheLimit || bytes > 96 * 1024 * 1024) {
      const oldest = retained.entries().next().value;
      if (!oldest) break;
      retained.delete(oldest[0]);
      bytes -= oldest[1];
      const resource = entry(oldest[0]);
      resource.value().element?.removeAttribute("src");
      update(oldest[0], { element: null, image: null, status: "idle" });
    }
  }

  images.queue.updateCallbacks({
    loadTarget: target => images.load(target),
    markLoading: target => {
      if (stopped() || entry(target.pageNum).value().status !== "idle") return null;
      update(target.pageNum, { status: "loading", error: null });
      return 0;
    },
    onLoaded: async (target, loaded) => {
      if (stopped()) return;
      const image = images.remember(target.pageNum, loaded);
      if (!windowPages().includes(target.pageNum)) {
        update(target.pageNum, { status: "idle" });
        return;
      }
      update(target.pageNum, { image });
      const release = await images.reserveDecode(image.byteSize);
      try {
        if (stopped()) return;
        if (!windowPages().includes(target.pageNum)) {
          update(target.pageNum, { image: null, status: "idle" });
          return;
        }
        const alt = `Page ${target.pageNum}`;
        const fetchPriority = options.priorityPages().includes(target.pageNum) ? "high" : "low";
        const width = image.width && image.height ? image.width : undefined;
        const height = image.width && image.height ? image.height : undefined;
        let element!: HTMLImageElement;
        untrack(() => <img ref={element} class="ehpeek-reader-page-image" alt={alt}
          decoding="async" loading="eager" draggable={false} fetchpriority={fetchPriority}
          width={width} height={height} />);
        const progressive = image.displayWhileLoading ?? (
          imageFileExtension(image.imageUrl) === "gif" ||
          imageFileExtension(image.originalImageUrl ?? "") === "gif" ||
          (image.byteSize ?? 0) > 2 * 1024 * 1024
        );
        const ready = loadImage(element, image.imageUrl, controller.signal, texts.errors.imageLoadFailed);
        if (progressive) update(target.pageNum, { element });
        await ready;
        if (stopped()) return;
        update(target.pageNum, { element, status: "ready", error: null });
        retainOffWindow();
      } finally {
        release();
      }
    },
    onError: (target, error) => {
      if (stopped()) return;
      const resource = entry(target.pageNum).value();
      resource.element?.removeAttribute("src");
      update(target.pageNum, { element: null, image: null, status: "error", error: error instanceof Error ? error.message : texts.errors.imageLoadFailed });
    },
  });

  createEffect(on([windowPages, options.seeking, options.closing], () => {
    if (stopped()) return;
    retainOffWindow();
    if (options.seeking()) {
      images.queue.sync([]);
      return;
    }
    for (const page of windowPages().filter(isContent)) void requestPage(page);
    maintainQueue();
  }));
  createEffect(on([options.firstVisiblePage, options.priorityPages], () => maintainQueue()));
  onCleanup(() => {
    disposed = true;
    controller.abort();
    images.dispose();
    for (const resource of resources.values()) resource.value().element?.removeAttribute("src");
    resources.clear();
    retained.clear();
  });
  return {
    windowPages,
    page: pageNum => isContent(pageNum) ? entry(pageNum).value() : undefined,
    retry(pageNum) {
      if (stopped() || entry(pageNum).value().status !== "error") return;
      untrack(() => {
        update(pageNum, { status: "idle", error: null });
        if (entry(pageNum).value().page) maintainQueue();
        else void requestPage(pageNum);
      });
    },
  };
}

function createResource() {
  const [value, set] = createSignal<ReaderPageResource>({
    page: null, image: null, element: null, status: "idle", error: null,
  });
  return { value, set };
}

async function loadImage(image: HTMLImageElement, url: string, signal: AbortSignal, message: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      image.removeEventListener("load", loaded);
      image.removeEventListener("error", failed);
      signal.removeEventListener("abort", aborted);
    };
    const loaded = () => { cleanup(); resolve(); };
    const failed = () => { cleanup(); reject(new Error(message)); };
    const aborted = () => { image.removeAttribute("src"); cleanup(); reject(signal.reason); };
    image.addEventListener("load", loaded);
    image.addEventListener("error", failed);
    signal.addEventListener("abort", aborted, { once: true });
    image.src = url;
    if (image.complete && image.naturalWidth > 0) loaded();
  });
  try { await image.decode(); } catch { /* A loaded image is still displayable when decode rejects. */ }
}
