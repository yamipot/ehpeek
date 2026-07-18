import type { PageType } from "../../eh";
import { prepareCommentsPanel } from "./CommentsPanel";
import { prepareGalleryInfoPanel } from "./GalleryInfoPanel";
import { prepareResultsPanel } from "./ResultsPanel";

export { prepareCommentsPanel } from "./CommentsPanel";
export { GalleryInfoPanel, prepareGalleryInfoPanel, TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS } from "./GalleryInfoPanel";
export { prepareResultsPanel, resetTouchUiPage } from "./ResultsPanel";
export {
  prepareSearchPanel,
  TOUCH_SEARCH_OPTION_CLASS,
  TouchSearchAction,
  TouchSearchCategoryToggle,
  TouchSearchPanel,
} from "./SearchPanel";
export { TOUCH_TOP_BAR_MENU_ITEM_CLASS, TouchTopBar } from "./TopBar";

export function prepareTouchGalleryPage(): void {
  prepareGalleryInfoPanel();
  prepareCommentsPanel();
}

export function prepareTouchResultsPage(page: PageType): void {
  prepareResultsPanel(page);
}
