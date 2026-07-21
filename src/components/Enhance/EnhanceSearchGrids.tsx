import { createSignal, onCleanup, onMount, untrack } from "solid-js";
import * as eh from "../../eh";
import texts from "../../texts.json";
import { createPointerGestureElement, type PointerDragEnd } from "../PointerGesture";
import { LoadingOverlay } from "../Widgets/Loading";
import { SwipeIndicator, type SwipeIndicatorState } from "../Widgets/SwipeIndicator";

const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;

export function EnhanceSearchGrids(props: {
  onPageChange: (source: eh.SearchResultsDom) => void;
  source: eh.SearchResultsDom;
}) {
  const [gestureTarget, setGestureTarget] = createSignal<HTMLElement | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [swipeIndicatorState, setSwipeIndicatorState] = createSignal<SwipeIndicatorState>({
    blocked: false,
    direction: "left",
    progress: 0,
  });
  let source = untrack(() => props.source);
  let navigationLoading = false;

  const swipeUrlForDelta = (dx: number): string | null =>
    dx < 0 ? source.data.nextUrl : source.data.previousUrl;

  const hideSwipeIndicator = () => {
    setSwipeIndicatorState((current) => ({ ...current, blocked: false, progress: 0 }));
  };

  const updateSwipeIndicator = (info: PointerDragEnd) => {
    setSwipeIndicatorState({
      blocked: !swipeUrlForDelta(info.dx),
      direction: info.dx < 0 ? "left" : "right",
      progress: Math.min(1, Math.max(0, (Math.abs(info.dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE))),
    });
  };

  const navigate = async (url: string): Promise<void> => {
    if (navigationLoading) {
      return;
    }

    navigationLoading = true;
    setLoading(true);
    source.handle.updateSearchLoading(true);
    try {
      await source.handle.loadSearchPage(url);
      const nextSource = eh.manageSearchResults();
      if (!nextSource) {
        throw new Error(texts.errors.searchPageContentNotFound);
      }
      source = nextSource;
      props.onPageChange(source);
      source.handle.ensureSearchSwipeInput();
      setGestureTarget(source.elems.resultList.Component());
      source.handle.scrollSearchPageToInput();
    } catch (error) {
      console.error("[ehpeek]", error);
    } finally {
      navigationLoading = false;
      setLoading(false);
      source.handle.updateSearchLoading(false);
    }
  };

  const navigateBySwipe = (info: PointerDragEnd, event: Event) => {
    const absX = Math.abs(info.dx);
    const absY = Math.abs(info.dy);
    if (absX < SWIPE_MIN_DISTANCE || absY > absX * SWIPE_MAX_VERTICAL_RATIO) {
      return;
    }
    const url = swipeUrlForDelta(info.dx);
    if (url) {
      event.preventDefault();
      void navigate(url);
    }
  };
  const onNavigation = (url: string) => {
    void navigate(url);
  };

  onMount(() => {
    source.handle.ensureSearchSwipeInput();
    setGestureTarget(source.elems.resultList.Component());
    onCleanup(source.handle.interceptSearchNavigation(onNavigation));
  });

  createPointerGestureElement(
    gestureTarget,
    () => ({
      onStart: () => {
        hideSwipeIndicator();
      },
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

  return (
    <>
      <SwipeIndicator state={swipeIndicatorState()} />
      <LoadingOverlay label={texts.reader.loading} visible={loading()} />
    </>
  );
}
