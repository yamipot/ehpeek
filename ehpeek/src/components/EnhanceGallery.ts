import type { ReaderPage } from "./Reader";
import { BetterPageBar, BETTER_PAGE_BAR_CLASS } from "./BetterPageBar";
import betterPageBarCss from "./BetterPageBar.css";
import { state } from "../state";
import { clamp } from "../utils";

const REQUEST_TIMEOUT_MS = 30000;
const PREVIEW_CACHE_LIMIT = 10;
const GALLERY_STYLE_ID = "ehpeek-gallery-style";

type GallerySnapshot = unknown;

type GalleryEnhancement = {
  currentPreviewIndex: () => number;
  maxPreviewIndex: () => number | null;
  previewUrlForIndex: (index: number) => string;
  previewIndexFromUrl: (url: string) => number | null;
  renderPageBars: (currentIndex: number, maxIndex: number | null) => void;
  snapshotPreview: () => GallerySnapshot;
  installPreviewPlaceholder: () => void;
  replacePreviewContent: (doc: Document, baseUrl: string) => void;
  restorePreview: (snapshot: GallerySnapshot) => void;
  onError: (error: unknown) => void;
};

let activeEnhancement: GalleryEnhancement | null = null;
let galleryThumbEnhancementInstalled = false;

export function enhanceGalleryThumbsEnabled(): boolean {
  return state.gallery.enhanceThumbs.value;
}

export function toggleEnhanceGalleryThumbs(): void {
  state.gallery.enhanceThumbs.set(!enhanceGalleryThumbsEnabled());
}

export function previewPageIndexFromUrl(url: string, pageUrl = window.location.href): number | null {
  try {
    const parsed = new URL(url, pageUrl);
    const current = new URL(pageUrl);

    if (parsed.origin !== current.origin || parsed.pathname !== current.pathname) {
      return null;
    }

    const value = Number(parsed.searchParams.get("p") || "0");
    return Number.isFinite(value) && value >= 0 ? value : null;
  } catch {
    return null;
  }
}

export function previewPageIndex(url = window.location.href): number {
  try {
    const value = Number(new URL(url).searchParams.get("p") || "0");
    return Number.isFinite(value) && value >= 0 ? value : 0;
  } catch {
    return 0;
  }
}

export function previewUrlForIndex(previewIndex: number, pageUrl = window.location.href): string {
  const url = new URL(pageUrl);

  if (previewIndex <= 0) {
    url.searchParams.delete("p");
  } else {
    url.searchParams.set("p", String(previewIndex));
  }

  url.hash = "";
  return url.href;
}

export function previewPageIndexForGalleryPage(galleryPage: number, pageSize: number, maxPreviewIndex: number | null): number {
  const previewIndex = Math.max(0, Math.floor((galleryPage - 1) / pageSize));
  return maxPreviewIndex === null ? previewIndex : Math.min(previewIndex, maxPreviewIndex);
}

export function peekPageFromHash(hash = window.location.hash): number | null {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  const page = Number(params.get("peek_page") || "");

  return Number.isFinite(page) && page > 0 ? page : null;
}

export function galleryPageNumber(url: string): number | undefined {
  try {
    const parsed = new URL(url, window.location.href);
    const match = parsed.pathname.match(/\/(\d+)-(\d+)\/?$/);
    const pageNumber = Number(match?.[2] || "");

    return Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : undefined;
  } catch {
    return undefined;
  }
}

export function updatePeekLocation(pageNumber: number | undefined, pageSize: number, maxPreviewIndex: number | null): void {
  if (!pageNumber || pageNumber <= 0) {
    return;
  }

  const url = new URL(window.location.href);
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nextValue = String(pageNumber);
  const nextPreviewIndex = previewPageIndexForGalleryPage(pageNumber, pageSize, maxPreviewIndex);
  let changed = false;

  if (nextPreviewIndex === 0) {
    if (url.searchParams.has("p")) {
      url.searchParams.delete("p");
      changed = true;
    }
  } else if (url.searchParams.get("p") !== String(nextPreviewIndex)) {
    url.searchParams.set("p", String(nextPreviewIndex));
    changed = true;
  }

  if (params.get("peek_page") !== nextValue) {
    params.set("peek_page", nextValue);
    changed = true;
  }

  if (!changed) {
    return;
  }

  url.hash = params.toString();
  window.history.replaceState(window.history.state, "", url.href);
}

export async function requestText(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => {
    controller.abort();
  }, REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      credentials: "include",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    return await response.text();
  } finally {
    window.clearTimeout(timeout);
  }
}

export class GalleryPageProvider {
  private readonly previewCache = new Map<number, ReaderPage[]>();

  constructor(
    private readonly landingIndex: number,
    private readonly landingPages: ReaderPage[],
    private readonly pageSize: number,
    private readonly maxPreviewIndex: number | null,
    private readonly windowSize: number,
    private readonly loadPreviewPage: (index: number, landingIndex: number, landingPages: ReaderPage[]) => Promise<ReaderPage[]>,
  ) {
    this.previewCache.set(landingIndex, landingPages);
  }

  previewIndexForPage(pageNum: number): number {
    return previewPageIndexForGalleryPage(pageNum, this.pageSize, this.maxPreviewIndex);
  }

  async loadDisplayPages(pageNums: number[]): Promise<ReaderPage[]> {
    const previewIndexes = Array.from(new Set(pageNums.map((pageNum) => this.previewIndexForPage(pageNum)))).filter(
      (value) => value >= 0 && (this.maxPreviewIndex === null || value <= this.maxPreviewIndex),
    );
    const requested = new Set(pageNums);
    const chunks = await Promise.all(previewIndexes.map((index) => this.cachedPreviewPage(index)));
    const byUrl = new Map<string, ReaderPage>();

    for (const page of chunks.flat()) {
      if (page.pageNum && requested.has(page.pageNum)) {
        byUrl.set(page.url, page);
      }
    }

    return Array.from(byUrl.values()).sort(
      (left, right) => (left.pageNum ?? Number.MAX_SAFE_INTEGER) - (right.pageNum ?? Number.MAX_SAFE_INTEGER),
    );
  }

  displayWindowAround(pageNum: number): number[] {
    const numbers: number[] = [];

    for (let offset = -this.windowSize; offset <= this.windowSize; offset += 1) {
      const value = pageNum + offset;

      if (value > 0) {
        numbers.push(value);
      }
    }

    return numbers;
  }

  private async cachedPreviewPage(index: number): Promise<ReaderPage[]> {
    const boundedIndex = this.maxPreviewIndex === null ? index : Math.min(index, this.maxPreviewIndex);

    if (boundedIndex < 0) {
      return [];
    }

    const cached = this.previewCache.get(boundedIndex);

    if (cached) {
      this.previewCache.delete(boundedIndex);
      this.previewCache.set(boundedIndex, cached);
      return cached;
    }

    const pages = await this.loadPreviewPage(boundedIndex, this.landingIndex, this.landingPages);
    this.previewCache.set(boundedIndex, pages);

    while (this.previewCache.size > PREVIEW_CACHE_LIMIT) {
      const oldest = this.previewCache.keys().next().value;

      if (oldest === undefined) {
        break;
      }

      this.previewCache.delete(oldest);
    }

    return pages;
  }
}

export function createBetterPageBar(options: {
  currentIndex: number;
  maxIndex: number | null;
  top: boolean;
  previewUrlForIndex: (index: number) => string;
}): HTMLTableElement {
  return new BetterPageBar({
    currentIndex: options.currentIndex,
    maxIndex: options.maxIndex,
    top: options.top,
    urlForIndex: options.previewUrlForIndex,
  }).element;
}

export function installGalleryThumbEnhancement(enhancement: GalleryEnhancement): void {
  activeEnhancement = enhancement;
  ensureGalleryStyle();
  enhancement.renderPageBars(enhancement.currentPreviewIndex(), enhancement.maxPreviewIndex());

  if (galleryThumbEnhancementInstalled) {
    return;
  }

  galleryThumbEnhancementInstalled = true;
  document.addEventListener("click", onPageBarClick, true);
}

export async function navigateGalleryPreview(url: string, historyMode: "push" | "replace"): Promise<void> {
  if (!activeEnhancement) {
    window.location.href = url;
    return;
  }

  const previousUrl = window.location.href;
  const snapshot = activeEnhancement.snapshotPreview();
  const targetPreviewIndex = activeEnhancement.previewIndexFromUrl(url);

  if (historyMode === "push") {
    window.history.pushState(window.history.state, "", url);
  } else {
    window.history.replaceState(window.history.state, "", url);
  }

  if (targetPreviewIndex !== null) {
    activeEnhancement.renderPageBars(targetPreviewIndex, activeEnhancement.maxPreviewIndex());
  }

  activeEnhancement.installPreviewPlaceholder();

  try {
    const html = await requestText(url);
    const doc = new DOMParser().parseFromString(html, "text/html");

    activeEnhancement.replacePreviewContent(doc, url);
  } catch (error) {
    activeEnhancement.restorePreview(snapshot);
    window.history.replaceState(window.history.state, "", previousUrl);
    activeEnhancement.renderPageBars(activeEnhancement.currentPreviewIndex(), activeEnhancement.maxPreviewIndex());
    throw error;
  }
}

function onPageBarClick(event: MouseEvent): void {
  const enhancement = activeEnhancement;

  if (!enhancement || !(event.target instanceof Element)) {
    return;
  }

  const barItem = event.target.closest<HTMLElement>(`.${BETTER_PAGE_BAR_CLASS} a[data-page-index], .${BETTER_PAGE_BAR_CLASS} button[data-page-jump]`);

  if (!barItem) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const url = pageBarUrl(barItem, enhancement);

  if (!url) {
    return;
  }

  if (!enhanceGalleryThumbsEnabled()) {
    window.location.href = url;
    return;
  }

  void navigateGalleryPreview(url, "push").catch(enhancement.onError);
}

function pageBarUrl(item: HTMLElement, enhancement: GalleryEnhancement): string | null {
  if (item instanceof HTMLAnchorElement) {
    return enhancement.previewIndexFromUrl(item.href) === null ? null : item.href;
  }

  const maxPreviewIndex = enhancement.maxPreviewIndex();

  if (maxPreviewIndex === null) {
    return null;
  }

  const page = window.prompt(`Jump to page: (1-${maxPreviewIndex + 1})`, String(enhancement.currentPreviewIndex() + 1));
  const pageNumber = Number(page || "");

  if (!Number.isFinite(pageNumber)) {
    return null;
  }

  return enhancement.previewUrlForIndex(clamp(Math.round(pageNumber) - 1, 0, maxPreviewIndex));
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
