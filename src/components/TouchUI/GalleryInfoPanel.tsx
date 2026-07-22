import {
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  Show,
  untrack,
} from "solid-js";
import type {
  GalleryFavoriteOption,
  MyTagMode,
} from "../../eh";
import { type GalleryInfoDom, type GalleryInfoTagGroup } from "../../eh";
import texts from "../../texts.json";
import { state } from "../../state";
import { refreshMyTags } from "../Enhance/MyTags";
import { WelcomeIcon } from "../WelcomeIcon";
import { DomNode, DomNodes } from "../Widgets/ExternalDom";
import { Icon } from "../Widgets/Icon";

const TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS =
  "ehpeek-touch-gallery-actions-menu-item block box-border w-full min-h-lg py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline textsize-md leading-[1.2]";
const TOUCH_GALLERY_TAG_MENU_ITEM_CLASS =
  "ehpeek-touch-gallery-tag-menu-item flex box-border w-full min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text no-underline font-inherit textsize-md text-left cursor-pointer";
const TOUCH_GALLERY_TAG_MENU_CLASS =
  "!box-border flex !h-auto !w-full !float-none !m-0 !p-0 flex-col !textsize-md";
export const TOUCH_GALLERY_INFO_CLASSES = {
  actionItems: TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS,
  cover:
    "block w-full max-w-full h-full max-h-full mx-auto object-contain object-center",
  host: "ehpeek-touch-gallery-host",
  newTag: {
    button:
      "box-border flex-none h-md px-lg rounded-xs border border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-background)] font-inherit textsize-md font-700 cursor-pointer",
    container: "ehpeek-touch-gallery-new-tag box-border w-full pt-md",
    field:
      "box-border min-w-0 flex-1 h-md px-md rounded-xs border ehp-color-site-border bg-[var(--color-site-surface)] ehp-color-site-text font-inherit textsize-md outline-none focus:border-[var(--color-site-accent)]",
    form: "flex w-full min-w-0 items-center gap-sm",
  },
};
const RATING_STAR_INDEXES = [0, 1, 2, 3, 4];
const RATING_ACTION_BUTTON_CLASS =
  "block w-full min-h-md coarse:min-h-64px py-xs coarse:py-md px-md coarse:px-lg rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 disabled:opacity-50 disabled:cursor-default";

type GalleryPanelTagGroup = GalleryInfoTagGroup;

export function GalleryInfoPanel(props: {
  primaryAction?: JSX.Element;
  source: GalleryInfoDom;
}) {
  const source = untrack(() => props.source);
  const rating = source.data.rating;
  const hasCover = source.elems.cover !== null;
  const [ratingValue, setRatingValue] = createSignal(rating?.value ?? 0);
  const [ratingPreview, setRatingPreview] = createSignal<number | null>(null);
  const [ratingPickerOpen, setRatingPickerOpen] = createSignal(false);
  const [ratingSubmitted, setRatingSubmitted] = createSignal(
    rating?.rated ?? false,
  );
  const [ratingCount] = createSignal(rating?.count ?? "");
  const [ratingValueLabel] = createSignal(rating?.label ?? "");
  const initialTagGroups = source.data.tagGroups.map((group) => ({
    ...group,
    tags: group.tags.flatMap(({ contentSourceIndex, ...tag }) => {
      const contentSource = source.elems.tagContents[contentSourceIndex];
      return contentSource ? [{ ...tag, contentSource }] : [];
    }),
  }));
  const [tagGroups, setTagGroups] =
    createSignal<GalleryPanelTagGroup[]>(initialTagGroups);
  const [selectedTag, setSelectedTag] = createSignal<
    GalleryPanelTagGroup["tags"][number] | null
  >(null);
  const [tagging, setTagging] = createSignal(false);
  const hasNewTag = () =>
    Boolean(
      source.elems.newTag &&
        source.elems.newTagButton &&
        source.elems.newTagField &&
        source.elems.newTagForm,
    );
  const displayedRating = createMemo(() => ratingPreview() ?? ratingValue());
  const ratingLabel = createMemo(() => {
    const preview = ratingPreview();
    return preview !== null
      ? `Rate as ${preview.toFixed(1)} stars`
      : ratingValueLabel();
  });

  onMount(() => {
    const stopObservingTags = source.handle.observeGalleryTagGroups(setTagGroups);

    onCleanup(stopObservingTags);
  });

  const submitRating = (value: number): boolean => {
    if (!rating) {
      return false;
    }

    try {
      source.handle.submitGalleryRating(value);
      setRatingValue(value);
      setRatingPreview(null);
      setRatingSubmitted(true);
      return true;
    } catch (error) {
      setRatingPreview(null);
      console.error("[ehpeek]", error);
      window.alert(
        error instanceof Error ? error.message : texts.errors.loadFailed,
      );
      return false;
    }
  };

  const openTagMenu = (tag: GalleryPanelTagGroup["tags"][number]) => {
    try {
      source.handle.openGalleryTagMenu(
        tag,
        TOUCH_GALLERY_TAG_MENU_CLASS,
        TOUCH_GALLERY_TAG_MENU_ITEM_CLASS,
      );
      setSelectedTag(tag);
    } catch (error) {
      console.error("[ehpeek] Gallery tag actions failed", error);
      window.alert(
        error instanceof Error ? error.message : texts.errors.loadFailed,
      );
    }
  };
  const closeTagMenu = () => {
    if (!selectedTag()) {
      return;
    }
    source.handle.closeGalleryTagMenu();
    setSelectedTag(null);
  };
  const updateTag = (updatedTag: GalleryPanelTagGroup["tags"][number]) => {
    setTagGroups((groups) => groups.map((group) => ({
      ...group,
      tags: group.tags.map((tag) => tag.url === updatedTag.url ? updatedTag : tag),
    })));
    setSelectedTag((tag) => tag?.url === updatedTag.url ? updatedTag : tag);
  };

  return (
    <section class="ehpeek-touch-gallery flex box-border w-full flex-col mb-md ehp-color-site-text font-sans">
      <div class="ehpeek-touch-gallery-hero relative grid min-h-[clamp(260px,42vh,340px)] pt-lg pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-surface ehp-color-site-text">
        <div
          class={`ehpeek-touch-gallery-summary grid gap-18px items-stretch ${hasCover ? "grid-cols-[minmax(120px,38%)_minmax(0,1fr)]" : "grid-cols-1"}`}
        >
          {hasCover && (
            <div class="ehpeek-touch-gallery-cover flex self-center justify-self-stretch w-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden rounded-3px">
              <DomNode node={source.elems.cover} />
            </div>
          )}
          <div class="ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 flex-col items-start gap-8px pt-2px">
            <div class="ehpeek-touch-gallery-heading flex min-w-0 w-full flex-none flex-col gap-sm items-start pb-xs">
              <div class="ehpeek-touch-gallery-title-main line-clamp-4 flex-none overflow-hidden textsize-lg font-400 leading-[1.16] text-left break-anywhere">
                {source.data.titleMain}
              </div>
              <div class="ehpeek-touch-gallery-title-sub line-clamp-3 flex-none overflow-hidden opacity-82 textsize-md leading-[1.2] text-left break-anywhere">
                {source.data.titleSub}
              </div>
            </div>
            <div class="ehpeek-touch-gallery-category-row grid grid-cols-[minmax(0,35fr)_minmax(0,65fr)] w-full flex-none items-center gap-lg mt-auto pt-md">
              <div
                class="ehpeek-touch-gallery-category box-border w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap rounded-xs border border-solid py-6px px-10px text-center textsize-md font-700 leading-[1.1] uppercase"
                style={source.data.categoryAppearance}
              >
                {source.data.category}
              </div>
              {rating && (
                <button
                  type="button"
                  class="ehpeek-touch-gallery-rating flex w-full min-w-0 flex-col items-center gap-4px p-0 border-0 bg-transparent ehp-color-site-text font-inherit text-center cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"
                  aria-label="Rate gallery"
                  onClick={() => {
                    setRatingPreview(null);
                    setRatingPickerOpen(true);
                  }}
                  onPointerLeave={() => {
                    setRatingPreview(null);
                  }}
                  onBlur={() => {
                    setRatingPreview(null);
                  }}
                >
                  <div
                    class="ehpeek-touch-gallery-rating-stars relative inline-flex max-w-full overflow-hidden"
                    onPointerMove={(event: PointerEvent) => {
                      if (event.pointerType !== "mouse") {
                        return;
                      }

                      setRatingPreview(
                        ratingFromPointer(
                          event.clientX,
                          event.currentTarget as HTMLElement,
                        ),
                      );
                    }}
                  >
                    <span
                      class="ehpeek-touch-gallery-rating-stars-empty flex gap-1px text-[var(--color-muted)] opacity-40"
                      aria-hidden="true"
                    >
                      <For each={RATING_STAR_INDEXES}>
                        {() => <Icon name="star" />}
                      </For>
                    </span>
                    <span
                      class={`ehpeek-touch-gallery-rating-stars-fill absolute top-0 left-0 flex gap-1px overflow-hidden ${ratingSubmitted() ? "text-[var(--color-rating-submitted)]" : "ehp-color-site-accent"}`}
                      aria-hidden="true"
                      style={{ width: `${(displayedRating() / 5) * 100}%` }}
                    >
                      <For each={RATING_STAR_INDEXES}>
                        {() => <Icon name="star" filled />}
                      </For>
                    </span>
                  </div>
                  <div class="ehpeek-touch-gallery-rating-meta flex max-w-full min-w-0 items-center justify-center gap-6px text-[var(--color-muted)] textsize-md leading-[1.15] whitespace-nowrap">
                    <span
                      class="ehpeek-touch-gallery-rating-label min-w-0 overflow-hidden text-ellipsis"
                      aria-live="polite"
                    >
                      {ratingLabel()}
                    </span>
                    {ratingCount() && (
                      <span class="ehpeek-touch-gallery-rating-count flex-none pl-6px border-0 border-l border-[var(--color-site-border-subtle)] opacity-75">
                        {ratingCount()}
                      </span>
                    )}
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
      <div class="ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-87px mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-visible rounded-xs bg-[var(--color-site-elevated)] shadow-[0_2px_10px_var(--color-shadow-panel)]">
        <TouchGalleryFavoriteButton source={source} />
        <div class="ehpeek-touch-gallery-primary-actions flex min-w-0 border-0 border-l-8 border-solid border-l-[var(--color-site-page)]">
          {props.primaryAction}
        </div>
      </div>
      <div class="ehpeek-touch-gallery-content flex flex-col gap-lg pt-xl pr-[max(16px,env(safe-area-inset-right,0px))] pb-lg pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-page ehp-color-site-text">
        <div class="ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-md gap-x-lg items-center textsize-md leading-[1.2] text-center">
          <For each={source.data.summary}>{(item) => (
            <div class="ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal">
              {item.value}
            </div>
          )}</For>
          <TouchGalleryActionsMenu items={source.elems.actionItems} />
        </div>
        {tagGroups().length > 0 && (
          <div class="ehpeek-touch-gallery-tag-groups flow-root pt-2px">
            <button
              type="button"
              class={`float-right inline-flex min-h-sm items-center justify-center gap-md ml-sm mb-sm rounded-xl border-0 px-lg font-inherit font-700 textsize-sm cursor-pointer transition-[background-color,color] duration-120 ${tagging() ? "bg-[var(--color-site-accent-hover)] ehp-color-site-accent" : "bg-[var(--color-site-surface)] ehp-color-site-text"}`}
              aria-pressed={tagging()}
              onClick={() => {
                setTagging((enabled) => !enabled);
              }}
            >
              <span>Tagging</span>
              <span
                class={`block flex-none w-10px h-10px coarse:w-18px coarse:h-18px rounded-full ${tagging() ? "bg-[var(--color-state-on)]" : "bg-[var(--color-state-off)]"}`}
                aria-hidden="true"
              />
            </button>
            <For each={tagGroups()}>{(group) => (
              <TouchGalleryTagGroup
                group={group}
                tagging={tagging()}
                onTagOpen={openTagMenu}
              />
            )}</For>
          </div>
        )}
        <Show when={hasNewTag()}>
          <div class={tagging() ? "block" : "hidden"}>
            <TouchGalleryNewTag source={source} />
          </div>
        </Show>
      </div>
      <TouchGalleryTagMenu
        source={source}
        tag={selectedTag()}
        onClose={closeTagMenu}
        onTagUpdated={updateTag}
      />
      <Show when={ratingPickerOpen()}>
        <div
          class="ehpeek-touch-gallery-rating-dialog fixed inset-0 z-overlay flex items-center justify-center p-md bg-black/65"
          role="dialog"
          aria-modal="true"
          aria-label="Rate gallery"
          onClick={(event: MouseEvent) => {
            if (event.target === event.currentTarget) {
              setRatingPreview(null);
              setRatingPickerOpen(false);
            }
          }}
        >
          <div class="box-border flex w-[min(92vw,420px)] flex-col gap-lg rounded-lg border ehp-color-site-border p-lg ehp-color-site-elevated ehp-color-site-text shadow-xl">
            <div class="textsize-md font-700">Rate gallery</div>
            <button
              type="button"
              class="relative inline-flex self-center max-w-full overflow-hidden p-0 border-0 bg-transparent cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"
              aria-label={`Rate gallery: ${displayedRating().toFixed(1)} stars`}
              onClick={(event: MouseEvent) => {
                setRatingPreview(
                  ratingFromPointer(
                    event.clientX,
                    event.currentTarget as HTMLElement,
                  ),
                );
              }}
            >
              <span
                class="flex gap-1px pointer-events-none text-[var(--color-muted)] opacity-40"
                aria-hidden="true"
              >
                <For each={RATING_STAR_INDEXES}>
                  {() => <Icon name="star" size={48} />}
                </For>
              </span>
              <span
                class={`absolute top-0 left-0 flex gap-1px overflow-hidden pointer-events-none ${ratingSubmitted() ? "text-[var(--color-rating-submitted)]" : "ehp-color-site-accent"}`}
                aria-hidden="true"
                style={{ width: `${(displayedRating() / 5) * 100}%` }}
              >
                <For each={RATING_STAR_INDEXES}>
                  {() => <Icon name="star" size={48} filled />}
                </For>
              </span>
            </button>
            <div class="grid grid-cols-2 gap-sm pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]">
              <button
                type="button"
                class={`${RATING_ACTION_BUTTON_CLASS} border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108`}
                onClick={() => {
                  if (submitRating(displayedRating())) {
                    setRatingPickerOpen(false);
                  }
                }}
              >
                Submit
              </button>
              <button
                type="button"
                class={`${RATING_ACTION_BUTTON_CLASS} border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]`}
                onClick={() => {
                  setRatingPreview(null);
                  setRatingPickerOpen(false);
                }}
              >
                {texts.button.close}
              </button>
            </div>
          </div>
        </div>
      </Show>
    </section>
  );
}

function TouchGalleryActionsMenu(props: {
  items: GalleryInfoDom["elems"]["actionItems"];
}) {
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
    <div
      ref={root}
      class="ehpeek-touch-gallery-actions-menu relative flex min-w-0 items-center justify-center"
    >
      <button
        type="button"
        class="ehpeek-touch-gallery-actions-menu-button inline-flex w-md h-md items-center justify-center border-0 bg-transparent ehp-color-site-text"
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
      >
        <Icon name="menu" />
      </button>
      <Show when={open()}>
        <div class="ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-overlay flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
          <DomNodes nodes={props.items} />
        </div>
      </Show>
    </div>
  );
}

function TouchGalleryTagGroup(props: {
  group: GalleryPanelTagGroup;
  onTagOpen: (tag: GalleryPanelTagGroup["tags"][number]) => void;
  tagging: boolean;
}) {
  return (
    <section class="ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(76px,20%)_minmax(0,1fr)] gap-sm items-start mb-md last:mb-0">
      <div class="ehpeek-touch-gallery-tag-group-name min-h-sm overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[var(--color-site-elevated)] py-sm px-md text-center lowercase ehp-color-site-accent textsize-md font-600">
        {props.group.namespace}
      </div>
      <div
        class="ehpeek-touch-gallery-tags flex flex-wrap gap-sm"
        onClick={(event: MouseEvent) => {
          if (
            !props.tagging ||
            event.defaultPrevented ||
            event.button !== 0 ||
            event.altKey ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey
          ) {
            return;
          }
          const link = event.target instanceof Element
            ? event.target.closest<HTMLAnchorElement>("a.ehpeek-touch-gallery-tag")
            : null;
          const href = link?.getAttribute("href");
          const tag = props.group.tags.find((candidate) => candidate.url === href);
          if (!tag) {
            return;
          }

          event.preventDefault();
          props.onTagOpen(tag);
        }}
      >
        <For each={props.group.tags}>{(tag) => (
          <TouchGalleryTag tag={tag} />
        )}</For>
      </div>
    </section>
  );
}

function TouchGalleryTag(props: {
  tag: GalleryPanelTagGroup["tags"][number];
}) {
  return (
    <a
      href={props.tag.url}
      class="ehpeek-touch-gallery-tag inline-flex max-w-full min-h-lg items-center overflow-hidden text-ellipsis whitespace-nowrap appearance-none m-0 py-0 rounded-xl border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] px-lg ehp-color-site-text font-inherit font-700 textsize-md cursor-pointer select-none no-underline transition-[border-color,background-color,color] duration-120 hover:border-[var(--color-site-border)] hover:bg-[var(--color-site-accent-hover)] hover:ehp-color-site-accent"
      style={{
        "background-color": props.tag.appearance.backgroundColor,
        "border-color": props.tag.appearance.borderColor,
        color: props.tag.appearance.color,
      }}
      aria-label={props.tag.label}
    >
      <TouchGalleryTagContent tag={props.tag} />
    </a>
  );
}

function TouchGalleryTagMenu(props: {
  source: GalleryInfoDom;
  tag: GalleryPanelTagGroup["tags"][number] | null;
  onClose: () => void;
  onTagUpdated: (tag: GalleryPanelTagGroup["tags"][number]) => void;
}) {
  const onClose = untrack(() => props.onClose);
  const onTagUpdated = untrack(() => props.onTagUpdated);
  const [favoriteDialogOpen, setFavoriteDialogOpen] = createSignal(false);
  const tagSets = state.gallery.myTagSets.reload();
  const [selectedTagSet, setSelectedTagSet] = createSignal(
    tagSets.find((option) => option.selected)?.value ??
      tagSets[0]?.value ??
      "1",
  );
  const [tagMode, setTagMode] = createSignal<MyTagMode>("marked");
  const [updating, setUpdating] = createSignal(false);
  const [favoriteTag, setFavoriteTag] = createSignal<
    GalleryPanelTagGroup["tags"][number] | null
  >(null);

  onMount(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && props.tag) {
        props.onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    onCleanup(() => {
      document.removeEventListener("keydown", onKeyDown);
    });
  });

  const updateFavoriteTag = async (tag: GalleryPanelTagGroup["tags"][number]) => {
    if (updating()) {
      return;
    }

    setUpdating(true);
    try {
      const myTagsPage = tag.myTag
        ? await props.source.handle.removeFavoriteTag(tag)
        : await props.source.handle.submitFavoriteTag(tag, selectedTagSet(), tagMode());
      const updateAppearance = (
        appearance: typeof myTagsPage.appearances[number] | undefined,
      ) => onTagUpdated({
          ...tag,
          appearance: appearance
            ? {
                ...tag.appearance,
                backgroundColor: appearance.backgroundColor,
                color: appearance.color,
              }
            : { backgroundColor: "", borderColor: "", color: "" },
          myTag: appearance
            ? { id: appearance.id, tagSet: appearance.tagSet }
            : null,
        });
      updateAppearance(myTagsPage.appearances.find((item) => item.name === tag.name));
      setFavoriteDialogOpen(false);
      onClose();
      void refreshMyTags(myTagsPage).then((appearances) => {
        if (appearances) {
          updateAppearance(appearances.find((item) => item.name === tag.name));
        }
      });
    } catch (error) {
      console.error("[ehpeek]", error);
      window.alert(
        error instanceof Error ? error.message : texts.errors.loadFailed,
      );
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <div
        class={`ehpeek-touch-gallery-tag-menu-dialog fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65 transition-opacity duration-120 ${props.tag ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"}`}
        role="dialog"
        aria-modal="true"
        aria-hidden={!props.tag}
        aria-label={props.tag?.label ?? ""}
        onClick={(event) => {
          if (event.target === event.currentTarget) {
            props.onClose();
          }
        }}
      >
        <div
          class="ehpeek-touch-gallery-tag-menu-panel box-border flex w-full max-w-420px max-h-[calc(100dvh-32px)] flex-col overflow-x-hidden overflow-y-auto whitespace-nowrap border ehp-color-site-border rounded-md ehp-color-site-elevated shadow-xl"
          role="menu"
          onClick={() => {
            if (!updating()) {
              props.onClose();
            }
          }}
        >
          <Show
            when={!updating()}
            fallback={<WelcomeIcon embedded label={texts.reader.loading} showIcon={false} />}
          >
            <DomNode node={props.source.elems.tagMenuAction} />
            <Show when={props.tag}>{(tag) => (
              <Show
                when={!tag().myTag}
                fallback={
                  <button
                    type="button"
                    class={TOUCH_GALLERY_TAG_MENU_ITEM_CLASS}
                    role="menuitem"
                    onClick={(event) => {
                      event.stopPropagation();
                      void updateFavoriteTag(tag());
                    }}
                  >
                    <Icon name="heart" filled />
                    <span>{texts.gallery.removeFavoriteTag}</span>
                  </button>
                }
              >
                <button
                  type="button"
                  class={TOUCH_GALLERY_TAG_MENU_ITEM_CLASS}
                  role="menuitem"
                  onClick={() => {
                    setFavoriteTag(tag());
                    setFavoriteDialogOpen(true);
                  }}
                >
                  <Icon name="heart" />
                  <span>{texts.gallery.favoriteTag}</span>
                </button>
              </Show>
            )}</Show>
          </Show>
        </div>
      </div>
      <Show when={favoriteDialogOpen()}>
        <div
          class="fixed inset-0 z-overlay flex items-center justify-center p-lg bg-black/65"
          role="dialog"
          aria-modal="true"
          aria-label={texts.gallery.favoriteTag}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setFavoriteDialogOpen(false);
            }
          }}
        >
          <div class="box-border flex w-full max-w-420px flex-col gap-lg rounded-md border ehp-color-site-border ehp-color-site-elevated p-lg shadow-xl">
            <div class="ehp-color-site-text textsize-lg font-700">
              {texts.gallery.favoriteTag}
            </div>
            <Show
              when={!updating()}
              fallback={<WelcomeIcon embedded label={texts.reader.loading} showIcon={false} />}
            >
              <label class="flex flex-col gap-sm ehp-color-site-text textsize-md font-600">
                <span>{texts.gallery.tagCollection}</span>
                <select
                  class="box-border min-h-md w-full rounded-xs border ehp-color-site-border ehp-color-site-surface ehp-color-site-text px-md font-inherit textsize-md"
                  value={selectedTagSet()}
                  onChange={(event) =>
                    setSelectedTagSet(event.currentTarget.value)
                  }
                >
                  <For each={tagSets}>{(option) => (
                    <option value={option.value}>{option.label}</option>
                  )}</For>
                </select>
              </label>
              <label class="flex flex-col gap-sm ehp-color-site-text textsize-md font-600">
                <span>{texts.gallery.tagBehavior}</span>
                <select
                  class="box-border min-h-md w-full rounded-xs border ehp-color-site-border ehp-color-site-surface ehp-color-site-text px-md font-inherit textsize-md"
                  value={tagMode()}
                  onChange={(event) =>
                    setTagMode(event.currentTarget.value as MyTagMode)
                  }
                >
                  <option value="marked">{texts.gallery.markTag}</option>
                  <option value="watched">{texts.gallery.watchTag}</option>
                  <option value="hidden">{texts.gallery.hideTag}</option>
                </select>
              </label>
              <div class="grid grid-cols-2 gap-md">
                <button
                  type="button"
                  class="min-h-md rounded-xs border-0 ehp-color-site-surface ehp-color-site-text font-inherit font-700 textsize-md cursor-pointer"
                  onClick={() => setFavoriteDialogOpen(false)}
                >
                  {texts.button.close}
                </button>
                <button
                  type="button"
                  class="flex min-h-md items-center justify-center gap-md rounded-xs border-0 bg-[var(--color-site-accent)] text-[var(--color-background)] font-inherit font-700 textsize-md cursor-pointer"
                  onClick={() => {
                    const tag = favoriteTag();
                    if (tag) {
                      void updateFavoriteTag(tag);
                    }
                  }}
                >
                  <Icon name="heart" />
                  <span>{texts.button.confirm}</span>
                </button>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </>
  );
}

function TouchGalleryNewTag(props: { source: GalleryInfoDom }) {
  return <DomNode node={props.source.elems.newTag} />;
}

function TouchGalleryTagContent(props: {
  tag: GalleryPanelTagGroup["tags"][number];
}) {
  let host!: HTMLSpanElement;

  onMount(() => {
    onCleanup(props.tag.contentSource.mirrorContentTo(host));
  });

  return (
    <span
      ref={host}
      class="contents [&_*]:!bg-transparent [&_*]:!text-inherit"
      translate="no"
    />
  );
}

function TouchGalleryFavoriteButton(props: { source: GalleryInfoDom }) {
  const [favorite, setFavorite] = createSignal(
    untrack(() => ({ ...props.source.data.favorite })),
  );
  const [open, setOpen] = createSignal(false);
  const [loadingState, setLoadingState] = createSignal<
    "idle" | "loading" | "failed"
  >("idle");
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
      setOptions(await props.source.handle.loadGalleryFavoriteOptions(
        currentFavorite.actionUrl,
        currentFavorite.favorited,
      ));
      setLoadingState("idle");
    } catch (error) {
      console.error("[ehpeek]", error);
      setLoadingState("failed");
    }
  };

  const updateFavorite = async (option: GalleryFavoriteOption) => {
    const actionUrl = favorite().actionUrl;
    if (!actionUrl || loadingState() === "loading") {
      return;
    }

    setLoadingState("loading");
    try {
      await props.source.handle.updateGalleryFavorite(actionUrl, option.value);
      setFavorite({
        ...favorite(),
        color: option.color,
        favorited: option.value !== "favdel",
        label: option.value === "favdel" ? "Not Favorited" : option.label,
      });
      setLoadingState("idle");
      setOpen(false);
    } catch (error) {
      console.error("[ehpeek]", error);
      setLoadingState("failed");
    }
  };

  return (
    <div
      ref={root}
      class="ehpeek-touch-gallery-favorite-menu relative z-2 min-w-0"
    >
      <button
        type="button"
        class={`ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-text text-center uppercase [touch-action:manipulation] textsize-md font-700 normal-case ${favorited() ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`}
        style={{ color: favorite().color ?? undefined }}
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
          class="ehpeek-touch-gallery-favorite-icon block mt-2px opacity-78 normal-case"
          aria-hidden="true"
        >
          <Icon name="heart" filled={favorited()} />
        </span>
      </button>
      <Show when={open()}>
        <div class="ehpeek-touch-gallery-favorite-panel absolute top-[calc(100%+8px)] left-0 z-overlay flex w-[min(86vw,360px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
          <Show when={loadingState() === "loading"}>
            <WelcomeIcon embedded label={texts.reader.loading} showIcon={false} />
          </Show>
          <Show when={loadingState() === "failed"}>
            <TouchGalleryFavoriteStatus text="Failed" />
          </Show>
          <Show when={loadingState() === "idle"}>
            <For each={options()}>
              {(option) => (
                <TouchGalleryFavoriteOption
                  option={option}
                  onSelect={() => void updateFavorite(option)}
                />
              )}
            </For>
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
  option: GalleryFavoriteOption;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      class={`ehpeek-touch-gallery-favorite-option flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`}
      aria-pressed={props.option.selected}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        props.onSelect();
      }}
    >
      <span
        class="ehpeek-touch-gallery-favorite-option-icon flex-none ehp-color-site-text"
        style={{ color: props.option.color ?? undefined }}
        aria-hidden="true"
      >
        <Icon name="heart" filled={props.option.value !== "favdel"} />
      </span>
      <span>{props.option.label}</span>
      <span
        class={`ml-auto flex-none ehp-color-site-text ${props.option.selected ? "visible" : "invisible"}`}
        style={{ color: props.option.color ?? undefined }}
        aria-hidden="true"
      >
        <Icon name="check" />
      </span>
    </button>
  );
}

function ratingFromPointer(clientX: number, element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.max(0.5, Math.ceil(progress * 10) / 2);
}
