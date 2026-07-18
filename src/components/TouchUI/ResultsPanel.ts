import type { PageType } from "../../eh";
import * as eh from "../../eh";

export function prepareResultsPanel(page: PageType): eh.TouchFavoritesCategorySelectInfo | null {
  if (page.type === "favorites") {
    return eh.prepareTouchFavoritesPage();
  } else if (page.type === "search") {
    eh.prepareTouchSearchResultsPage();
  }

  return null;
}

export function resetTouchUiPage(): void {
  eh.resetTouchPageLayout();
}
