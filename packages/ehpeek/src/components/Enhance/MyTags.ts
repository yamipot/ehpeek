import * as eh from "../../eh";
import type { MyTagsPageData } from "../../eh";
import { state, type MyTagAppearance } from "../../state";

async function loadMyTagsPage(tagSet?: string): Promise<MyTagsPageData> {
  const url = new URL("/mytags", window.location.origin);
  if (tagSet) {
    url.searchParams.set("tagset", tagSet);
  }
  const response = await eh.requestPage(url.href);
  return eh.extractMyTagsPageData(response.document, tagSet);
}

export function loadMyTagAppearances(): MyTagAppearance[] | null {
  return state.gallery.myTags.value && state.gallery.myTagAppearances.stored()
    ? state.gallery.myTagAppearances.reload()
    : null;
}

export async function refreshMyTags(initialPage?: MyTagsPageData): Promise<MyTagAppearance[] | null> {
  if (!state.gallery.myTags.value) {
    return null;
  }
  try {
    const initialData = initialPage ?? await loadMyTagsPage();
    const options = initialData.options;
    state.gallery.myTagSets.set(options);
    const pages = options.length > 0
      ? await Promise.all(options.map(async (option) => {
          if (option.selected) {
            return initialData;
          }
          return loadMyTagsPage(option.value);
        }))
      : [initialData];
    const appearances = pages.flatMap((page) => page.enabled ? page.appearances : []);
    const unique = Array.from(new Map(appearances.map((appearance) => [appearance.name, appearance])).values());
    state.gallery.myTagAppearances.set(unique);
    return unique;
  } catch (error) {
    console.error("[ehpeek] Could not load My Tags", error);
    return null;
  }
}
