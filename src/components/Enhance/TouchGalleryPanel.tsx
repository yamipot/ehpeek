import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import * as eh from "../../eh";
import type { GalleryFavoriteInfo, GalleryFavoriteOption, GalleryInfo, GalleryTagGroup } from "../../eh";
import texts from "../../texts.json";
import { requestText } from "../../utils";
import { Icon } from "../Icon";
import { DomNode, DomNodes } from "./Misc";

export const TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS = "ehpeek-touch-gallery-actions-menu-item block box-border w-full min-h-lg py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline text-21px leading-[1.2]";
const RATING_STAR_INDEXES = [0, 1, 2, 3, 4];

export function TouchGalleryPanel(props: {
  onPrimaryActionMount: (mount: HTMLElement) => void;
  onPrimaryActionUnmount: () => void;
  source: GalleryInfo;
}) {
  const rating = props.source.rating;
  const hasCover = props.source.cover !== null;
  const [ratingValue, setRatingValue] = createSignal(rating?.value ?? 0);
  const [ratingPreview, setRatingPreview] = createSignal<number | null>(null);
  const [backToTopVisible, setBackToTopVisible] = createSignal(false);
  const displayedRating = createMemo(() => ratingPreview() ?? ratingValue());
  const selectedRating = createMemo(() => ratingPreview() ?? selectableRating(ratingValue()));
  const ratingLabel = createMemo(() => ratingPreview() ? `Rate as ${ratingPreview()!.toFixed(1)} stars` : rating?.label ?? "");

  onMount(() => {
    const updateBackToTopVisibility = () => {
      setBackToTopVisible(window.scrollY > Math.max(320, window.innerHeight * 0.5));
    };

    updateBackToTopVisibility();
    window.addEventListener("scroll", updateBackToTopVisibility, { passive: true });

    onCleanup(() => {
      window.removeEventListener("scroll", updateBackToTopVisibility);
    });
  });
  onCleanup(() => props.onPrimaryActionUnmount());

  const submitRating = (value: number) => {
    if (!rating) {
      return;
    }

    eh.setGalleryRating(value);
    setRatingValue(value);
    setRatingPreview(null);
  };

  const handleRatingKeyDown = (event: KeyboardEvent) => {
    if (!rating) {
      return;
    }

    const nextValue = ratingFromKeyboard(event.key, selectedRating());

    if (nextValue !== null) {
      event.preventDefault();
      setRatingPreview(nextValue);
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      submitRating(selectedRating());
    }
  };

  return (
    <section class="ehpeek-touch-gallery flex box-border w-full flex-col mb-md ehp-color-site-text font-sans">
      <div class="ehpeek-touch-gallery-hero relative grid min-h-[clamp(260px,42vh,340px)] pt-lg pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-surface ehp-color-site-text">
        <div
          class={`ehpeek-touch-gallery-summary grid gap-18px items-stretch ${hasCover ? "grid-cols-[minmax(120px,38%)_minmax(0,1fr)]" : "grid-cols-1"}`}
        >
          {hasCover && (
            <div class="ehpeek-touch-gallery-cover flex self-center justify-self-stretch w-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden rounded-3px">
              <DomNode node={props.source.cover} />
            </div>
          )}
          <div class="ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 flex-col items-start gap-8px pt-2px">
            <div class="ehpeek-touch-gallery-heading flex min-w-0 w-full flex-none flex-col gap-sm items-start pb-xs">
              <div class="ehpeek-touch-gallery-title-main line-clamp-4 flex-none overflow-hidden text-[clamp(23px,6.2vw,34px)] font-400 leading-[1.16] text-left break-anywhere">
                {props.source.titleMain}
              </div>
              <div class="ehpeek-touch-gallery-title-sub line-clamp-3 flex-none overflow-hidden opacity-82 text-[clamp(18px,4.8vw,26px)] leading-[1.2] text-left break-anywhere">
                {props.source.titleSub}
              </div>
            </div>
            <div class="ehpeek-touch-gallery-category-row flex w-full flex-none flex-wrap items-center justify-start gap-x-20px gap-y-10px mt-auto pt-md">
              <div
                class="ehpeek-touch-gallery-category max-w-full flex-none overflow-hidden text-ellipsis whitespace-nowrap rounded-xs py-6px px-10px ehp-color-site-page ehp-color-site-accent text-15px font-700 leading-[1.1] uppercase"
                style={props.source.categoryAppearance}
              >
                {props.source.category}
              </div>
              {rating && (
                <div class="ehpeek-touch-gallery-rating flex w-auto min-w-0 flex-none flex-col items-start gap-4px">
                  <div
                    class="ehpeek-touch-gallery-rating-stars relative inline-flex max-w-full overflow-hidden cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"
                    role="slider"
                    tabIndex={0}
                    aria-label="Rate gallery"
                    aria-valuemin={0.5}
                    aria-valuemax={5}
                    aria-valuenow={selectedRating()}
                    aria-valuetext={`${selectedRating().toFixed(1)} stars`}
                    onPointerMove={(event: PointerEvent) => {
                      setRatingPreview(ratingFromPointer(event.clientX, event.currentTarget as HTMLElement));
                    }}
                    onPointerLeave={() => {
                      setRatingPreview(null);
                    }}
                    onClick={(event: MouseEvent) => {
                      if (event.detail > 0) {
                        submitRating(ratingFromPointer(event.clientX, event.currentTarget as HTMLElement));
                      }
                    }}
                    onKeyDown={handleRatingKeyDown}
                    onBlur={() => {
                      setRatingPreview(null);
                    }}
                  >
                    <span class="ehpeek-touch-gallery-rating-stars-empty flex gap-1px text-[rgba(255,255,255,0.25)]" aria-hidden="true">
                      {RATING_STAR_INDEXES.map(() => (
                        <Icon name="star" />
                      ))}
                    </span>
                    <span
                      class="ehpeek-touch-gallery-rating-stars-fill absolute top-0 left-0 flex gap-1px overflow-hidden ehp-color-site-accent"
                      aria-hidden="true"
                      style={{ width: `${(displayedRating() / 5) * 100}%` }}
                    >
                      {RATING_STAR_INDEXES.map(() => (
                        <Icon name="star" filled />
                      ))}
                    </span>
                  </div>
                  <div class="ehpeek-touch-gallery-rating-meta flex max-w-full items-center justify-start gap-6px text-[rgba(255,255,255,0.78)] text-12px leading-[1.15] whitespace-nowrap">
                    <span
                      class="ehpeek-touch-gallery-rating-label min-w-0 overflow-hidden text-ellipsis"
                      aria-live="polite"
                    >
                      {ratingLabel()}
                    </span>
                    {rating.count && (
                      <span class="ehpeek-touch-gallery-rating-count flex-none pl-6px border-0 border-l border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.58)]">
                        {rating.count}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div class="ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-87px mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-visible rounded-xs bg-[var(--color-site-elevated)] shadow-[0_2px_10px_var(--color-shadow-panel)]">
        <TouchGalleryFavoriteButton source={props.source.favorite} />
        <div
          class="ehpeek-touch-gallery-primary-actions flex min-w-0 border-l border-[var(--color-site-border-subtle)]"
          ref={(node) => {
            props.onPrimaryActionMount(node);
          }}
        />
      </div>
      <div class="ehpeek-touch-gallery-content flex flex-col gap-lg pt-xl pr-[max(16px,env(safe-area-inset-right,0px))] pb-lg pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-page ehp-color-site-text">
        <div class="ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-md gap-x-lg items-center text-27px leading-[1.2] text-center">
          {props.source.summary.map((item) => (
            <div class="ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal">
              {item.value}
            </div>
          ))}
          <TouchGalleryActionsMenu actions={props.source.actions} />
        </div>
        {props.source.tagGroups.length > 0 && (
          <div class="ehpeek-touch-gallery-tag-groups flex flex-col gap-md pt-2px">
            {props.source.tagGroups.map((group) => (
              <TouchGalleryTagGroup group={group} />
            ))}
          </div>
        )}
      </div>
      <Show when={backToTopVisible()}>
        <button
          type="button"
          class="ehpeek-back-to-top fixed right-[max(16px,env(safe-area-inset-right,0px))] bottom-[calc(max(16px,env(safe-area-inset-bottom,0px))_+_52px)] z-ui inline-flex w-lg h-lg items-center justify-center rounded-full border ehp-color-site-border bg-[var(--color-site-elevated)] ehp-color-site-accent shadow-[0_4px_14px_var(--color-shadow-floating)] cursor-pointer [touch-action:manipulation] active:scale-96"
          aria-label={texts.reader.backToTop}
          title={texts.reader.backToTop}
          onClick={() => {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        >
          <Icon name="arrow-up" />
        </button>
      </Show>
    </section>
  );
}

function TouchGalleryActionsMenu(props: { actions: HTMLElement[] }) {
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;

  onMount(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && root.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("click", onClick);

    onCleanup(() => {
      document.removeEventListener("click", onClick);
    });
  });

  return (
    <div ref={root} class="ehpeek-touch-gallery-actions-menu relative flex min-w-0 items-center justify-center">
      <button
        type="button"
        class="ehpeek-touch-gallery-actions-menu-button inline-flex w-md h-md items-center justify-center border-0 bg-transparent ehp-color-site-text"
        aria-haspopup="menu"
        aria-expanded={open()}
        aria-label={texts.navigation.menu}
        title={texts.navigation.menu}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icon name="menu" />
      </button>
      <Show when={open()}>
        <div class="ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-overlay flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
          <DomNodes nodes={props.actions} clone />
        </div>
      </Show>
    </div>
  );
}

function TouchGalleryTagGroup(props: { group: GalleryTagGroup }) {
  return (
    <section class="ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(76px,20%)_minmax(0,1fr)] gap-sm items-start">
      <div class="ehpeek-touch-gallery-tag-group-name min-h-sm overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[var(--color-site-elevated)] py-sm px-md text-center lowercase ehp-color-site-accent textsize-lg font-600">
        {props.group.namespace}
      </div>
      <div class="ehpeek-touch-gallery-tags flex flex-wrap gap-sm">
        {props.group.tags.map((tag) => (
          <a
            class="ehpeek-touch-gallery-tag inline-flex max-w-full min-h-lg items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] px-lg no-underline ehp-color-site-text textsize-lg transition-[border-color,background-color,color] duration-120 hover:border-[var(--color-site-border)] hover:bg-[var(--color-site-accent-hover)] hover:ehp-color-site-accent"
            href={tag.href}
            style={tag.appearance}
            aria-label={tag.label}
          >
            <DomNode node={tag.content} />
          </a>
        ))}
      </div>
    </section>
  );
}

function TouchGalleryFavoriteButton(props: { source: GalleryFavoriteInfo }) {
  const [favorite, setFavorite] = createSignal({ ...props.source });
  const [open, setOpen] = createSignal(false);
  const [loadingState, setLoadingState] = createSignal<"idle" | "loading" | "failed">("idle");
  const [options, setOptions] = createSignal<GalleryFavoriteOption[]>([]);
  const favorited = () => favorite().favorited;
  let root!: HTMLDivElement;

  onMount(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && root.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("click", onClick);

    onCleanup(() => {
      document.removeEventListener("click", onClick);
    });
  });

  const openMenu = async () => {
    const currentFavorite = favorite();

    if (!currentFavorite.actionUrl) {
      return;
    }

    setOpen(true);
    setLoadingState("loading");

    try {
      const html = await requestText(currentFavorite.actionUrl);
      const doc = new DOMParser().parseFromString(html, "text/html");
      setOptions(eh.parseGalleryFavoriteOptions(doc, currentFavorite.favorited));
      setLoadingState("idle");
    } catch (error) {
      console.error("[ehpeek]", error);
      setLoadingState("failed");
    }
  };

  return (
    <div ref={root} class="ehpeek-touch-gallery-favorite-menu relative z-2 min-w-0">
      <button
        type="button"
        class={`ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-xl font-700 normal-case ${favorited() ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`}
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          if (open()) {
            setOpen(false);
          } else {
            void openMenu();
          }
        }}
      >
        <span class="block leading-[1.15]">{favorite().label}</span>
        <span
          class={`ehpeek-touch-gallery-favorite-icon block mt-2px opacity-78 normal-case ${favorited() ? "ehp-color-site-accent" : "ehp-color-site-text"}`}
          aria-hidden="true"
        >
          <Icon name="heart" filled={favorited()} />
        </span>
      </button>
      <Show when={open()}>
        <div class="ehpeek-touch-gallery-favorite-panel absolute top-[calc(100%+8px)] left-0 z-overlay flex w-[min(86vw,360px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
          <Show when={loadingState() === "loading"}>
            <TouchGalleryFavoriteStatus text="Loading..." />
          </Show>
          <Show when={loadingState() === "failed"}>
            <TouchGalleryFavoriteStatus text="Failed" />
          </Show>
          <Show when={loadingState() === "idle"}>
            <For each={options()}>{(option) => (
              <TouchGalleryFavoriteOption
                actionUrl={favorite().actionUrl}
                option={option}
                onApplied={() => {
                  setFavorite({
                    ...favorite(),
                    favorited: option.value !== "favdel",
                    label: option.value === "favdel" ? "Not Favorited" : option.label,
                  });
                  setOpen(false);
                }}
              />
            )}</For>
          </Show>
        </div>
      </Show>
    </div>
  );
}

function TouchGalleryFavoriteStatus(props: { text: string }) {
  return (
    <div class="ehpeek-touch-gallery-favorite-loading flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit text-21px leading-[1.2] text-left">
      {props.text}
    </div>
  );
}

function TouchGalleryFavoriteOption(props: {
  actionUrl: string;
  option: GalleryFavoriteOption;
  onApplied: () => void;
}) {
  return (
    <button
      type="button"
      class={`ehpeek-touch-gallery-favorite-option flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit text-21px leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`}
      aria-pressed={props.option.selected}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        void applyFavoriteOption(props.actionUrl, props.option)
          .then(props.onApplied)
          .catch((error) => {
            console.error("[ehpeek]", error);
          });
      }}
    >
      <span
        class={`ehpeek-touch-gallery-favorite-option-icon flex-none ${props.option.value === "favdel" ? "ehp-color-site-text" : "ehp-color-site-accent"}`}
        aria-hidden="true"
      >
        <Icon name="heart" filled={props.option.value !== "favdel"} />
      </span>
      <span>{props.option.label}</span>
      <span
        class={`ml-auto flex-none ehp-color-site-accent ${props.option.selected ? "visible" : "invisible"}`}
        aria-hidden="true"
      >
        <Icon name="check" />
      </span>
    </button>
  );
}

async function applyFavoriteOption(actionUrl: string, option: GalleryFavoriteOption): Promise<void> {
  const body = new URLSearchParams();
  body.set("favcat", option.value);
  body.set("favnote", "");
  body.set("apply", "Apply Changes");
  body.set("update", "1");

  const response = await fetch(actionUrl, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
}

function selectableRating(value: number): number {
  return Math.min(5, Math.max(0.5, Math.round(value * 2) / 2));
}

function ratingFromPointer(clientX: number, element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.max(0.5, Math.ceil(progress * 10) / 2);
}

function ratingFromKeyboard(key: string, value: number): number | null {
  if (key === "ArrowRight" || key === "ArrowUp") {
    return Math.min(5, value + 0.5);
  }

  if (key === "ArrowLeft" || key === "ArrowDown") {
    return Math.max(0.5, value - 0.5);
  }

  if (key === "Home") {
    return 0.5;
  }

  if (key === "End") {
    return 5;
  }

  return null;
}
