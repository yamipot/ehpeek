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

  const navItems = links.map((link) => link.clone());
  const originalElem = original.inplace();
  originalElem.replaceWith(mount);

  const handle = {
    /** Normalizes cloned original links for EhPeek's icon-based TopBar. */
    transformNavItems(className: string) {
      navItems.forEach((item) =>
        item.transform({
          attributes: { remove: ["id"] },
          classes: { replace: className },
          styles: { remove: "all" },
        }),
      );
    },
  };

  return {
    data,
    elems: { mount, navItems } satisfies ManagedDomElements,
    handle,
  };
}

export type TopBarDom = NonNullable<ReturnType<typeof manageTopBar>>;
