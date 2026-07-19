import { createSignal, onCleanup, onMount, Show } from "solid-js";
import * as eh from "../eh";
import type { PageType } from "../eh";
import * as EhSyringe from "../integrations/EhSyringe";
import texts from "../texts.json";
import { normalizeUrl } from "../utils";

const HISTORY_STATE_KEY = "ehpeekSinglePageApp";
const PERSISTENT_SELECTOR =
  "[data-ehpeek-persistent], #eh-syringe-popup-button, #eh-syringe-popup-back, .eh-syringe-lite-auto-complete-list";

type NavigationRequest = {
  body?: FormData;
  method: "GET" | "POST";
  url: string;
};

type NavigationMode = "push" | "pop";
const NAVIGATION_REQUEST_EVENT = "ehpeek:navigation-request";

type AppHistoryState = {
  scrollX: number;
  scrollY: number;
};

export function SinglePage(props: {
  onPageActivate: (page: PageType) => void | Promise<void>;
  onPageDeactivate: () => void;
}) {
  const [loading, setLoading] = createSignal(false);
  const [failedUrl, setFailedUrl] = createSignal<string | null>(null);
  let routeHost!: HTMLDivElement;
  let stagingHost!: HTMLDivElement;
  let navigationController: AbortController | null = null;
  let navigationSequence = 0;
  let scrollFrame: number | null = null;

  const updateHistoryScroll = () => {
    const current = historyState();
    window.history.replaceState(
      {
        ...current,
        [HISTORY_STATE_KEY]: {
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        } satisfies AppHistoryState,
      },
      "",
      window.location.href,
    );
  };

  const scheduleHistoryScrollUpdate = () => {
    if (scrollFrame !== null) {
      return;
    }

    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = null;
      updateHistoryScroll();
    });
  };

  const navigate = async (request: NavigationRequest, mode: NavigationMode, popState?: unknown) => {
    const sequence = ++navigationSequence;
    navigationController?.abort();
    const controller = new AbortController();
    navigationController = controller;
    setFailedUrl(null);
    setLoading(true);
    routeHost.inert = true;
    routeHost.setAttribute("aria-busy", "true");

    try {
      const response = await eh.requestPage(request.url, {
        method: request.method,
        body: request.body,
        signal: controller.signal,
        timeoutMs: null,
      });
      const responseUrl = response.url;
      const page = singlePageRoute(responseUrl);

      if (!page) {
        throw new Error(`Unsupported Single Page App route: ${responseUrl}`);
      }

      const doc = response.document;
      stagingHost.replaceChildren(...importPageContent(doc, responseUrl));
      await EhSyringe.waitForRouteTranslation(stagingHost);

      if (sequence !== navigationSequence || controller.signal.aborted) {
        return;
      }

      props.onPageDeactivate();

      if (mode === "push") {
        updateHistoryScroll();
        window.history.pushState(
          {
            ...historyState(),
            [HISTORY_STATE_KEY]: {
              scrollX: 0,
              scrollY: 0,
            } satisfies AppHistoryState,
          },
          "",
          responseUrl,
        );
      }

      routeHost.replaceChildren(...Array.from(stagingHost.childNodes));
      document.title = doc.title || document.title;
      await props.onPageActivate(page);

      const targetScroll = mode === "pop" ? appHistoryState(popState) : null;
      window.requestAnimationFrame(() => {
        window.scrollTo(targetScroll?.scrollX ?? 0, targetScroll?.scrollY ?? 0);
      });
    } catch (error) {
      if (controller.signal.aborted) {
        return;
      }

      console.error("[ehpeek] Single Page App navigation failed", error);
      setFailedUrl(request.url);
    } finally {
      if (sequence === navigationSequence) {
        navigationController = null;
        stagingHost.replaceChildren();
        routeHost.inert = false;
        routeHost.removeAttribute("aria-busy");
        setLoading(false);
      }
    }
  };

  onMount(() => {
    let disposed = false;
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

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

      const link = navigationLink(event.target);

      if (
        !link ||
        !routeHost.contains(link) ||
        (link.target && link.target !== "_self") ||
        link.hasAttribute("download")
      ) {
        return;
      }

      const url = new URL(link.href, window.location.href);

      if (url.origin !== window.location.origin || !singlePageRoute(url.href)) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      void navigate({ method: "GET", url: url.href }, "push");
    };

    const onSubmit = (event: SubmitEvent) => {
      const form = searchForm(event.target);

      if (!form || !routeHost.contains(form)) {
        return;
      }

      const request = navigationRequestForForm(form, event.submitter);

      if (!request || !singlePageRoute(request.url)) {
        return;
      }

      event.preventDefault();
      void navigate(request, "push");
    };

    const onPopState = (event: PopStateEvent) => {
      const page = singlePageRoute(window.location.href);

      if (!page) {
        window.location.assign(window.location.href);
        return;
      }

      void navigate({ method: "GET", url: window.location.href }, "pop", event.state);
    };

    const onNavigationRequest = (event: Event) => {
      const request = event as CustomEvent<{ url?: unknown }>;
      if (typeof request.detail?.url !== "string") {
        return;
      }

      const url = new URL(request.detail.url, window.location.href);
      if (url.origin !== window.location.origin || !singlePageRoute(url.href)) {
        return;
      }

      event.preventDefault();
      void navigate({ method: "GET", url: url.href }, "push");
    };

    const initialize = async () => {
      await EhSyringe.waitForInitialUi();
      if (disposed) {
        return;
      }

      eh.captureGalleryApiSession();
      preparePageContent(document.body, window.location.href);
      routeHost.replaceChildren(...pageContentNodes());
      updateHistoryScroll();
      document.addEventListener("click", onClick, true);
      document.addEventListener("submit", onSubmit, true);
      document.addEventListener(NAVIGATION_REQUEST_EVENT, onNavigationRequest);
      window.addEventListener("popstate", onPopState);
      window.addEventListener("scroll", scheduleHistoryScrollUpdate, { passive: true });

      const initialPage = singlePageRoute(window.location.href);
      if (initialPage) {
        await props.onPageActivate(initialPage);
      }
    };

    void initialize();

    onCleanup(() => {
      disposed = true;
      navigationController?.abort();
      props.onPageDeactivate();
      window.history.scrollRestoration = previousScrollRestoration;
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
      document.removeEventListener(NAVIGATION_REQUEST_EVENT, onNavigationRequest);
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("scroll", scheduleHistoryScrollUpdate);

      if (scrollFrame !== null) {
        window.cancelAnimationFrame(scrollFrame);
      }
    });
  });

  return (
    <div class="ehpeek-single-page-app contents">
      <div ref={routeHost} class="ehpeek-single-page-route contents" />
      <div ref={stagingHost} class="hidden" aria-hidden="true" inert />
      <Show when={loading()}>
        <div
          class="fixed top-0 left-0 z-overlay h-4px w-full overflow-hidden bg-[var(--color-site-border-subtle)]"
          role="progressbar"
          aria-label={texts.reader.loading}
        >
          <div class="h-full w-1/2 animate-pulse bg-[var(--color-site-accent)]" />
        </div>
      </Show>
      <Show when={failedUrl()} keyed>
        {(url) => (
          <aside
            class="fixed right-md bottom-md z-overlay flex max-w-[min(420px,calc(100vw-24px))] flex-col gap-md rounded-md border ehp-color-site-border p-lg ehp-color-site-elevated ehp-color-site-text font-sans"
            role="alert"
          >
            <div class="textsize-md font-700">{texts.singlePageApp.loadFailed}</div>
            <div class="flex flex-wrap justify-end gap-sm">
              <button
                type="button"
                class="min-h-md rounded-md border ehp-color-site-border bg-transparent px-md ehp-color-site-text textsize-md font-inherit"
                onClick={() => setFailedUrl(null)}
              >
                {texts.singlePageApp.dismiss}
              </button>
              <a
                href={url}
                data-ehpeek-single-page-bypass
                class="inline-flex min-h-md items-center rounded-md border border-[var(--color-site-accent)] bg-[var(--color-site-accent)] px-md text-[var(--color-background)] no-underline textsize-md font-700"
              >
                {texts.singlePageApp.openOriginal}
              </a>
            </div>
          </aside>
        )}
      </Show>
    </div>
  );
}

export function supportsSinglePageRoute(url: string): boolean {
  return singlePageRoute(url) !== null;
}

function singlePageRoute(url: string): PageType | null {
  const page = eh.extractPageType(url);

  if (page.type === "search" || page.type === "favorites") {
    return page;
  }

  if (page.type !== "gallery") {
    return null;
  }

  try {
    const parsed = new URL(url, window.location.href);
    let unsupportedParameter = false;
    parsed.searchParams.forEach((_value, key) => {
      unsupportedParameter ||= key !== "p";
    });
    const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
    let unsupportedHash = false;
    hash.forEach((_value, key) => {
      unsupportedHash ||= key !== "peek_page";
    });
    return unsupportedParameter || unsupportedHash ? null : page;
  } catch {
    return null;
  }
}

function pageContentNodes(root: HTMLElement = document.body): Node[] {
  return Array.from(root.childNodes).filter(
    (node) => !(node instanceof Element && node.matches(PERSISTENT_SELECTOR)),
  );
}

function preparePageContent(root: ParentNode, baseUrl: string): void {
  eh.captureGalleryApiSession(root, baseUrl);
  preserveGalleryData(root, baseUrl);
  preserveGalleryUtilityLinks(root, baseUrl);
  preserveFileSearchAction(root, baseUrl);

  for (const form of Array.from(root.querySelectorAll<HTMLFormElement>("form"))) {
    const action = form.getAttribute("action") ?? "";
    form.action = normalizeUrl(action || baseUrl, baseUrl);
  }

  for (const element of Array.from(root.querySelectorAll<HTMLElement>("*"))) {
    for (const attribute of Array.from(element.attributes)) {
      if (/^on/i.test(attribute.name)) {
        preserveControlRole(element, attribute.value);
        element.removeAttribute(attribute.name);
      }
    }
  }

  for (const script of Array.from(root.querySelectorAll<HTMLScriptElement>("script"))) {
    script.remove();
  }
}

function importPageContent(doc: Document, baseUrl: string): Node[] {
  absolutizeDocumentUrls(doc, baseUrl);
  preparePageContent(doc, baseUrl);
  return Array.from(doc.body.childNodes, (node) => document.importNode(node, true));
}

function navigationLink(target: EventTarget | null): HTMLAnchorElement | null {
  const link = target instanceof Element ? target.closest<HTMLAnchorElement>("a[href]") : null;
  return link instanceof HTMLAnchorElement && !link.hasAttribute("data-ehpeek-single-page-bypass") ? link : null;
}

function searchForm(target: EventTarget | null): HTMLFormElement | null {
  const form = target instanceof HTMLFormElement ? target : null;
  return form && (form.matches("#searchbox form, #fsdiv form") || form.querySelector("[name='f_search']"))
    ? form
    : null;
}

function preserveFileSearchAction(root: ParentNode, baseUrl: string): void {
  const fileSearch = root.querySelector<HTMLElement>("#fsdiv");
  const script = Array.from(root.querySelectorAll<HTMLScriptElement>("script"), (item) => item.textContent ?? "")
    .find((text) => text.includes("ulhost")) ?? "";
  const uploadBase = script.match(/\bulhost\s*=\s*["']([^"']+)["']/)?.[1];

  if (fileSearch && uploadBase) {
    fileSearch.dataset.ehpeekFileSearchAction = new URL("image_lookup.php", normalizeUrl(uploadBase, baseUrl)).href;
  }
}

function preserveGalleryUtilityLinks(root: ParentNode, baseUrl: string): void {
  for (const link of Array.from(root.querySelectorAll<HTMLAnchorElement>("#gd5 a[onclick]"))) {
    const popupUrl = (link.getAttribute("onclick") ?? "").match(/\bpopUp\(['"]([^'"]+)['"]/)?.[1];
    if (!popupUrl) {
      continue;
    }

    link.href = new URL(popupUrl, baseUrl).href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.dataset.ehpeekGalleryUtility = "true";
  }
}

function preserveGalleryData(root: ParentNode, baseUrl: string): void {
  const scripts = Array.from(root.querySelectorAll<HTMLScriptElement>("script"), (item) => item.textContent ?? "");
  const ratingScript = scripts.find((text) => text.includes("display_rating"));
  const rating = ratingScript ? scriptNumberValue(ratingScript, "display_rating") : null;
  const ratingImage = root.querySelector<HTMLElement>("#rating_image");
  if (ratingImage && rating !== null) {
    ratingImage.dataset.ehpeekRating = String(rating);
  }

  const gallery = new URL(baseUrl).pathname.match(/^\/g\/(\d+)\/([^/]+)/i);
  const favoriteScript = scripts.find((text) => text.includes("popbase") && text.includes("addfav"));
  const favoriteMatch = favoriteScript?.match(
    /popbase\s*=\s*base_url\s*\+\s*"gallerypopups\.php\?gid=(\d+)&t=([^"&]+)&act="/,
  );
  const favorite = root.querySelector<HTMLElement>("#fav");
  if (favorite && gallery && favoriteMatch?.[1] === gallery[1] && favoriteMatch[2] === gallery[2]) {
    favorite.dataset.ehpeekActionUrl = `/gallerypopups.php?gid=${favoriteMatch[1]}&t=${favoriteMatch[2]}&act=addfav`;
  }
}

function preserveControlRole(element: HTMLElement, handler: string): void {
  if (handler.includes("toggle_advsearch")) {
    element.dataset.ehpeekSearchAdvancedToggle = "true";
  }
  if (handler.includes("toggle_filesearch")) {
    element.dataset.ehpeekSearchFileToggle = "true";
  }
  if (handler.includes("inline_set=dm_")) {
    element.dataset.ehpeekGridModeSource = "true";
  }
}

function absolutizeDocumentUrls(doc: Document, baseUrl: string): void {
  const attributes: Array<[string, string]> = [
    ["a[href]", "href"],
    ["area[href]", "href"],
    ["form[action]", "action"],
    ["img[src]", "src"],
    ["input[src]", "src"],
    ["script[src]", "src"],
    ["source[src]", "src"],
  ];

  for (const [selector, attribute] of attributes) {
    for (const element of Array.from(doc.querySelectorAll<HTMLElement>(selector))) {
      const value = element.getAttribute(attribute);
      if (!value || value.startsWith("#") || /^(?:data|javascript|mailto):/i.test(value)) {
        continue;
      }
      element.setAttribute(attribute, normalizeUrl(value, baseUrl));
    }
  }
}

function scriptNumberValue(script: string, name: string): number | null {
  const match = script.match(new RegExp(`\\b(?:var\\s+)?${name}\\s*=\\s*(-?\\d+(?:\\.\\d+)?)`));
  if (!match) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function navigationRequestForForm(form: HTMLFormElement, submitter: HTMLElement | null): NavigationRequest | null {
  const method = form.method.toUpperCase();

  if (method !== "GET" && method !== "POST") {
    return null;
  }

  const data = new FormData(form, submitter);
  const url = new URL(form.action || window.location.href, window.location.href);

  if (method === "GET") {
    url.search = "";
    url.hash = "";
    data.forEach((value, key) => {
      if (typeof value === "string") {
        url.searchParams.append(key, value);
      }
    });

    return { method, url: url.href };
  }

  return { body: data, method, url: url.href };
}

function historyState(): Record<string, unknown> {
  const value = window.history.state;
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function appHistoryState(value: unknown): AppHistoryState | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const state = (value as Record<string, unknown>)[HISTORY_STATE_KEY];

  if (!state || typeof state !== "object") {
    return null;
  }

  const scrollX = Number((state as Record<string, unknown>).scrollX);
  const scrollY = Number((state as Record<string, unknown>).scrollY);

  return Number.isFinite(scrollX) && Number.isFinite(scrollY) ? { scrollX, scrollY } : null;
}
