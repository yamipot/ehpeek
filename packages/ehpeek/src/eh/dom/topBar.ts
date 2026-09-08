import {
  createAnchor,
  createManagedElement,
  DomNode,
  type ManagedDomElements,
  type ManagedDomNode,
} from "./core";
import { domClass } from "./domClass";

/** Creates the Settings mount beside the original page navigation or gallery header. */
export function manageSettingsMenuMount() {
  const page = DomNode.from(document);
  const source = page.use(domClass.topBar);
  const thumbnailContainer = page.use(domClass.gallery).preview.thumbs.one();
  const titleContainer = source.galleryTitle.one();
  const topNav = source.navigation.one();
  const anchor = thumbnailContainer ?? titleContainer;

  if (topNav) {
    const item = createManagedElement("div");
    topNav.inplace().append(item);
    return item;
  }

  if (!anchor?.parent()) {
    return null;
  }

  const item = createManagedElement("div").replaceClasses("text-right");
  const managedAnchor = anchor.inplace();

  if (thumbnailContainer) {
    managedAnchor.before(item);
  } else {
    managedAnchor.after(item);
  }

  return item;
}

/** Manages the original top navigation for the TouchUI TopBar feature. */
export function manageTopBar() {
  const mount = createAnchor("top-bar");
  if (!mount) {
    return null;
  }

  const page = DomNode.from(document);
  const source = page.use(domClass.topBar);
  const original = source.navigation.one();
  const links = source.navigation.links.all();
  if (!original || links.length === 0) {
    return null;
  }

  const data = {
    favoritesHref: new URL("/favorites.php", window.location.href).href,
    homeHref: links[0]?.attribute("href") ?? "/",
  };

  const elems = {
    mount,
  } satisfies ManagedDomElements;
  const originalNavigation = original.inplace(domClass.topBar.navigation.apply)
    .apply("hide")
    .setAttributes({ "aria-hidden": "true" });
  let navigationTargets: ManagedDomNode<HTMLAnchorElement>[] = [];
  originalNavigation.before(elems.mount);

  const handle = {
    /** Reads the live original navigation only when TouchUI opens its menu. */
    readNavigationItems(): TopBarNavigationItem[] {
      const current = source.navigation.links.requery();
      navigationTargets = current.map((link) => link.inplace());
      return current.map((link, index) => ({
        href: link.attribute("href") ?? "#",
        index,
        label: link.text(),
        target: link.attribute("target"),
      }));
    },
    /** Delegates activation to the retained original node, including third-party handlers. */
    activateNavigationItem(index: number): void {
      navigationTargets[index]?.click();
    },
  };

  return {
    data,
    elems,
    handle,
  };
}

export type TopBarNavigationItem = {
  href: string;
  index: number;
  label: string;
  target: string | null;
};

export type TopBarDom = NonNullable<ReturnType<typeof manageTopBar>>;
