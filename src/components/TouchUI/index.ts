import type { PageType } from "../../eh";
import { prepareCommentsPanel } from "./CommentsPanel";
import { prepareGalleryInfoPanel } from "./GalleryInfoPanel";
import { prepareResultsPanel } from "./ResultsPanel";

export { prepareCommentsPanel } from "./CommentsPanel";
export {
  GalleryInfoPanel,
  prepareGalleryInfoPanel,
  TOUCH_GALLERY_INFO_TRANSFORMS,
} from "./GalleryInfoPanel";
export { prepareResultsPanel, resetTouchUiPage } from "./ResultsPanel";
export { FavoritesCategorySelect } from "./FavoritesPanel";
export {
  prepareSearchPanel,
  TOUCH_SEARCH_OPTION_CLASS,
  TouchSearchAction,
  TouchSearchAdvancedToggle,
  TouchSearchCategoryToggle,
  TouchSearchFileToggle,
  TouchSearchPanel,
} from "./SearchPanel";
export { TouchTopBar, TOUCH_TOP_BAR_TRANSFORM } from "./TopBar";

export function prepareTouchGalleryPage(): void {
  prepareGalleryInfoPanel();
  prepareCommentsPanel();
}

export function prepareTouchResultsPage(page: PageType) {
  return prepareResultsPanel(page);
}
