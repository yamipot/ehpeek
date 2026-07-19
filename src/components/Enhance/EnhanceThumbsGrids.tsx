import { createPointerGestureElement, type PointerDragEnd } from "../PointerGesture";
import { loadingSpinnerElement } from "../Widgets/Loading";
import { SwipeIndicator, type SwipeIndicatorState } from "../Widgets/SwipeIndicator";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
import {
  SCROLL_PAGE_BAR_CLASS,
  setScrollPageBarWindowIndex,
} from "./ScrollPageBar";
import * as eh from "../../eh";
import texts from "../../texts.json";
import { clamp } from "../../utils";

const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;

let galleryThumbEnhancementOnError: ((error: unknown) => void) | null = null;
let galleryThumbEnhancementClickInstalled = false;
let setSwipeGestureTarget: ((target: HTMLElement | null) => void) | null = null;
let galleryNavigationLoading = false;
let replaceGalleryPageBar: ((currentIndex: number, maxIndex: number | null) => void) | null = null;
let thumbsGridsEnabled = false;
let galleryPreviewSource: eh.GalleryPreviewDom | null = null;
let setGalleryPreviewSource: ((source: eh.GalleryPreviewDom) => void) | null = null;

type SwipeState = {
  horizontal: boolean;
  cancelled: boolean;
};

export function EnhanceThumbsGrids(props: {
  enabled: boolean;
  galleryPreview: eh.GalleryPreviewDom;
  onGalleryPreviewChange: (source: eh.GalleryPreviewDom) => void;
  onError: (error: unknown) => void;
  replaceGalleryPageBar: (currentIndex: number, maxIndex: number | null) => void;
}) {
  const [gestureTarget, setGestureTarget] = createSignal<HTMLElement | null>(null);
  const [swipeIndicatorState, setSwipeIndicatorState] = createSignal<SwipeIndicatorState>({
    blocked: false,
    direction: "left",
    progress: 0,
  });
  let swipeState: SwipeState | null = null;
  const updateGestureTarget = (target: HTMLElement | null) => setGestureTarget(target);
  const hideSwipeIndicator = () => {
    setSwipeIndicatorState((current) => ({ ...current, blocked: false, progress: 0 }));
  };
  const updateSwipeIndicator = (info: PointerDragEnd) => {
    if (!swipeState?.horizontal || swipeState.cancelled) {
      return;
    }

    const direction = info.dx < 0 ? "left" : "right";
    setSwipeIndicatorState({
      blocked: !swipeUrlForDelta(info.dx),
      direction,
      progress: swipeProgressForDelta(info.dx),
    });
  };
  const navigateBySwipe = (info: PointerDragEnd, event: Event) => {
    if (!swipeState?.horizontal || swipeState.cancelled) {
      return;
    }

    const dx = info.dx;
    const absX = Math.abs(dx);
    const absY = Math.abs(info.dy);

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
  };

  onMount(() => {
    thumbsGridsEnabled = props.enabled;
    galleryPreviewSource = props.galleryPreview;
    setGalleryPreviewSource = props.onGalleryPreviewChange;
    setSwipeGestureTarget = updateGestureTarget;
    replaceGalleryPageBar = props.replaceGalleryPageBar;

    if (props.enabled) {
      galleryThumbEnhancementOnError = props.onError;
      const preview = galleryPreviewSource.data;
      replaceGalleryPageBar(preview.currentIndex, preview.maxIndex);
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

      if (thumbsGridsEnabled === props.enabled) {
        thumbsGridsEnabled = false;
      }
      if (setGalleryPreviewSource === props.onGalleryPreviewChange) {
        setGalleryPreviewSource = null;
        galleryPreviewSource = null;
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
      <SwipeIndicator state={swipeIndicatorState()} />
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

  const previousPreview = galleryPreviewSource;
  const targetPreviewIndex = eh.previewPageIndexFromUrl(url);
  const maxPreviewIndex = galleryPreviewSource?.data.maxIndex ?? null;

  galleryNavigationLoading = true;
  galleryPreviewSource?.actions.setBusy(true);

  if (targetPreviewIndex !== null) {
    setScrollPageBarWindowIndex(targetPreviewIndex);
    replaceGalleryPageBar?.(targetPreviewIndex, maxPreviewIndex);
  }

  if (options.scrollToPageBar) {
    scrollToPageBar(options.scrollToPageBar);
  }

  try {
    const nextPreview = await previousPreview?.actions.navigate(
      url,
      loadingSpinnerElement(texts.reader.loading, "lg"),
    );
    if (!nextPreview) {
      return;
    }
    galleryPreviewSource = nextPreview;
    setGalleryPreviewSource?.(nextPreview);
    replaceGalleryPageBar?.(nextPreview.data.currentIndex, nextPreview.data.maxIndex);
    setThumbsGridSwipeTarget();
    if (options.scrollToPageBar) {
      scrollToPageBar(options.scrollToPageBar);
    }
  } catch (error) {
    if (previousPreview) {
      galleryPreviewSource = previousPreview;
      setGalleryPreviewSource?.(previousPreview);
      replaceGalleryPageBar?.(previousPreview.data.currentIndex, previousPreview.data.maxIndex);
    }
    throw error;
  } finally {
    galleryNavigationLoading = false;
    galleryPreviewSource?.actions.setBusy(false);
  }
}

function setThumbsGridSwipeTarget(): void {
  if (!thumbsGridsEnabled) {
    return;
  }

  const thumbs = galleryPreviewSource?.actions.swipeTarget();

  if (!thumbs) {
    return;
  }

  setSwipeGestureTarget?.(thumbs);
}

function swipeUrlForDelta(dx: number): string | null {
  const currentIndex = eh.previewPageIndex();
  const maxIndex = galleryPreviewSource?.data.maxIndex ?? null;
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
  if (!thumbsGridsEnabled) {
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
  const maxIndex = galleryPreviewSource?.data.maxIndex ?? null;

  if (targetPreviewIndex !== null && (targetPreviewIndex === currentIndex - 1 || targetPreviewIndex === maxIndex)) {
    return "bottom";
  }

  return "top";
}

function scrollToPageBar(target: "top" | "bottom"): void {
  galleryPreviewSource?.actions.scrollPageBar(target);
}

function pageBarUrl(item: HTMLElement): string | null {
  if (item instanceof HTMLAnchorElement) {
    return eh.previewPageIndexFromUrl(item.href) === null ? null : item.href;
  }

  const maxPreviewIndex = galleryPreviewSource?.data.maxIndex ?? null;

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
