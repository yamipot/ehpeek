import { imageFileExtension } from "./images";
import { ReaderPageLoader } from "./loading";
import { batch, createEffect, createSignal, onCleanup, onMount, Show, untrack } from "solid-js";
import { createReadProgressPublisher, type ReadProgressPort } from "../features/ReadProgressSyncer";
import type { ContentSource, ReaderCustomization, ReaderPage, ReaderSettingsState } from "../kit/interfaces";

import { useReaderTexts } from "../kit/i18n";
import { currentReaderOrientation } from "../features/ReaderSettings";
import {
  clamp,
} from "../kit/helpers";
import type { ScrollMotion } from "../kit/animation";
import { ReaderGestures } from "./gestures";
import {
  PagesViewport,
  type PagesViewportActions,
  type PagesViewportCallbacks,
} from "./Viewport";
import {
  Toolbar,
  type ToolbarCallbacks,
} from "./Toolbar";
import { ZoomOverlay, type ZoomOverlayActions, type ZoomOverlayImage } from "./ZoomOverlay";
import {
  doublePagePairStart,
  ReaderSession,
  type ReaderControls,
  type ReaderOptions,
} from "./session";
import { ReaderScrollBar } from "./ScrollBar";
import { ViewportCanvas, ScrollScaleAdjustment } from "./ViewportCanvas";
import "../styles";
import { bindInteractionGate } from "../features/InteractionGate";

const VIEWER_ID = "ehpeek-reader";

const PAGED_WHEEL_THRESHOLD = 8;
const HORIZONTAL_SCROLL_WHEEL_FACTOR = 0.5;
const PROGRESS_IDLE_COMMIT_MS = 180;
const SCROLL_GESTURE_IDLE_MS = 160;
const SCROLL_BAR_IDLE_MS = 900;
const SCROLL_BAR_SHOW_DISTANCE = 48;
const SCROLL_BAR_EXPAND_VIEWPORTS = 2;
export type { ReaderOptions } from "./session";

export type ReaderActions = {
  progress: ReadProgressPort;
  gotoPage: (pageNum: number) => void;
};

export type ReaderCallbacks = {
  onClose: () => boolean;
  onProgress: (page: ReaderPage) => void;
  onEnd: () => void;
  onOpenPreview: (pageNum: number) => void;
  onToggleFullscreen: () => void;
};
export type ReaderProps = {
  disabled?: boolean;
  callbacks: ReaderCallbacks;
  actionsRef: (actions: ReaderActions | null) => void;
  settings: ReaderSettingsState;
  customization?: ReaderCustomization;
  fullscreenActive: boolean;
  options: ReaderOptions;
  source: ContentSource;
};

export function Reader(props: ReaderProps) {
  const options = untrack(() => props.options);
  const totalPages = options.totalPages ?? 0;
  const source = untrack(() => props.source);
  const session = new ReaderSession(options, untrack(() => props.settings));
  const readerState = session.state;
  const scrollFitPageNum = readerState.navi.currentPageNum();
  let readerElement!: HTMLDivElement;
  const disabled = () => props.disabled ?? false;
  untrack(() => bindInteractionGate(() => readerElement, disabled));
  const publisher = createReadProgressPublisher();
  const clientCallbacks = untrack(() => props.callbacks);
  const readerCallbacks = untrack(() => wireReaderCallbacks(
    session,
    options,
    source,
    {
      ...clientCallbacks,
      onProgress: page => {
        if (page.pageNum) publisher.publish(page.pageNum);
        clientCallbacks.onProgress(page);
      },
    },
    untrack(() => props.settings),
    untrack(() => props.customization) ?? {},
    () => readerElement,
    disabled,
  ));
  untrack(() => props.actionsRef)({
    gotoPage: readerCallbacks.gotoPage,
    progress: {
      current: readerState.navi.currentPageNum,
      subscribe: publisher.subscribe,
      setProgress: readerCallbacks.syncProgress,
    },
  });
  let previousFullscreenActive = untrack(() => props.fullscreenActive);
  const viewportPageLayout = () =>
    readerState.ctrls.value().pageLayout === "double" &&
      readerState.ctrls.value().firstPageSeparate &&
      readerState.navi.currentPageNum() === 1
      ? "single"
      : readerState.ctrls.value().pageLayout;

  createEffect(() => {
    const fullscreenActive = props.fullscreenActive;
    if (fullscreenActive === previousFullscreenActive) {
      return;
    }
    previousFullscreenActive = fullscreenActive;
    session.requestAnimationFrame(() => {
      session.requestAnimationFrame(readerCallbacks.realignCurrentPage);
    });
  });

  onCleanup(() => {
    props.actionsRef(null);
    readerCallbacks.cleanup();
    session.dispose();
  });
  onMount(readerCallbacks.init);

  return (
    <div
      ref={readerElement}
      id={VIEWER_ID}
      class="ehpeek-reader"
      data-navigation-mode={readerState.ctrls.value().navigationMode}
      data-page-layout={viewportPageLayout()}
      data-read-direction={readerState.ctrls.value().direction}
    >
      <Show when={!readerState.scrollViewport.adjusting()}>
        <header class="ehpeek-reader-header">
          <Toolbar
            disabled={props.disabled}
            callbacks={readerCallbacks.toolbar}
            customization={props.customization}
            leftHandedControls={props.settings.leftHandedControls.value()}
            controls={readerState.ctrls.value()}
            downloadInfos={readerState.navi.downloadInfos()}
            fullscreenActive={props.fullscreenActive}
            open={readerState.toolbar.open()}
            progress={{
              pageNum: readerState.navi.currentPageNum(),
              totalPages: options.totalPages,
              maxProgressPageNum: readerState.navi.maxProgressPageNum(),
              keepInputValue: readerState.navi.progressInputActive(),
            }}
          />
        </header>
      </Show>
      <ViewportCanvas
        disabled={props.disabled}
        adjusting={readerState.scrollViewport.adjusting()}
        callbacks={readerCallbacks.viewportCanvas}
        scaleMode={readerState.scrollViewport.scaleMode()}
        scalePercent={readerState.scrollViewport.scalePercent()}
      >
        <PagesViewport
          disabled={props.disabled}
          actionsRef={readerCallbacks.viewportActionsRef}
          callbacks={readerCallbacks.viewport}
          decodedImageCacheLimit={options.decodedImageCacheLimit}
          direction={readerState.ctrls.value().direction}
          navigationMode={readerState.ctrls.value().navigationMode}
          pageLayout={viewportPageLayout()}
          scrollFitImageSize={readerState.scrollViewport.fitImageSize()}
          scrollFitPageNum={scrollFitPageNum}
          scrollSizeScale={readerState.scrollViewport.sizeScale()}
          window={readerState.navi.viewportWindow()}
          zoomActive={readerState.overlay.image() !== null}
        />
      </ViewportCanvas>
      <Show when={
        readerState.ctrls.value().navigationMode === "scroll" &&
        readerState.ctrls.value().direction === "ttb" &&
        totalPages > 1
      }>
        <ReaderScrollBar
          disabled={props.disabled}
          callbacks={readerCallbacks.toolbar}
          currentPage={readerState.navi.currentPageNum()}
          expanded={readerState.scrollBar.expanded()}
          narrow={readerState.scrollViewport.viewportWidth() < window.innerWidth}
          totalPages={totalPages}
          visible={readerState.scrollBar.visible()}
        />
      </Show>
      <ZoomOverlay
        actionsRef={readerCallbacks.zoomOverlayActionsRef}
        image={readerState.overlay.image()}
        onClose={() => readerState.overlay.update(null)}
      />
    </div>
  );
}

function wireReaderCallbacks(
  session: ReaderSession,
  options: ReaderOptions,
  source: ContentSource,
  callbacks: ReaderCallbacks,
  settings: ReaderSettingsState,
  customization: ReaderCustomization,
  readerElement: () => HTMLElement,
  disabled: () => boolean,
) {
  const texts = useReaderTexts();
  const state = session.state;
  let viewportActions!: PagesViewportActions;
  let zoomOverlay!: ZoomOverlayActions;
  const totalPages = options.totalPages && options.totalPages > 0 ? options.totalPages : undefined;
  let closed = false;
  const scrollFitPageNum = state.navi.currentPageNum();
  const pagedMode = () => state.ctrls.value().navigationMode === "paged";
  const doublePageActive = () =>
    pagedMode() &&
    state.ctrls.value().pageLayout === "double" &&
    !(state.ctrls.value().firstPageSeparate && state.navi.currentPageNum() === 1);
  const stopViewportMotion = () => {
    pagedTargetPageNumber = null;
    viewportActions.stopMotion();
  };
  const [readerOrientation, setReaderOrientation] = createSignal(currentReaderOrientation());
  let viewportResizeObserver: ResizeObserver | null = null;
  const updateReaderViewportSize = () => {
    const viewport = readerElement();
    state.scrollViewport.setViewportWidth(Math.max(1, viewport.clientWidth));
    state.scrollViewport.setViewportHeight(Math.max(1, viewport.clientHeight));
    setReaderOrientation(currentReaderOrientation());
  };

  function configuredReaderControls(): ReaderControls {
    const controls = settings[`${readerOrientation()}Controls`];
    const navigationMode = controls.navigationMode.value();
    return {
      navigationMode,
      direction: navigationMode === "scroll"
        ? controls.scrollDirection.value()
        : controls.pagedDirection.value(),
      firstPageSeparate: untrack(() => state.ctrls.value().firstPageSeparate),
      pageLayout: controls.pageLayout.value(),
      rightTapAction: controls.rightTapAction.value(),
    };
  }

  function updateControls(requestedControls: ReaderControls): void {
    const previous = state.ctrls.value();
    const persistedControls = settings[`${readerOrientation()}Controls`];
    const controls = requestedControls.navigationMode === previous.navigationMode
      ? requestedControls
      : {
          ...requestedControls,
          direction: requestedControls.navigationMode === "scroll"
            ? persistedControls.scrollDirection.value()
            : persistedControls.pagedDirection.value(),
        };
    batch(() => {
      persistedControls.navigationMode.set(controls.navigationMode);
      if (controls.navigationMode === "scroll") {
        persistedControls.scrollDirection.set(controls.direction);
      } else {
        persistedControls.pagedDirection.set(controls.direction);
      }
      persistedControls.pageLayout.set(controls.pageLayout);
      persistedControls.rightTapAction.set(controls.rightTapAction);
      applyControls(controls);
    });
  }

  createEffect(() => {
    const controls = configuredReaderControls();
    untrack(() => applyControls(controls));
  });

  function applyControls(controls: ReaderControls): void {
    const previous = state.ctrls.value();
    if (Object.keys(controls).every((key) =>
      controls[key as keyof ReaderControls] === previous[key as keyof ReaderControls]
    )) return;
    const currentPageNum = state.navi.currentPageNum();
    state.ctrls.update(controls);
    if (controls.navigationMode !== "scroll") {
      state.scrollViewport.setAdjusting(false);
    }

    if (
      controls.navigationMode !== previous.navigationMode ||
      controls.pageLayout !== previous.pageLayout ||
      controls.firstPageSeparate !== previous.firstPageSeparate
    ) {
      stopViewportMotion();
      viewportActions.resetPosition();
      // Align after PagesViewport has applied the new mode's layout.
      session.requestAnimationFrame(() => {
        setCurrentPageNumber(currentPageNum, true);
      });
    } else if (controls.direction !== previous.direction) {
      loader.syncViewportWindow();
      scrollToCurrentPage();
    }
  }

  // Navigation intent is temporary; only committed pages publish progress.
  let pagedTargetPageNumber: number | null = null;
  let lastReportedPageNum: number | null = null;

  function setCurrentPageNumber(pageNumber: number, scrollIntoView: boolean, scrollMotion: ScrollMotion = "instant"): void {
    pagedTargetPageNumber = null;
    const target = state.navi.normalizePage(
      clamp(Math.round(pageNumber), 1, state.navi.readerPageLimit()),
    );
    state.navi.updatePage(target);
    syncAfterPageChange({ scrollIntoView, scrollMotion });
  }

  function syncAfterPageChange(options: {
    scrollIntoView: boolean;
    scrollMotion?: ScrollMotion;
  }): void {
    loader.sync(() => {
      notifyActivePageChange();
      if (options.scrollIntoView) scrollToCurrentPage({ motion: options.scrollMotion });
    });
  }

  function turnPageBy(delta: number): void {
    if (pagedMode()) {
      const base = pagedTargetPageNumber ?? state.navi.currentPageNum();
      const firstPageSeparate = state.ctrls.value().firstPageSeparate;
      let pageDelta = delta;
      if (state.ctrls.value().pageLayout === "double") {
        if (totalPages !== undefined && base === totalPages + 1 && delta < 0) {
          pageDelta = doublePagePairStart(totalPages, firstPageSeparate) - base;
        } else if (firstPageSeparate && base === 1 && delta > 0) {
          pageDelta = 1;
        } else if (firstPageSeparate && base === 2 && delta < 0) {
          pageDelta = -1;
        } else {
          pageDelta = delta * 2;
        }
      }
      animatePagedStep(pageDelta);
      return;
    }
    setCurrentPageNumber(state.navi.currentPageNum() + delta, true);
  }

  function animatePagedStep(delta: number): void {
    const base = pagedTargetPageNumber ?? state.navi.currentPageNum();
    const target = clamp(Math.round(base + delta), 1, state.navi.readerPageLimit());
    if (target === base) {
      scrollToCurrentPage({ motion: "animated", overrideTarget: false });
      return;
    }
    if (viewportActions.pageOffset(target) === null) {
      setCurrentPageNumber(target, true, "animated");
      return;
    }
    state.navi.setDirection(target > base ? 1 : -1);
    pagedTargetPageNumber = target;
    viewportActions.moveToPage(target, "animated", () => {
      if (pagedTargetPageNumber !== target) {
        return;
      }
      setCurrentPageNumber(target, true);
    });
  }

  function scrollToCurrentPage({
    motion = "instant",
    overrideTarget = true,
  }: {
    motion?: ScrollMotion;
    overrideTarget?: boolean;
  } = {}): void {
    if (pagedTargetPageNumber !== null && !overrideTarget) {
      return;
    }
    pagedTargetPageNumber = null;
    viewportActions.moveToPage(state.navi.currentPageNum(), motion);
  }

  function updatePageNumber(): void {
    const pageNum = state.navi.currentPageNum();
    const downloadPageNums = doublePageActive()
      ? [pageNum, pageNum + 1]
      : [pageNum];
    state.navi.setDownloadInfos(downloadPageNums.flatMap((downloadPageNum) => {
      const image = loader.images.get(downloadPageNum);
      if (!image || !state.navi.isContentPage(downloadPageNum)) {
        return [];
      }
      loader.images.touch(downloadPageNum);
      const currentFileName = image.fileName ?? `page-${downloadPageNum}.${imageFileExtension(image.imageUrl) || "webp"}`;
      return [{
        currentFileName,
        currentImageUrl: image.imageUrl,
        imageHeight: viewportActions.pageImageHeight(downloadPageNum) ?? image.height,
        imageWidth: viewportActions.pageImageWidth(downloadPageNum) ?? image.width,
        originalFileName: image.originalFileName ?? currentFileName,
        originalImageUrl: image.originalImageUrl,
        pageNum: downloadPageNum,
      }];
    }));
    state.navi.setMaxProgressPageNum(Math.max(1, state.navi.progressPageLimit()));
  }

  function notifyActivePageChange(): void {
    const page = loader.pages.get(state.navi.currentPageNum());
    if (page && page.pageNum !== lastReportedPageNum) {
      lastReportedPageNum = page.pageNum ?? null;
      callbacks.onProgress(page);
    }
  }

  function updateCurrentFromScroll(): void {
    const next = viewportActions.centerPageNum();
    if (next !== null && next !== state.navi.currentPageNum()) {
      state.navi.updatePage(next);
      syncAfterPageChange({ scrollIntoView: false });
      return;
    }
    loader.maintainLoadQueue();
  }

  const loader = new ReaderPageLoader(
    source, options,
    { pageNum: state.navi.currentPageNum, doublePage: doublePageActive, closed: () => closed },
    {
      onWindow: state.navi.setViewportWindow,
      onImagesChanged: updatePageNumber,
      onPagesReady: () => {
        notifyActivePageChange();
        if (state.ctrls.value().navigationMode === "scroll" && state.navi.currentPageNum() === scrollFitPageNum) {
          scrollToCurrentPage();
        }
      },
      onImageSize: (pageNum, width, height) => {
        if (pageNum === scrollFitPageNum && width && height && !state.scrollViewport.fitImageSize()) {
          state.scrollViewport.setFitImageSize({ width, height });
        }
      },
    },
    texts,
  );

  function imageAtPoint(point: { clientX: number; clientY: number }): ZoomOverlayImage | null {
    const pageNum = viewportActions.pageNumAtPoint(point);
    return pageNum === null || !viewportActions.pageImageReady(pageNum)
      ? null
      : loader.images.get(pageNum) ?? null;
  }

  function prepareZoomAtPoint(
    point: { clientX: number; clientY: number },
    scaleMultiplier = 1,
  ): boolean {
    const image = imageAtPoint(point);
    if (!image) {
      return false;
    }
    stopViewportMotion();
    viewportActions.cancelDrag();
    const zoomScale = viewportActions.pageZoomScale(image.pageNum);
    state.overlay.update(image);
    zoomOverlay.reset({
      centerX: point.clientX,
      centerY: point.clientY,
      scale: zoomScale * scaleMultiplier,
    });
    return true;
  }

  // Input adapters translate gestures and controls into the navigation operations above.
  function wireViewport(): PagesViewportCallbacks {
    let scrollFrame: number | null = null;
    let scrollBarTimer: number | null = null;
    let scrollGestureTimer: number | null = null;
    let previousScrollPosition: number | null = null;
    let scrollDistance = 0;
    const scrollPosition = () => state.ctrls.value().direction === "ttb"
      ? viewportActions.scrollTop()
      : viewportActions.scrollLeft();

    const updateScrollBarActivity = (): void => {
      const currentScrollPosition = scrollPosition();
      if (previousScrollPosition !== null) {
        scrollDistance += Math.abs(currentScrollPosition - previousScrollPosition);
      }
      previousScrollPosition = currentScrollPosition;
      if (scrollDistance >= SCROLL_BAR_SHOW_DISTANCE) {
        state.scrollBar.updateVisible(true);
      }
      const viewportSize = state.ctrls.value().direction === "ttb" ? window.innerHeight : window.innerWidth;
      if (scrollDistance >= viewportSize * SCROLL_BAR_EXPAND_VIEWPORTS) {
        state.scrollBar.updateExpanded(true);
      }
      session.clearTimeout(scrollGestureTimer);
      scrollGestureTimer = session.setTimeout(() => {
        scrollGestureTimer = null;
        scrollDistance = 0;
        previousScrollPosition = scrollPosition();
      }, SCROLL_GESTURE_IDLE_MS);
      session.clearTimeout(scrollBarTimer);
      scrollBarTimer = session.setTimeout(() => {
        scrollBarTimer = null;
        scrollDistance = 0;
        previousScrollPosition = scrollPosition();
        state.scrollBar.updateExpanded(false);
        state.scrollBar.updateVisible(false);
      }, SCROLL_BAR_IDLE_MS);
    };

    onCleanup(() => {
      session.clearTimeout(scrollBarTimer);
      session.clearTimeout(scrollGestureTimer);
    });

    return {
      onNativeScroll: (): void => {
        if (state.overlay.image() !== null || pagedMode()) {
          return;
        }
        if (state.scrollViewport.adjusting()) {
          return;
        }
        updateScrollBarActivity();
        if (viewportActions.isDragging()) {
          return;
        }
        const previousPosition = scrollPosition();
        if (state.ctrls.value().direction === "ttb") {
          viewportActions.moveToTop(previousPosition);
        } else {
          viewportActions.moveToLeft(previousPosition);
        }
        if (scrollPosition() !== previousPosition || scrollFrame !== null) {
          return;
        }
        scrollFrame = session.requestAnimationFrame(() => {
          scrollFrame = null;
          updateCurrentFromScroll();
        });
      },
      onReloadPage: (pageNum: number): void => {
        if (!viewportActions.resetPageError(pageNum)) {
          return;
        }
        if (loader.pages.has(pageNum)) {
          loader.maintainLoadQueue();
        } else {
          void loader.loadMissingPages([pageNum], loader.invalidate());
        }
      },
      onWheel: (delta: number, event: WheelEvent): void => {
        const deltaPixels = wheelDeltaPixels(delta, event.deltaMode);
        if (state.overlay.image() !== null) {
          event.preventDefault();
          zoomOverlay.moveWheel({
            centerX: event.clientX,
            centerY: event.clientY,
            delta: deltaPixels,
          });
          return;
        }
        if (event.ctrlKey || event.metaKey) {
          event.preventDefault();
          if (!pagedMode()) {
            if (scrollViewport.startPinch()) {
              scrollViewport.movePinch(
                Math.exp(-clamp(deltaPixels, -100, 100) * 0.0025),
              );
              scrollViewport.endPinch();
            }
            return;
          }
          if (!prepareZoomAtPoint(event)) {
            return;
          }
          zoomOverlay.moveWheel({
            centerX: event.clientX,
            centerY: event.clientY,
            delta: deltaPixels,
          });
          return;
        }
        if (!pagedMode() && state.ctrls.value().direction === "ttb") {
          return;
        }
        event.preventDefault();
        if (!pagedMode()) {
          const direction = state.ctrls.value().direction === "rtl" ? -1 : 1;
          viewportActions.moveToLeft(
            viewportActions.scrollLeft() +
              deltaPixels * direction * HORIZONTAL_SCROLL_WHEEL_FACTOR,
          );
          return;
        }
        if (!viewportActions.isDragging() && Math.abs(delta) >= PAGED_WHEEL_THRESHOLD) {
          turnPageBy(delta > 0 ? 1 : -1);
        }
      },
      pointer: gesture,
    };
  }

  function wireToolbar(): ToolbarCallbacks {
    const toolbar = {} as ToolbarCallbacks;
    let progressNavigationTimer: number | null = null;
    let pendingProgressPageNum: number | null = null;

    const cancelProgressNavigation = (): void => {
      if (progressNavigationTimer !== null) {
        session.clearTimeout(progressNavigationTimer);
        progressNavigationTimer = null;
      }
    };
    const previewProgress = (pageNum: number): void => {
      const target = state.navi.normalizePage(
        clamp(Math.round(pageNum), 1, state.navi.progressPageLimit()),
      );
      state.navi.updatePage(target);
      loader.invalidate();
      loader.syncViewportWindow();
      scrollToCurrentPage();
      updatePageNumber();
    };

    onCleanup(cancelProgressNavigation);
    createEffect(() => {
      if (!disabled()) return;
      cancelProgressNavigation();
      pendingProgressPageNum = null;
    });

    toolbar.onCloseClick = requestReaderClose;
    toolbar.onControlsChange = updateControls;
    toolbar.onFullscreenClick = callbacks.onToggleFullscreen;
    toolbar.onOpenOriginalPageClick = (): void => {
      const page = loader.pages.get(state.navi.currentPageNum());
      if (page && state.navi.isContentPage(state.navi.currentPageNum())) {
        customization.onOpenOriginalPage?.(page.url, page.pageNum ?? state.navi.currentPageNum());
      }
    };
    toolbar.onOpenScrollPreviewClick = (): void => {
      callbacks.onOpenPreview(state.navi.currentPageNum());
    };
    toolbar.onViewportAdjustClick = scrollViewport.open;
    toolbar.onProgressPointerDown = (event: PointerEvent): void => {
      state.navi.setProgressInputActive(true);
      cancelProgressNavigation();
      event.stopPropagation();
    };
    toolbar.onProgressInput = (pageNum: number): void => {
      if (!Number.isFinite(pageNum) || pageNum <= 0) {
        return;
      }
      state.navi.setProgressInputActive(true);
      pendingProgressPageNum = clamp(Math.round(pageNum), 1, state.navi.progressPageLimit());
      previewProgress(pendingProgressPageNum);
      cancelProgressNavigation();
      progressNavigationTimer = session.setTimeout(
        () => toolbar.onProgressCommit(pendingProgressPageNum ?? state.navi.currentPageNum()),
        PROGRESS_IDLE_COMMIT_MS,
      );
    };
    toolbar.onProgressCommit = (value: number): void => {
      if (!state.navi.progressInputActive() && pendingProgressPageNum === null) {
        return;
      }
      const pageNum = pendingProgressPageNum ?? value;
      state.navi.setProgressInputActive(false);
      pendingProgressPageNum = null;
      cancelProgressNavigation();
      if (Number.isFinite(pageNum) && pageNum > 0) {
        setCurrentPageNumber(pageNum, true);
      }
    };
    return toolbar;
  }

  const onKeydown = (event: KeyboardEvent): void => {
    if (disabled() || shouldIgnoreKeyboardEvent(event)) {
      return;
    }
    if (event.key === "Escape") {
      if (state.overlay.image() !== null) {
        state.overlay.update(null);
      } else {
        requestReaderClose();
      }
      event.preventDefault();
    } else if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      (state.ctrls.value().direction === "ttb" && (event.key === "ArrowUp" || event.key === "ArrowDown"))
    ) {
      event.preventDefault();
      if (state.overlay.image() === null) {
        if (event.key === "ArrowUp" || event.key === "ArrowDown") {
          turnPageBy(event.key === "ArrowUp" ? -1 : 1);
        } else {
          turnPageBy(event.key === "ArrowLeft" ? state.navi.leftTapDelta() : state.navi.rightTapDelta());
        }
      }
    }
  };

  // Mount/unmount connects the already-defined responsibilities in one place.
  function requestReaderClose(): void {
    if (closed) {
      return;
    }
    closed = callbacks.onClose();
  }

  const scrollViewport = new ScrollScaleAdjustment(state.scrollViewport, () => state.ctrls.value().direction, settings);
  const gestures = new ReaderGestures(
    state, scrollViewport,
    {
      close: requestReaderClose, onEnd: callbacks.onEnd, openPreview: callbacks.onOpenPreview,
      turnPageBy, prepareZoom: prepareZoomAtPoint, realign: scrollToCurrentPage,
      followScroll: updateCurrentFromScroll, stopMotion: stopViewportMotion,
      cancelPageTarget: () => { pagedTargetPageNumber = null; },
      imageAtPoint,
    },
  );
  const gesture = gestures.callbacks;
  const viewport = wireViewport();
  const toolbar = wireToolbar();
  createEffect(() => {
    if (!disabled()) return;
    untrack(() => {
      stopViewportMotion();
      viewportActions.cancelDrag();
      scrollViewport.endPinch();
      state.navi.setProgressInputActive(false);
    });
  });

  return {
    viewportActionsRef: (actions: PagesViewportActions): void => {
      viewportActions = actions;
      loader.viewport = actions;
      gestures.viewport = actions;
    },
    zoomOverlayActionsRef: (actions: ZoomOverlayActions): void => {
      zoomOverlay = actions;
      gestures.zoom = actions;
    },
    init: () => {
      document.addEventListener("keydown", onKeydown, true);
      window.addEventListener("resize", updateReaderViewportSize);
      updateReaderViewportSize();
      viewportResizeObserver = new ResizeObserver(updateReaderViewportSize);
      viewportResizeObserver.observe(readerElement());
      viewportActions.focus();
      updatePageNumber();
      syncAfterPageChange({ scrollIntoView: true });
    },
    cleanup: () => {
      closed = true;
      loader.dispose();
      document.removeEventListener("keydown", onKeydown, true);
      window.removeEventListener("resize", updateReaderViewportSize);
      viewportResizeObserver?.disconnect();
      viewportResizeObserver = null;
    },
    gotoPage: (pageNum: number) => setCurrentPageNumber(pageNum, true),
    syncProgress: (pageNum: number) => {
      lastReportedPageNum = state.navi.normalizePage(
        clamp(Math.round(pageNum), 1, state.navi.readerPageLimit()),
      );
      setCurrentPageNumber(pageNum, true);
    },
    realignCurrentPage: () => {
      scrollToCurrentPage();
    },
    toolbar,
    viewport,
    viewportCanvas: scrollViewport.callbacks,
  };

}

function wheelDeltaPixels(delta: number, mode: number): number {
  if (mode === WheelEvent.DOM_DELTA_LINE) {
    return delta * 16;
  }
  if (mode === WheelEvent.DOM_DELTA_PAGE) {
    return delta * window.innerHeight;
  }
  return delta;
}

function shouldIgnoreKeyboardEvent(event: KeyboardEvent): boolean {
  if (event.isComposing) {
    return true;
  }

  const eventTarget = event.target;

  if (!(eventTarget instanceof Element)) {
    return false;
  }

  return Boolean(eventTarget.closest("input, textarea, select, [contenteditable='true'], [contenteditable='']"));
}
