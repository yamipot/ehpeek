import type { ReaderPage } from "../../readerTypes";
import type { PointerDragEnd } from "../pointerGesture";
import { loadingSpinnerElement } from "../Loading";
import { createPointerGestureElement } from "../PointerGestureSurface";
import { SwipeIndicator, type SwipeDirection, type SwipeIndicatorActions } from "./Misc";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import {
  SCROLL_PAGE_BAR_BOTTOM_CLASS,
  SCROLL_PAGE_BAR_CLASS,
  SCROLL_PAGE_BAR_TOP_CLASS,
  setScrollPageBarWindowIndex,
} from "./ScrollPageBar";
import * as eh from "../../eh";
import { state } from "../../state";
import texts from "../../texts.json";
import { clamp, requestText } from "../../utils";

const PREVIEW_CACHE_LIMIT = 10;
const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;

let galleryThumbEnhancementOnError: ((error: unknown) => void) | null = null;
let galleryThumbEnhancementClickInstalled = false;
let swipeElement: HTMLElement | null = null;
let setSwipeGestureTarget: ((target: HTMLElement | null) => void) | null = null;
let swipeIndicatorActions!: SwipeIndicatorActions;
let swipeIndicatorDirection: SwipeDirection = "left";
let swipeState: SwipeState | null = null;
let galleryNavigationLoading = false;
let replaceGalleryPageBar: ((currentIndex: number, maxIndex: number | null) => void) | null = null;

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

export function EnhanceThumbsGrids(props: {
  enabled: boolean;
  onError: (error: unknown) => void;
  replaceGalleryPageBar: (currentIndex: number, maxIndex: number | null) => void;
}) {
  const [gestureTarget, setGestureTarget] = createSignal<HTMLElement | null>(null);
  const updateGestureTarget = (target: HTMLElement | null) => setGestureTarget(target);

  onMount(() => {
    setSwipeGestureTarget = updateGestureTarget;
    replaceGalleryPageBar = props.replaceGalleryPageBar;

    if (props.enabled) {
      galleryThumbEnhancementOnError = props.onError;
      replaceGalleryPageBar(eh.previewPageIndex(), eh.maxPreviewPageIndex());
      setThumbsGridSwipeTarget();

      if (!galleryThumbEnhancementClickInstalled) {
        galleryThumbEnhancementClickInstalled = true;
        document.addEventListener("click", onPageBarClick, true);
      }
    }

    onCleanup(() => {
      if (setSwipeGestureTarget === updateGestureTarget) {
        setSwipeGestureTarget = null;
      }
      if (replaceGalleryPageBar === props.replaceGalleryPageBar) {
        replaceGalleryPageBar = null;
      }
    });
  });

  createPointerGestureElement(
    gestureTarget,
    () => ({
      onStart: () => {
        swipeState = { horizontal: true, cancelled: false };
        hideSwipeIndicator();
      },
      onMove: (info) => {
        updateSwipeIndicator(info);
      },
      onEnd: (info, event) => {
        navigateBySwipe(info, event);
        swipeState = null;
        hideSwipeIndicator();
      },
      dragAxis: "x",
      dragIntentRatio: HORIZONTAL_INTENT_RATIO,
      dragStartThreshold: SWIPE_INTENT_DISTANCE,
    }),
  );

  return (
    <Show when={props.enabled}>
      <SwipeIndicator
        actionsRef={(actions) => {
          swipeIndicatorActions = actions;
        }}
      />
    </Show>
  );
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
  const maxPreviewIndex = eh.maxPreviewPageIndex();

  galleryNavigationLoading = true;
  swipeElement?.setAttribute("aria-busy", "true");

  window.history.replaceState(window.history.state, "", url);

  if (targetPreviewIndex !== null) {
    setScrollPageBarWindowIndex(targetPreviewIndex);
    replaceGalleryPageBar?.(targetPreviewIndex, maxPreviewIndex);
  }

  if (options.scrollToPageBar) {
    scrollToPageBar(options.scrollToPageBar);
  }

  eh.showPreviewPlaceholder(loadingSpinnerElement(texts.reader.loading, "lg"));

  try {
    const html = await requestText(url);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nextMaxPreviewIndex = eh.maxPreviewPageIndex(doc, url);

    eh.replacePreviewContent(doc);
    replaceGalleryPageBar?.(eh.previewPageIndexFromUrl(url) ?? eh.previewPageIndex(), nextMaxPreviewIndex);
    setThumbsGridSwipeTarget();
    if (options.scrollToPageBar) {
      scrollToPageBar(options.scrollToPageBar);
    }
  } catch (error) {
    eh.restorePreview(snapshot);
    window.history.replaceState(window.history.state, "", previousUrl);
    replaceGalleryPageBar?.(eh.previewPageIndex(), eh.maxPreviewPageIndex());
    throw error;
  } finally {
    galleryNavigationLoading = false;
    swipeElement?.removeAttribute("aria-busy");
  }
}

function setThumbsGridSwipeTarget(): void {
  if (!enhanceThumbsGridsEnabled()) {
    return;
  }

  const thumbs = document.querySelector<HTMLElement>("#gdt");

  if (!thumbs) {
    return;
  }

  swipeElement = thumbs;
  eh.prepareThumbsGridSwipeTargets(thumbs);
  setSwipeGestureTarget?.(thumbs);
}

function updateSwipeIndicator(info: PointerDragEnd): void {
  if (!swipeState?.horizontal || swipeState.cancelled) {
    return;
  }

  const direction = info.dx < 0 ? "left" : "right";
  const availableUrl = swipeUrlForDelta(info.dx);
  const progress = swipeProgressForDelta(info.dx);

  if (!availableUrl) {
    swipeIndicatorDirection = direction;
    swipeIndicatorActions.update({
      blocked: true,
      direction,
      progress,
    });
    return;
  }

  swipeIndicatorDirection = direction;
  swipeIndicatorActions.update({ direction, progress });
}

function hideSwipeIndicator(): void {
  swipeIndicatorActions.hide(swipeIndicatorDirection);
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
      galleryThumbEnhancementOnError?.(error),
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

function swipeProgressForDelta(dx: number): number {
  return Math.min(1, Math.max(0, (Math.abs(dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE)));
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
    galleryThumbEnhancementOnError?.(error),
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
