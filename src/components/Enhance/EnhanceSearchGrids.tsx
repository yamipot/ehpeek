import type { PointerDragEnd } from "../pointerGesture";
import { LoadingOverlay } from "../Loading";
import { createPointerGestureElement } from "../PointerGestureSurface";
import { SwipeIndicator, type SwipeDirection, type SwipeIndicatorActions } from "./Misc";
import { createSignal, onCleanup, onMount } from "solid-js";
import * as eh from "../../eh";
import texts from "../../texts.json";

const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;

let installed = false;
let swipeElement: HTMLElement | null = null;
let setSearchLoading: ((loading: boolean) => void) | null = null;
let setSwipeGestureTarget: ((target: HTMLElement | null) => void) | null = null;
let swipeIndicatorActions!: SwipeIndicatorActions;
let swipeIndicatorDirection: SwipeDirection = "left";
let swipeState: SwipeState | null = null;
let searchNavigationLoading = false;

type SwipeState = {
  horizontal: boolean;
  cancelled: boolean;
};

export function EnhanceSearchGrids(props: { resultList: HTMLElement }) {
  const [gestureTarget, setGestureTarget] = createSignal<HTMLElement | null>(null);
  const [loading, setLoading] = createSignal(false);
  const updateLoading = (value: boolean) => setLoading(value);
  const updateGestureTarget = (target: HTMLElement | null) => setGestureTarget(target);

  onMount(() => {
    setSearchLoading = updateLoading;
    setSwipeGestureTarget = updateGestureTarget;
    setResultListSwipeTarget(props.resultList);

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
      <SwipeIndicator
        actionsRef={(actions) => {
          swipeIndicatorActions = actions;
        }}
      />
      <LoadingOverlay label={texts.reader.loading} visible={loading()} />
    </>
  );
}

function setResultListSwipeTarget(resultList: HTMLElement): void {
  resultList.style.touchAction = "pan-y";
  resultList.style.overscrollBehaviorX = "contain";
  swipeElement = resultList;
  setSwipeGestureTarget?.(resultList);
}

function onSearchNavigationClick(event: MouseEvent): void {
  const link = eh.findSearchNavigationLink(event.target);

  if (!link) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  void navigateSearchPage(link.href);
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
    void navigateSearchPage(url);
  }
}

async function navigateSearchPage(url: string): Promise<void> {
  if (searchNavigationLoading) {
    return;
  }

  searchNavigationLoading = true;
  setSearchLoading?.(true);
  swipeElement?.setAttribute("aria-busy", "true");

  try {
    const resultList = await eh.replaceSearchPageContentFromUrl(url);
    window.history.pushState(window.history.state, "", url);
    if (document.documentElement.dataset.ehpeekTouchUi === "true") {
      const pageType = eh.extractPageType(url).type;

      if (pageType === "favorites") {
        eh.prepareTouchFavoritesPage();
      } else if (pageType === "search") {
        eh.prepareTouchSearchResultsPage();
      }
    }
    setResultListSwipeTarget(resultList);
    eh.searchTopNavigationBar()?.scrollIntoView({ block: "start", behavior: "auto" });
  } catch (error) {
    console.error("[ehpeek]", error);
  } finally {
    searchNavigationLoading = false;
    setSearchLoading?.(false);
    swipeElement?.removeAttribute("aria-busy");
  }
}

function swipeUrlForDelta(dx: number): string | null {
  const nav = eh.searchPageNavigation();

  if (!nav) {
    return null;
  }

  return dx < 0 ? nav.nextUrl : nav.previousUrl;
}

function swipeProgressForDelta(dx: number): number {
  return Math.min(1, Math.max(0, (Math.abs(dx) - SWIPE_INTENT_DISTANCE) / (SWIPE_MIN_DISTANCE - SWIPE_INTENT_DISTANCE)));
}
