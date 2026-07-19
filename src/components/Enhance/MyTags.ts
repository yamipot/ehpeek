import * as eh from "../../eh";
import type { MyTagsPageData } from "../../eh";
import { state, type MyTagAppearance } from "../../state";

async function loadMyTagsPage(tagSet?: string): Promise<MyTagsPageData> {
  const url = new URL("/mytags", window.location.origin);
  if (tagSet) {
    url.searchParams.set("tagset", tagSet);
  }
  const response = await eh.requestPage(url.href);
  const data = eh.extractMyTagsPageData(response.document, tagSet);
  if (!data) {
    throw new Error("The My Tags page could not be read.");
  }
  return data;
}

export async function loadMyTagAppearances(): Promise<MyTagAppearance[] | null> {
  return state.gallery.myTagAppearances.stored()
    ? state.gallery.myTagAppearances.reload()
    : await refreshMyTags();
}

export async function refreshMyTags(initialPage?: MyTagsPageData): Promise<MyTagAppearance[] | null> {
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
