import type {
  OrientationSettings,
  ReaderSettings,
  SettingCallbacks,
} from "@ehpeek/reader/settings";
import { state } from "../state";

type ControlsStore = typeof state.reader.portraitControls;
function readControls(store: ControlsStore): OrientationSettings {
  return {
    navigationMode: store.navigationMode.value,
    scrollDirection: store.scrollDirection.value,
    pagedDirection: store.pagedDirection.value,
    pageLayout: store.pageLayout.value,
    rightTapAction: store.rightTapAction.value,
  };
}
function saveControls(store: ControlsStore, value: OrientationSettings): void {
  if (store.navigationMode.value !== value.navigationMode)
    store.navigationMode.set(value.navigationMode);
  if (store.scrollDirection.value !== value.scrollDirection)
    store.scrollDirection.set(value.scrollDirection);
  if (store.pagedDirection.value !== value.pagedDirection)
    store.pagedDirection.set(value.pagedDirection);
  if (store.pageLayout.value !== value.pageLayout)
    store.pageLayout.set(value.pageLayout);
  if (store.rightTapAction.value !== value.rightTapAction)
    store.rightTapAction.set(value.rightTapAction);
}
export function readerSettings(): Partial<ReaderSettings> {
  return {
    portraitControls: readControls(state.reader.portraitControls),
    landscapeControls: readControls(state.reader.landscapeControls),
    scrollTtbScale: state.reader.scrollTtbScale.value,
    scrollHorizontalScale: state.reader.scrollHorizontalScale.value,
    leftHandedControls: state.app.leftHandedControls.value,
    previewDirection: state.gallery.scrollPreviewDirection.value,
  };
}
export function readerSettingCallbacks(
  onEmbeddedDirectionChange: SettingCallbacks["embeddedPreviewDirection"],
): SettingCallbacks {
  return {
    portraitControls: (controls) =>
      saveControls(state.reader.portraitControls, controls),
    landscapeControls: (controls) =>
      saveControls(state.reader.landscapeControls, controls),
    scrollTtbScale: (scale) => state.reader.scrollTtbScale.set(scale),
    scrollHorizontalScale: (scale) =>
      state.reader.scrollHorizontalScale.set(scale),
    previewDirection: (direction) =>
      state.gallery.scrollPreviewDirection.set(direction),
    embeddedPreviewDirection: onEmbeddedDirectionChange,
  };
}
