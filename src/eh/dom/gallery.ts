import {
  requestPage,
  type GalleryTagApiInfo,
} from "../request";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import texts from "../../texts.json";
import { normalizeUrl } from "../../utils";
import type { ImagePageInfo } from "../types";
import type { MyTagAppearance, MyTagSetOption } from "../../state";
import {
  extractPageType,
  galleryIdentityFromUrl,
  galleryTagNameFromUrl,
  isAllowedGalleryApiUrl,
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

const GALLERY_PAGE_DESCRIPTION_SELECTOR = ".gpc:not(.eh-syringe-ignore)";

type GalleryApiSession = {
  apiKey: string;
  apiUid: number;
  apiUrl: string;
};

let galleryApiSession: GalleryApiSession | null = null;

function scriptNumberValue(script: string, name: string): number | null {
  const match = script.match(new RegExp(`\\b${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  const value = Number(match?.[1]);
  return match && Number.isFinite(value) ? value : null;
}

export type MyTagsPageData = {
  appearances: MyTagAppearance[];
  enabled: boolean;
  options: MyTagSetOption[];
};

/** Extracts one My Tags collection page for the My Tags store refresh flow. */
export function extractMyTagsPageData(
  root: ParentNode = document,
  tagSet?: string,
): MyTagsPageData | null {
  const page = DomNode.from(root);
  const tags = page.one<HTMLElement>("#usertags_outer");

  if (!tags) {
    return null;
  }

  const options = page.all<HTMLOptionElement>("#tagset_outer select option").map((option) => ({
    label: option.text() || option.inputValue(),
    selected: option.selected(),
    value: option.inputValue(),
  }));
  const activeTagSet = tagSet ?? options.find((option) => option.selected)?.value ?? "1";
  const defaultColor = page.one<HTMLInputElement>("#tagcolor")?.inputValue().trim() ?? "";
  const output: MyTagAppearance[] = [];

  for (const item of tags.all<HTMLElement>(":scope > [id^='usertag_']")) {
    const preview = item.one<HTMLElement>("[id^='tagpreview_'][title]");
    const name = normalizeTagName(preview?.attribute("title") ?? "");

    if (!preview || !name) {
      continue;
    }

    const itemColor = item.one<HTMLInputElement>("input[id^='tagcolor_']")?.inputValue() ?? "";
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
    enabled: page.one<HTMLInputElement>("#tagset_enable")?.checked() ?? true,
    options,
  };
}

function applyMyTagAppearances(appearances: MyTagAppearance[], root: ParentNode = document): void {
  const byName = new Map(appearances.map((appearance) => [appearance.name, appearance]));

  for (const tag of DomNode.from(root).all<HTMLAnchorElement>("#taglist a")) {
    const name = galleryTagNameFromUrl(tag.attribute("href") ?? "");
    const appearance = name ? byName.get(normalizeTagName(name)) : undefined;
    const container = tag.closest<HTMLElement>("div.gt, div.gtl, div.gtw") ?? tag;

    if (!appearance) {
      continue;
    }

    if (appearance.backgroundColor) {
      container.inplace().styles({ "background-color": appearance.backgroundColor }, "important");
      tag.inplace()
        .styles({ color: appearance.color }, "important")
        .transform({
          attributes: {
            set: {
              "data-ehpeek-my-tag-id": appearance.id,
              "data-ehpeek-my-tag-set": appearance.tagSet,
            },
          },
        });
    }
  }
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

function observeGalleryTagChanges(onChange: () => void): () => void {
  const tagListSource = DomNode.from(document).one<HTMLElement>("#taglist");
  const tagList = tagListSource?.inplace();

  if (!tagList) {
    return () => undefined;
  }

  return tagList.observe(onChange);
}

/** Applies and maintains stored My Tags appearances for the GalleryInfo enhancer lifecycle. */
export function mutateGalleryMyTags(appearances: MyTagAppearance[]) {
  applyMyTagAppearances(appearances);
  return observeGalleryTagChanges(() =>
    applyMyTagAppearances(appearances),
  );
}

/** Captures GalleryInfo API credentials before SinglePage removes original scripts. */
export function manageGalleryApiSession(root: ParentNode = document, baseUrl = window.location.href): boolean {
  if (galleryApiSession) {
    return true;
  }

  const script = DomNode.from(root).all<HTMLScriptElement>("script")
    .map((item) => item.text())
    .find((text) => text.includes("var api_url") && text.includes("var apikey"));

  if (!script) {
    console.warn("[ehpeek] Gallery API session capture failed", {
      reason: "api-script-not-found",
      pathname: new URL(baseUrl).pathname,
    });
    return false;
  }

  const apiUrlValue = scriptStringValue(script, "api_url");
  const apiKey = scriptStringValue(script, "apikey");
  const apiUid = scriptNumberValue(script, "apiuid");

  if (!apiUrlValue || !apiKey || apiUid === null) {
    console.warn("[ehpeek] Gallery API session capture failed", {
      reason: "api-values-missing",
      hasApiKey: Boolean(apiKey),
      hasApiUid: apiUid !== null,
      hasApiUrl: Boolean(apiUrlValue),
    });
    return false;
  }

  const apiUrl = new URL(apiUrlValue, baseUrl);
  const pageUrl = new URL(baseUrl);
  const allowedUrl = isAllowedGalleryApiUrl(apiUrl, pageUrl);

  if (
    !allowedUrl ||
    !Number.isSafeInteger(apiUid) ||
    apiUid <= 0 ||
    !/^[A-Za-z0-9_-]{8,128}$/.test(apiKey)
  ) {
    console.warn("[ehpeek] Gallery API session capture failed", {
      reason: "api-values-invalid",
      apiOrigin: apiUrl.origin,
      apiPathname: apiUrl.pathname,
      apiUidValid: Number.isSafeInteger(apiUid) && apiUid > 0,
      apiKeyLength: apiKey.length,
    });
    return false;
  }

  galleryApiSession = {
    apiKey,
    apiUid,
    apiUrl: apiUrl.href,
  };
  return true;
}

/** Builds GalleryInfo's tag/rating API data from the captured session and current URL. */
export function extractGalleryTagApiInfo(): GalleryTagApiInfo | null {
  const gallery = galleryIdentityFromUrl();

  if (!gallery) {
    console.warn("[ehpeek] Gallery API context unavailable", {
      reason: "gallery-path-invalid",
      pathname: window.location.pathname,
    });
    return null;
  }

  if (!galleryApiSession) {
    console.warn("[ehpeek] Gallery API context unavailable", {
      reason: "api-session-unavailable",
      galleryId: gallery.galleryId,
    });
    return null;
  }

  const { galleryId, token } = gallery;
  const session = galleryApiSession;

  if (!session || !Number.isSafeInteger(galleryId) || galleryId <= 0 || !/^[A-Za-z0-9]+$/.test(token)) {
    console.warn("[ehpeek] Gallery API context unavailable", {
      reason: "gallery-identity-invalid",
      galleryId,
      hasSession: Boolean(session),
    });
    return null;
  }

  return {
    apiKey: session.apiKey,
    apiUid: session.apiUid,
    apiUrl: session.apiUrl,
    galleryId,
    token,
  };
}

function scriptStringValue(script: string, name: string): string | null {
  const match = script.match(new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`));
  return match?.[2] ?? null;
}

/** Returns the original GalleryInfo control used to mount the Continue/Read button. */
export function manageGalleryContinueReadingButtonMount() {
  const managedHost = createManagedElement("div");
  const viewerOptionsSource = DomNode.from(document).one<HTMLElement>("#gd5");
  const viewerOptions = viewerOptionsSource?.inplace();

  if (viewerOptions) {
    viewerOptions
      .transform({ classes: { add: ["ehpeek-gallery-actions"] } })
      .append(managedHost);
    return managedHost;
  }

  documentBody().append(managedHost);
  return managedHost;
}

export type GalleryPreviewData = {
  currentIndex: number;
  currentUrl: string;
  descriptionText: string | null;
  endImage: number | null;
  maxIndex: number | null;
  pageSize: number | null;
  pages: ReaderPage[];
  startImage: number | null;
  totalImages: number | null;
};

/** Manages Gallery Preview pagination, thumbnails, and Reader-page data. */
export function manageGalleryPreview(
  root: ParentNode = document,
  baseUrl = window.location.href,
) {
  const page = DomNode.from(root);
  const currentUrl = new URL(baseUrl, window.location.href).href;
  const currentIndex = previewPageIndex(currentUrl);
  const pageDescriptionSource = page.one<HTMLElement>(GALLERY_PAGE_DESCRIPTION_SELECTOR);
  const rangeText = pageDescriptionSource?.text() ?? "";
  const rangeMatch = rangeText.match(/([\d,]+)\s*-\s*([\d,]+)\D+([\d,]+)/);
  const rangeValues = rangeMatch
    ? rangeMatch.slice(1).map((value) => Number(value.replace(/,/g, "")))
    : [];
  const [startImage, endImage, totalImages] = rangeValues.length === 3 && rangeValues.every((value) => value > 0)
    ? rangeValues
    : [null, null, null];
  const currentPageSize = startImage !== null && endImage !== null ? endImage - startImage + 1 : null;
  const inferredFullPageSize = currentPageSize !== null && totalImages !== null && endImage === totalImages && currentIndex > 0
    ? (totalImages - currentPageSize) / currentIndex
    : currentPageSize;
  const pageSize = inferredFullPageSize !== null && Number.isInteger(inferredFullPageSize) && inferredFullPageSize > 0
    ? inferredFullPageSize
    : null;
  const maxIndex = pageSize !== null && totalImages !== null
    ? Math.max(currentIndex, Math.ceil(totalImages / pageSize) - 1)
    : null;
  const seen = new Set<string>();
  const pages = page
    .all<HTMLAnchorElement>("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']")
    .flatMap((link): ReaderPage[] => {
      const url = normalizeUrl(link.attribute("href") || "", currentUrl);
      const imagePage = extractPageType(url);
      if (imagePage.type !== "image" || seen.has(url)) {
        return [];
      }
      seen.add(url);
      const size = link.one<HTMLImageElement>("img")?.imageSize();
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
    descriptionText: rangeText || null,
    endImage,
    maxIndex,
    pageSize,
    pages,
    startImage,
    totalImages,
  };
  const thumbsSource = page.one<HTMLElement>("#gdt");
  const thumbImages = thumbsSource?.all<HTMLImageElement>("img") ?? [];
  const thumbs = root === document ? thumbsSource?.inplace() ?? null : null;
  const thumbItems = thumbsSource?.children().map((item) =>
    root === document ? item.inplace() : item.move()
  ) ?? [];
  const mount = root === document && thumbs
    ? createManagedElement("div").transform({ classes: { replace: "contents" } })
    : null;
  const originalPageBarTop = page.one<HTMLElement>(".ptt")?.inplace() ?? null;
  const originalPageBarBottom = page.one<HTMLElement>(".ptb")?.inplace() ?? null;
  const originalPageDescription = pageDescriptionSource?.inplace() ?? null;
  const pageBarTop = originalPageBarTop ? createManagedElement("div") : null;
  const pageBarBottom = originalPageBarBottom ? createManagedElement("div") : null;
  const pageBarDescription = originalPageDescription && pageBarTop
    ? createManagedElement("div")
    : null;
  if (mount && thumbs) {
    thumbs.before(mount);
  }
  const elems = {
    mount,
    pageBarBottom,
    pageBarDescription,
    pageBarTop,
    thumbItems,
    thumbs,
  };
  const handle = {
    connectImageOpen(onOpen: (url: string) => void): () => void {
      const handleClick = (event: MouseEvent) => {
        const link = event.target instanceof Element
          ? DomNode.from(event.target).closest<HTMLAnchorElement>("a[href]")
          : null;
        const href = link?.attribute("href") ?? "";
        if (
          !link ||
          extractPageType(href).type !== "image" ||
          (!link.one("img") && !link.closest("#gdt, .gdtm, .gdtl"))
        ) {
          return;
        }

        event.preventDefault();
        event.stopPropagation();
        onOpen(normalizeUrl(href, currentUrl));
      };

      return thumbs?.listen("click", handleClick) ?? (() => undefined);
    },
    transformSwipeInput(): void {
      if (!thumbsSource) {
        return;
      }
      thumbs?.transform({ classes: { add: ["select-none", "touch-pan-y"] } });
      for (const source of thumbImages) {
        source.inplace().transform({
          attributes: { set: { draggable: "false" } },
          classes: { add: ["[-webkit-user-drag:none]"] },
        });
      }
    },
    replaceThumbs(items: typeof thumbItems): void {
      thumbs?.replaceChildren(...items);
    },
    setThumbsLoading(loading: boolean): void {
      thumbs?.attribute("aria-busy", String(loading));
    },
    transformPageBars(): void {
      if (originalPageBarTop && pageBarTop) {
        originalPageBarTop.after(pageBarTop);
        originalPageBarTop.setHidden(true);
      }
      if (originalPageBarBottom && pageBarBottom) {
        originalPageBarBottom.after(pageBarBottom);
        originalPageBarBottom.setHidden(true);
      }
      if (originalPageDescription && pageBarDescription && pageBarTop) {
        originalPageDescription.setHidden(true);
        pageBarTop.before(pageBarDescription);
      }
    },
    scrollPageBar(position: "bottom" | "top"): void {
      const pageBar = position === "top" ? pageBarTop : pageBarBottom;
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
  const url = imageGalleryUrl(root);
  if (!url) {
    return null;
  }
  const page = extractPageType(url);
  return page.type === "gallery" ? page : null;
}

/** Fetches and extracts one original image page for Reader Provider. */
export async function loadEhImagePage(page: ReaderPage): Promise<LoadedReaderPage> {
  const response = await requestPage(page.url);
  const info = readImagePageInfo(response.document, page.url);

  if (!info.imageUrl) {
    throw new Error(texts.errors.imageNotFound);
  }

  return info;
}

function readImagePageInfo(root: ParentNode, baseUrl: string): ImagePageInfo {
  const page = DomNode.from(root);
  const image = page.one<HTMLImageElement>("img#img");
  const imageUrl = normalizeUrl(
    image?.attribute("src") || image?.attribute("data-src") || "",
    baseUrl,
  );
  const originalImageUrl = page
    .all<HTMLAnchorElement>("a[href]")
    .map((link) => normalizeUrl(link.attribute("href") || "", baseUrl))
    .find(isFullImageUrl) ?? null;
  return {
    height: numberAttribute(image, "height"),
    imageUrl,
    originalImageUrl,
    width: numberAttribute(image, "width"),
  };
}

function imageGalleryUrl(
  root: ParentNode = document,
  baseUrl = window.location.href,
): string | null {
  for (const link of DomNode.from(root).all<HTMLAnchorElement>("a[href]")) {
    const url = normalizeUrl(link.attribute("href") || "", baseUrl);
    if (extractPageType(url).type === "gallery") {
      return url;
    }
  }
  return null;
}

function numberAttribute(node: DomNode<Element> | null, name: string): number | null {
  const value = Number(node?.attribute(name));
  return Number.isFinite(value) && value > 0 ? value : null;
}
