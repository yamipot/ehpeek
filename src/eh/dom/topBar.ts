import {
  createAnchor,
  createManagedElement,
  DomNode,
  type ManagedDomElements,
} from "./core";

/** Creates the Settings mount beside the original page navigation or gallery header. */
export function manageSettingsMenuMount() {
  const page = DomNode.from(document);
  const thumbnailContainer = page.one<HTMLElement>("#gdt");
  const titleContainer = page.one<HTMLElement>("#gd2, h1");
  const topNav = page.one<HTMLElement>("#nb");
  const anchor = thumbnailContainer ?? titleContainer;

  if (topNav) {
    const item = createManagedElement("div");
    topNav.inplace().append(item);
    return item;
  }

  if (!anchor?.parent()) {
    return null;
  }

  const item = createManagedElement("div");
  item.styles({ "text-align": "right" });
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
  const original = page.one<HTMLElement>("#nb");
  const links = original?.all<HTMLAnchorElement>("a[href]") ?? [];
  if (!original || links.length === 0) {
    return null;
  }

  const data = {
    favoritesHref: new URL("/favorites.php", window.location.href).href,
    homeHref: links[0]?.attribute("href") ?? "/",
  };

  const elems = {
    mount,
    navItems: links.map((link) => link.move()),
  } satisfies ManagedDomElements;
  original.inplace().replaceWith(elems.mount);

  const handle = {
    /** Normalizes original links moved into EhPeek's icon-based TopBar. */
    updateNavItemVisual(className: string) {
      elems.navItems.forEach((item) =>
        item.removeAttributes("id").replaceClasses(className).removeAllStyles(),
      );
    },
  };

  return {
    data,
    elems,
    handle,
  };
}

export type TopBarDom = NonNullable<ReturnType<typeof manageTopBar>>;
