import type { GalleryPreviewCache } from "./GalleryPreviewCache";
import texts from "../i18n";

export async function openOriginalReader(
  pageNum: number,
  previewCache: GalleryPreviewCache,
): Promise<void> {
  const page = (await previewCache.getPages([pageNum]))[0];

  if (!page || page.pageNum !== pageNum) {
    throw new Error(texts.errors.imageNotFound);
  }

  window.location.assign(page.url);
}

export function reportReaderOpenError(error: unknown): void {
  const message = error instanceof Error ? error.message : texts.errors.loadFailed;
  console.error("[ehpeek]", error);
  window.alert(message);
}
