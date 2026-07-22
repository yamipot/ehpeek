import type { GalleryTitlePreference } from "../../state";
import { DomNode } from "./core";
import { domClass } from "./domClass";

/** Extracts E-H's persisted Gallery Name Display choice from User Settings. */
export function extractGalleryTitlePreference(): GalleryTitlePreference | null {
  const page = DomNode.from(document);
  const source = page.use(domClass.settings);
  const japaneseTitle = source.titleJapanese.one();
  const defaultTitle = source.titleDefault.one();

  if (japaneseTitle?.checked()) {
    return "sub";
  }
  return defaultTitle?.checked() ? "main" : null;
}
