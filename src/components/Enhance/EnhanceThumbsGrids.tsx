import {
  createEffect,
  createSignal,
  onCleanup,
  Show,
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
  const [gotoPreviewIndex, setGotoPreviewIndex] = createSignal<number>();
  const [pageBarWindowIndex, setPageBarWindowIndex] = createSignal<number | null>(null);
  const [swipeIndicatorState, setSwipeIndicatorState] = createSignal<SwipeIndicatorState>({
    blocked: false,
    direction: "left",
    progress: 0,
  });
  const pageBarCurrentIndex = (): number =>
    gotoPreviewIndex() ??
    props.previewCache.current().data.currentIndex;
  const pageBarMaxIndex = (): number | null =>
    props.previewCache.current().data.maxIndex;

  const requestPreviewPage = (
    previewIndex: number,
    scrollToPageBar: "bottom" | "top",
  ): void => {
    const current = props.previewCache.current();
    const onLoadError = props.onLoadError;
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

  const actions: ThumbsGridsActions = {
    gotoPreview: setGotoPreviewIndex,
  };
  createEffect(() => {
    props.actionsRef(actions);
  });

  createEffect<eh.GalleryPreviewDom>((previous) => {
    const current = props.previewCache.current();
    setGotoPreviewIndex(undefined);
    current.handle.transformSwipeInput();
    if (current !== previous) {
      pageBarSource.handle.replaceThumbs(current.elems.thumbItems);
    }
    return current;
  }, pageBarSource);

  createEffect(() => {
    setPageBarWindowIndex(pageBarCurrentIndex());
  });

  createEffect(() => {
    pageBarSource.handle.setThumbsLoading(props.previewCache.loading());
  });

  onCleanup(() => {
    pageBarSource.handle.setThumbsLoading(false);
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
    if (!mount.element) {
      continue;
    }
    const element = mount.element;
    element.mount(() => (
      <ScrollPageBar
        currentIndex={pageBarCurrentIndex()}
        element={element}
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
