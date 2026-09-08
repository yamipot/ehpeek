import { createSignal } from "solid-js";
import type { ContentSource, PreviewItem } from "./ContentSource";
import { clamp } from "./utils";

const BATCH_SIZE = 40;
export type PreviewCache = ReturnType<typeof createPreviewCache>;

export function createPreviewCache(source: ContentSource) {
  const items = new Map<number, PreviewItem>(
    source.initialPreviewItems.map((item) => [item.pageNum, item]),
  );
  const [version, setVersion] = createSignal(0);
  const controller = new AbortController();
  const pending = new Map<number, Promise<void>>();
  const maxBatch = Math.max(0, Math.ceil(source.totalPages / BATCH_SIZE) - 1);
  const batchForPage = (page: number) =>
    clamp(Math.floor((page - 1) / BATCH_SIZE), 0, maxBatch);
  return {
    source,
    maxBatch,
    batchForPage,
    pageForBatch: (index: number) => index * BATCH_SIZE + 1,
    version,
    item: (page: number) => {
      version();
      return items.get(page) ?? null;
    },
    load: (index: number): Promise<void> => {
      const existing = pending.get(index);
      if (existing) return existing;
      const pages = Array.from(
        {
          length: Math.min(BATCH_SIZE, source.totalPages - index * BATCH_SIZE),
        },
        (_, offset) => index * BATCH_SIZE + offset + 1,
      ).filter((page) => !items.has(page));
      if (pages.length === 0) return Promise.resolve();
      const request = source
        .getPreviewItems(pages, controller.signal)
        .then((incoming) => {
          if (controller.signal.aborted) return;
          for (const item of incoming) items.set(item.pageNum, item);
          setVersion((v) => v + 1);
        })
        .finally(() => pending.delete(index));
      pending.set(index, request);
      return request;
    },
    dispose: () => controller.abort(),
  };
}
