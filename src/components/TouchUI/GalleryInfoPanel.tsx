import { createMemo, createSignal, For, onCleanup, onMount, Show } from "solid-js";
import * as eh from "../../eh";
import type { GalleryFavoriteInfo, GalleryFavoriteOption, GalleryInfo, GalleryNewTagInfo, GalleryTag, GalleryTagAction, GalleryTagApiInfo, GalleryTagGroup } from "../../eh";
import * as EhSyringe from "../../integrations/EhSyringe";
import texts from "../../texts.json";
import { DomNode, DomNodes } from "../Widgets/ExternalDom";
import { Icon } from "../Widgets/Icon";

export const TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS = "ehpeek-touch-gallery-actions-menu-item block box-border w-full min-h-lg py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline textsize-md leading-[1.2]";
const RATING_STAR_INDEXES = [0, 1, 2, 3, 4];

export function GalleryInfoPanel(props: {
  onPrimaryActionMount: (mount: HTMLElement) => void;
  onPrimaryActionUnmount: () => void;
  source: GalleryInfo;
}) {
  const rating = props.source.rating;
  const hasCover = props.source.cover !== null;
  const [ratingValue, setRatingValue] = createSignal(rating?.value ?? 0);
  const [ratingPreview, setRatingPreview] = createSignal<number | null>(null);
  const [ratingSubmitted, setRatingSubmitted] = createSignal(rating?.rated ?? false);
  const [ratingUpdating, setRatingUpdating] = createSignal(false);
  const [ratingCount, setRatingCount] = createSignal(rating?.count ?? "");
  const [ratingValueLabel, setRatingValueLabel] = createSignal(rating?.label ?? "");
  const [tagGroups, setTagGroups] = createSignal(props.source.tagGroups);
  const [newTagVisible, setNewTagVisible] = createSignal(false);
  const displayedRating = createMemo(() => ratingPreview() ?? ratingValue());
  const selectedRating = createMemo(() => ratingPreview() ?? selectableRating(ratingValue()));
  const ratingLabel = createMemo(() => ratingPreview() ? `Rate as ${ratingPreview()!.toFixed(1)} stars` : ratingValueLabel());

  onMount(() => {
    const stopObservingTags = eh.observeGalleryTagChanges(() => {
      setTagGroups(eh.readGalleryTagGroups());
    });

    onCleanup(stopObservingTags);
  });
  onCleanup(() => props.onPrimaryActionUnmount());

  const submitRating = async (value: number) => {
    if (!rating || !props.source.tagApi || ratingUpdating()) {
      return;
    }

    setRatingUpdating(true);
    try {
      const result = await eh.setGalleryRating(props.source.tagApi, value);
      setRatingValue(result.value);
      setRatingCount(String(result.count));
      setRatingValueLabel(formatRatingLabel(rating.label, result.average));
      setRatingPreview(null);
      setRatingSubmitted(true);
    } catch (error) {
      console.error("[ehpeek]", error);
      window.alert(error instanceof Error ? error.message : texts.errors.loadFailed);
    } finally {
      setRatingUpdating(false);
    }
  };

  const openNewTag = () => {
    const newTag = props.source.newTag;

    if (!newTag) {
      return;
    }

    setNewTagVisible(true);
    queueMicrotask(() => eh.focusGalleryNewTag(newTag));
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
      void submitRating(selectedRating());
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
              <div class="ehpeek-touch-gallery-title-main line-clamp-4 flex-none overflow-hidden textsize-lg font-400 leading-[1.16] text-left break-anywhere">
                {props.source.titleMain}
              </div>
              <div class="ehpeek-touch-gallery-title-sub line-clamp-3 flex-none overflow-hidden opacity-82 textsize-md leading-[1.2] text-left break-anywhere">
                {props.source.titleSub}
              </div>
            </div>
            <div class="ehpeek-touch-gallery-category-row grid grid-cols-[minmax(0,35fr)_minmax(0,65fr)] w-full flex-none items-center gap-lg mt-auto pt-md">
              <div
                class="ehpeek-touch-gallery-category box-border w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-xs py-6px px-10px ehp-color-site-page ehp-color-site-accent text-center textsize-md font-700 leading-[1.1] uppercase"
                style={props.source.categoryAppearance}
              >
                {props.source.category}
              </div>
              {rating && (
                <div class="ehpeek-touch-gallery-rating flex w-full min-w-0 flex-col items-center gap-4px text-center">
                  <div
                    class="ehpeek-touch-gallery-rating-stars relative inline-flex max-w-full overflow-hidden cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"
                    role="slider"
                    tabIndex={0}
                    aria-disabled={ratingUpdating() || !props.source.tagApi}
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
                        void submitRating(ratingFromPointer(event.clientX, event.currentTarget as HTMLElement));
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
                      class={`ehpeek-touch-gallery-rating-stars-fill absolute top-0 left-0 flex gap-1px overflow-hidden ${ratingSubmitted() ? "text-[var(--color-accent)]" : "ehp-color-site-accent"}`}
                      aria-hidden="true"
                      style={{ width: `${(displayedRating() / 5) * 100}%` }}
                    >
                      {RATING_STAR_INDEXES.map(() => (
                        <Icon name="star" filled />
                      ))}
                    </span>
                  </div>
                  <div class="ehpeek-touch-gallery-rating-meta flex max-w-full min-w-0 items-center justify-center gap-6px text-[rgba(255,255,255,0.78)] textsize-md leading-[1.15] whitespace-nowrap">
                    <span
                      class="ehpeek-touch-gallery-rating-label min-w-0 overflow-hidden text-ellipsis"
                      aria-live="polite"
                    >
                      {ratingLabel()}
                    </span>
                    {ratingCount() && (
                      <span class="ehpeek-touch-gallery-rating-count flex-none pl-6px border-0 border-l border-[rgba(255,255,255,0.2)] text-[rgba(255,255,255,0.58)]">
                        {ratingCount()}
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
          class="ehpeek-touch-gallery-primary-actions flex min-w-0 border-0 border-l-8 border-l-[var(--color-site-page)]"
          ref={(node) => {
            props.onPrimaryActionMount(node);
          }}
        />
      </div>
      <div class="ehpeek-touch-gallery-content flex flex-col gap-lg pt-xl pr-[max(16px,env(safe-area-inset-right,0px))] pb-lg pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-page ehp-color-site-text">
        <div class="ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-md gap-x-lg items-center textsize-md leading-[1.2] text-center">
          {props.source.summary.map((item) => (
            <div class="ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal">
              {item.value}
            </div>
          ))}
          <TouchGalleryActionsMenu actions={props.source.actions} />
        </div>
        {tagGroups().length > 0 && (
          <div class="ehpeek-touch-gallery-tag-groups flex flex-col gap-md pt-2px">
            {tagGroups().map((group) => (
              <TouchGalleryTagGroup
                group={group}
                onNewTagOpen={props.source.newTag ? openNewTag : undefined}
                tagApi={props.source.tagApi}
              />
            ))}
          </div>
        )}
        <Show when={newTagVisible() ? props.source.newTag : null} keyed>
          {(newTag) => <TouchGalleryNewTag source={newTag} />}
        </Show>
      </div>
    </section>
  );
}

export function prepareGalleryInfoPanel(): void {
  eh.applyTouchGalleryPanelPageStyle();
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

function TouchGalleryTagGroup(props: {
  group: GalleryTagGroup;
  onNewTagOpen?: () => void;
  tagApi: GalleryTagApiInfo | null;
}) {
  return (
    <section class="ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(76px,20%)_minmax(0,1fr)] gap-sm items-start">
      <div class="ehpeek-touch-gallery-tag-group-name min-h-sm overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[var(--color-site-elevated)] py-sm px-md text-center lowercase ehp-color-site-accent textsize-md font-600">
        {props.group.namespace}
      </div>
      <div class="ehpeek-touch-gallery-tags flex flex-wrap gap-sm">
        {props.group.tags.map((tag) => (
          <TouchGalleryTag tag={tag} onNewTagOpen={props.onNewTagOpen} tagApi={props.tagApi} />
        ))}
      </div>
    </section>
  );
}

function TouchGalleryTag(props: {
  tag: GalleryTag;
  onNewTagOpen?: () => void;
  tagApi: GalleryTagApiInfo | null;
}) {
  const [open, setOpen] = createSignal(false);
  const [alignEnd, setAlignEnd] = createSignal(false);
  const [updating, setUpdating] = createSignal(false);
  let root!: HTMLDivElement;
  const closeMenu = () => setOpen(false);

  onMount(() => {
    const onClick = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !root.contains(event.target)) {
        closeMenu();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);

    onCleanup(() => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    });
  });

  const runTagAction = async (action: GalleryTagAction) => {
    if (!props.tagApi) {
      return;
    }

    closeMenu();
    setUpdating(true);
    try {
      await eh.runGalleryTagAction(props.tagApi, props.tag, action);
    } catch (error) {
      console.error("[ehpeek]", error);
      window.alert(error instanceof Error ? error.message : texts.errors.loadFailed);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div ref={root} class="ehpeek-touch-gallery-tag-menu relative inline-flex max-w-full">
      <button
        type="button"
        class="ehpeek-touch-gallery-tag inline-flex max-w-full min-h-lg items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] px-lg ehp-color-site-text font-inherit textsize-md cursor-pointer transition-[border-color,background-color,color] duration-120 hover:border-[var(--color-site-border)] hover:bg-[var(--color-site-accent-hover)] hover:ehp-color-site-accent"
        style={props.tag.appearance}
        aria-label={props.tag.label}
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={() => {
          if (!open()) {
            const bounds = root.getBoundingClientRect();
            setAlignEnd(bounds.left + bounds.width / 2 > window.innerWidth / 2);
            setOpen(true);
          } else {
            closeMenu();
          }
        }}
      >
        <TouchGalleryTagContent tag={props.tag} />
      </button>
      <Show when={open()}>
        <div
          class={`ehpeek-touch-gallery-tag-menu-panel absolute top-[calc(100%+6px)] z-overlay flex w-max min-w-240px max-w-[calc(100vw-24px)] flex-col overflow-hidden whitespace-nowrap border ehp-color-site-border rounded-sm ehp-color-site-elevated ${alignEnd() ? "right-0" : "left-0"}`}
          role="menu"
        >
          <button
            type="button"
            class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md text-left cursor-pointer"
            role="menuitem"
            disabled={updating() || !props.tagApi}
            onClick={() => void runTagAction("voteUp")}
          >
            <span class="w-24px text-center ehp-color-site-accent" aria-hidden="true">↑</span>
            <span>{texts.gallery.voteUp}</span>
          </button>
          <button
            type="button"
            class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md text-left cursor-pointer"
            role="menuitem"
            disabled={updating() || !props.tagApi}
            onClick={() => void runTagAction("voteDown")}
          >
            <span class="w-24px text-center ehp-color-site-accent" aria-hidden="true">↓</span>
            <span>{texts.gallery.voteDown}</span>
          </button>
          <a
            class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-text no-underline font-inherit textsize-md text-left"
            href={props.tag.href}
            role="menuitem"
            onClick={closeMenu}
          >
            <Icon name="search" />
            <span>{texts.gallery.showTaggedGalleries}</span>
          </a>
          <a
            class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 border-t ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text no-underline font-inherit textsize-md text-left cursor-pointer"
            href={props.tag.definitionHref}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={closeMenu}
          >
            <Icon name="external-link" />
            <span>{texts.gallery.showTagDefinition}</span>
          </a>
          <button
            type="button"
            class="ehpeek-touch-gallery-tag-menu-item flex min-h-lg items-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-text font-inherit textsize-md text-left cursor-pointer"
            role="menuitem"
            disabled={!props.onNewTagOpen}
            onClick={() => {
              closeMenu();
              props.onNewTagOpen?.();
            }}
          >
            <span class="w-24px text-center ehp-color-site-accent textsize-lg leading-none" aria-hidden="true">+</span>
            <span>{texts.gallery.addNewTag}</span>
          </button>
        </div>
      </Show>
    </div>
  );
}

function TouchGalleryNewTag(props: { source: GalleryNewTagInfo }) {
  onMount(() => {
    props.source.field = EhSyringe.reuseTagTipInput(props.source.field);
    eh.prepareGalleryNewTag(props.source);
  });

  return <DomNode node={props.source.container} />;
}

function TouchGalleryTagContent(props: { tag: GalleryTag }) {
  let host!: HTMLSpanElement;

  onMount(() => {
    onCleanup(EhSyringe.mirrorTranslatedContent(props.tag.contentSource, host));
  });

  return <span ref={host} class="contents" translate="no" />;
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
      const response = await eh.requestPage(currentFavorite.actionUrl);
      setOptions(eh.parseGalleryFavoriteOptions(response.document, currentFavorite.favorited));
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
        class={`ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-md font-700 normal-case ${favorited() ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`}
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
    <div class="ehpeek-touch-gallery-favorite-loading flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md leading-[1.2] text-left">
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
      class={`ehpeek-touch-gallery-favorite-option flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`}
      aria-pressed={props.option.selected}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        void eh.updateGalleryFavorite(props.actionUrl, props.option.value)
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

function selectableRating(value: number): number {
  return Math.min(5, Math.max(0.5, Math.round(value * 2) / 2));
}

function formatRatingLabel(label: string, value: number): string {
  const formatted = value.toFixed(2);
  return /\d+(?:\.\d+)?/.test(label) ? label.replace(/\d+(?:\.\d+)?/, formatted) : `${label} ${formatted}`.trim();
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
