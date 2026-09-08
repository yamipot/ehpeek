import type { ContentSource } from "@ehpeek/reader/ContentSource";
import type { GalleryPreviewCache } from "./GalleryPreviewCache";

export function createReaderContentSource(
  cache: GalleryPreviewCache,
  galleryId: number,
  token: string,
): ContentSource {
  const initial = cache.current().data;
  const fileName = (page: number, url: string, alternative = "") =>
    `${galleryId}-${token}-p${page}.${imageExtension(url) || imageExtension(alternative) || "webp"}`;
  return {
    totalPages: initial.totalImages,
    initialPageNum: initial.startImage,
    aspectRatio: initial.dominantAspectRatio,
    initialPreviewItems: initial.previewItems,
    getPages: cache.getPages,
    getPreviewItems: cache.getPreviewItems,
    loadImage: async (page, signal) => {
      const image = await cache.loadImage(page, signal);
      return {
        ...image,
        fileName: fileName(page.pageNum ?? 1, image.imageUrl),
        originalFileName: fileName(
          page.pageNum ?? 1,
          image.originalImageUrl ?? "",
          image.imageUrl,
        ),
        byteSize: imageByteSize(image.imageUrl),
      };
    },
  };
}

function imageExtension(url: string): string {
  try {
    const name = decodeURIComponent(
      new URL(url).pathname.split("/").pop() ?? "",
    );
    const extension = name.match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
    return extension &&
      ["avif", "bmp", "gif", "jpeg", "jpg", "png", "webp"].includes(extension)
      ? extension
      : "";
  } catch {
    return "";
  }
}

function imageByteSize(url: string): number | null {
  try {
    const key = new URL(url).pathname
      .split("/")
      .find((part) => /^[a-f0-9]{40}-\d+-\d+-\d+-[a-z0-9]+$/i.test(part));
    const bytes = Number(key?.split("-")[1]);
    return Number.isSafeInteger(bytes) && bytes > 0 ? bytes : null;
  } catch {
    return null;
  }
}
