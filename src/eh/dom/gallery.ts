import {
  addMyTag,
  deleteMyTag,
  requestPage,
  updateGalleryRating,
  updateGalleryTagVote,
  type GalleryRatingResult,
  type GalleryTagApiInfo,
  type MyTagMode,
} from "../request";
import type { LoadedReaderPage, ReaderPage } from "../../readerTypes";
import texts from "../../texts.json";
import { normalizeUrl } from "../../utils";
import type {
  GalleryFavoriteOption,
  GalleryPageBarMount,
  GalleryTagAction,
  GalleryTagData,
  ImagePageInfo,
} from "../types";
import type { MyTagAppearance, MyTagSetOption } from "../../state";
import {
  extractPageType,
  galleryIdentityFromUrl,
  galleryTagNameFromUrl,
  isAllowedGalleryApiUrl,
  isFullImageUrl,
  isSameOriginUrl,
  previewPageIndex,
  previewUrlForIndex,
  type PageType,
} from "../url";
import {
  createManagedElement,
  documentBody,
  DomNode,
  ManagedDomNode,
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

/** Submits GalleryInfo's rating control through the original gallery API context. */
async function setGalleryRating(
  info: GalleryTagApiInfo,
  value: number,
): Promise<GalleryRatingResult> {
  const rating = Math.round(value * 2);

  if (rating < 1 || rating > 10) {
    throw new RangeError("Gallery rating must be between 0.5 and 5 stars.");
  }

  return updateGalleryRating(info, value);
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

/** Adds a GalleryInfo tag to a My Tags collection. */
async function favoriteGalleryTag(tag: GalleryTagData, tagSet: string, mode: MyTagMode): Promise<void> {
  const response = await addMyTag(tag.name, tagSet, mode);

  if (!isSameOriginUrl(response.url) || !extractMyTagsPageData(response.document, tagSet)) {
    throw new Error("My Tags page is unavailable");
  }

}

/** Removes a GalleryInfo tag from its My Tags collection. */
async function removeGalleryTagFavorite(tag: GalleryTagData): Promise<void> {
  if (!tag.myTag) {
    return;
  }

  const response = await deleteMyTag(tag.myTag.id, tag.myTag.tagSet);

  if (!isSameOriginUrl(response.url) || !extractMyTagsPageData(response.document, tag.myTag.tagSet)) {
    throw new Error("My Tags page is unavailable");
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
export function extractGalleryMyTags(appearances: MyTagAppearance[]) {
  applyMyTagAppearances(appearances);
  const dispose = observeGalleryTagChanges(() =>
    applyMyTagAppearances(appearances),
  );
  return { actions: { dispose } };
}

/** Submits GalleryInfo's vote action and replaces the managed original tag list. */
async function runGalleryTagAction(
  info: GalleryTagApiInfo,
  tag: GalleryTagData,
  action: GalleryTagAction,
): Promise<void> {
  const vote = action === "voteUp"
    ? 1
    : action === "voteDown"
      ? -1
      : tag.vote === "up"
        ? -1
        : tag.vote === "down"
          ? 1
          : 0;
  const tagPane = await updateGalleryTagVote(info, tag.name, vote);
  const tagListSource = DomNode.from(document).one<HTMLElement>("#taglist");
  const tagList = tagListSource?.inplace();

  if (!tagList) {
    throw new Error("Gallery tag list is unavailable.");
  }

  const template = document.createElement("template");
  template.innerHTML = tagPane;
  tagList.replaceChildren(...Array.from(template.content.childNodes));
}

/** Captures GalleryInfo API credentials before SinglePage removes original scripts. */
export function extractGalleryApiSession(root: ParentNode = document, baseUrl = window.location.href): boolean {
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
function extractGalleryTagApiInfo(): GalleryTagApiInfo | null {
  const gallery = galleryIdentityFromUrl();

  if (!gallery) {
    console.warn("[ehpeek] Gallery API context unavailable", {
      reason: "gallery-path-invalid",
      pathname: window.location.pathname,
    });
    return null;
  }

  if (!galleryApiSession && !extractGalleryApiSession()) {
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

/** Extracts GalleryInfo's favorite-slot choices from the fetched original dialog. */
function extractGalleryFavoriteOptions(doc: Document, favorited: boolean): GalleryFavoriteOption[] {
  return DomNode.from(doc).all<HTMLInputElement>("input[name='favcat']").map((input) => {
    const row = input.closest<HTMLElement>("div[style*='height']");
    const value = input.inputValue();
    const label = row?.text().replace(/\s+/g, " ") || value;

    return {
      color: galleryFavoriteColor(value),
      label,
      selected: favorited && input.checked(),
      value,
    };
  });
}

function galleryFavoriteColor(value: string): string | null {
  const slot = value.match(/^(?:fav)?([0-9])$/i)?.[1] ?? value.match(/^favorites?\s+([0-9])$/i)?.[1];
  return slot === undefined ? null : `var(--color-site-favorite-${slot})`;
}

/** Extracts the original Gallery API operations consumed by GalleryInfo. */
export function extractGalleryOperations() {
  const actions = {
    async favoriteOptions(actionUrl: string, favorited: boolean) {
      const response = await requestPage(actionUrl);
      return extractGalleryFavoriteOptions(response.document, favorited);
    },
    async favoriteTag(
      tag: GalleryTagData,
      tagSet: string,
      mode: MyTagMode,
    ): Promise<void> {
      await favoriteGalleryTag(tag, tagSet, mode);
    },
    async rate(value: number) {
      const api = extractGalleryTagApiInfo();
      if (!api) {
        throw new Error("Gallery API context is unavailable.");
      }
      return setGalleryRating(api, value);
    },
    async removeFavoriteTag(tag: GalleryTagData): Promise<void> {
      await removeGalleryTagFavorite(tag);
    },
    async tagAction(tag: GalleryTagData, action: GalleryTagAction): Promise<void> {
      const api = extractGalleryTagApiInfo();
      if (!api) {
        throw new Error("Gallery API context is unavailable.");
      }
      await runGalleryTagAction(api, tag, action);
    },
  };
  return { actions };
}

export type GalleryOperationsDom = ReturnType<
  typeof extractGalleryOperations
>;

/** Returns the original GalleryInfo control used to mount the Continue/Read button. */
export function extractGalleryContinueReadingButtonMount() {
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
  endImage: number | null;
  maxIndex: number | null;
  pageSize: number | null;
  pages: ReaderPage[];
  startImage: number | null;
  totalImages: number | null;
};

export type GalleryPreviewDom = {
  actions: {
    imageUrlForClick: (target: EventTarget | null) => string | null;
    navigate: (url: string, placeholder: Node | string) => Promise<GalleryPreviewDom>;
    pageBarMounts: (topClassName: string, bottomClassName: string) => GalleryPageBarMount[];
    scrollPageBar: (position: "bottom" | "top") => void;
    setBusy: (busy: boolean) => void;
    swipeTarget: () => HTMLElement | null;
  };
  data: GalleryPreviewData;
};

/** Extracts all Gallery Preview pagination and Reader-page data from one original document. */
export function extractGalleryPreview(
  root: ParentNode = document,
  baseUrl = window.location.href,
): GalleryPreviewDom {
  const page = DomNode.from(root);
  const currentUrl = new URL(baseUrl, window.location.href).href;
  const currentIndex = previewPageIndex(currentUrl);
  const rangeText = page.one<HTMLElement>(GALLERY_PAGE_DESCRIPTION_SELECTOR)?.text() ?? "";
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
    endImage,
    maxIndex,
    pageSize,
    pages,
    startImage,
    totalImages,
  };
  const actions = {
    imageUrlForClick(target: EventTarget | null): string | null {
      const link = target instanceof Element
        ? DomNode.from(target).closest<HTMLAnchorElement>("a[href]")
        : null;
      const href = link?.attribute("href") ?? "";
      if (!link || extractPageType(href).type !== "image") {
        return null;
      }
      return link.one("img") || link.closest("#gdt, .gdtm, .gdtl")
        ? normalizeUrl(href, currentUrl)
        : null;
    },
    async navigate(url: string, placeholder: Node | string): Promise<GalleryPreviewDom> {
      const previousUrl = window.location.href;
      const snapshot = snapshotPreview();
      window.history.replaceState(window.history.state, "", url);
      showPreviewPlaceholder(placeholder);
      try {
        const response = await requestPage(url);
        applyPreviewContent(response.document);
        return extractGalleryPreview();
      } catch (error) {
        restorePreview(snapshot);
        window.history.replaceState(window.history.state, "", previousUrl);
        throw error;
      }
    },
    pageBarMounts(topClassName: string, bottomClassName: string) {
      return replaceGalleryPageBarMounts(topClassName, bottomClassName);
    },
    scrollPageBar(position: "bottom" | "top"): void {
      const target = DomNode.from(document).one<HTMLElement>(`[data-ehpeek-preview-page-bar='${position}']`);
      target?.inplace().scrollIntoView({
        behavior: "smooth",
        block: position === "top" ? "start" : "end",
      });
    },
    setBusy(busy: boolean): void {
      const thumbsSource = page.one<HTMLElement>("#gdt");
      const thumbs = thumbsSource?.inplace();
      thumbs?.transform({ attributes: busy ? { set: { "aria-busy": "true" } } : { remove: ["aria-busy"] } });
    },
    swipeTarget(): HTMLElement | null {
      const thumbsSource = page.one<HTMLElement>("#gdt");
      const thumbs = thumbsSource?.inplace() ?? null;
      if (!thumbs || !thumbsSource) {
        return null;
      }
      thumbs.styles({ "touch-action": "pan-y", "user-select": "none" });
      for (const source of thumbsSource.all<HTMLElement>("a, img, .gdtm, .gdtl")) {
        const target = source.inplace();
        target.styles({ "touch-action": "pan-y", "user-select": "none" });
        if (source.matches("img")) {
          target.attribute("draggable", "false").styles({ "-webkit-user-drag": "none" });
        }
      }
      return thumbs.Component();
    },
  };

  return { actions, data };
}

/** Replaces Preview's original page bars with managed ScrollPageBar mounts. */
function replaceGalleryPageBarMounts(
  topClassName: string,
  bottomClassName: string,
): GalleryPageBarMount[] {
  const originals = DomNode.from(document).all<HTMLElement>(".ptt, .ptb");
  const topSource = originals.find((item) => item.hasClass("ptt")) ?? originals[0];
  const bottomSource = originals.find((item) => item.hasClass("ptb")) ?? originals[1] ?? originals[0];
  const mounts: GalleryPageBarMount[] = [];
  const description = galleryPageDescription();
  const descriptionText = description?.text() || null;

  if (description) {
    description.inplace().setHidden(true);
  }

  if (topSource) {
    mounts.push(replaceGalleryPageBarAt(topSource, true, topClassName, descriptionText));
  }

  if (bottomSource) {
    mounts.push(replaceGalleryPageBarAt(bottomSource, false, bottomClassName, descriptionText));
  }

  for (const original of originals) {
    original.inplace().setHidden(true);
  }

  return mounts;
}

/** Detaches the current Preview content for SinglePage history restoration. */
function snapshotPreview() {
  const page = DomNode.from(document);
  return {
    description: galleryPageDescription()?.clone() ?? null,
    thumbs: page.one<HTMLElement>("#gdt")?.clone() ?? null,
  };
}

/** Replaces Preview thumbnails with its loading or error placeholder. */
function showPreviewPlaceholder(content: Node | string): void {
  const currentSource = DomNode.from(document).one<HTMLElement>("#gdt");
  const current = currentSource?.inplace();

  if (!current || !currentSource) {
    return;
  }

  const rect = currentSource.rect();
  const placeholder = createManagedElement("div")
    .attribute("id", "gdt")
    .attribute("aria-busy", "true")
    .transform({ classes: { replace: "ehpeek-preview-placeholder flex items-center justify-center opacity-72" } })
    .styles({ "min-height": `${Math.max(160, Math.round(rect.height))}px` })
    .appendContent(content);
  current.replaceWith(placeholder);
}

/** Imports fetched Preview description and thumbnails into the current gallery page. */
function applyPreviewContent(doc: Document): void {
  const description = galleryPageDescription(doc);

  if (description) {
    replaceGalleryPageDescription(description);
  }

  replaceFirstGalleryElement("#gdt", doc);
}

/** Restores a detached Preview snapshot during SinglePage history navigation. */
function restorePreview(snapshot: ReturnType<typeof snapshotPreview>): void {
  const currentThumbsSource = DomNode.from(document).one<HTMLElement>("#gdt");
  const currentThumbs = currentThumbsSource?.inplace();

  if (snapshot.description) {
    replaceGalleryPageDescription(snapshot.description);
  }

  if (snapshot.thumbs && currentThumbs) {
    currentThumbs.replaceWith(snapshot.thumbs);
  }
}

function replaceGalleryPageBarAt(
  source: DomNode<HTMLElement>,
  top: boolean,
  className: string,
  descriptionText: string | null,
): GalleryPageBarMount {
  const page = DomNode.from(document);
  const existingSource = page.one<HTMLDivElement>(`.${className}`);
  const existing = existingSource?.inplace() ?? null;
  const descriptionSource = top
    ? page.one<HTMLDivElement>("[data-ehpeek-gallery-page-description-mount]")
    : null;
  const descriptionElement = top
    ? descriptionSource?.inplace() ?? createManagedElement("div")
    : null;
  descriptionElement?.attribute("data-ehpeek-gallery-page-description-mount", "true");

  if (existing) {
    existing.attribute("data-ehpeek-preview-page-bar", top ? "top" : "bottom");
    if (descriptionElement) {
      existing.before(descriptionElement);
    }
    return { descriptionElement, descriptionText, element: existing, top };
  }

  const pageBar = createManagedElement("div");
  pageBar.attribute("data-ehpeek-preview-page-bar", top ? "top" : "bottom");
  source.inplace().after(pageBar);
  if (descriptionElement) {
    pageBar.before(descriptionElement);
  }
  return { descriptionElement, descriptionText, element: pageBar, top };
}

function replaceFirstGalleryElement(selector: string, doc: Document): void {
  const current = DomNode.from(document).one<HTMLElement>(selector);
  const incoming = DomNode.from(doc).one<HTMLElement>(selector);

  if (!current || !incoming) {
    return;
  }

  const currentElement = current.inplace();
  const incomingElement = incoming.clone();
  if (currentElement && incomingElement) {
    currentElement.replaceWith(incomingElement);
  }
}

function galleryPageDescription(root: ParentNode = document): DomNode<HTMLElement> | null {
  return DomNode.from(root).one<HTMLElement>(GALLERY_PAGE_DESCRIPTION_SELECTOR);
}

function replaceGalleryPageDescription(incoming: DomNode<HTMLElement> | ManagedDomNode): void {
  const current = galleryPageDescription();

  if (!current) {
    return;
  }

  const staleDescriptions = DomNode.from(document).all<HTMLElement>(".gpc");
  const currentElement = current.inplace();
  const incomingElement = incoming instanceof ManagedDomNode ? incoming : incoming.clone();
  if (currentElement && incomingElement) {
    currentElement.replaceWith(incomingElement);
  }

  for (const description of staleDescriptions) {
    if (!description.sameNode(current)) {
      description.inplace().remove();
    }
  }
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

/** Fetches one original preview page for Reader Provider pagination. */
export async function pullPreviewPage(index: number): Promise<ReaderPage[]> {
  const previewUrl = previewUrlForIndex(index);
  const response = await requestPage(previewUrl);
  return extractGalleryPreview(response.document, previewUrl).data.pages;
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
