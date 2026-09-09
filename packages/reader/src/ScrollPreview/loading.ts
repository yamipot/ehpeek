import { createEffect, createSignal, onCleanup, type Accessor } from "solid-js";
import { PriorityLoadQueue } from "../features/PriorityLoadQueue";
import type { PreviewCache } from "../features/PreviewCache";

const PREVIEW_CONCURRENT_LOADS = 2;
const PREVIEW_LOAD_RADIUS = 2;

export function createPreviewLoading(options: {
  centeredPageNum: Accessor<number>;
  maxBatchIndex: number;
  onLoadError: (error: unknown) => void;
  previewCache: PreviewCache;
  ready: Accessor<boolean>;
}) {
  const queue = new PriorityLoadQueue<number, void>(
    PREVIEW_CONCURRENT_LOADS,
  );
  const requestedBatches = new Set<number>();
  const [failedBatches, setFailedBatches] = createSignal<Set<number>>(new Set());
  const [loadingCount, setLoadingCount] = createSignal(0);
  let loadToken = 0;

  const sync = (centerIndex: number, retryIndex?: number): void => {
    const firstIndex = Math.max(0, centerIndex - PREVIEW_LOAD_RADIUS);
    const lastIndex = Math.min(options.maxBatchIndex, centerIndex + PREVIEW_LOAD_RADIUS);
    const targets = [];
    for (let batchIndex = firstIndex; batchIndex <= lastIndex; batchIndex += 1) {
      targets.push({
        key: batchIndex,
        priority: batchIndex === retryIndex ? -1 : Math.abs(batchIndex - centerIndex),
        target: batchIndex,
      });
    }
    queue.sync(targets);
  };

  queue.updateCallbacks({
    loadTarget: (batchIndex) => options.previewCache.load(batchIndex),
    markLoading: (batchIndex) => {
      if (requestedBatches.has(batchIndex)) {
        return null;
      }
      requestedBatches.add(batchIndex);
      setFailedBatches((current) => {
        if (!current.has(batchIndex)) {
          return current;
        }
        const next = new Set(current);
        next.delete(batchIndex);
        return next;
      });
      setLoadingCount((count) => count + 1);
      return ++loadToken;
    },
    onLoaded: () => {
      setLoadingCount((count) => Math.max(0, count - 1));
    },
    onError: (batchIndex, error) => {
      requestedBatches.delete(batchIndex);
      setFailedBatches((current) => new Set(current).add(batchIndex));
      setLoadingCount((count) => Math.max(0, count - 1));
      options.onLoadError(error);
    },
  });

  createEffect(() => {
    if (options.ready()) {
      sync(options.previewCache.batchForPage(options.centeredPageNum()));
    }
  });
  onCleanup(() => queue.dispose());

  return {
    failedBatches,
    loadingCount,
    retry(pageNum: number): void {
      const retryIndex = options.previewCache.batchForPage(pageNum);
      sync(
        options.previewCache.batchForPage(options.centeredPageNum()),
        retryIndex,
      );
    },
  };
}
