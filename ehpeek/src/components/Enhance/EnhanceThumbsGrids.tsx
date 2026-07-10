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
const THUMBS_SWIPE_OVERLAY_CLASS = "ehpeek-thumbs-swipe-overlay";

let galleryThumbEnhancementErrorHandler: ((error: unknown) => void) | null = null;
let galleryThumbEnhancementClickInstalled = false;
let overlayElement: HTMLDivElement | null = null;
let swipeIndicator: SwipeIndicator | null = null;
let swipeState: SwipeState | null = null;
let galleryNavigationLoading = false;

type SwipeState = {
  horizontal: boolean;
  cancelled: boolean;
  suppressClick: boolean;
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
  historyMode: "push" | "replace",
  options: { scrollToPageBar?: "top" | "bottom" } = {},
): Promise<void> {
  if (galleryNavigationLoading) {
    return;
  }

  const previousUrl = window.location.href;
  const snapshot = eh.snapshotPreview();
  const targetPreviewIndex = eh.previewPageIndexFromUrl(url);

  galleryNavigationLoading = true;
  overlayElement?.setAttribute("aria-busy", "true");

  if (historyMode === "push") {
    window.history.pushState(window.history.state, "", url);
  } else {
    window.history.replaceState(window.history.state, "", url);
  }

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
    overlayElement?.removeAttribute("aria-busy");
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

  overlayElement = installThumbsGridOverlayDom(thumbs);
  new PointerDrag(overlayElement, {
    onStart: () => {
      swipeState = { horizontal: false, cancelled: false, suppressClick: false };
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
    shouldSuppressClick: () => swipeState?.suppressClick ?? false,
    onSuppressClick: () => {
      swipeState = null;
      hideSwipeIndicator();
    },
  });
  overlayElement.addEventListener("click", onOverlayClick);
}

function installThumbsGridOverlayDom(thumbs: HTMLElement): HTMLDivElement {
  let overlay!: HTMLDivElement;
  const existingWrapper = thumbs.parentElement?.classList.contains(THUMBS_SWIPE_WRAPPER_CLASS)
    ? (thumbs.parentElement as HTMLDivElement)
    : null;
  const wrapper = existingWrapper ?? (<div className={`${THUMBS_SWIPE_WRAPPER_CLASS} relative`} /> as HTMLDivElement);
  const indicator = new SwipeIndicator();

  wrapper.querySelectorAll<HTMLElement>(`:scope > .${THUMBS_SWIPE_OVERLAY_CLASS}`).forEach((item) => item.remove());
  overlay = (
    <div className={`${THUMBS_SWIPE_OVERLAY_CLASS} absolute inset-0 z-2 bg-transparent overscroll-x-contain touch-pan-y`} aria-hidden="true">
      {indicator.element}
    </div>
  ) as HTMLDivElement;
  swipeIndicator = indicator;

  if (!existingWrapper) {
    thumbs.before(wrapper);
    wrapper.append(thumbs);
  }

  wrapper.append(overlay);
  return overlay;
}

function onOverlayClick(event: MouseEvent): void {
  if (swipeState?.suppressClick) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  forwardClickThroughOverlay(event.clientX, event.clientY);
}

function forwardClickThroughOverlay(clientX: number, clientY: number): void {
  if (!overlayElement) {
    return;
  }

  overlayElement.style.pointerEvents = "none";
  const target = document.elementFromPoint(clientX, clientY);
  overlayElement.style.pointerEvents = "";

  if (!(target instanceof Element)) {
    return;
  }

  const link = target.closest<HTMLAnchorElement>("a[href]");

  if (link) {
    link.click();
    return;
  }

  target.dispatchEvent(
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
    swipeState.suppressClick = true;
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
    swipeState.suppressClick = true;
    event.preventDefault();
    void navigateGalleryPreview(url, "push", { scrollToPageBar: dx < 0 ? "top" : "bottom" }).catch((error) =>
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

  void navigateGalleryPreview(url, "push", { scrollToPageBar: pageBarScrollTarget(barItem, targetPreviewIndex) }).catch((error) =>
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
