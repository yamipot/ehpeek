import { createSignal, onCleanup, onMount, untrack } from "solid-js";
import * as eh from "../../eh";
import texts from "../../i18n";
import { LoadingOverlay } from "../Widgets/Loading";
import { PageSwipe, type PageSwipeDirection } from "./PageSwipe";

export function EnhanceSearchGrids(props: {
  onPageChange: (source: eh.SearchResultsDom) => void;
  source: eh.SearchResultsDom;
}) {
  const [gestureTarget, setGestureTarget] = createSignal<HTMLElement | null>(null);
  const [loading, setLoading] = createSignal(false);
  let source = untrack(() => props.source);
  let navigationController: AbortController | null = null;

  const swipeUrl = (direction: PageSwipeDirection): string | null =>
    source.handle.readNavigationUrl(direction === "next" ? "next" : "previous");

  const navigate = async (
    url: string,
    options: { pushHistory: boolean; replacePending?: boolean },
  ): Promise<void> => {
    if (navigationController && !options.replacePending) {
      return;
    }

    navigationController?.abort();
    const controller = new AbortController();
    navigationController = controller;
    const loadingSource = source;
    setLoading(true);
    loadingSource.handle.updateSearchLoading(true);
    try {
      await loadingSource.handle.loadSearchPage(url, controller.signal);
      if (controller.signal.aborted) {
        return;
      }
      const nextSource = eh.manageSearchResults();
      if (!nextSource) {
        throw new Error(texts.errors.searchPageContentNotFound);
      }
      if (options.pushHistory) {
        window.history.pushState(window.history.state, "", url);
      }
      source = nextSource;
      props.onPageChange(source);
      source.handle.ensureSearchSwipeInput();
      setGestureTarget(source.elems.resultList.Component());
      source.handle.scrollSearchPageToInput();
    } catch (error) {
      if (!controller.signal.aborted) {
        console.error("[ehpeek]", error);
      }
    } finally {
      loadingSource.handle.updateSearchLoading(false);
      if (navigationController === controller) {
        navigationController = null;
        setLoading(false);
      }
    }
  };

  const onNavigation = (url: string) => {
    void navigate(url, { pushHistory: true });
  };

  onMount(() => {
    const previousScrollRestoration = window.history.scrollRestoration;
    const onHistoryNavigation = () => {
      void navigate(window.location.href, {
        pushHistory: false,
        replacePending: true,
      });
    };

    window.history.scrollRestoration = "manual";
    source.handle.ensureSearchSwipeInput();
    setGestureTarget(source.elems.resultList.Component());
    window.addEventListener("popstate", onHistoryNavigation);
    onCleanup(source.handle.interceptSearchNavigation(onNavigation));
    onCleanup(() => {
      navigationController?.abort();
      window.removeEventListener("popstate", onHistoryNavigation);
      window.history.scrollRestoration = previousScrollRestoration;
    });
  });

  return (
    <>
      <PageSwipe
        canNavigate={(direction) => Boolean(swipeUrl(direction))}
        onNavigate={(direction) => {
          const url = swipeUrl(direction);
          if (url) {
            void navigate(url, { pushHistory: true });
          }
        }}
        target={gestureTarget}
      />
      <LoadingOverlay label={texts.common.status.loading} visible={loading()} />
    </>
  );
}
