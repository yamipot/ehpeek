import { createAnchor, DomNode, type ManagedDomElements } from "./core";

/** Reads and takes ownership of E-H's navigation row for TouchTopBar. */
export function topBar(
  reference: { menuItemClassName: string },
  root: ParentNode = document,
) {
  const mount = createAnchor("top-bar");
  if (!mount) {
    return null;
  }

  const page = DomNode.from(root);
  const original = page.one<HTMLElement>("#nb");
  const host = original?.parent();
  const links = original?.all<HTMLAnchorElement>("a[href]") ?? [];
  if (!original || !host || links.length === 0) {
    return null;
  }
  if (!original.manageable() || links.some((link) => !link.manageable())) {
    return null;
  }

  const data = {
    available: true,
    favoritesHref: new URL("/favorites.php", window.location.href).href,
    homeHref: links[0]?.attribute("href") ?? "/",
  };

  const navItems = links
    .map((link) => link.clone())
    .filter((item) => item !== null);
  const originalElem = original.inplace();
  if (!originalElem || navItems.length !== links.length) {
    return null;
  }
  navItems.forEach((item) =>
    item.transform({
      attributes: { remove: ["id"] },
      classes: { replace: reference.menuItemClassName },
      styles: { remove: "all" },
    }),
  );
  originalElem.replaceWith(mount);

  return {
    data,
    elems: { mount, navItems } satisfies ManagedDomElements,
  };
}
