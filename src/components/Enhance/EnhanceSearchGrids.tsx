import { createPointerGestureElement, type PointerDragEnd } from "../PointerGesture";
import { LoadingOverlay } from "../Widgets/Loading";
import { SwipeIndicator, type SwipeIndicatorState } from "../Widgets/SwipeIndicator";
import { createSignal, onCleanup, onMount, untrack } from "solid-js";
import * as eh from "../../eh";
import texts from "../../texts.json";

const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;
const NAVIGATION_REQUEST_EVENT = "ehpeek:navigation-request";

let installed = false;
let setSearchLoading: ((loading: boolean) => void) | null = null;
let setSwipeGestureTarget: ((target: HTMLElement | null) => void) | null = null;
let onSearchPageChange: (() => void) | null = null;
let searchNavigationLoading = false;
let searchSource: eh.SearchResultsDom | null = null;

type SwipeState = {
  horizontal: boolean;
  cancelled: boolean;
};

export function EnhanceSearchGrids(props: { onPageChange?: () => void; source: eh.SearchResultsDom }) {
  const [gestureTarget, setGestureTarget] = createSignal<HTMLElement | null>(null);
  const [loading, setLoading] = createSignal(false);
  const [swipeIndicatorState, setSwipeIndicatorState] = createSignal<SwipeIndicatorState>({
    blocked: false,
    direction: "left",
    progress: 0,
  });
  let swipeState: SwipeState | null = null;
  const handlePageChange = untrack(() => props.onPageChange ?? null);
  const updateLoading = (value: boolean) => setLoading(value);
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
      void navigateSearchPage(url);
    }
  };

  onMount(() => {
    setSearchLoading = updateLoading;
    setSwipeGestureTarget = updateGestureTarget;
    onSearchPageChange = handlePageChange;
    searchSource = props.source;
    setResultListSwipeTarget();

    if (!installed) {
      installed = true;
      document.addEventListener("click", onSearchNavigationClick, true);
    }

    onCleanup(() => {
      if (setSearchLoading === updateLoading) {
        setSearchLoading = null;
      }

      if (setSwipeGestureTarget === updateGestureTarget) {
        setSwipeGestureTarget = null;
      }

      if (onSearchPageChange === handlePageChange) {
        onSearchPageChange = null;
      }
      searchSource = null;
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
    <>
      <SwipeIndicator state={swipeIndicatorState()} />
      <LoadingOverlay label={texts.reader.loading} visible={loading()} />
    </>
  );
}

function setResultListSwipeTarget(): void {
  const resultList = searchSource?.actions.swipeTarget();
  if (!resultList) {
    return;
  }
  setSwipeGestureTarget?.(resultList);
}

function onSearchNavigationClick(event: MouseEvent): void {
  const url = searchSource?.actions.navigationUrlForClick(event.target);
  if (!url) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  void navigateSearchPage(url);
}

async function navigateSearchPage(url: string): Promise<void> {
  const navigationRequest = new CustomEvent(NAVIGATION_REQUEST_EVENT, {
    cancelable: true,
    detail: { url },
  });
  document.dispatchEvent(navigationRequest);
  if (navigationRequest.defaultPrevented) {
    return;
  }

  if (searchNavigationLoading) {
    return;
  }

  searchNavigationLoading = true;
  setSearchLoading?.(true);
  searchSource?.actions.setBusy(true);

  try {
    const nextSource = await searchSource?.actions.navigate(url);
    if (!nextSource) {
      throw new Error(texts.errors.searchPageContentNotFound);
    }
    searchSource = nextSource;
    onSearchPageChange?.();
    setResultListSwipeTarget();
    searchSource.actions.scrollToTop();
  } catch (error) {
    console.error("[ehpeek]", error);
  } finally {
    searchNavigationLoading = false;
    setSearchLoading?.(false);
    searchSource?.actions.setBusy(false);
  }
}

function swipeUrlForDelta(dx: number): string | null {
  const data = searchSource?.data;
  if (!data) {
    return null;
  }

  return dx < 0 ? data.nextUrl : data.previousUrl;
}

function swipeProgressForDelta(dx: number): number {
  return Math.min(1, Math.max(0, (Math.abs(dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE)));
}
