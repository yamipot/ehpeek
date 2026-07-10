import { PointerDrag, type PointerDragEnd, type PointerDragMove } from "../common/pointerDrag";
import { SwipeIndicator } from "./Misc";
import { h } from "../../jsx";
import * as eh from "../../eh";
import type { PageType } from "../../eh";

const SWIPE_MIN_DISTANCE = 96;
const SWIPE_INTENT_DISTANCE = 28;
const HORIZONTAL_INTENT_RATIO = 2.2;
const SWIPE_MAX_VERTICAL_RATIO = 0.38;
const SEARCH_SWIPE_WRAPPER_CLASS = "ehpeek-search-swipe-wrapper";
const SEARCH_SWIPE_OVERLAY_CLASS = "ehpeek-search-swipe-overlay";

let installed = false;
let overlayElement: HTMLDivElement | null = null;
let swipeIndicator: SwipeIndicator | null = null;
let swipeState: SwipeState | null = null;
let searchNavigationLoading = false;

type SwipeState = {
  horizontal: boolean;
  cancelled: boolean;
};

export function installEnhanceSearchGrids(pageType: Extract<PageType, { type: "search" }>): void {
  if (installed || pageType.type !== "search" || !eh.searchPageNavigation()) {
    return;
  }

  const resultList = eh.searchResultList();

  if (!resultList?.parentElement) {
    return;
  }

  installed = true;
  installResultListEnhancement(resultList);
  document.addEventListener("click", onSearchNavigationClick, true);
}

function installResultListEnhancement(resultList: HTMLElement): void {
  overlayElement = installResultListOverlayDom(resultList);
  new PointerDrag(overlayElement, {
    onStart: () => {
      swipeState = { horizontal: false, cancelled: false };
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
    onTap: (info) => {
      forwardClickThroughOverlay(info.clientX, info.clientY);
    },
  });
}

function installResultListOverlayDom(resultList: HTMLElement): HTMLDivElement {
  let overlay!: HTMLDivElement;
  const existingWrapper = resultList.parentElement?.classList.contains(SEARCH_SWIPE_WRAPPER_CLASS)
    ? (resultList.parentElement as HTMLDivElement)
    : null;
  const wrapper = existingWrapper ?? (<div className={`${SEARCH_SWIPE_WRAPPER_CLASS} relative`} /> as HTMLDivElement);
  const indicator = new SwipeIndicator();

  wrapper.querySelectorAll<HTMLElement>(`:scope > .${SEARCH_SWIPE_OVERLAY_CLASS}`).forEach((item) => item.remove());
  overlay = (
    <div className={`${SEARCH_SWIPE_OVERLAY_CLASS} absolute inset-0 z-2 bg-transparent overscroll-x-contain touch-pan-y`} aria-hidden="true">
      {indicator.element}
    </div>
  ) as HTMLDivElement;
  swipeIndicator = indicator;

  if (!existingWrapper) {
    resultList.before(wrapper);
    wrapper.append(resultList);
  }

  wrapper.append(overlay);
  return overlay;
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
    event.preventDefault();
    void navigateSearchPage(url, dx < 0);
  }
}

async function navigateSearchPage(url: string, scrollToTopNavigation: boolean): Promise<void> {
  if (searchNavigationLoading) {
    return;
  }

  searchNavigationLoading = true;
  overlayElement?.setAttribute("aria-busy", "true");
  scrollSearchNavigationIntoView(scrollToTopNavigation);

  try {
    const resultList = await eh.replaceSearchPageContentFromUrl(url);
    window.history.pushState(window.history.state, "", url);
    installResultListEnhancement(resultList);
  } catch (error) {
    console.error("[ehpeek]", error);
  } finally {
    searchNavigationLoading = false;
    overlayElement?.removeAttribute("aria-busy");
  }
}

function swipeUrlForDelta(dx: number): string | null {
  const nav = eh.searchPageNavigation();

  if (!nav) {
    return null;
  }

  return dx < 0 ? nav.nextUrl : nav.previousUrl;
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
