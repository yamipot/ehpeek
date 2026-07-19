import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
  untrack,
  type Accessor,
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

export function ThumbsGrids(props: {
  onLoadError: (error: unknown) => void;
  previewCache: GalleryPreviewCache;
  gotoPreviewIndex: Accessor<number | undefined>;
}) {
  const pageBarSource = untrack(() => props.previewCache.current());
  const [gestureTarget, setGestureTarget] = createSignal<HTMLElement | null>(null);
  const [pageBarCurrentIndex, setPageBarCurrentIndex] = createSignal(
    pageBarSource.data.currentIndex,
  );
  const [pageBarMaxIndex, setPageBarMaxIndex] = createSignal(
    pageBarSource.data.maxIndex,
  );
  const [pageBarWindowIndex, setPageBarWindowIndex] = createSignal<number | null>(null);
  const [swipeIndicatorState, setSwipeIndicatorState] = createSignal<SwipeIndicatorState>({
    blocked: false,
    direction: "left",
    progress: 0,
  });
  let activePreview = pageBarSource;

  const setPageBar = (currentIndex: number, maxIndex: number | null): void => {
    setPageBarCurrentIndex(currentIndex);
    setPageBarMaxIndex(maxIndex);
    setPageBarWindowIndex(currentIndex);
  };

  const requestPreviewPage = (
    previewIndex: number,
    scrollToPageBar: "bottom" | "top",
  ): void => {
    const current = props.previewCache.current();
    const onLoadError = props.onLoadError;
    setPageBar(previewIndex, current.data.maxIndex);
    pageBarSource.handle.scrollPageBar(scrollToPageBar);
    if (previewIndex === current.data.currentIndex) {
      return;
    }

    void props.previewCache.select(previewIndex).then(
      (next) => {
        if (untrack(() => props.previewCache.current()) === next) {
          pageBarSource.handle.scrollPageBar(scrollToPageBar);
        }
      },
      (error: unknown) => {
        const active = untrack(() => props.previewCache.current());
        setPageBar(active.data.currentIndex, active.data.maxIndex);
        onLoadError(error);
      },
    );
  };

  const swipeIndexForDelta = (dx: number): number | null => {
    const current = props.previewCache.current().data;
    const nextIndex = dx < 0 ? current.currentIndex + 1 : current.currentIndex - 1;
    if (nextIndex < 0 || (current.maxIndex !== null && nextIndex > current.maxIndex)) {
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

  createEffect(() => {
    const index = props.gotoPreviewIndex();
    if (index !== undefined) {
      setPageBarCurrentIndex(index);
      setPageBarWindowIndex(index);
    }
  });

  createEffect(() => {
    const current = props.previewCache.current();
    setPageBar(current.data.currentIndex, current.data.maxIndex);
    current.handle.transformSwipeInput();
    if (current !== activePreview) {
      pageBarSource.handle.replaceThumbs(current.elems.thumbItems);
      activePreview = current;
    }
  });

  createEffect(() => {
    pageBarSource.handle.setThumbsLoading(props.previewCache.loading());
  });

  onCleanup(() => {
    pageBarSource.handle.setThumbsLoading(false);
  });

  createEffect(() => {
    setGestureTarget(pageBarSource.elems.thumbs?.Component() ?? null);
  });

  createPointerGestureElement(
    gestureTarget,
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

  pageBarSource.handle.transformPageBars();
  pageBarSource.elems.pageBarDescription?.mount(() => (
    <Show when={props.previewCache.current().data.descriptionText}>
      {(description) => <GalleryPageDescription text={description()} />}
    </Show>
  ));
  const mounts = [
    { element: pageBarSource.elems.pageBarTop, top: true },
    { element: pageBarSource.elems.pageBarBottom, top: false },
  ];
  for (const mount of mounts) {
    mount.element?.mount(() => (
      <ScrollPageBar
        currentIndex={pageBarCurrentIndex()}
        element={mount.element!}
        maxIndex={pageBarMaxIndex()}
        onNavigate={requestPreviewPage}
        onWindowIndexChange={setPageBarWindowIndex}
        top={mount.top}
        urlForIndex={(index) =>
          eh.previewUrlForIndex(index, props.previewCache.current().data.currentUrl)
        }
        windowIndex={pageBarWindowIndex}
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
