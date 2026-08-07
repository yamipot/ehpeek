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
  let navigationLoading = false;

  const swipeUrl = (direction: PageSwipeDirection): string | null =>
    direction === "next" ? source.data.nextUrl : source.data.previousUrl;

  const navigate = async (url: string): Promise<void> => {
    if (navigationLoading) {
      return;
    }

    navigationLoading = true;
    setLoading(true);
    source.handle.updateSearchLoading(true);
    try {
      await source.handle.loadSearchPage(url);
      const nextSource = eh.manageSearchResults();
      if (!nextSource) {
        throw new Error(texts.errors.searchPageContentNotFound);
      }
      source = nextSource;
      props.onPageChange(source);
      source.handle.ensureSearchSwipeInput();
      setGestureTarget(source.elems.resultList.Component());
      source.handle.scrollSearchPageToInput();
    } catch (error) {
      console.error("[ehpeek]", error);
    } finally {
      navigationLoading = false;
      setLoading(false);
      source.handle.updateSearchLoading(false);
    }
  };

  const onNavigation = (url: string) => {
    void navigate(url);
  };

  onMount(() => {
    source.handle.ensureSearchSwipeInput();
    setGestureTarget(source.elems.resultList.Component());
    onCleanup(source.handle.interceptSearchNavigation(onNavigation));
  });

  return (
    <>
      <PageSwipe
        canNavigate={(direction) => Boolean(swipeUrl(direction))}
        onNavigate={(direction) => {
          const url = swipeUrl(direction);
          if (url) {
            void navigate(url);
          }
        }}
        target={gestureTarget}
      />
      <LoadingOverlay label={texts.common.status.loading} visible={loading()} />
    </>
  );
}
