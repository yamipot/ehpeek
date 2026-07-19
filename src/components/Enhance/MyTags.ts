import * as eh from "../../eh";
import type { MyTagsPageData } from "../../eh";
import { state, type MyTagAppearance } from "../../state";

class MyTagsProvider {
  async load(tagSet?: string): Promise<MyTagsPageData | null> {
    const url = new URL("/mytags", window.location.origin);
    if (tagSet) {
      url.searchParams.set("tagset", tagSet);
    }
    const response = await eh.requestPage(url.href);

    if (!eh.isSameOriginUrl(response.url)) {
      throw new Error("My Tags page is unavailable");
    }

    return eh.extractMyTagsPageData(response.document, tagSet);
  }
}

const provider = new MyTagsProvider();

export async function loadMyTagAppearances(): Promise<MyTagAppearance[] | null> {
  return state.gallery.myTagAppearances.stored()
    ? state.gallery.myTagAppearances.reload()
    : await refreshMyTags();
}

export async function refreshMyTags(initialPage?: MyTagsPageData): Promise<MyTagAppearance[] | null> {
  try {
    const initialData = initialPage ?? await provider.load();
    if (!initialData) {
      return null;
    }

    const options = initialData.options;
    state.gallery.myTagSets.set(options);
    const pages = options.length > 0
      ? await Promise.all(options.map(async (option) => {
          if (option.selected) {
            return initialData;
          }
          return provider.load(option.value);
        }))
      : [initialData];
    const appearances = pages.flatMap((page) => page?.enabled ? page.appearances : []);
    const unique = Array.from(new Map(appearances.map((appearance) => [appearance.name, appearance])).values());
    state.gallery.myTagAppearances.set(unique);
    return unique;
  } catch (error) {
    console.error("[ehpeek] Could not load My Tags", error);
    return null;
  }
}
