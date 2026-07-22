import { requestPage } from "../request";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import texts from "../../texts.json";
import { normalizeUrl } from "../../utils";
import type { ImagePageInfo } from "../types";
import type { MyTagAppearance, MyTagSetOption } from "../../state";
import {
  extractPageType,
  galleryTagNameFromUrl,
  isFullImageUrl,
  previewPageIndex,
  previewUrlForIndex,
  type PageType,
} from "../url";
import {
  createManagedElement,
  documentBody,
  DomNode,
} from "./core";
import { domClass } from "./domClass";

export type MyTagsPageData = {
  appearances: MyTagAppearance[];
  enabled: boolean;
  options: MyTagSetOption[];
};

/** Extracts one My Tags collection page for the My Tags store refresh flow. */
export function extractMyTagsPageData(
  root: ParentNode = document,
  tagSet?: string,
): MyTagsPageData {
  const page = DomNode.from(root);
  const source = page.use(domClass.myTags);
  const tags = source.tags.one();

  if (!tags) {
    throw new Error("The My Tags page could not be read.");
  }

  const options = source.options.all().map((option) => ({
    label: option.text() || option.inputValue(),
    selected: option.selected(),
    value: option.inputValue(),
  }));
  const activeTagSet = tagSet ?? options.find((option) => option.selected)?.value ?? "1";
  const defaultColor = source.defaultColor.one()?.inputValue().trim() ?? "";
  const output: MyTagAppearance[] = [];

  for (const item of tags.all(domClass.myTags.tags.items)) {
    const preview = item.one(domClass.myTags.tags.items.preview);
    const name = normalizeTagName(preview?.attribute("title") ?? "");

    if (!preview || !name) {
      continue;
    }

    const itemColor = item.one(domClass.myTags.tags.items.color)?.inputValue() ?? "";
    const backgroundColor = normalizeTagColor(itemColor) || normalizeTagColor(defaultColor);
    const id = item.attribute("id")?.match(/^usertag_(\d+)$/)?.[1] ?? "";

    if (!id) {
      continue;
    }

    output.push({
      name,
      backgroundColor,
      color: readableTagColor(backgroundColor),
      id,
      tagSet: activeTagSet,
    });
  }

  return {
    appearances: output,
    enabled: source.enabled.one()?.checked() ?? true,
    options,
  };
}

function normalizeTagName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

function normalizeTagColor(value: string): string {
  const color = value.trim();
  return /^#[\da-f]{6}$/i.test(color) ? color : "";
}

function readableTagColor(backgroundColor: string): "#000000" | "#ffffff" {
  const red = Number.parseInt(backgroundColor.slice(1, 3), 16) / 255;
  const green = Number.parseInt(backgroundColor.slice(3, 5), 16) / 255;
  const blue = Number.parseInt(backgroundColor.slice(5, 7), 16) / 255;
  const linear = (channel: number) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
  const luminance = 0.2126 * linear(red) + 0.7152 * linear(green) + 0.0722 * linear(blue);
  return luminance > 0.179 ? "#000000" : "#ffffff";
}

/** Applies and maintains stored My Tags appearances for the GalleryInfo enhancer lifecycle. */
export function mutateGalleryMyTags(appearances: MyTagAppearance[]) {
  const byName = new Map(appearances.map((appearance) => [appearance.name, appearance]));
  const source = DomNode.from(document).use(domClass.gallery);
  const apply = () => {
    for (const tag of source.tags.links.all()) {
      const name = galleryTagNameFromUrl(tag.attribute("href") ?? "");
      const appearance = name ? byName.get(normalizeTagName(name)) : undefined;
      if (!appearance?.backgroundColor) {
        continue;
      }

      const container = tag.closest(domClass.gallery.tagContainer);
      if (!container) {
        continue;
      }

      container.inplace(domClass.gallery.tagContainer.apply)
        .styles({
          "--ehpeek-my-tag-background": appearance.backgroundColor,
          "--ehpeek-my-tag-color": appearance.color,
        })
        .apply("myTag");
      tag.inplace()
        .setAttributes({
          "data-ehpeek-my-tag-id": appearance.id,
          "data-ehpeek-my-tag-set": appearance.tagSet,
        });
    }
  };

  apply();
  return source.tags.inplace()?.observe(apply)
    ?? (() => undefined);
}

/** Returns the original GalleryInfo control used to mount the Continue/Read button. */
export function manageGalleryContinueReadingButtonMount() {
  const managedHost = createManagedElement("div")
    .replaceClasses("box-border w-full px-sm pt-sm pb-sm");
  const viewerOptions = DomNode.from(document).use(domClass.gallery).actions.inplace();

  if (viewerOptions) {
    viewerOptions
      .apply("expand")
      .append(managedHost);
    return managedHost;
  }

  documentBody().append(managedHost);
  return managedHost;
}

export type GalleryPreviewData = {
  currentIndex: number;
  currentUrl: string;
  descriptionText: string;
  endImage: number;
  maxIndex: number;
  pageSize: number;
  pages: ReaderPage[];
  startImage: number;
  totalImages: number;
};

/** Manages Gallery Preview pagination, thumbnails, and Reader-page data. */
export function manageGalleryPreview(
  root: ParentNode = document,
  baseUrl = window.location.href,
) {
  const page = DomNode.from(root);
  const source = page.use(domClass.gallery.preview);
  const currentUrl = new URL(baseUrl, window.location.href).href;
  const currentIndex = previewPageIndex(currentUrl);
  const pageDescriptionSource = source.description.one();
  const rangeText = pageDescriptionSource?.text() ?? "";
  const rangeMatch = rangeText.match(/([\d,]+)\s*-\s*([\d,]+)\D+([\d,]+)/);
  const rangeValues = rangeMatch?.slice(1).map((value) => Number(value.replace(/,/g, ""))) ?? [];
  const startImage = rangeValues[0];
  const endImage = rangeValues[1];
  const totalImages = rangeValues[2];
  if (
    startImage === undefined ||
    endImage === undefined ||
    totalImages === undefined ||
    !Number.isSafeInteger(startImage) ||
    !Number.isSafeInteger(endImage) ||
    !Number.isSafeInteger(totalImages) ||
    startImage <= 0 ||
    endImage <= 0 ||
    totalImages <= 0 ||
    endImage < startImage ||
    totalImages < endImage
  ) {
    throw new Error("Cannot read the gallery preview image range.");
  }
  const currentPageSize = endImage - startImage + 1;
  const inferredFullPageSize = endImage === totalImages && currentIndex > 0
    ? (totalImages - currentPageSize) / currentIndex
    : currentPageSize;
  if (!Number.isInteger(inferredFullPageSize) || inferredFullPageSize <= 0) {
    throw new Error("Cannot determine the gallery preview page size.");
  }
  const pageSize = inferredFullPageSize;
  const maxIndex = Math.max(currentIndex, Math.ceil(totalImages / pageSize) - 1);
  const seen = new Set<string>();
  const pages = source.imageLinks
    .all()
    .flatMap((link): ReaderPage[] => {
      const url = normalizeUrl(link.attribute("href") || "", currentUrl);
      const imagePage = extractPageType(url);
      if (imagePage.type !== "image" || seen.has(url)) {
        return [];
      }
      seen.add(url);
      const size = link.one(domClass.common.image)?.imageSize();
      return [{
        aspectRatio: size && size.width > 0 && size.height > 0 ? size.height / size.width : 1.42,
        pageNum: imagePage.pageNum,
        url,
      }];
    })
    .sort((left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER));

  const data: GalleryPreviewData = {
    currentIndex,
    currentUrl,
    descriptionText: rangeText,
    endImage,
    maxIndex,
    pageSize,
    pages,
    startImage,
    totalImages,
  };
  const thumbsSource = source.thumbs.one();
  const pageBarTopSource = source.pageBarTop.one();
  const pageBarBottomSource = source.pageBarBottom.one();
  const createPageBarMount = (position: "bottom" | "top") =>
    createManagedElement("div").replaceClasses(
      `w-max max-w-full mx-auto overflow-x-auto touch-pan-y [-webkit-overflow-scrolling:touch] [&[data-dragging=true]]:select-none ${position === "top" ? "mt-2px mb-0" : "mt-0 mb-10px"}`,
    );
  const elems = {
    mount: root === document && thumbsSource
      ? createManagedElement("div").replaceClasses("contents")
      : null,
    originalPageBarBottom: pageBarBottomSource?.inplace() ?? null,
    originalPageBarTop: pageBarTopSource?.inplace() ?? null,
    originalPageDescription: pageDescriptionSource?.inplace() ?? null,
    pageBarBottom: pageBarBottomSource ? createPageBarMount("bottom") : null,
    pageBarDescription: pageDescriptionSource && pageBarTopSource
      ? createManagedElement("div")
      : null,
    pageBarTop: pageBarTopSource ? createPageBarMount("top") : null,
    thumbImages: source.thumbs.images.inplaceAll(),
    thumbItems: thumbsSource?.children().map((item) =>
      root === document ? item.inplace() : item.move()
    ) ?? [],
    thumbs: root === document ? source.thumbs.inplace() : null,
  };
  if (elems.mount && elems.thumbs) {
    elems.thumbs.before(elems.mount);
  }
  const handle = {
    /** Opens thumbnail image links in EhPeek Reader instead of original navigation. */
    interceptPreviewImageOpen(onOpen: (url: string) => void): () => void {
      elems.thumbs?.apply("suppressTapHighlight");
      const handleClick = (event: MouseEvent) => {
        const link = event.target instanceof Element
          ? DomNode.from(event.target).closest(domClass.common.links)
          : null;
        const href = link?.attribute("href") ?? "";
        if (
          !link ||
          extractPageType(href).type !== "image" ||
          (!link.one(domClass.common.image) &&
            !link.closest(domClass.gallery.preview.imageLinkHost))
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onOpen(normalizeUrl(href, currentUrl));
      };

      return elems.thumbs?.listen("click", handleClick) ?? (() => undefined);
    },
    /** Makes thumbnail dragging available to the horizontal preview-page gesture. */
    ensurePreviewSwipeInput(): void {
      elems.thumbs?.apply("swipe");
      for (const image of elems.thumbImages) {
        image.setAttributes({ draggable: "false" });
      }
    },
    /** Installs a fetched preview page into the currently visible thumbnail host. */
    replacePreviewThumbs(items: typeof elems.thumbItems): void {
      elems.thumbs?.replaceChildren(...items);
    },
    /** Marks preview loading while retaining the currently visible thumbnails. */
    updatePreviewLoading(loading: boolean): void {
      elems.thumbs?.attribute("aria-busy", String(loading));
    },
    /** Replaces both original page bars with mounts owned by EhPeek pagination. */
    installPreviewPageBars(): void {
      DomNode.from(document).use(domClass.page).body.inplace()?.apply("hidePreviewPageBars");
      if (elems.originalPageBarTop && elems.pageBarTop) {
        elems.originalPageBarTop.after(elems.pageBarTop);
      }
      if (elems.originalPageBarBottom && elems.pageBarBottom) {
        elems.originalPageBarBottom.after(elems.pageBarBottom);
      }
      if (elems.originalPageDescription && elems.pageBarDescription && elems.pageBarTop) {
        elems.pageBarTop.before(elems.pageBarDescription);
      }
    },
    /** Brings the requested EhPeek page bar into view after preview navigation. */
    scrollPreviewPageBarIntoView(position: "bottom" | "top"): void {
      const pageBar = position === "top" ? elems.pageBarTop : elems.pageBarBottom;
      pageBar?.scrollIntoView({
        behavior: "smooth",
        block: position === "top" ? "start" : "end",
      });
    },
  };

  return { data, elems, handle };
}

export type GalleryPreviewDom = ReturnType<typeof manageGalleryPreview>;

/** Loads and extracts one Preview page without changing the active document. */
export async function loadGalleryPreviewPage(
  previewIndex: number,
  pageUrl: string,
): Promise<GalleryPreviewDom> {
  const url = previewUrlForIndex(previewIndex, pageUrl);
  const response = await requestPage(url);
  return manageGalleryPreview(response.document, response.url);
}

/** Resolves Reader's gallery identity from the current original image page. */
export function extractImageGalleryPage(root: ParentNode = document): Extract<PageType, { type: "gallery" }> | null {
  for (const link of DomNode.from(root).use(domClass.common).links.all()) {
    const page = extractPageType(normalizeUrl(link.attribute("href") || ""));
    if (page.type === "gallery") {
      return page;
    }
  }
  return null;
}

/** Fetches and extracts one original image page for Reader Provider. */
export async function loadEhImagePage(page: ReaderPage): Promise<LoadedReaderPage> {
  const response = await requestPage(page.url);
  const source = DomNode.from(response.document);
  const imagePage = source.use(domClass.gallery.imagePage);
  const image = imagePage.image.one();
  const imageUrl = normalizeUrl(
    image?.attribute("src") || image?.attribute("data-src") || "",
    page.url,
  );

  if (!imageUrl) {
    throw new Error(texts.errors.imageNotFound);
  }

  const numberAttribute = (name: string): number | null => {
    const value = Number(image?.attribute(name));
    return Number.isFinite(value) && value > 0 ? value : null;
  };
  const info: ImagePageInfo = {
    height: numberAttribute("height"),
    imageUrl,
    originalImageUrl: imagePage.links
      .all()
      .map((link) => normalizeUrl(link.attribute("href") || "", page.url))
      .find(isFullImageUrl) ?? null,
    width: numberAttribute("width"),
  };
  return info;
}
