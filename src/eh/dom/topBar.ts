import { ehSiteTheme } from "../url";
import {
  createAnchor,
  createManagedElement,
  documentBody,
  documentElement,
  documentHead,
  DomNode,
  type ManagedDomElements,
} from "./core";

/** Installs global styles and owns the persistent Settings mount for the EhPeek App shell. */
export function extractAppShell(styles: { theme: string; uno: string }, touch: boolean) {
  const page = DomNode.from(document);
  documentElement()?.attribute("data-ehpeek-site", ehSiteTheme());
  const installStyle = (id: string, content: string) => {
    if (!content || page.one(`#${id}`)) {
      return;
    }
    const style = createManagedElement("style").attribute("id", id);
    style.setTextUnlessInput(content);
    documentHead()?.append(style);
  };
  installStyle("ehpeek-uno-style", styles.uno);
  installStyle("ehpeek-theme-style", styles.theme);
  if (touch) {
    documentElement()?.attribute("data-ehpeek-touch-ui", "true");
  }
  const settingsMenu = createManagedElement("div").transform({
    attributes: { set: { "data-ehpeek-persistent": "true" } },
    classes: { replace: "fixed inset-0 z-[1150] pointer-events-none" },
  });
  documentBody()?.append(settingsMenu);
  const actions = {
    createMount(className = "", persistent = false) {
      const mount = createManagedElement("div");
      if (className) {
        mount.transform({ classes: { replace: className } });
      }
      if (persistent) {
        mount.attribute("data-ehpeek-persistent", "true");
      }
      documentBody()?.append(mount);
      return mount;
    },
  };
  return { actions, elems: { settingsMenu } };
}

/** Creates the Settings mount beside the original page navigation or gallery header. */
export function extractSettingsMenuMount() {
  const page = DomNode.from(document);
  const thumbnailContainer = page.one<HTMLElement>("#gdt");
  const titleContainer = page.one<HTMLElement>("#gd2, h1");
  const topNav = page.one<HTMLElement>("#nb");
  const anchor = thumbnailContainer ?? titleContainer;
  const item = createManagedElement("div");

  if (topNav) {
    (topNav.owned() ?? topNav.inplace())?.append(item);
    return item;
  }

  if (!anchor?.parent()) {
    return null;
  }

  item.styles({ "text-align": "right" });
  const managedAnchor = anchor.owned() ?? anchor.inplace();

  if (thumbnailContainer) {
    managedAnchor?.before(item);
  } else {
    managedAnchor?.after(item);
  }

  return managedAnchor ? item : null;
}

/** Extracts and owns the original top navigation for the TouchUI TopBar feature. */
export function extractTopBar() {
  const mount = createAnchor("top-bar");
  if (!mount) {
    return null;
  }

  const page = DomNode.from(document);
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
  originalElem.replaceWith(mount);

  const transforms = {
    navItems(className: string) {
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
    transforms,
  };
}

export type TopBarDom = NonNullable<ReturnType<typeof extractTopBar>>;
