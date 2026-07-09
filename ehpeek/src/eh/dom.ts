import { createBetterPageBar } from "../components/BetterPageBar";
import betterPageBarCss from "../components/BetterPageBar.css";
import type { ReaderPage } from "../components/Reader";
import type { SettingsMenu } from "../components/SettingsMenu";
import { normalizeUrl } from "../utils";

const GALLERY_STYLE_ID = "ehpeek-gallery-style";
const BETTER_PAGE_BAR_TOP_CLASS = "ehpeek-better-page-bar-top";
const BETTER_PAGE_BAR_BOTTOM_CLASS = "ehpeek-better-page-bar-bottom";
const PREVIEW_PLACEHOLDER_CLASS = "ehpeek-preview-placeholder";

export type PreviewSnapshot = {
  description: Node | null;
  thumbs: Node | null;
};

type ExtractedPage =
  | {
      type: "image";
      pageNum: number;
    }
  | {
      type: "gallery" | "other";
    };

export function imageAspectRatio(image: HTMLImageElement | null): number {
  const width = image?.naturalWidth || image?.width || Number(image?.getAttribute("width") || "");
  const height = image?.naturalHeight || image?.height || Number(image?.getAttribute("height") || "");

  return width > 0 && height > 0 ? height / width : 1.42;
}

export function collectGalleryPages(
  extractPageType: (url: string) => ExtractedPage,
  root: ParentNode = document,
  baseUrl = window.location.href,
): ReaderPage[] {
  const links = Array.from(
    root.querySelectorAll<HTMLAnchorElement>("#gdt a[href], .gdtm a[href], .gdtl a[href], a[href*='/s/']"),
  );
  const seen = new Set<string>();
  const pages: ReaderPage[] = [];

  for (const link of links) {
    const url = normalizeUrl(link.getAttribute("href") || "", baseUrl);
    const page = extractPageType(url);

    if (!url || page.type !== "image" || seen.has(url)) {
      continue;
    }

    seen.add(url);
    pages.push({
      url,
      aspectRatio: imageAspectRatio(link.querySelector("img")),
      pageNum: page.pageNum,
    });
  }

  return pages.sort((left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER));
}

export function readShowingRange(root: ParentNode = document): { start: number; end: number; total: number } | null {
  const text = root.querySelector(".gpc")?.textContent ?? "";
  const match = text.match(/([\d,]+)\s*-\s*([\d,]+)\s+of\s+([\d,]+)/i);

  if (!match) {
    return null;
  }

  const start = Number(match[1].replace(/,/g, ""));
  const end = Number(match[2].replace(/,/g, ""));
  const total = Number(match[3].replace(/,/g, ""));

  return [start, end, total].every((value) => Number.isFinite(value) && value > 0) ? { start, end, total } : null;
}

export function maxPreviewPageIndex(root: ParentNode = document, baseUrl = window.location.href): number | null {
  const indexes = Array.from(root.querySelectorAll<HTMLAnchorElement>("a[href*='?p='], a[href*='&p=']"))
    .map((link) => {
      try {
        return Number(new URL(link.getAttribute("href") || "", baseUrl).searchParams.get("p") || "");
      } catch {
        return NaN;
      }
    })
    .filter((value) => Number.isFinite(value) && value >= 0);

  if (indexes.length === 0) {
    return null;
  }

  return Math.max(...indexes);
}

export function findClickedImageLink(target: EventTarget | null, extractPageType: (url: string) => ExtractedPage): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;

  if (!(link instanceof HTMLAnchorElement) || extractPageType(link.href).type !== "image") {
    return null;
  }

  if (link.querySelector("img") || link.closest("#gdt, .gdtm, .gdtl")) {
    return link;
  }

  return null;
}

export function replaceGalleryPageBar(options: {
  currentIndex: number;
  maxIndex: number | null;
  previewUrlForIndex: (index: number) => string;
}): void {
  ensureGalleryStyle();

  const originals = Array.from(document.querySelectorAll<HTMLElement>(".ptt, .ptb"));
  const topSource = originals.find((item) => item.classList.contains("ptt")) ?? originals[0];
  const bottomSource = originals.find((item) => item.classList.contains("ptb")) ?? originals[1] ?? originals[0];

  if (topSource) {
    replaceGalleryPageBarAt(topSource, true, options);
  }

  if (bottomSource) {
    replaceGalleryPageBarAt(bottomSource, false, options);
  }

  for (const original of originals) {
    original.hidden = true;
  }
}

export function snapshotPreview(): PreviewSnapshot {
  return {
    description: document.querySelector(".gpc")?.cloneNode(true) ?? null,
    thumbs: document.querySelector("#gdt")?.cloneNode(true) ?? null,
  };
}

export function installPreviewPlaceholder(): void {
  const current = document.querySelector<HTMLElement>("#gdt");

  if (!current) {
    return;
  }

  const rect = current.getBoundingClientRect();
  const placeholder = document.createElement("div");
  placeholder.id = "gdt";
  placeholder.className = PREVIEW_PLACEHOLDER_CLASS;
  placeholder.style.minHeight = `${Math.max(160, Math.round(rect.height))}px`;
  placeholder.setAttribute("aria-busy", "true");
  current.replaceWith(placeholder);
}

export function replacePreviewContent(doc: Document): void {
  replaceFirstElement(".gpc", doc);
  replaceFirstElement("#gdt", doc);
}

export function restorePreview(snapshot: PreviewSnapshot): void {
  const currentDescription = document.querySelector(".gpc");
  const currentThumbs = document.querySelector("#gdt");

  if (snapshot.description && currentDescription) {
    currentDescription.replaceWith(snapshot.description);
  }

  if (snapshot.thumbs && currentThumbs) {
    currentThumbs.replaceWith(snapshot.thumbs);
  }
}

export function mountSettingsMenu(settingsMenu: SettingsMenu): boolean {
  const thumbnailContainer = document.querySelector("#gdt");
  const titleContainer = document.querySelector("#gd2, h1");
  const topNav = document.querySelector("#nb");
  const anchor = thumbnailContainer ?? titleContainer;

  if (topNav) {
    settingsMenu.mount(topNav);
    return true;
  }

  if (!anchor?.parentElement) {
    return false;
  }

  const wrapper = document.createElement("div");
  wrapper.style.textAlign = "right";

  if (thumbnailContainer) {
    anchor.parentElement.insertBefore(wrapper, anchor);
  } else {
    anchor.insertAdjacentElement("afterend", wrapper);
  }

  settingsMenu.mount(wrapper);
  return true;
}

export function settingsMenuTriggerTagName(): "a" | "button" {
  return document.querySelector("#nb") ? "a" : "button";
}

function replaceGalleryPageBarAt(
  source: HTMLElement,
  top: boolean,
  options: {
    currentIndex: number;
    maxIndex: number | null;
    previewUrlForIndex: (index: number) => string;
  },
): void {
  const className = top ? BETTER_PAGE_BAR_TOP_CLASS : BETTER_PAGE_BAR_BOTTOM_CLASS;
  const existing = document.querySelector<HTMLElement>(`.${className}`);
  const pageBar = createBetterPageBar({
    currentIndex: options.currentIndex,
    maxIndex: options.maxIndex,
    top,
    urlForIndex: options.previewUrlForIndex,
  });

  if (existing) {
    existing.replaceWith(pageBar);
  } else {
    source.insertAdjacentElement("afterend", pageBar);
  }
}

function replaceFirstElement(selector: string, doc: Document): void {
  const current = document.querySelector(selector);
  const incoming = doc.querySelector(selector);

  if (!current || !incoming) {
    return;
  }

  current.replaceWith(document.importNode(incoming, true));
}

function ensureGalleryStyle(): void {
  if (document.getElementById(GALLERY_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = GALLERY_STYLE_ID;
  style.textContent = betterPageBarCss;
  document.head.append(style);
}
