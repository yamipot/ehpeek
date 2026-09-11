import type { NavigationMode, PageLayout, ReadDirection } from "../kit/interfaces";
import { clamp } from "../kit/helpers";

export type ScrollBounds = { min?: number; max?: number };
export type SlotElements = { node: HTMLElement; frame: HTMLElement };
export type ViewportCenterAnchor = { pageNum: number; xRatio: number; yRatio: number };

export function createPagesScroller(element: HTMLElement) {
  const clampedTop = (scrollTop: number, bounds?: ScrollBounds | null): number => {
    if (!bounds) {
      return scrollTop;
    }

    return clamp(scrollTop, bounds.min ?? Number.NEGATIVE_INFINITY, bounds.max ?? Number.POSITIVE_INFINITY);
  };

  return {
    element,
    resetPosition(): void {
      element.scrollLeft = 0;
      element.scrollTop = 0;
    },
    scrollLeft(): number {
      return element.scrollLeft;
    },
    scrollTop(): number {
      return element.scrollTop;
    },
    viewportWidth(): number {
      return element.clientWidth || window.innerWidth || 1;
    },
    viewportHeight(): number {
      return element.clientHeight;
    },
    viewportXRatio(clientX: number): number {
      const bounds = element.getBoundingClientRect();
      return (clientX - bounds.left) / Math.max(1, bounds.width);
    },
    moveToLeft(scrollLeft: number): void {
      element.scrollLeft = scrollLeft;
    },
    centerHorizontal(): void {
      element.scrollLeft = Math.max(0, (element.scrollWidth - element.clientWidth) / 2);
    },
    centerVertical(): void {
      element.scrollTop = Math.max(0, (element.scrollHeight - element.clientHeight) / 2);
    },
    centerAnchor(): ViewportCenterAnchor | null {
      const viewportRect = element.getBoundingClientRect();
      const centerX = viewportRect.left + viewportRect.width / 2;
      const centerY = viewportRect.top + viewportRect.height / 2;
      const pages = Array.from(element.querySelectorAll<HTMLElement>(".ehpeek-page"));
      let closest: { distance: number; node: HTMLElement } | null = null;
      for (const node of pages) {
        const rect = node.getBoundingClientRect();
        const dx = centerX < rect.left ? rect.left - centerX : centerX > rect.right ? centerX - rect.right : 0;
        const dy = centerY < rect.top ? rect.top - centerY : centerY > rect.bottom ? centerY - rect.bottom : 0;
        const distance = Math.hypot(dx, dy);
        if (!closest || distance < closest.distance) {
          closest = { distance, node };
        }
      }
      if (!closest) {
        return null;
      }
      const rect = closest.node.getBoundingClientRect();
      const pageNum = Number(closest.node.dataset.ehpeekPageNum || "");
      return Number.isFinite(pageNum) && rect.width > 0 && rect.height > 0
        ? {
          pageNum,
          xRatio: (centerX - rect.left) / rect.width,
          yRatio: (centerY - rect.top) / rect.height,
        }
        : null;
    },
    restoreCenterAnchor(anchor: ViewportCenterAnchor): void {
      const node = element.querySelector<HTMLElement>(`.ehpeek-page[data-ehpeek-page-num="${anchor.pageNum}"]`);
      if (!node) {
        return;
      }
      const viewportRect = element.getBoundingClientRect();
      const pageRect = node.getBoundingClientRect();
      const centerX = viewportRect.left + viewportRect.width / 2;
      const centerY = viewportRect.top + viewportRect.height / 2;
      element.scrollLeft += pageRect.left + pageRect.width * anchor.xRatio - centerX;
      element.scrollTop += pageRect.top + pageRect.height * anchor.yRatio - centerY;
    },
    moveToTop(scrollTop: number, bounds?: ScrollBounds | null): void {
      const nextScrollTop = clampedTop(scrollTop, bounds);
      if (element.scrollTop !== nextScrollTop) element.scrollTop = nextScrollTop;
    },
    slotTop(elements: SlotElements): number {
      const elementsRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      return element.scrollTop + elementsRect.top - scrollerRect.top;
    },
    slotLeft(elements: SlotElements): number {
      const elementsRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      return element.scrollLeft + elementsRect.left - scrollerRect.left;
    },

    slotOffset(
      elements: SlotElements,
      navigationMode: NavigationMode,
      direction: ReadDirection,
      pageLayout: PageLayout,
    ): number {
      const pageRect = elements.node.getBoundingClientRect();
      const scrollerRect = element.getBoundingClientRect();
      if (direction === "ttb") {
        return pageRect.top - scrollerRect.top;
      }
      if (direction === "rtl" && (navigationMode === "scroll" || pageLayout === "double")) {
        return pageRect.right - scrollerRect.right;
      }
      return pageRect.left - scrollerRect.left;
    },

    slotContainsViewportTarget(elements: SlotElements, direction: ReadDirection): boolean {
      const scrollerRect = element.getBoundingClientRect();
      const rect = elements.node.getBoundingClientRect();
      if (direction === "ttb") {
        const target = scrollerRect.top + Math.min(80, scrollerRect.height * 0.14);
        return rect.top <= target && rect.bottom > target;
      }
      const offset = Math.min(80, scrollerRect.width * 0.14);
      const target = direction === "rtl" ? scrollerRect.right - offset : scrollerRect.left + offset;
      return rect.left <= target && rect.right > target;
    },

    slotViewportStartDistance(
      elements: SlotElements,
      direction: ReadDirection,
    ): number | null {
      const scrollerRect = element.getBoundingClientRect();
      const rect = elements.node.getBoundingClientRect();
      if (
        rect.bottom <= scrollerRect.top ||
        rect.top >= scrollerRect.bottom ||
        rect.right <= scrollerRect.left ||
        rect.left >= scrollerRect.right
      ) {
        return null;
      }
      if (direction === "ttb") {
        return Math.max(0, rect.top - scrollerRect.top);
      }
      return direction === "rtl"
        ? Math.max(0, scrollerRect.right - rect.right)
        : Math.max(0, rect.left - scrollerRect.left);
    },
  };
}
