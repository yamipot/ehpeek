import {
  createEffect,
  createSignal,
  onCleanup,
  untrack,
} from "solid-js";
import type { GalleryPreviewCache } from "../../App/GalleryPreviewCache";
import * as eh from "../../eh";
import texts from "../../texts.json";
import { createPointerGestureElement, type PointerDragEnd } from "../PointerGesture";
import { LoadingOverlay } from "../Widgets/Loading";
import { SwipeIndicator, type SwipeIndicatorState } from "../Widgets/SwipeIndicator";
import { GalleryPageDescription, ScrollPageBar } from "./ScrollPageBar";

const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;

export type ThumbsGridsActions = {
  gotoPreview: (previewIndex: number) => void;
};

export function ThumbsGrids(props: {
  actionsRef: (actions: ThumbsGridsActions) => void;
  onLoadError: (error: unknown) => void;
  previewCache: GalleryPreviewCache;
}) {
  const pageBarSource = untrack(() => props.previewCache.current());
  const [pageBarCurrentIndex, setPageBarCurrentIndex] = createSignal(
    pageBarSource.data.currentIndex,
  );
  const [swipeIndicatorState, setSwipeIndicatorState] = createSignal<SwipeIndicatorState>({
    blocked: false,
    direction: "left",
    progress: 0,
  });
  const pageBarMaxIndex = (): number =>
    props.previewCache.current().data.maxIndex;

  const requestPreviewPage = (
    previewIndex: number,
    scrollToPageBar: "bottom" | "top",
  ): void => {
    const current = props.previewCache.current();
    const onLoadError = props.onLoadError;
    pageBarSource.handle.scrollPreviewPageBarIntoView(scrollToPageBar);
    if (previewIndex === current.data.currentIndex) {
      return;
    }

    setPageBarCurrentIndex(previewIndex);
    void props.previewCache.select(previewIndex).then(
      (next) => {
        if (untrack(() => props.previewCache.current()) === next) {
          pageBarSource.handle.scrollPreviewPageBarIntoView(scrollToPageBar);
        }
      },
      (error: unknown) => {
        const cacheIndex = untrack(() => props.previewCache.current().data.currentIndex);
        setPageBarCurrentIndex((currentIndex) =>
          currentIndex === previewIndex
            ? cacheIndex
            : currentIndex,
        );
        onLoadError(error);
      },
    );
  };

  const swipeIndexForDelta = (dx: number): number | null => {
    const current = props.previewCache.current().data;
    const nextIndex = dx < 0 ? current.currentIndex + 1 : current.currentIndex - 1;
    if (nextIndex < 0 || nextIndex > current.maxIndex) {
      return null;
    }
    return nextIndex;
  };

  const hideSwipeIndicator = (): void => {
    setSwipeIndicatorState((current) => ({ ...current, blocked: false, progress: 0 }));
  };

  const updateSwipeIndicator = (info: PointerDragEnd): void => {
    setSwipeIndicatorState({
      blocked: swipeIndexForDelta(info.dx) === null,
      direction: info.dx < 0 ? "left" : "right",
      progress: Math.min(1, Math.max(0, (Math.abs(info.dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE))),
    });
  };

  const navigateBySwipe = (info: PointerDragEnd, event: Event): void => {
    const absX = Math.abs(info.dx);
    const absY = Math.abs(info.dy);
    if (absX < SWIPE_MIN_DISTANCE || absY > absX * SWIPE_MAX_VERTICAL_RATIO) {
      return;
    }
    const previewIndex = swipeIndexForDelta(info.dx);
    if (previewIndex !== null) {
      event.preventDefault();
      requestPreviewPage(previewIndex, info.dx < 0 ? "top" : "bottom");
    }
  };

  const actions: ThumbsGridsActions = {
    gotoPreview: setPageBarCurrentIndex,
  };
  createEffect(() => {
    props.actionsRef(actions);
  });

  createEffect<eh.GalleryPreviewDom>((previous) => {
    const current = props.previewCache.current();
    setPageBarCurrentIndex(current.data.currentIndex);
    current.handle.ensurePreviewSwipeInput();
    if (current !== previous) {
      pageBarSource.handle.replacePreviewThumbs(current.elems.thumbItems);
    }
    return current;
  }, pageBarSource);

  createEffect(() => {
    pageBarSource.handle.updatePreviewLoading(props.previewCache.loading());
  });

  onCleanup(() => {
    pageBarSource.handle.updatePreviewLoading(false);
  });

  createPointerGestureElement(
    () => pageBarSource.elems.thumbs?.Component() ?? null,
    () => ({
      onStart: hideSwipeIndicator,
      onMove: updateSwipeIndicator,
      onEnd: (info, event) => {
        navigateBySwipe(info, event);
        hideSwipeIndicator();
      },
      dragAxis: "x",
      dragIntentRatio: HORIZONTAL_INTENT_RATIO,
      dragStartThreshold: SWIPE_INTENT_DISTANCE,
    }),
  );

  pageBarSource.handle.installPreviewPageBars();
  pageBarSource.elems.pageBarDescription?.mount(() => (
    <GalleryPageDescription text={props.previewCache.current().data.descriptionText} />
  ));
  for (const element of [
    pageBarSource.elems.pageBarTop,
    pageBarSource.elems.pageBarBottom,
  ]) {
    if (!element) {
      continue;
    }
    element.mount(() => (
      <ScrollPageBar
        currentIndex={pageBarCurrentIndex()}
        maxIndex={pageBarMaxIndex()}
        onNavigate={requestPreviewPage}
        urlForIndex={(index) =>
          eh.previewUrlForIndex(index, props.previewCache.current().data.currentUrl)
        }
      />
    ));
  }
  onCleanup(() => {
    pageBarSource.elems.pageBarDescription?.remove();
    pageBarSource.elems.pageBarTop?.remove();
    pageBarSource.elems.pageBarBottom?.remove();
  });

  return (
    <>
      <LoadingOverlay
        label={texts.reader.loading}
        visible={props.previewCache.loading()}
      />
      <SwipeIndicator state={swipeIndicatorState()} />
    </>
  );
}
