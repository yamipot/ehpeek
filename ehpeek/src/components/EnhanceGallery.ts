import type { ReaderPage } from "./Reader";
import { GalleryMobileView } from "./GalleryMobileView";
import {
  BETTER_PAGE_BAR_BOTTOM_CLASS,
  BETTER_PAGE_BAR_CLASS,
  BETTER_PAGE_BAR_TOP_CLASS,
  setBetterPageBarWindowIndex,
} from "./BetterPageBar";
import * as eh from "../eh";
import { state } from "../state";
import texts from "../texts.json";
import { clamp, requestText } from "../utils";

const PREVIEW_CACHE_LIMIT = 10;
const CONTINUE_READING_STYLE_ID = "ehpeek-continue-reading-style";
const CONTINUE_READING_STYLE = `
.ehpeek-gallery-actions {
  box-sizing: border-box;
}

.ehpeek-continue-reading {
  display: block;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  margin-top: 4px;
  padding: 4px 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 4px;
  background: rgba(18, 18, 18, 0.82);
  color: #f5f5f5;
  box-shadow: none;
  cursor: pointer;
  text-align: center;
  font: 700 13px/1.15 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ehpeek-continue-reading:hover {
  background: rgba(32, 32, 32, 0.9);
}

.ehpeek-continue-reading-page {
  display: block;
  margin-top: 1px;
  opacity: 0.72;
  font-size: 11px;
  font-weight: 600;
}

@media (max-width: 760px), (pointer: coarse) {
  .ehpeek-mobile-gallery-primary-actions .ehpeek-continue-reading {
    min-height: 87px;
    margin: 0;
    padding: 12px 15px;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #f0b35a;
    box-shadow: none;
    font-size: 26px;
    text-transform: uppercase;
  }

  .ehpeek-mobile-gallery-primary-actions .ehpeek-continue-reading-page {
    margin-top: 2px;
    color: #f0b35a;
    font-size: 18px;
    opacity: 0.78;
    text-transform: none;
  }

  .ehpeek-gallery-actions {
    display: flex;
    height: auto !important;
    min-height: 0 !important;
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    overflow: visible !important;
  }

  .ehpeek-gallery-actions > * {
    box-sizing: border-box;
    max-width: 100%;
  }

  .ehpeek-gallery-actions a,
  .ehpeek-gallery-actions button,
  .ehpeek-gallery-actions input[type="button"],
  .ehpeek-gallery-actions input[type="submit"] {
    min-height: 63px;
    touch-action: manipulation;
  }

  .ehpeek-continue-reading {
    margin-top: 0;
    padding: 12px 15px;
    font-size: 23px;
  }

  .ehpeek-continue-reading-page {
    font-size: 18px;
  }
}
`;

let galleryThumbEnhancementErrorHandler: ((error: unknown) => void) | null = null;
let galleryThumbEnhancementClickInstalled = false;
let galleryMobileView: GalleryMobileView | null = null;

export function enhanceGalleryThumbsEnabled(): boolean {
  return state.gallery.enhanceThumbs.value;
}

export function toggleEnhanceGalleryThumbs(): void {
  const enabled = !enhanceGalleryThumbsEnabled();
  state.gallery.enhanceThumbs.set(enabled);

  if (enabled) {
    installGalleryPageBar();
  } else {
    eh.restoreGalleryPageBar();
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
    return eh.previewPageIndexForGalleryPage(pageNum, this.pageSize, this.maxPreviewIndex);
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

export function installGalleryThumbEnhancement(onError: (error: unknown) => void, onOpenSettings: () => void): void {
  galleryThumbEnhancementErrorHandler = onError;
  galleryMobileView ??= new GalleryMobileView({ onOpenSettings });
  galleryMobileView.install();

  if (enhanceGalleryThumbsEnabled()) {
    installGalleryPageBar();
  }

  if (galleryThumbEnhancementClickInstalled) {
    return;
  }

  galleryThumbEnhancementClickInstalled = true;
  document.addEventListener("click", onPageBarClick, true);
}

export async function navigateGalleryPreview(url: string, historyMode: "push" | "replace"): Promise<void> {
  const previousUrl = window.location.href;
  const snapshot = eh.snapshotPreview();
  const targetPreviewIndex = eh.previewPageIndexFromUrl(url);

  if (historyMode === "push") {
    window.history.pushState(window.history.state, "", url);
  } else {
    window.history.replaceState(window.history.state, "", url);
  }

  if (targetPreviewIndex !== null) {
    eh.replaceGalleryPageBar(targetPreviewIndex, eh.maxPreviewPageIndex());
  }

  eh.installPreviewPlaceholder();

  try {
    const html = await requestText(url);
    const doc = new DOMParser().parseFromString(html, "text/html");

    eh.replacePreviewContent(doc, url);
  } catch (error) {
    eh.restorePreview(snapshot);
    window.history.replaceState(window.history.state, "", previousUrl);
    eh.replaceGalleryPageBar(eh.previewPageIndex(), eh.maxPreviewPageIndex());
    throw error;
  }
}

type ContinueReadingButtonInfo = {
  label: string;
  detail: string;
};

export function installContinueReadingButton(info: ContinueReadingButtonInfo, onClick: () => void): void {
  document.querySelector(".ehpeek-continue-reading")?.remove();
  galleryMobileView?.install();
  ensureContinueReadingStyle();

  const detail = document.createElement("span");
  const button = document.createElement("button");

  button.type = "button";
  button.className = "ehpeek-continue-reading";
  button.title = info.label;
  button.textContent = info.label;
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    onClick();
  });

  detail.className = "ehpeek-continue-reading-page";
  detail.textContent = info.detail;
  button.append(detail);
  mountContinueReadingButton(button);
}

function onPageBarClick(event: MouseEvent): void {
  if (!enhanceGalleryThumbsEnabled()) {
    return;
  }

  if (!(event.target instanceof Element)) {
    return;
  }

  const barItem = event.target.closest<HTMLElement>(`.${BETTER_PAGE_BAR_CLASS} a[data-page-index], .${BETTER_PAGE_BAR_CLASS} button[data-page-jump]`);

  if (!barItem) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const url = pageBarUrl(barItem);

  if (!url) {
    return;
  }

  const fromBottomBar = Boolean(barItem.closest(`.${BETTER_PAGE_BAR_BOTTOM_CLASS}`));
  const targetPreviewIndex = eh.previewPageIndexFromUrl(url);

  if (targetPreviewIndex !== null) {
    setBetterPageBarWindowIndex(targetPreviewIndex);
  }

  if (fromBottomBar) {
    scrollToTopPageBar();
  }

  void navigateGalleryPreview(url, "push").catch((error) => galleryThumbEnhancementErrorHandler?.(error));
}

function ensureContinueReadingStyle(): void {
  if (document.getElementById(CONTINUE_READING_STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = CONTINUE_READING_STYLE_ID;
  style.textContent = CONTINUE_READING_STYLE;
  document.head.append(style);
}

function mountContinueReadingButton(button: HTMLButtonElement): void {
  if (galleryMobileView?.mountContinueButton(button)) {
    return;
  }

  const viewerOptions = document.querySelector<HTMLElement>("#gd5");

  if (viewerOptions) {
    viewerOptions.classList.add("ehpeek-gallery-actions");
    viewerOptions.append(button);
    return;
  }

  document.body.append(button);
}

function scrollToTopPageBar(): void {
  document.querySelector<HTMLElement>(`.${BETTER_PAGE_BAR_TOP_CLASS}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
}

function installGalleryPageBar(): void {
  eh.replaceGalleryPageBar(eh.previewPageIndex(), eh.maxPreviewPageIndex());
}

function pageBarUrl(item: HTMLElement): string | null {
  if (item instanceof HTMLAnchorElement) {
    return eh.previewPageIndexFromUrl(item.href) === null ? null : item.href;
  }

  const maxPreviewIndex = eh.maxPreviewPageIndex();

  if (maxPreviewIndex === null) {
    return null;
  }

  const page = window.prompt(`Jump to page: (1-${maxPreviewIndex + 1})`, String(eh.previewPageIndex() + 1));
  const pageNumber = Number(page || "");

  if (!Number.isFinite(pageNumber)) {
    return null;
  }

  return eh.previewUrlForIndex(clamp(Math.round(pageNumber) - 1, 0, maxPreviewIndex));
}
