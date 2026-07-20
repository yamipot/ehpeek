import { createSignal, onCleanup, onMount, Show } from "solid-js";
import * as eh from "../eh";
import type { PageType } from "../eh";
import texts from "../texts.json";

const HISTORY_STATE_KEY = "ehpeekSinglePageApp";

type NavigationMode = "push" | "pop";

type AppHistoryState = {
  scrollX: number;
  scrollY: number;
};

export type SinglePageActions = {
  navigate: (url: string) => boolean;
};

export function SinglePage(props: {
  actionsRef: (actions: SinglePageActions) => void;
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
  let disconnectPageNavigation: (() => void) | null = null;

  const loadPage = async (request: eh.NavigationRequest, signal: AbortSignal) => {
    const response = await eh.requestPage(request.url, {
      method: request.method,
      body: request.body,
      signal,
      timeoutMs: null,
    });
    const page = eh.singlePageRoute(response.url);
    if (!page) {
      throw new Error(`Unsupported Single Page App route: ${response.url}`);
    }
    return {
      page,
      source: eh.managePageContent(response.document, response.url),
    };
  };

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

  const navigate = async (request: eh.NavigationRequest, mode: NavigationMode, popState?: unknown) => {
    const sequence = ++navigationSequence;
    navigationController?.abort();
    const controller = new AbortController();
    navigationController = controller;
    setFailedUrl(null);
    setLoading(true);
    routeHost.inert = true;
    routeHost.setAttribute("aria-busy", "true");

    try {
      const next = await loadPage(request, controller.signal);
      const nextSource = next.source;
      nextSource.handle.mountPageContent(stagingHost);
      await eh.EhSyringe.waitForRouteTranslation(stagingHost);

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
          next.page.url,
        );
      }

      nextSource.handle.mountPageContent(routeHost);
      document.title = nextSource.data.title || document.title;
      await props.onPageActivate(next.page);

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

  const navigateUrl = (value: string): boolean => {
    const url = new URL(value, window.location.href);
    if (!eh.isSameOriginUrl(url.href) || !eh.singlePageRoute(url.href)) {
      return false;
    }

    void navigate({ method: "GET", url: url.href }, "push");
    return true;
  };

  onMount(() => {
    let disposed = false;
    const previousScrollRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    const onPopState = (event: PopStateEvent) => {
      if (!eh.singlePageRoute(window.location.href)) {
        window.location.assign(window.location.href);
        return;
      }

      void navigate({ method: "GET", url: window.location.href }, "pop", event.state);
    };

    const initialize = async () => {
      await eh.EhSyringe.waitForInitialUi();
      if (disposed) {
        return;
      }

      const page = eh.singlePageRoute(window.location.href);
      if (!page) {
        return;
      }
      const pageSource = eh.managePageContent();
      pageSource.handle.mountPageContent(routeHost);
      const onPageNavigation = (request: eh.NavigationRequest) => {
        void navigate(request, "push");
      };
      disconnectPageNavigation = pageSource.handle.interceptSinglePageNavigation(
        routeHost,
        onPageNavigation,
      );
      updateHistoryScroll();
      window.addEventListener("popstate", onPopState);
      window.addEventListener("scroll", scheduleHistoryScrollUpdate, { passive: true });

      await props.onPageActivate(page);
    };

    props.actionsRef({ navigate: navigateUrl });
    void initialize();

    onCleanup(() => {
      disposed = true;
      navigationController?.abort();
      disconnectPageNavigation?.();
      props.onPageDeactivate();
      window.history.scrollRestoration = previousScrollRestoration;
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
