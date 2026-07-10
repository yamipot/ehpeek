import type { ReaderPage } from "../Reader";
import { PointerDrag, type PointerDragEnd, type PointerDragMove } from "../common/pointerDrag";
import { SwipeIndicator } from "./Misc";
import {
  SCROLL_PAGE_BAR_BOTTOM_CLASS,
  SCROLL_PAGE_BAR_CLASS,
  SCROLL_PAGE_BAR_TOP_CLASS,
  setScrollPageBarWindowIndex,
} from "./ScrollPageBar";
import { h } from "../../jsx";
import * as eh from "../../eh";
import { state } from "../../state";
import { clamp, requestText } from "../../utils";

const PREVIEW_CACHE_LIMIT = 10;
const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;
const THUMBS_SWIPE_WRAPPER_CLASS = "ehpeek-thumbs-swipe-wrapper";

let galleryThumbEnhancementErrorHandler: ((error: unknown) => void) | null = null;
let galleryThumbEnhancementClickInstalled = false;
let swipeElement: HTMLDivElement | null = null;
let swipeIndicator: SwipeIndicator | null = null;
let swipeState: SwipeState | null = null;
let galleryNavigationLoading = false;
const installedSwipeElements = new WeakSet<HTMLElement>();

type SwipeState = {
  horizontal: boolean;
  cancelled: boolean;
};

export function enhanceThumbsGridsEnabled(): boolean {
  return state.gallery.enhanceThumbs.value;
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

export function installEnhanceThumbsGrids(onError: (error: unknown) => void): void {
  galleryThumbEnhancementErrorHandler = onError;

  if (enhanceThumbsGridsEnabled()) {
    installGalleryPageBar();
    installThumbsGridSwipe();
  }

  if (galleryThumbEnhancementClickInstalled) {
    return;
  }

  galleryThumbEnhancementClickInstalled = true;
  document.addEventListener("click", onPageBarClick, true);
}

export async function navigateGalleryPreview(
  url: string,
  options: { scrollToPageBar?: "top" | "bottom" } = {},
): Promise<void> {
  if (galleryNavigationLoading) {
    return;
  }

  const previousUrl = window.location.href;
  const snapshot = eh.snapshotPreview();
  const targetPreviewIndex = eh.previewPageIndexFromUrl(url);

  galleryNavigationLoading = true;
  swipeElement?.setAttribute("aria-busy", "true");

  window.history.replaceState(window.history.state, "", url);

  if (targetPreviewIndex !== null) {
    setScrollPageBarWindowIndex(targetPreviewIndex);
    eh.replaceGalleryPageBar(targetPreviewIndex, eh.maxPreviewPageIndex());
  }

  if (options.scrollToPageBar) {
    scrollToPageBar(options.scrollToPageBar);
  }

  eh.installPreviewPlaceholder();

  try {
    const html = await requestText(url);
    const doc = new DOMParser().parseFromString(html, "text/html");

    eh.replacePreviewContent(doc, url);
    installThumbsGridSwipe();
    if (options.scrollToPageBar) {
      scrollToPageBar(options.scrollToPageBar);
    }
  } catch (error) {
    eh.restorePreview(snapshot);
    window.history.replaceState(window.history.state, "", previousUrl);
    eh.replaceGalleryPageBar(eh.previewPageIndex(), eh.maxPreviewPageIndex());
    throw error;
  } finally {
    galleryNavigationLoading = false;
    swipeElement?.removeAttribute("aria-busy");
  }
}

function installThumbsGridSwipe(): void {
  if (!enhanceThumbsGridsEnabled()) {
    return;
  }

  const thumbs = document.querySelector<HTMLElement>("#gdt");

  if (!thumbs?.parentElement) {
    return;
  }

  swipeElement = installThumbsGridSwipeDom(thumbs);

  if (installedSwipeElements.has(swipeElement)) {
    return;
  }

  installedSwipeElements.add(swipeElement);
  new PointerDrag(swipeElement, {
    onStart: () => {
      swipeState = { horizontal: false, cancelled: false };
      hideSwipeIndicator();
    },
    onMove: (info, event) => {
      updateSwipeState(info, event);
      updateSwipeIndicator(info);
    },
    onEnd: (info, event) => {
      navigateBySwipe(info, event);
      swipeState = null;
      hideSwipeIndicator();
    },
    onTap: (info) => {
      clickFromStartTarget(info.startTarget, info.clientX, info.clientY);
    },
  });
}

function installThumbsGridSwipeDom(thumbs: HTMLElement): HTMLDivElement {
  const existingWrapper = thumbs.parentElement?.classList.contains(THUMBS_SWIPE_WRAPPER_CLASS)
    ? (thumbs.parentElement as HTMLDivElement)
    : null;
  const wrapper = existingWrapper ?? (<div className={`${THUMBS_SWIPE_WRAPPER_CLASS} relative`} /> as HTMLDivElement);
  const indicator = new SwipeIndicator();

  swipeIndicator = indicator;

  if (!existingWrapper) {
    thumbs.before(wrapper);
    wrapper.append(thumbs);
  }

  wrapper.querySelectorAll<HTMLElement>(":scope > .ehpeek-swipe-indicator").forEach((item) => item.remove());
  wrapper.append(indicator.element);
  return wrapper;
}

function clickFromStartTarget(startTarget: EventTarget | null, clientX: number, clientY: number): void {
  if (!(startTarget instanceof Element)) {
    return;
  }

  const link = startTarget.closest<HTMLAnchorElement>("a[href]");

  if (link) {
    link.click();
    return;
  }

  startTarget.dispatchEvent(
    new MouseEvent("click", {
      bubbles: true,
      cancelable: true,
      clientX,
      clientY,
    }),
  );
}

function updateSwipeState(info: PointerDragMove, event: PointerEvent | MouseEvent): void {
  if (!swipeState) {
    return;
  }

  const dx = info.dx;
  const dy = info.dy;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (swipeState.horizontal || swipeState.cancelled) {
    return;
  }

  if (absY >= SWIPE_INTENT_DISTANCE && absY > absX) {
    swipeState.cancelled = true;
    hideSwipeIndicator();
    return;
  }

  if (absX >= SWIPE_INTENT_DISTANCE && absX >= absY * HORIZONTAL_INTENT_RATIO) {
    swipeState.horizontal = true;
    event.preventDefault();
  }
}

function updateSwipeIndicator(info: PointerDragMove): void {
  if (!swipeIndicator || !swipeState?.horizontal || swipeState.cancelled) {
    return;
  }

  const direction = info.dx < 0 ? "left" : "right";
  const availableUrl = swipeUrlForDelta(info.dx);

  if (!availableUrl) {
    swipeIndicator.hide();
    return;
  }

  const progress = Math.min(1, Math.max(0, (Math.abs(info.dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE)));

  swipeIndicator.show(direction, progress);
}

function hideSwipeIndicator(): void {
  swipeIndicator?.hide();
}

function navigateBySwipe(info: PointerDragEnd, event: Event): void {
  if (!swipeState?.horizontal || swipeState.cancelled) {
    return;
  }

  const dx = info.dx;
  const dy = info.dy;
  const absX = Math.abs(dx);
  const absY = Math.abs(dy);

  if (absX < SWIPE_MIN_DISTANCE || absY > absX * SWIPE_MAX_VERTICAL_RATIO) {
    return;
  }

  const url = swipeUrlForDelta(dx);

  if (url) {
    event.preventDefault();
    void navigateGalleryPreview(url, { scrollToPageBar: dx < 0 ? "top" : "bottom" }).catch((error) =>
      galleryThumbEnhancementErrorHandler?.(error),
    );
  }
}

function swipeUrlForDelta(dx: number): string | null {
  const currentIndex = eh.previewPageIndex();
  const maxIndex = eh.maxPreviewPageIndex();
  const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;

  if (nextIndex < 0 || (maxIndex !== null && nextIndex > maxIndex)) {
    return null;
  }

  return eh.previewUrlForIndex(nextIndex);
}

function onPageBarClick(event: MouseEvent): void {
  if (!enhanceThumbsGridsEnabled()) {
    return;
  }

  if (!(event.target instanceof Element)) {
    return;
  }

  const barItem = event.target.closest<HTMLElement>(`.${SCROLL_PAGE_BAR_CLASS} a[data-page-index], .${SCROLL_PAGE_BAR_CLASS} button[data-page-jump]`);

  if (!barItem) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const url = pageBarUrl(barItem);

  if (!url) {
    return;
  }

  const targetPreviewIndex = eh.previewPageIndexFromUrl(url);

  if (targetPreviewIndex !== null) {
    setScrollPageBarWindowIndex(targetPreviewIndex);
  }

  void navigateGalleryPreview(url, { scrollToPageBar: pageBarScrollTarget(barItem, targetPreviewIndex) }).catch((error) =>
    galleryThumbEnhancementErrorHandler?.(error),
  );
}

function pageBarScrollTarget(item: HTMLElement, targetPreviewIndex: number | null): "top" | "bottom" {
  if (item instanceof HTMLButtonElement) {
    return "top";
  }

  const currentIndex = eh.previewPageIndex();
  const maxIndex = eh.maxPreviewPageIndex();

  if (targetPreviewIndex !== null && (targetPreviewIndex === currentIndex - 1 || targetPreviewIndex === maxIndex)) {
    return "bottom";
  }

  return "top";
}

function scrollToPageBar(target: "top" | "bottom"): void {
  const selector = target === "top" ? `.${SCROLL_PAGE_BAR_TOP_CLASS}` : `.${SCROLL_PAGE_BAR_BOTTOM_CLASS}`;
  const block = target === "top" ? "start" : "end";

  document.querySelector<HTMLElement>(selector)?.scrollIntoView({ block, behavior: "smooth" });
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
