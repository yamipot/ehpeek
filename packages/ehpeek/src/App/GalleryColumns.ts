import { createSignal } from "solid-js";
import { state, GALLERY_COLUMNS_RATIO_DEFAULT, GALLERY_COLUMNS_RATIO_MIN, GALLERY_COLUMNS_RATIO_MAX } from "../state";
import { reportUiError } from "../ui";

function currentColumnsEnabled(): boolean {
  return currentColumnsSetting().value;
}

function currentColumnsSetting() {
  return window.matchMedia("(orientation: landscape)").matches
    ? state.touch.landscapeColumns
    : state.touch.portraitColumns;
}

function currentGalleryColumnsRatio(): number {
  return currentGalleryColumnsRatioSetting().value;
}

function currentGalleryColumnsRatioSetting() {
  return window.matchMedia("(orientation: landscape)").matches
    ? state.touch.landscapeGalleryColumnsRatio
    : state.touch.portraitGalleryColumnsRatio;
}

function currentReaderPreviewColumnsRatio(): number | null {
  return currentReaderPreviewColumnsRatioSetting().value;
}

function currentReaderPreviewColumnsRatioSetting() {
  return window.matchMedia("(orientation: landscape)").matches
    ? state.touch.landscapeReaderPreviewColumnsRatio
    : state.touch.portraitReaderPreviewColumnsRatio;
}

/** Direction-specific preferences and transient drag values belong to one page session. */
export function createGalleryColumns(touchUiEnabled: boolean) {
  const [columnsEnabled, setColumnsEnabled] = createSignal(currentColumnsEnabled());
  const [galleryColumnsRatio, setGalleryColumnsRatio] =
    createSignal(currentGalleryColumnsRatio());
  const [readerPreviewColumnsRatio, setReaderPreviewColumnsRatio] =
    createSignal(currentReaderPreviewColumnsRatio());
  const [readerPreviewModeActive, setReaderPreviewModeActive] = createSignal(false);
  const [galleryColumnsResizeHandleVisible, setGalleryColumnsResizeHandleVisible] =
    createSignal(false);

  function activeGalleryColumnsRatio(): number {
    return readerPreviewModeActive()
      ? readerPreviewColumnsRatio() ?? galleryColumnsRatio()
      : galleryColumnsRatio();
  }

  function updateColumnsLayout(): void {
    if (!touchUiEnabled) {
      return;
    }
    setColumnsEnabled(currentColumnsEnabled());
    setGalleryColumnsRatio(currentGalleryColumnsRatio());
    setReaderPreviewColumnsRatio(currentReaderPreviewColumnsRatio());
  }

  function setCurrentColumnsEnabled(enabled: boolean): void {
    void currentColumnsSetting().setAsync(enabled)
      .then(() => window.location.reload())
      .catch(reportUiError);
  }

  function updateGalleryColumnsRatio(ratio: number): void {
    const normalized = Math.min(
      GALLERY_COLUMNS_RATIO_MAX,
      Math.max(GALLERY_COLUMNS_RATIO_MIN, ratio),
    );
    if (readerPreviewModeActive()) {
      setReaderPreviewColumnsRatio(normalized);
    } else {
      setGalleryColumnsRatio(normalized);
    }
  }

  function persistGalleryColumnsRatio(ratio: number): void {
    if (readerPreviewModeActive()) {
      currentReaderPreviewColumnsRatioSetting().set(ratio);
    } else {
      currentGalleryColumnsRatioSetting().set(ratio);
    }
  }

  function resetGalleryColumnsRatio(): void {
    if (readerPreviewModeActive()) {
      setReaderPreviewColumnsRatio(null);
      currentReaderPreviewColumnsRatioSetting().set(null);
      return;
    }
    updateGalleryColumnsRatio(GALLERY_COLUMNS_RATIO_DEFAULT);
    persistGalleryColumnsRatio(GALLERY_COLUMNS_RATIO_DEFAULT);
  }

  return {
    enabled: columnsEnabled,
    ratio: activeGalleryColumnsRatio,
    resizeHandleVisible: galleryColumnsResizeHandleVisible,
    resetDisabled: () => readerPreviewModeActive()
      ? readerPreviewColumnsRatio() === null
      : galleryColumnsRatio() === GALLERY_COLUMNS_RATIO_DEFAULT,
    setEnabled: setCurrentColumnsEnabled,
    setReaderPreviewActive: setReaderPreviewModeActive,
    showResizeHandle: setGalleryColumnsResizeHandleVisible,
    updateRatio: updateGalleryColumnsRatio,
    commitRatio: persistGalleryColumnsRatio,
    resetRatio: resetGalleryColumnsRatio,
    refreshOrientation: updateColumnsLayout,
  };
}
