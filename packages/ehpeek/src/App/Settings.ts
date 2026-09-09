import { clearBackToTopPositions, state } from "../state";

export function settingsMenuState(defaults = false) {
  const read = <T,>(setting: { defaultValue: T; value: T }): T =>
    defaults ? setting.defaultValue : setting.value;

  return {
    twoColumnsReaderMode: read(state.reader.twoColumnsMode),
    openGalleryInNewTab: read(state.app.openGalleryInNewTab),
    locale: read(state.app.locale),
    readerEnabled: read(state.reader.enabled),
    exitReaderOnFullscreenExit: read(state.reader.exitOnFullscreenExit),
    readerFullscreenEnabled: read(state.reader.fullscreen),
    includeReaderPageInUrl: read(state.reader.includePageInUrl),
    replacePreviewWithScroll: read(state.gallery.replacePreviewWithScroll),
    enhanceThumbsGridsEnabled: read(state.gallery.enhanceThumbs),
    enhanceSearchGridsEnabled: read(state.search.enhance),
    myTagsEnabled: read(state.gallery.myTags),
    readHistoryEnabled: read(state.gallery.readHistory),
    includeUnreadHistoryEnabled: read(state.gallery.includeUnreadHistory),
    searchHistoryEnabled: read(state.search.history),
    touchUiEnabled: read(state.touch.enabled),
    fitToViewport: read(state.touch.fitToViewport),
    portraitUiScale: read(state.app.portraitUiScale),
    landscapeUiScale: read(state.app.landscapeUiScale),
  };
}

export async function applySettingsMenuState(
  next: ReturnType<typeof settingsMenuState>,
): Promise<void> {
  if (!next.touchUiEnabled) {
    await clearBackToTopPositions();
  }
  await Promise.all([
    state.reader.twoColumnsMode.setAsync(next.twoColumnsReaderMode),
    state.app.openGalleryInNewTab.setAsync(next.openGalleryInNewTab),
    state.app.locale.setAsync(next.locale),
    state.reader.enabled.setAsync(next.readerEnabled),
    state.reader.exitOnFullscreenExit.setAsync(next.exitReaderOnFullscreenExit),
    state.reader.fullscreen.setAsync(next.readerFullscreenEnabled),
    state.reader.includePageInUrl.setAsync(next.includeReaderPageInUrl),
    state.gallery.replacePreviewWithScroll.setAsync(next.replacePreviewWithScroll),
    state.gallery.enhanceThumbs.setAsync(next.enhanceThumbsGridsEnabled),
    state.search.enhance.setAsync(next.enhanceSearchGridsEnabled),
    state.gallery.myTags.setAsync(next.myTagsEnabled),
    state.gallery.readHistory.setAsync(next.readHistoryEnabled),
    state.gallery.includeUnreadHistory.setAsync(next.includeUnreadHistoryEnabled),
    state.search.history.setAsync(next.searchHistoryEnabled),
    state.touch.enabled.setAsync(next.touchUiEnabled),
    state.touch.fitToViewport.setAsync(next.fitToViewport),
    state.app.portraitUiScale.setAsync(next.portraitUiScale),
    state.app.landscapeUiScale.setAsync(next.landscapeUiScale),
  ]);
  window.location.reload();
}
