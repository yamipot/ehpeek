import {
  createAnchor,
  createManagedElement,
  DomNode,
  type ManagedDomElements,
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
    navItems: source.navigation.links.moveAll().map((link) =>
      link.apply("layout")),
  } satisfies ManagedDomElements;
  original.inplace().replaceWith(elems.mount);

  return {
    data,
    elems,
  };
}

export type TopBarDom = NonNullable<ReturnType<typeof manageTopBar>>;
