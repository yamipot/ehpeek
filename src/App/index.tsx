import {
  createEffect,
  createRoot,
  createSignal,
  Show,
} from "solid-js";
import { EnhanceSearchGrids } from "../components/Enhance/EnhanceSearchGrids";
import {
  ThumbsGrids,
} from "../components/Enhance/EnhanceThumbsGrids";
import {
  ScrollPreview,
} from "../components/Enhance/ScrollPreview";
import { ReadHistoryPage } from "../components/Enhance/ReadHistory";
import {
  loadReadHistory,
  loadReadHistoryRecords,
  ReadingProgressSession,
  type ReadingProgress,
} from "../state/readHistory";
import { SearchHistory } from "../components/Enhance/SearchHistory";
import { loadMyTagAppearances, refreshMyTags } from "../components/Enhance/MyTags";
import { SettingsMenu } from "../components/SettingsMenu";
import {
  BackToTop,
  clearBackToTopPosition,
} from "../components/Widgets/BackToTop";
import {
  GalleryInfoPanel,
  FavoritesCategorySelect,
  TouchSearchAction,
  TouchSearchCategoryToggle,
  TouchSearchOptionToggle,
  TouchSearchPanel,
  TouchTopBar,
} from "../components/TouchUI";
import * as eh from "../eh";
import { state } from "../state";
import { dispatchReady } from "../state/events";
import texts from "../texts.json";
import { registerGlobalStyle } from "../utils";
import ehDomCss from "../eh/dom/styles.css";
import unoCss from "ehpeek:uno.css";
import themeCss from "../theme.css";
import { reportReaderOpenError } from "./Reader";
import {
  createGalleryCoordinator,
  type GalleryCoordinator,
} from "./GalleryCoordinator";
import {
  createGalleryPreviewCache,
  type GalleryPreviewCache,
} from "./GalleryPreviewCache";
import { createAppMount } from "./host";
import {
  createOverlayHost,
  OverlayHostProvider,
  type OverlayHost,
} from "./OverlayHost";
import { applyUiScale, type UiScale } from "../uiScale";
import {
  configureUiRoots,
  markUiRoot,
  setUiPointer,
} from "../uiRoot";

function settingsMenuState(defaults = false) {
  const read = <T,>(setting: { defaultValue: T; value: T }): T =>
    defaults ? setting.defaultValue : setting.value;

  return {
    openGalleryInNewTab: read(state.app.openGalleryInNewTab),
    readerEnabled: read(state.reader.enabled),
    exitReaderOnFullscreenExit: read(state.reader.exitOnFullscreenExit),
    readerFullscreenEnabled: read(state.reader.fullscreen),
    replacePreviewWithScroll: read(state.gallery.replacePreviewWithScroll),
    enhanceThumbsGridsEnabled: read(state.gallery.enhanceThumbs),
    enhanceSearchGridsEnabled: read(state.search.enhance),
    myTagsEnabled: read(state.gallery.myTags),
    readHistoryEnabled: read(state.gallery.readHistory),
    includeUnreadHistoryEnabled: read(state.gallery.includeUnreadHistory),
    searchHistoryEnabled: read(state.search.history),
    touchUiEnabled: read(state.touch.enabled),
    uiScale: read(currentUiScaleSetting()),
  };
}

function applySettingsMenuState(
  next: ReturnType<typeof settingsMenuState>,
): void {
  if (!next.touchUiEnabled) {
    clearBackToTopPosition();
  }
  state.app.openGalleryInNewTab.set(next.openGalleryInNewTab);
  state.reader.enabled.set(next.readerEnabled);
  state.reader.exitOnFullscreenExit.set(next.exitReaderOnFullscreenExit);
  state.reader.fullscreen.set(next.readerFullscreenEnabled);
  state.gallery.replacePreviewWithScroll.set(next.replacePreviewWithScroll);
  state.gallery.enhanceThumbs.set(next.enhanceThumbsGridsEnabled);
  state.search.enhance.set(next.enhanceSearchGridsEnabled);
  state.gallery.myTags.set(next.myTagsEnabled);
  state.gallery.readHistory.set(next.readHistoryEnabled);
  state.gallery.includeUnreadHistory.set(next.includeUnreadHistoryEnabled);
  state.search.history.set(next.searchHistoryEnabled);
  state.touch.enabled.set(next.touchUiEnabled);
  currentUiScaleSetting().set(next.uiScale);
  window.location.reload();
}

const gState = (() => {
  const settings = settingsMenuState();
  const [columnsEnabled, setColumnsEnabled] = createSignal(currentColumnsEnabled());
  const [leftHandedControls, setLeftHandedControls] =
    createSignal(state.app.leftHandedControls.value);
  const [settingsMenuOpen, setSettingsMenuOpen] = createSignal(false);
  const [uiScale, setUiScale] = createSignal(currentUiScale());
  return {
    columnsEnabled,
    leftHandedControls,
    setLeftHandedControls,
    settings,
    settingsMenuOpen,
    setUiScale,
    setColumnsEnabled,
    setSettingsMenuOpen,
    uiScale,
  };
})();

function currentUiScale(): UiScale {
  return currentUiScaleSetting().value;
}

function currentUiScaleSetting() {
  return window.matchMedia("(orientation: landscape)").matches
    ? state.app.landscapeUiScale
    : state.app.portraitUiScale;
}

function currentColumnsEnabled(): boolean {
  return window.matchMedia("(orientation: landscape)").matches
    ? state.touch.landscapeColumns.value
    : state.touch.portraitColumns.value;
}

let overlayHost: OverlayHost;

function updateUiScale(): void {
  const scale = currentUiScale();
  gState.setUiScale(scale);
  applyUiScale(scale);
  overlayHost?.setUiScale(scale);
}

function updateColumnsLayout(): void {
  if (!gState.settings.touchUiEnabled) {
    return;
  }
  gState.setColumnsEnabled(currentColumnsEnabled());
}

function setCurrentColumnsEnabled(enabled: boolean): void {
  const setting = window.matchMedia("(orientation: landscape)").matches
    ? state.touch.landscapeColumns
    : state.touch.portraitColumns;
  setting.set(enabled);
  gState.setColumnsEnabled(enabled);
}

function setCurrentUiScale(scale: UiScale): void {
  currentUiScaleSetting().set(scale);
  gState.setUiScale(scale);
  applyUiScale(scale);
  overlayHost?.setUiScale(scale);
}

function setLeftHandedControls(enabled: boolean): void {
  state.app.leftHandedControls.set(enabled);
  gState.setLeftHandedControls(enabled);
}

configureUiRoots({
  pointer: window.matchMedia("(hover: hover) and (pointer: fine)").matches
    ? "mouse"
    : "touch",
  site: eh.ehSiteTheme(),
});
const PRESS_MIN_VISIBLE_MS = 100;
const PRESS_MOVE_TOLERANCE_PX = 8;
let pressedInteraction: HTMLElement | undefined;
let pressedClearTimer: number | undefined;
let pendingPress: {
  interaction: HTMLElement;
  pointerId: number;
  startX: number;
  startY: number;
} | undefined;
const clearPressedInteraction = () => {
  if (pressedClearTimer !== undefined) {
    window.clearTimeout(pressedClearTimer);
    pressedClearTimer = undefined;
  }
  pendingPress = undefined;
  pressedInteraction?.removeAttribute("data-ehpeek-pressed");
  pressedInteraction = undefined;
};
const showPressedInteraction = (interaction: HTMLElement) => {
  pressedInteraction = interaction;
  interaction.setAttribute("data-ehpeek-pressed", "true");
};
const releasePressedInteraction = () => {
  pressedClearTimer = window.setTimeout(
    clearPressedInteraction,
    PRESS_MIN_VISIBLE_MS,
  );
};
document.addEventListener("pointerdown", (event) => {
  if (event.pointerType !== "mouse") {
    setUiPointer("touch");
  }
  clearPressedInteraction();
  const interaction = event.target instanceof Element
    ? event.target.closest<HTMLElement>("[data-ehpeek-pressable=true]") ??
      event.target.closest<HTMLElement>(
        "a[href], button, input[type=button], input[type=submit], [role=button], [role=tab]",
      )
    : null;
  if (!interaction?.closest(".ehpeek-ui-root")) {
    return;
  }
  pendingPress = {
    interaction,
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
  };
}, { capture: true, passive: true });
document.addEventListener("pointerup", (event) => {
  if (pendingPress?.pointerId !== event.pointerId) {
    return;
  }
  showPressedInteraction(pendingPress.interaction);
  pendingPress = undefined;
  releasePressedInteraction();
}, {
  capture: true,
  passive: true,
});
document.addEventListener("pointercancel", clearPressedInteraction, {
  capture: true,
  passive: true,
});
document.addEventListener("pointermove", (event) => {
  if (event.pointerType === "mouse") {
    setUiPointer("mouse");
  }
  if (
    pendingPress?.pointerId === event.pointerId &&
    Math.hypot(
      event.clientX - pendingPress.startX,
      event.clientY - pendingPress.startY,
    ) > PRESS_MOVE_TOLERANCE_PX
  ) {
    clearPressedInteraction();
  }
}, { capture: true, passive: true });
updateUiScale();
registerGlobalStyle("ehpeek-uno-style", unoCss);
registerGlobalStyle("ehpeek-theme-style", themeCss);
registerGlobalStyle("ehpeek-dom-style", ehDomCss);

function allowFeatureFailure(name: string, run: () => void): void {
  try {
    run();
  } catch (error) {
    console.error(`[ehpeek] ${name} failed`, error);
  }
}

async function allowAsyncFeatureFailure(
  name: string,
  run: () => Promise<void>,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    console.error(`[ehpeek] ${name} failed`, error);
  }
}

function requirePageDependency<T>(name: string, dependency: T | null): T {
  if (dependency === null) {
    throw new Error(`Cannot initialize ${name}.`);
  }
  return dependency;
}

type GalleryReadButtonProps = {
  onRead: () => void;
  progress: () => ReadingProgress;
};

function readButtonLabel(progress: ReadingProgress): string {
  return progress.hasHistory
    ? texts.reader.continueReading
    : texts.reader.startReading;
}

function readButtonProgress(progress: ReadingProgress): string {
  return progress.totalPages
    ? `${progress.currentPage}/${progress.totalPages}`
    : String(progress.currentPage);
}

function GalleryReadButton(props: GalleryReadButtonProps) {
  return (
    <button
      type="button"
      class="flex box-border w-full max-w-full min-h-sm items-center gap-sm py-sm px-xs border-0 bg-transparent text-[var(--color-site-accent)] hover:bg-[var(--color-site-accent-hover)] shadow-none cursor-pointer text-left font-inherit [font-size:1.05em] font-700 leading-[1.2]"
      aria-label={readButtonLabel(props.progress())}
      title={readButtonLabel(props.progress())}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onRead();
      }}
    >
      {readButtonLabel(props.progress())}
      <Show when={props.progress().hasHistory}>
        <span class="inline-block ml-auto opacity-72 [font-size:0.9em] font-600 whitespace-nowrap">
          {readButtonProgress(props.progress())}
        </span>
      </Show>
    </button>
  );
}

function TouchGalleryReadButton(props: GalleryReadButtonProps) {
  return (
    <button
      type="button"
      class="flex min-w-0 w-full h-full ui-hit-min-h-xl flex-col items-center justify-center ui-gap-xs ui-py-md ui-px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] [font-size:var(--ui-font-size-lg)] font-700"
      aria-label={readButtonLabel(props.progress())}
      title={readButtonLabel(props.progress())}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        props.onRead();
      }}
    >
      {readButtonLabel(props.progress())}
      <Show when={props.progress().hasHistory}>
        <span class="block ehp-color-site-accent [font-size:var(--ui-font-size-sm)] font-600 opacity-78 normal-case">
          {readButtonProgress(props.progress())}
        </span>
      </Show>
    </button>
  );
}

function installSettingsMenu(): void {
  if (typeof GM_registerMenuCommand === "function") {
    GM_registerMenuCommand(texts.settings.openSettings, () => {
      gState.setSettingsMenuOpen(true);
    });
  }

  const mount = createAppMount(
    "fixed inset-0 z-[1150] pointer-events-none",
    overlayHost.element,
  );
  mount.mount(() => (
    <OverlayHostProvider host={overlayHost}>
      <SettingsMenu
        historyHref={eh.readHistoryUrl()}
        leftHandedControls={gState.leftHandedControls}
        open={gState.settingsMenuOpen()}
        defaultState={settingsMenuState(true)}
        initState={{ ...gState.settings, uiScale: gState.uiScale() }}
        onApply={(next) => {
          applySettingsMenuState(next);
        }}
        onOpenChange={gState.setSettingsMenuOpen}
      />
    </OverlayHostProvider>
  ));
}

function injectCommon(page: eh.PageType): void {
  if (!gState.settings.touchUiEnabled) {
    allowFeatureFailure("Desktop settings entry", () => {
      const settingsMount = eh.manageSettingsMenuMount();
      if (!settingsMount) {
        return;
      }
      settingsMount.mount(() => (
        <a
          href="#"
          onClick={(event: MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            gState.setSettingsMenuOpen(true);
          }}
        >
          {texts.settings.menuLabel}
        </a>
      ));
    });
    return;
  }

  allowFeatureFailure("Touch top bar", () => {
    const topBarDom = eh.manageTopBar();
    if (!topBarDom) {
      return;
    }
    const columnsAvailable =
      page.type === "gallery" ||
      page.type === "readHistory" ||
      ((page.type === "search" || page.type === "favorites") &&
        state.search.grid.value !== null);
    topBarDom.elems.mount.mount(() => (
      <TouchTopBar
        historyHref={gState.settings.readHistoryEnabled
          ? eh.readHistoryUrl()
          : undefined}
        leftHandedControls={{
          enabled: gState.leftHandedControls,
          onChange: setLeftHandedControls,
        }}
        uiScale={{
          value: gState.uiScale,
          onChange: setCurrentUiScale,
        }}
        columns={columnsAvailable ? {
          enabled: gState.columnsEnabled,
          onChange: setCurrentColumnsEnabled,
        } : undefined}
        source={topBarDom}
        onSettingsMenuOpen={() => {
          gState.setSettingsMenuOpen(true);
        }}
      />
    ));
  });

  if (
    page.type === "gallery" ||
    page.type === "search" ||
    page.type === "favorites" ||
    page.type === "readHistory"
  ) {
    allowFeatureFailure("Back to top", () => {
      const host = createAppMount();
      host.mount(() => <BackToTop leftHanded={gState.leftHandedControls} />);
    });
  }
}

function injectGalleryDetails(
  previewCache: GalleryPreviewCache,
  coordinator: GalleryCoordinator,
): void {
  const preview = previewCache.current();
  allowFeatureFailure("Touch GalleryInfo", () => {
    eh.mutateGalleryTouchLayout();
    const galleryInfoDom = requirePageDependency(
      "Touch GalleryInfo",
      eh.manageGalleryInfo(preview.data),
    );
    galleryInfoDom.handle.installGalleryInfoPanel();
    galleryInfoDom.elems.mount.mount(() => (
      <OverlayHostProvider host={overlayHost}>
        <GalleryInfoPanel
          leftHandedControls={gState.leftHandedControls}
          source={galleryInfoDom}
          primaryAction={(
            <TouchGalleryReadButton
              onRead={coordinator.openFromReadButton}
              progress={coordinator.progress}
            />
          )}
        />
      </OverlayHostProvider>
    ));
    const wideLayout = requirePageDependency(
      "Touch Gallery layout",
      eh.mutateGalleryWideLayout(
        galleryInfoDom,
        preview,
        gState.columnsEnabled(),
        gState.settings.replacePreviewWithScroll,
      ),
    );
    createEffect(() => wideLayout.updateEnabled(gState.columnsEnabled()));
  });

  allowFeatureFailure("Touch Gallery comments", () => {
    eh.manageGalleryCommentsTouch(reportReaderOpenError);
  });
}

function injectGalleryPreview(
  previewCache: GalleryPreviewCache,
  coordinator: GalleryCoordinator,
): void {
  const preview = previewCache.current();
  const previewMount = preview.elems.mount;

  if (gState.settings.readerEnabled) {
    allowFeatureFailure("Reader thumbnail links", () => {
      preview.handle.interceptPreviewImageOpen((pageUrl) => {
        coordinator.openGalleryPage(pageUrl);
      });
    });
  }

  if (!gState.settings.touchUiEnabled) {
    allowFeatureFailure("Desktop Read button", () => {
      const galleryReadButtonMount = eh.manageGalleryContinueReadingButtonMount();
      galleryReadButtonMount.mount(() => (
        <GalleryReadButton
          onRead={coordinator.openFromReadButton}
          progress={coordinator.progress}
        />
      ));
    });
  }

  if (!previewMount) {
    return;
  }

  allowFeatureFailure("Gallery Preview enhancements", () => {
    if (gState.settings.replacePreviewWithScroll) {
      preview.handle.removeOriginalPreview();
    }
    previewMount.mount(() => (
      <OverlayHostProvider host={overlayHost}>
        <div
          classList={{
            "contents": !gState.settings.replacePreviewWithScroll,
            "relative h-full w-full [--scroll-preview-height:100%]":
              gState.settings.replacePreviewWithScroll &&
              gState.settings.touchUiEnabled &&
              gState.columnsEnabled(),
            "relative [--scroll-preview-height:55lvh] [width:min(calc(100%-(var(--touch-gallery-gutter)*2)),90lvh)] mx-auto":
              gState.settings.replacePreviewWithScroll &&
              gState.settings.touchUiEnabled &&
              !gState.columnsEnabled(),
            "relative [--scroll-preview-height:70svh] w-[min(calc(100%-32px),1212px)] mx-auto":
              gState.settings.replacePreviewWithScroll &&
              !gState.settings.touchUiEnabled,
          }}
        >
          <ScrollPreview
            coordinator={coordinator}
            embeddedDirection={gState.columnsEnabled()
              ? state.gallery.embeddedScrollPreviewColumnsDirection.value
              : state.gallery.embeddedScrollPreviewSingleDirection.value}
            fillEmbeddedContainer={gState.columnsEnabled}
            leftHandedControls={gState.leftHandedControls}
            onLoadError={reportReaderOpenError}
            onEmbeddedDirectionChange={(direction) => {
              if (gState.columnsEnabled()) {
                state.gallery.embeddedScrollPreviewColumnsDirection.set(direction);
              } else {
                state.gallery.embeddedScrollPreviewSingleDirection.set(direction);
              }
            }}
            onReadDirectionChange={(direction) => {
              state.gallery.scrollPreviewDirection.set(direction);
            }}
            previewCache={previewCache}
            readDirection={state.gallery.scrollPreviewDirection.value}
            replaceOriginalPreview={gState.settings.replacePreviewWithScroll}
          />
          {gState.settings.enhanceThumbsGridsEnabled &&
          !gState.settings.replacePreviewWithScroll ? (
            <ThumbsGrids
              coordinator={coordinator}
              onLoadError={reportReaderOpenError}
              previewCache={previewCache}
            />
          ) : null}
        </div>
      </OverlayHostProvider>
    ));
  });
}

function injectGalleryPage(
  page: Extract<eh.PageType, { type: "gallery" }>,
): void {
  const preview = eh.manageGalleryPreview();
  const previewCache = createGalleryPreviewCache(preview);
  const coordinator = createGalleryCoordinator({
    enhanceThumbsGridsEnabled: gState.settings.enhanceThumbsGridsEnabled,
    exitReaderOnFullscreenExit: gState.settings.exitReaderOnFullscreenExit,
    includeUnreadHistoryEnabled: gState.settings.includeUnreadHistoryEnabled,
    overlayHost,
    previewCache,
    readHistoryEnabled: gState.settings.readHistoryEnabled,
    readerEnabled: gState.settings.readerEnabled,
    readerFullscreenEnabled: gState.settings.readerFullscreenEnabled,
    replacePreviewWithScroll: gState.settings.replacePreviewWithScroll,
  });

  if (gState.settings.myTagsEnabled) {
    allowFeatureFailure("Gallery My Tags appearance", () => {
      const myTagAppearances = loadMyTagAppearances();
      if (myTagAppearances) {
        eh.mutateGalleryMyTags(myTagAppearances);
        return;
      }
      void allowAsyncFeatureFailure("My Tags appearance", async () => {
        const appearances = await refreshMyTags();
        if (appearances) {
          eh.mutateGalleryMyTags(appearances);
        }
      });
    });
  }

  if (gState.settings.touchUiEnabled) {
    injectGalleryDetails(previewCache, coordinator);
  }
  injectGalleryPreview(previewCache, coordinator);

  if (state.reader.enabled.value && page.peekPage !== null) {
    void allowAsyncFeatureFailure("Reader deep link", async () => {
      await coordinator.openReaderFromHash();
    });
  }
}

function injectSearchControls(
  page: Extract<eh.PageType, { type: "favorites" | "search" }>,
): eh.TouchResultsPageDom {
  const touchResultsDom = eh.manageTouchResultsPage(page);

  allowFeatureFailure("Touch Search panel", () => {
    const searchPanelDom = eh.manageSearchPanel();
    if (!searchPanelDom) {
      return;
    }
    markUiRoot(searchPanelDom.elems.form.Component());
    searchPanelDom.elems.mount.mount(() => (
      <TouchSearchPanel
        source={searchPanelDom}
        after={touchResultsDom.data.favoritesCategory ? (
          <FavoritesCategorySelect source={touchResultsDom} />
        ) : undefined}
      />
    ));
    searchPanelDom.elems.categoryToggleMount?.mount(() => (
      <TouchSearchCategoryToggle source={searchPanelDom} />
    ));
    searchPanelDom.elems.advancedToggleMount?.mount(() => (
      <TouchSearchOptionToggle option="advancedOptions" source={searchPanelDom} />
    ));
    searchPanelDom.elems.fileSearchToggleMount?.mount(() => (
      <TouchSearchOptionToggle option="fileSearch" source={searchPanelDom} />
    ));
    searchPanelDom.elems.searchActionMount.mount(() => (
      <TouchSearchAction action="search" source={searchPanelDom} />
    ));
    searchPanelDom.elems.clearActionMount?.mount(() => (
      <TouchSearchAction action="clear" source={searchPanelDom} />
    ));
  });

  return touchResultsDom;
}

function injectSearchPage(
  page: Extract<eh.PageType, { type: "favorites" | "search" }>,
): void {
  const initialResultsDom = requirePageDependency(
    "Search results",
    eh.manageSearchResults(),
  );
  const [resultsDom, setResultsDom] = createSignal(
    initialResultsDom,
  );
  markUiRoot(initialResultsDom.elems.resultList.Component());

  const updateSearchGridModeSelector = () => {
    eh.mutateSearchGridModeSelect(
      state.search.grid.value,
      (mode) => {
        state.search.grid.set(mode);
        window.location.assign(
          new URL("/?inline_set=dm_e", window.location.href).href,
        );
      },
      () => {
        state.search.grid.set(null);
      },
    );
  };

  allowFeatureFailure("Search grid mode selector", updateSearchGridModeSelector);
  const searchGridMode = state.search.grid.value;
  if (searchGridMode) {
    allowFeatureFailure(
      "Search grid",
      () => eh.manageSearchGrids(searchGridMode),
    );
  }
  const updateSearchReadHistoryAppearance = () => {
    if (!gState.settings.readHistoryEnabled) {
      return;
    }
    eh.mutateSearchReadHistoryAppearance(loadReadHistory);
  };
  allowFeatureFailure("Search Read History appearance", updateSearchReadHistoryAppearance);

  if (gState.settings.openGalleryInNewTab) {
    allowFeatureFailure("Gallery links in new tabs", () => {
      initialResultsDom.handle.listenGalleryLinksOpenInNewTab();
    });
  }
  const updateSearchPage = (source: eh.SearchResultsDom) => {
    setResultsDom(source);
    updateSearchGridModeSelector();
    if (searchGridMode) {
      eh.manageSearchGrids(searchGridMode);
    }
    updateSearchReadHistoryAppearance();
  };
  const mountSearchPagination = (
    onPageChange: (source: eh.SearchResultsDom) => void,
  ) => {
    if (!gState.settings.enhanceSearchGridsEnabled) {
      return;
    }
    allowFeatureFailure("Enhanced Search pagination", () => {
      const host = createAppMount();
      host.mount(() => (
        <EnhanceSearchGrids
          source={initialResultsDom}
          onPageChange={(source) =>
            allowFeatureFailure("Changed Search page", () => onPageChange(source))}
        />
      ));
    });
  };

  if (gState.settings.touchUiEnabled) {
    const touchResultsDom = injectSearchControls(page);
    createEffect(() => {
      resultsDom().handle.updateResultColumns(gState.columnsEnabled());
    });
    mountSearchPagination((source) => {
      markUiRoot(source.elems.resultList.Component());
      updateSearchPage(source);
      touchResultsDom.handle.updateTouchResultsLayout();
    });
  } else {
    mountSearchPagination(updateSearchPage);
  }

  if (gState.settings.searchHistoryEnabled) {
    allowFeatureFailure("Search history", () => {
      const searchTextInput = eh.manageSearchTextInput();
      if (!searchTextInput) {
        return;
      }
      const host = createAppMount();
      host.mount(() => <SearchHistory source={searchTextInput} />);
    });
  }
}

function injectReadHistoryPage(
  page: Extract<eh.PageType, { type: "readHistory" }>,
): void {
  const pageSize = 25;
  const records = loadReadHistoryRecords();
  const pageCount = Math.max(1, Math.ceil(records.length / pageSize));
  const pageIndex = Math.min(page.pageIndex, pageCount - 1);
  const items = records.map((record) => ({
    currentPage: record.pageNum,
    galleryId: record.galleryId,
    info: record.gallery,
    token: record.token,
    totalPages: record.totalPages,
    updatedAt: record.updatedAt,
  }));
  const historyDom = requirePageDependency(
    "Read History page",
    eh.manageReadHistoryPage(
      items.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize),
      state.gallery.titlePreference.reload(),
      state.search.grid.value ?? "ehpeek-lite",
    ),
  );
  markUiRoot(historyDom.elems.resultList.Component());
  if (gState.settings.touchUiEnabled) {
    createEffect(() => {
      historyDom.handle.updateResultColumns(gState.columnsEnabled());
    });
    allowFeatureFailure("Touch Read History layout", () => {
      eh.manageTouchResultsPage(page);
    });
  }
  historyDom.elems.navigationTopMount.mount(() => (
    <ReadHistoryPage
      initialPageIndex={pageIndex}
      items={items}
      pageSize={pageSize}
      source={historyDom}
    />
  ));
}

function injectImagePage(
  page: Extract<eh.PageType, { type: "image" }>,
): void {
  if (!gState.settings.readHistoryEnabled) {
    return;
  }
  const gallery = requirePageDependency(
    "Image Gallery data",
    eh.extractImageGalleryPage(),
  );
  if (gallery.galleryId !== page.galleryId) {
    return;
  }
  const previous = loadReadHistory(gallery.galleryId, gallery.token);
  const historySession = new ReadingProgressSession({
    gallery: previous?.gallery,
    galleryId: gallery.galleryId,
    token: gallery.token,
    totalPages: previous?.totalPages,
  }, {
    currentPage: previous?.pageNum && previous.pageNum > 0 ? previous.pageNum : 1,
    hasHistory: Boolean(previous && previous.pageNum > 0),
    totalPages: previous?.totalPages ?? null,
  });
  historySession.update(page.pageNum, previous?.totalPages);
}

function injectPage(page: eh.PageType): void {
  updateUiScale();
  injectCommon(page);

  switch (page.type) {
    case "gallery":
      allowFeatureFailure("Gallery page", () => injectGalleryPage(page));
      break;
    case "favorites":
    case "search":
      allowFeatureFailure("Search page", () => injectSearchPage(page));
      break;
    case "readHistory":
      allowFeatureFailure("Read History page", () => injectReadHistoryPage(page));
      break;
    case "image":
      allowFeatureFailure("Image page", () => injectImagePage(page));
      break;
    case "myTags":
      if (gState.settings.myTagsEnabled) {
        void allowAsyncFeatureFailure("My Tags refresh", async () => {
          await refreshMyTags(eh.extractMyTagsPageData());
        });
      }
      break;
    case "settings": {
      const titlePreference = eh.extractGalleryTitlePreference();
      if (titlePreference) {
        state.gallery.titlePreference.set(titlePreference);
      }
      break;
    }
    case "other":
      break;
  }
}

eh.EhSyringe.initialize();

let historyRouteActive = eh.extractPageType().type === "readHistory";
window.addEventListener("hashchange", () => {
  const nextHistoryRouteActive = eh.extractPageType().type === "readHistory";
  if (historyRouteActive !== nextHistoryRouteActive) {
    window.location.reload();
  }
  historyRouteActive = nextHistoryRouteActive;
});

async function startApp(): Promise<void> {
  if (document.readyState === "loading") {
    await new Promise<void>((resolve) => {
      document.addEventListener("DOMContentLoaded", () => resolve(), { once: true });
    });
  }

  overlayHost = createOverlayHost(document.body, currentUiScale());
  const page = eh.extractPageType();
  const onViewportResize = () => {
    updateUiScale();
    updateColumnsLayout();
  };
  window.addEventListener("resize", onViewportResize, { passive: true });

  createRoot(() => {
    installSettingsMenu();
    injectPage(page);
  });
  dispatchReady();
}

void startApp().catch((error) => {
  console.error("[ehpeek] App startup failed", error);
});
