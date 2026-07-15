import type { PointerDragEnd } from "../pointerGesture";
import { LoadingOverlay } from "../Loading";
import { usePointerGestureElement } from "../PointerGestureSurface";
import { SwipeIndicator, type SwipeDirection, type SwipeIndicatorHandle } from "./Misc";
import { Fragment, h } from "preact";
import { useEffect, useState } from "preact/hooks";
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
let swipeIndicator: SwipeIndicatorHandle | null = null;
let swipeIndicatorDirection: SwipeDirection = "left";
let swipeState: SwipeState | null = null;
let searchNavigationLoading = false;

type SwipeState = {
  horizontal: boolean;
  cancelled: boolean;
};

export function EnhanceSearchGrids(props: { resultList: HTMLElement }) {
  const [gestureTarget, setGestureTarget] = useState<HTMLElement | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setSearchLoading = setLoading;
    setSwipeGestureTarget = setGestureTarget;
    setResultListSwipeTarget(props.resultList);

    if (!installed) {
      installed = true;
      document.addEventListener("click", onSearchNavigationClick, true);
    }

    return () => {
      if (setSearchLoading === setLoading) {
        setSearchLoading = null;
      }

      if (setSwipeGestureTarget === setGestureTarget) {
        setSwipeGestureTarget = null;
      }
    };
  }, [props.resultList]);

  usePointerGestureElement(gestureTarget, {
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
  });

  return (
    <Fragment>
      <SwipeIndicator
        handleRef={(handle) => {
          swipeIndicator = handle;
        }}
      />
      <LoadingOverlay label={texts.reader.loading} visible={loading} />
    </Fragment>
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
  void navigateSearchPage(link.href, isNextPageOrJump(link));
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
    swipeIndicator?.update({
      blocked: true,
      direction,
      progress,
    });
    return;
  }

  swipeIndicatorDirection = direction;
  swipeIndicator?.update({ direction, progress });
}

function hideSwipeIndicator(): void {
  swipeIndicator?.hide(swipeIndicatorDirection);
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
    void navigateSearchPage(url, false);
  }
}

async function navigateSearchPage(url: string, scrollToTopNavigation: boolean): Promise<void> {
  if (searchNavigationLoading) {
    return;
  }

  searchNavigationLoading = true;
  setSearchLoading?.(true);
  swipeElement?.setAttribute("aria-busy", "true");
  scrollSearchNavigationIntoView(scrollToTopNavigation);

  try {
    const resultList = await eh.replaceSearchPageContentFromUrl(url);
    window.history.pushState(window.history.state, "", url);
    setResultListSwipeTarget(resultList);
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

function scrollSearchNavigationIntoView(enabled: boolean): void {
  if (!enabled) {
    return;
  }

  const target = document.querySelector<HTMLElement>(".searchnav");

  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const currentTop = window.scrollY;
  const targetTop = Math.max(0, currentTop + rect.top);

  if (currentTop <= targetTop) {
    return;
  }

  window.scrollTo({ top: targetTop, behavior: "auto" });
}

function isNextPageOrJump(link: HTMLAnchorElement): boolean {
  const id = link.id.toLowerCase();

  return id.endsWith("next") || id.endsWith("last");
}
