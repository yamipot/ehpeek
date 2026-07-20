import { normalizeUrl } from "../../utils";
import { galleryIdentityFromUrl, isSameOriginUrl, singlePageRoute } from "../url";
import { manageGalleryApiSession } from "./gallery";
import { DomNode, type ManagedDomElements } from "./core";

const PERSISTENT_SELECTOR =
  "[data-ehpeek-persistent], #eh-syringe-popup-button, #eh-syringe-popup-back, .eh-syringe-lite-auto-complete-list";

export type NavigationRequest = {
  body?: FormData;
  method: "GET" | "POST";
  url: string;
};

/** Owns and sanitizes one original E-H document for the SinglePage route lifecycle. */
export function managePageContent(
  root: Document | HTMLElement = document,
  baseUrl = window.location.href,
) {
  const documentSource = DomNode.from(root);
  const container = root instanceof Document ? DomNode.from(root.body) : DomNode.from(root);
  const persistent = (node: DomNode<HTMLElement>) =>
    node.matches(PERSISTENT_SELECTOR) || node.closest(PERSISTENT_SELECTOR) !== null;
  const scriptSources = container.all<HTMLScriptElement>("script").filter((script) => !persistent(script));
  const scriptTexts = scriptSources.map((script) => script.text());
  const sources = container.all<HTMLElement>("*").filter((node) => !persistent(node));
  const contentSources = container.children().filter((node) => !persistent(node));

  manageGalleryApiSession(root, baseUrl);

  const absoluteAttributes: Array<[string, string]> = [
    ["a[href]", "href"],
    ["area[href]", "href"],
    ["form[action]", "action"],
    ["img[src]", "src"],
    ["input[src]", "src"],
    ["source[src]", "src"],
  ];
  for (const [selector, attribute] of absoluteAttributes) {
    for (const source of container.all<HTMLElement>(selector).filter((node) => !persistent(node))) {
      const value = source.attribute(attribute);
      if (!value || value.startsWith("#") || /^(?:data|javascript|mailto):/i.test(value)) {
        continue;
      }
      source.inplace().attribute(attribute, normalizeUrl(value, baseUrl));
    }
  }

  const fileSearch = container.one<HTMLElement>("#fsdiv");
  const uploadScript = scriptTexts.find((text) => text.includes("ulhost")) ?? "";
  const uploadBase = uploadScript.match(/\bulhost\s*=\s*["']([^"']+)["']/)?.[1];
  if (fileSearch && uploadBase) {
    fileSearch.inplace().attribute(
      "data-ehpeek-file-search-action",
      new URL("image_lookup.php", normalizeUrl(uploadBase, baseUrl)).href,
    );
  }

  for (const source of container.all<HTMLAnchorElement>("#gd5 a[onclick]")) {
    const popupUrl = (source.attribute("onclick") ?? "").match(/\bpopUp\(['"]([^'"]+)['"]/)?.[1];
    if (!popupUrl) {
      continue;
    }
    source.inplace().transform({
      attributes: {
        set: {
          href: new URL(popupUrl, baseUrl).href,
          rel: "noopener noreferrer",
          target: "_blank",
        },
      },
    });
  }

  const ratingScript = scriptTexts.find((text) => text.includes("display_rating"));
  const rating = ratingScript ? scriptNumberValue(ratingScript, "display_rating") : null;
  const ratingImage = container.one<HTMLElement>("#rating_image");
  if (ratingImage && rating !== null) {
    ratingImage.inplace().attribute("data-ehpeek-rating", String(rating));
  }

  const gallery = galleryIdentityFromUrl(baseUrl);
  const favoriteScript = scriptTexts.find((text) => text.includes("popbase") && text.includes("addfav"));
  const favoriteMatch = favoriteScript?.match(
    /popbase\s*=\s*base_url\s*\+\s*"gallerypopups\.php\?gid=(\d+)&t=([^"&]+)&act="/,
  );
  const favorite = container.one<HTMLElement>("#fav");
  if (
    favorite &&
    gallery &&
    Number(favoriteMatch?.[1]) === gallery.galleryId &&
    favoriteMatch?.[2] === gallery.token
  ) {
    favorite.inplace().attribute(
      "data-ehpeek-action-url",
      `/gallerypopups.php?gid=${favoriteMatch[1]}&t=${favoriteMatch[2]}&act=addfav`,
    );
  }

  for (const source of sources) {
    const managedSource = source.inplace();
    const inlineAttributes = source.attributeNames().filter((name) => /^on/i.test(name));
    const handlers = inlineAttributes.map((name) => source.attribute(name) ?? "");
    const attributes: Record<string, string> = {};
    if (handlers.some((handler) => handler.includes("toggle_advsearch"))) {
      attributes["data-ehpeek-search-advanced-toggle"] = "true";
    }
    if (handlers.some((handler) => handler.includes("toggle_filesearch"))) {
      attributes["data-ehpeek-search-file-toggle"] = "true";
    }
    if (handlers.some((handler) => handler.includes("inline_set=dm_"))) {
      attributes["data-ehpeek-grid-mode-source"] = "true";
    }
    managedSource.transform({
      attributes: {
        remove: inlineAttributes,
        set: attributes,
      },
    });
  }

  scriptSources.forEach((script) => script.inplace().remove());
  const content = contentSources.map((source) => {
    const node = source.inplace();
    node.remove();
    return node;
  });
  const elems = { content } satisfies ManagedDomElements;
  const data = {
    title: documentSource.one<HTMLTitleElement>("title")?.text() ?? "",
  };
  const navigationRequest = (event: MouseEvent | SubmitEvent): NavigationRequest | null => {
    if (event instanceof MouseEvent) {
      const link = event.target instanceof Element
        ? DomNode.from(event.target).closest<HTMLAnchorElement>("a[href]")
        : null;
      if (
        !link ||
        link.hasAttribute("data-ehpeek-single-page-bypass") ||
        (link.attribute("target") && link.attribute("target") !== "_self") ||
        link.hasAttribute("download")
      ) {
        return null;
      }
      return {
        method: "GET",
        url: new URL(link.attribute("href") ?? "", window.location.href).href,
      };
    }

    const form = event.target instanceof HTMLFormElement ? DomNode.from(event.target) : null;
    if (!form || (!form.matches("#searchbox form, #fsdiv form") && !form.one("[name='f_search']"))) {
      return null;
    }
    const method = (form.attribute("method") ?? "GET").toUpperCase();
    if (method !== "GET" && method !== "POST") {
      return null;
    }
    const formElement = form.inplace().Component();
    const formData = new FormData(formElement, event.submitter);
    const url = new URL(form.attribute("action") || window.location.href, window.location.href);
    if (method === "GET") {
      url.search = "";
      url.hash = "";
      formData.forEach((value, key) => {
        if (typeof value === "string") {
          url.searchParams.append(key, value);
        }
      });
      return { method, url: url.href };
    }
    return { body: formData, method, url: url.href };
  };
  const handle = {
    /** Intercepts only same-origin routes supported by EhPeek Single Page App. */
    connectNavigation(
      host: HTMLElement,
      onNavigate: (request: NavigationRequest) => void,
    ): () => void {
      const onClick = (event: MouseEvent) => {
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          event.shiftKey
        ) {
          return;
        }
        const request = navigationRequest(event);
        if (!request || !isSameOriginUrl(request.url) || !singlePageRoute(request.url)) {
          return;
        }

        event.preventDefault();
        event.stopImmediatePropagation();
        onNavigate(request);
      };
      const onSubmit = (event: SubmitEvent) => {
        const request = navigationRequest(event);
        if (!request || !isSameOriginUrl(request.url) || !singlePageRoute(request.url)) {
          return;
        }

        event.preventDefault();
        onNavigate(request);
      };

      host.addEventListener("click", onClick, true);
      host.addEventListener("submit", onSubmit, true);
      return () => {
        host.removeEventListener("click", onClick, true);
        host.removeEventListener("submit", onSubmit, true);
      };
    },
    /** Installs the detached response content into Single Page App's active host. */
    mount(host: HTMLElement): void {
      host.replaceChildren(...content.map((node) => node.Component()));
    },
  };

  return { data, elems, handle };
}

function scriptNumberValue(script: string, name: string): number | null {
  const match = script.match(new RegExp(`\\b(?:var\\s+)?${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}
