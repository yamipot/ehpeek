import {
  type Accessor,
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
import { sharedApply, type GalleryInfoDom, type GalleryInfoTagGroup } from "../../eh";
import texts from "../../i18n";
import { state } from "../../state";
import { refreshMyTags } from "../Enhance/MyTags";
import { WelcomeIcon } from "../WelcomeIcon";
import { Dialog } from "../Widgets/Dialog";
import { DomNode, DomNodes } from "../Widgets/ExternalDom";
import { Icon } from "../Widgets/Icon";

const RATING_STAR_INDEXES = [0, 1, 2, 3, 4];
const RATING_ACTION_BUTTON_CLASS =
  "flex w-full min-h-[var(--ui-control-size-md)] items-center justify-center ui-py-xs ui-px-md ui-rounded-md border cursor-pointer font-inherit text-center textsize-md font-700 leading-[1.1] transition-[filter,transform,box-shadow] duration-120 active:scale-98 disabled:opacity-50 disabled:cursor-default";
const GALLERY_FAVORITE_ROW_CLASS =
  "flex box-border w-full ui-hit-min-h-md items-center ui-gap-md ui-py-xs ui-px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit textsize-md leading-[1.2] text-left";
const GALLERY_FAVORITE_ICON_SIZE = "var(--ui-icon-size-lg)";
const TAG_NAMESPACE_PREFIXES: Readonly<Record<string, string>> = {
  artist: "a",
  character: "c",
  cosplayer: "cos",
  female: "f",
  group: "g",
  language: "l",
  location: "loc",
  male: "m",
  mixed: "x",
  other: "o",
  parody: "p",
  reclass: "r",
};

function exactTagQuery(name: string): string {
  const separator = name.indexOf(":");
  if (separator < 0) {
    return `tag:${name}$`;
  }
  const namespace = name.slice(0, separator).toLowerCase();
  const prefix = TAG_NAMESPACE_PREFIXES[namespace] ?? namespace;
  return `${prefix}:${name.slice(separator + 1)}$`;
}

type GalleryPanelTagGroup = GalleryInfoTagGroup;

export function GalleryInfoPanel(props: {
  leftHandedControls: Accessor<boolean>;
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
  let ratingPointerType = "";
  const hasNewTag = () => source.elems.newTag !== null;
  const displayedRating = createMemo(() => ratingPreview() ?? ratingValue());
  const closeRatingPicker = () => {
    setRatingPreview(null);
    setRatingPickerOpen(false);
  };
  const ratingLabel = createMemo(() => {
    const preview = ratingPreview();
    if (preview !== null) {
      return `Rate as ${preview.toFixed(1)} stars`;
    }
    return ratingSubmitted()
      ? `Rated ${ratingValue().toFixed(1)} stars`
      : ratingValueLabel();
  });
  const previewRatingFromPointer = (event: PointerEvent): void => {
    if (event.pointerType !== "mouse") {
      return;
    }
    setRatingPreview(
      ratingFromPointer(
        event.clientX,
        event.currentTarget as HTMLElement,
      ),
    );
  };

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
      source.handle.openGalleryTagMenu(tag);
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
    <section class="flex box-border w-full flex-col ui-mb-sm ehp-color-site-text font-sans">
      <div class="ehpeek-touch-gallery-summary-container relative grid min-h-[clamp(130px,21vh,170px)] ui-pt-sm safe-pr-sm safe-pl-sm ehp-color-site-surface ehp-color-site-text">
        <div
          class={`ehpeek-touch-gallery-summary grid ui-gap-sm items-stretch ${hasCover ? "ehpeek-touch-gallery-summary-has-cover" : "grid-cols-1"}`}
        >
          {hasCover && (
            <div class="ehpeek-touch-gallery-summary-cover flex self-center justify-self-stretch w-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden rounded-3px">
              <DomNode node={source.elems.cover} />
            </div>
          )}
          <div class="ehpeek-touch-gallery-summary-details flex self-stretch min-w-0 flex-col items-start ui-gap-xs pt-1px">
            <div class="flex min-w-0 w-full flex-none flex-col ui-gap-xs items-start pb-2px">
              <div class="line-clamp-4 flex-none overflow-hidden [font-size:var(--ui-font-size-lg)] font-400 leading-[1.16] text-left break-anywhere">
                {source.data.titleMain}
              </div>
              <div class="line-clamp-3 flex-none overflow-hidden opacity-82 textsize-md leading-[1.2] text-left break-anywhere">
                {source.data.titleSub}
              </div>
            </div>
            <div class="flex min-w-0 max-w-full flex-none items-center ui-gap-sm">
              <a
                class="box-border flex-none whitespace-nowrap ui-rounded-xs border border-solid ui-py-xs ui-px-xs text-center textsize-md font-700 leading-[1.1] uppercase no-underline hover:no-underline active:no-underline"
                href={source.data.categoryUrl ?? undefined}
                style={source.data.categoryAppearance}
              >
                {source.data.category}
              </a>
              {source.data.uploader && (
                <a
                  class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap opacity-82 textsize-md font-700 leading-[1.1] no-underline hover:underline active:underline"
                  href={source.data.uploaderUrl}
                >
                  {source.data.uploader}
                </a>
              )}
            </div>
            {rating && (
                <button
                  type="button"
                  class="flex w-[65%] max-w-full flex-none self-end flex-col items-end ui-gap-xs mt-auto p-0 border-0 bg-transparent ehp-color-site-text font-inherit text-right cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:ui-rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"
                  aria-label={texts.gallery.rate}
                  onClick={() => {
                    const preview = ratingPointerType === "mouse"
                      ? ratingPreview()
                      : null;
                    ratingPointerType = "";
                    if (preview !== null) {
                      submitRating(preview);
                      return;
                    }
                    setRatingPreview(null);
                    setRatingPickerOpen(true);
                  }}
                  onBlur={() => {
                    setRatingPreview(null);
                  }}
                  onPointerCancel={() => {
                    ratingPointerType = "";
                    setRatingPreview(null);
                  }}
                  onPointerDown={(event: PointerEvent) => {
                    ratingPointerType = event.pointerType;
                    if (event.pointerType !== "mouse") {
                      setRatingPreview(null);
                    }
                  }}
                >
                  <div
                    class="relative inline-flex [&_.ehpeek-icon]:w-[var(--ui-icon-size-lg)] [&_.ehpeek-icon]:h-[var(--ui-icon-size-lg)]"
                    onPointerDown={previewRatingFromPointer}
                    onPointerMove={previewRatingFromPointer}
                    onPointerLeave={() => setRatingPreview(null)}
                  >
                    <span
                      class="flex gap-1px text-[var(--color-muted)] opacity-40"
                      aria-hidden="true"
                    >
                      <For each={RATING_STAR_INDEXES}>
                        {() => <Icon name="star" />}
                      </For>
                    </span>
                    <span
                      class={`absolute top-0 left-0 flex gap-1px overflow-hidden ${ratingSubmitted() ? "text-[var(--color-rating-submitted)]" : "ehp-color-site-accent"}`}
                      aria-hidden="true"
                      style={{ width: `${(displayedRating() / 5) * 100}%` }}
                    >
                      <For each={RATING_STAR_INDEXES}>
                        {() => <Icon name="star" filled />}
                      </For>
                    </span>
                  </div>
                  <div class="flex items-center justify-end ui-gap-xs text-[var(--color-muted)] [font-size:var(--ui-font-size-lg)] leading-[1.15] whitespace-nowrap">
                    <span aria-live="polite">
                      {ratingLabel()}
                    </span>
                    {ratingCount() && (
                      <span class="flex-none ui-pl-xs border-0 border-l border-[var(--color-site-border-subtle)] opacity-75">
                        {ratingCount()}
                      </span>
                    )}
                  </div>
                </button>
            )}
          </div>
          <div
            class="ehpeek-touch-gallery-primary-actions relative z-1 grid grid-cols-[1fr_1fr] min-h-[var(--ui-control-size-xl)] overflow-visible ui-rounded-xs bg-[var(--color-site-elevated)] shadow-[0_2px_10px_var(--color-shadow-panel)]"
            classList={{ "[direction:rtl]": props.leftHandedControls() }}
            onDragStart={(event: DragEvent) => event.preventDefault()}
          >
            <div class="contents [direction:ltr]">
              <TouchGalleryFavoriteButton source={source} />
            </div>
            <div
              class="flex min-w-0 border-0 border-solid border-[var(--color-site-page)] [direction:ltr]"
              classList={{
                "border-r-6": props.leftHandedControls(),
                "border-l-6": !props.leftHandedControls(),
              }}
            >
              {props.primaryAction}
            </div>
          </div>
        </div>
      </div>
      <div class="flex flex-col ui-gap-sm ui-pt-md safe-pr-sm ui-pb-sm safe-pl-sm ehp-color-site-page ehp-color-site-text">
        <div class="grid grid-cols-[repeat(3,minmax(0,1fr))] ui-gap-y-sm ui-gap-x-sm items-center [font-size:var(--ui-font-size-lg)] leading-[1.2] text-center">
          <For each={source.data.summary}>{(item) => (
            <div class="line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal">
              {item.value}
            </div>
          )}</For>
          <TouchGalleryActionsMenu items={source.elems.actionItems} />
        </div>
        {(tagGroups().length > 0 || hasNewTag()) && (
          <div
            class="flex flex-col pt-2px"
            onDragStart={(event: DragEvent) => event.preventDefault()}
          >
            <button
              type="button"
              class={`inline-flex self-end ui-hit-min-h-xs items-center justify-center ui-gap-sm ui-mb-xs ui-rounded-xl border-0 ui-px-md font-inherit font-700 textsize-sm cursor-pointer transition-[background-color,color] duration-120 ${tagging() ? "bg-[var(--color-site-accent-hover)] ehp-color-site-accent" : "bg-[var(--color-site-surface)] ehp-color-site-text"}`}
              aria-pressed={tagging()}
              onClick={() => {
                setTagging((enabled) => !enabled);
              }}
            >
              <span>{texts.gallery.tagging}</span>
              <span
                class={`block flex-none ui-w-md ui-h-md rounded-full ${tagging() ? "bg-[var(--color-state-on)]" : "bg-[var(--color-state-off)]"}`}
                aria-hidden="true"
              />
            </button>
            <Show when={tagGroups().length > 0}>
              <div class="grid min-w-0 w-full grid-cols-[max-content_minmax(0,1fr)] items-start ui-gap-x-xs ui-gap-y-sm">
                <For each={tagGroups()}>{(group) => (
                  <TouchGalleryTagGroup
                    group={group}
                    tagging={tagging()}
                    onTagOpen={openTagMenu}
                  />
                )}</For>
              </div>
            </Show>
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
        <Dialog
          bodyClass="flex flex-col ui-gap-lg ui-pt-lg ui-px-lg"
          label={texts.gallery.rate}
          lockPageScroll
          onClose={closeRatingPicker}
          title={texts.gallery.rate}
          variant="site"
          width="md"
        >
          <button
            type="button"
            class="relative inline-flex self-center max-w-full overflow-hidden p-0 border-0 bg-transparent cursor-pointer select-none [touch-action:manipulation] [-webkit-tap-highlight-color:transparent] focus-visible:ui-rounded-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-site-accent)] focus-visible:outline-offset-3px"
            aria-label={texts.gallery.rateWithStars.replace(
              "{rating}",
              displayedRating().toFixed(1),
            )}
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
                {() => <Icon name="star" size="var(--ui-control-size-lg)" />}
              </For>
            </span>
            <span
              class={`absolute top-0 left-0 flex gap-1px overflow-hidden pointer-events-none ${ratingSubmitted() || ratingPreview() !== null ? "text-[var(--color-rating-submitted)]" : "ehp-color-site-accent"}`}
              aria-hidden="true"
              style={{ width: `${(displayedRating() / 5) * 100}%` }}
            >
              <For each={RATING_STAR_INDEXES}>
                {() => <Icon name="star" size="var(--ui-control-size-lg)" filled />}
              </For>
            </span>
          </button>
          <div
            class="text-center textsize-md font-700"
            aria-live="polite"
          >
            {ratingLabel()}
          </div>
          <div class="grid grid-cols-2 ui-gap-sm ui-pt-md border-0 border-t border-t-[var(--color-site-border-subtle)]">
            <button
              type="button"
              class={`${RATING_ACTION_BUTTON_CLASS} border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108`}
              disabled={ratingPreview() === null}
              onClick={() => {
                const value = ratingPreview();
                if (value !== null && submitRating(value)) {
                  setRatingPickerOpen(false);
                }
              }}
            >
              {texts.common.actions.submit}
            </button>
            <button
              type="button"
              class={`${RATING_ACTION_BUTTON_CLASS} border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]`}
              onClick={closeRatingPicker}
            >
              {texts.common.actions.close}
            </button>
          </div>
        </Dialog>
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
      class="relative flex min-w-0 items-center justify-center"
    >
      <button
        type="button"
        class="inline-flex w-[var(--ui-control-size-md)] h-[var(--ui-control-size-md)] items-center justify-center border-0 bg-transparent ehp-color-site-text"
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
        <div class="absolute top-[calc(var(--ui-control-size-md)+var(--ui-space-sm))] right-0 z-overlay flex w-[min(78vw,calc(var(--ui-control-size-xl)*4))] flex-col overflow-hidden border ehp-color-site-border ui-rounded-sm ehp-color-site-elevated">
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
    <section class="contents">
      <div class="box-border min-h-[var(--ui-control-size-sm)] whitespace-nowrap ui-rounded-xl bg-[var(--color-site-elevated)] ui-py-xs ui-px-md text-center lowercase ehp-color-site-accent textsize-md font-600">
        {props.group.namespace}
      </div>
      <div
        class="flex flex-wrap ui-gap-xs"
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
      class="ehpeek-touch-gallery-tag inline-flex flex-none box-border max-w-full min-h-[var(--ui-control-size-sm)] items-center overflow-hidden text-ellipsis whitespace-nowrap appearance-none m-0 py-0 ui-rounded-xl border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] ui-px-lg ehp-color-site-text font-inherit font-700 textsize-md cursor-pointer select-text no-underline transition-[border-color,background-color,color] duration-120 hover:border-[var(--color-site-border)] hover:bg-[var(--color-site-accent-hover)] hover:ehp-color-site-accent"
      style={{
        "background-color": props.tag.appearance.backgroundColor,
        "border-color": props.tag.appearance.borderColor,
        color: props.tag.appearance.color,
      }}
      aria-label={props.tag.label}
      draggable={false}
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
  const [collectionOpen, setCollectionOpen] = createSignal(false);
  const [tagMode, setTagMode] = createSignal<MyTagMode>("marked");
  const [updating, setUpdating] = createSignal(false);
  const [favoriteTag, setFavoriteTag] = createSignal<
    GalleryPanelTagGroup["tags"][number] | null
  >(null);
  const closeFavoriteTagDialog = () => {
    setCollectionOpen(false);
    setFavoriteDialogOpen(false);
  };

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
        class={`fixed inset-0 z-overlay flex items-center justify-center ui-p-lg bg-black/65 transition-opacity duration-120 ${props.tag ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"}`}
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
          class="box-border flex w-full max-w-[calc(var(--ui-control-size-xl)*5.25)] max-h-[calc(100dvh-(var(--ui-space-lg)*2))] flex-col overflow-x-hidden overflow-y-auto overscroll-contain whitespace-nowrap border ehp-color-site-border ui-rounded-md ehp-color-site-elevated shadow-xl"
          role="menu"
          onClick={() => {
            if (!updating()) {
              props.onClose();
            }
          }}
        >
          <Show
            when={!updating()}
            fallback={<WelcomeIcon embedded label={texts.common.status.loading} showIcon={false} />}
          >
            <DomNode node={props.source.elems.tagMenuAction} />
            <Show when={props.tag}>{(tag) => (
              <button
                type="button"
                class={sharedApply.galleryTagMenuItem}
                role="menuitem"
                onClick={(event) => {
                  event.stopPropagation();
                  void navigator.clipboard.writeText(exactTagQuery(tag().name)).then(
                    onClose,
                    (error: unknown) => {
                      console.error("[ehpeek] Copy gallery tag failed", error);
                      window.alert(
                        error instanceof Error ? error.message : texts.errors.loadFailed,
                      );
                    },
                  );
                }}
              >
                <Icon name="copy" />
                <span>{texts.gallery.copyOriginalTag}</span>
              </button>
            )}</Show>
            <Show when={state.gallery.myTags.value}>
              <Show when={props.tag}>{(tag) => (
                <Show
                  when={!tag().myTag}
                  fallback={
                    <button
                      type="button"
                      class={sharedApply.galleryTagMenuItem}
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
                    class={sharedApply.galleryTagMenuItem}
                    role="menuitem"
                    onClick={() => {
                      setFavoriteTag(tag());
                      setCollectionOpen(false);
                      setFavoriteDialogOpen(true);
                    }}
                  >
                    <Icon name="heart" />
                    <span>{texts.gallery.favoriteTag}</span>
                  </button>
                </Show>
              )}</Show>
            </Show>
          </Show>
        </div>
      </div>
      <Show when={favoriteDialogOpen()}>
        <Dialog
          bodyClass="flex flex-col ui-gap-lg ui-pt-lg ui-px-lg"
          label={texts.gallery.favoriteTag}
          lockPageScroll
          onClose={closeFavoriteTagDialog}
          title={texts.gallery.favoriteTag}
          variant="site"
          width="md"
        >
          <Show
            when={!updating()}
            fallback={<WelcomeIcon embedded label={texts.common.status.loading} showIcon={false} />}
          >
              <div class="flex flex-col ui-gap-sm ehp-color-site-text textsize-md font-600">
                <span>{texts.gallery.tagCollection}</span>
                <div class="relative">
                  <button
                    type="button"
                    class="flex box-border w-full min-h-[var(--ui-control-size-md)] items-center justify-between ui-gap-md ui-rounded-md border ehp-color-site-border !bg-transparent hover:!bg-[var(--color-site-item-hover)] active:!bg-[var(--color-site-item-hover)] ehp-color-site-text ui-px-md font-inherit text-left textsize-md cursor-pointer"
                    aria-haspopup="listbox"
                    aria-expanded={collectionOpen()}
                    onClick={() => setCollectionOpen((open) => !open)}
                  >
                    <span class="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap">
                      {tagSets.find((option) => option.value === selectedTagSet())?.label ?? selectedTagSet()}
                    </span>
                    <span class="flex-none" aria-hidden="true">{collectionOpen() ? "▴" : "▾"}</span>
                  </button>
                  <Show when={collectionOpen()}>
                    <div class="absolute top-full left-0 right-0 z-2 ui-mt-xs max-h-240px overflow-y-auto overscroll-contain ui-rounded-md border ehp-color-site-border ehp-color-site-elevated shadow-xl" role="listbox" aria-label={texts.gallery.tagCollection}>
                      <For each={tagSets}>{(option) => (
                        <button
                          type="button"
                          class={`flex box-border w-full min-h-[var(--ui-control-size-md)] items-center justify-between ui-gap-md ui-px-md border-0 border-b last:border-b-0 ehp-color-site-border-subtle-b ehp-color-site-text font-inherit text-left textsize-md cursor-pointer ${selectedTagSet() === option.value ? "bg-[var(--color-site-item-hover)] font-700" : "!bg-transparent hover:!bg-[var(--color-site-item-hover)]"}`}
                          role="option"
                          aria-selected={selectedTagSet() === option.value}
                          onClick={() => {
                            setSelectedTagSet(option.value);
                            setCollectionOpen(false);
                          }}
                        >
                          <span>{option.label}</span>
                          <Show when={selectedTagSet() === option.value}>
                            <Icon name="check" />
                          </Show>
                        </button>
                      )}</For>
                    </div>
                  </Show>
                </div>
              </div>
              <div class="flex flex-col ui-gap-sm ehp-color-site-text textsize-md font-600">
                <span>{texts.gallery.tagBehavior}</span>
                <div class="overflow-hidden ui-rounded-md border ehp-color-site-border" role="radiogroup" aria-label={texts.gallery.tagBehavior}>
                  <For each={([
                    ["marked", texts.gallery.markTag],
                    ["watched", texts.gallery.watchTag],
                    ["hidden", texts.gallery.hideTag],
                  ] as const)}>{([value, label]) => (
                    <button
                      type="button"
                      class={`flex box-border w-full min-h-[var(--ui-control-size-md)] items-center justify-between ui-gap-md ui-px-md border-0 border-b last:border-b-0 ehp-color-site-border-subtle-b ehp-color-site-text font-inherit text-left textsize-md cursor-pointer ${tagMode() === value ? "bg-[var(--color-site-item-hover)] font-700" : "!bg-transparent hover:!bg-[var(--color-site-item-hover)]"}`}
                      role="radio"
                      aria-checked={tagMode() === value}
                      onClick={() => setTagMode(value)}
                    >
                      <span>{label}</span>
                      <Show when={tagMode() === value}>
                        <Icon name="check" />
                      </Show>
                    </button>
                  )}</For>
                </div>
              </div>
              <div class="grid grid-cols-2 ui-gap-md">
                <button
                  type="button"
                  class={`${RATING_ACTION_BUTTON_CLASS} border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] text-[var(--color-site-text)] hover:bg-[var(--color-site-item-hover)]`}
                  onClick={closeFavoriteTagDialog}
                >
                  {texts.common.actions.close}
                </button>
                <button
                  type="button"
                  class={`${RATING_ACTION_BUTTON_CLASS} ui-gap-md border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] shadow-[0_2px_8px_var(--color-shadow-panel)] hover:brightness-108`}
                  onClick={() => {
                    const tag = favoriteTag();
                    if (tag) {
                      void updateFavoriteTag(tag);
                    }
                  }}
                >
                  <Icon name="heart" />
                  <span>{texts.common.actions.confirm}</span>
                </button>
              </div>
          </Show>
        </Dialog>
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
  const [note, setNote] = createSignal("");
  const [noteDraft, setNoteDraft] = createSignal("");
  const [editingNote, setEditingNote] = createSignal(false);
  const favorited = () => favorite().favorited;
  const closeMenu = () => {
    if (
      noteDraft() !== note() &&
      !window.confirm(texts.gallery.discardFavoriteNote)
    ) {
      return;
    }
    setNoteDraft(note());
    setEditingNote(false);
    setOpen(false);
  };

  const openMenu = async () => {
    const currentFavorite = favorite();

    if (!currentFavorite.actionUrl) {
      return;
    }

    setOpen(true);
    setEditingNote(false);
    setNote("");
    setNoteDraft("");
    setLoadingState("loading");

    try {
      const dialog = await props.source.handle.loadGalleryFavoriteDialog(
        currentFavorite.actionUrl,
        currentFavorite.favorited,
      );
      setOptions(dialog.options);
      setNote(dialog.note);
      setNoteDraft(dialog.note);
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
      await props.source.handle.updateGalleryFavorite(
        actionUrl,
        option.value,
        noteDraft(),
      );
      setFavorite({
        ...favorite(),
        color: option.color,
        favorited: option.value !== "favdel",
        label: option.value === "favdel"
          ? texts.gallery.notFavorited
          : option.label,
      });
      setNote(noteDraft());
      setLoadingState("idle");
      setOpen(false);
    } catch (error) {
      console.error("[ehpeek]", error);
      setLoadingState("failed");
    }
  };

  return (
    <div class="relative z-2 min-w-0">
      <button
        type="button"
        class="flex min-w-0 w-full h-full ui-hit-min-h-xl flex-col items-center justify-center ui-gap-xs ui-py-md ui-px-lg border-0 bg-transparent ehp-color-site-text text-center uppercase [touch-action:manipulation] [font-size:var(--ui-font-size-lg)] font-700 normal-case"
        style={{ color: favorite().color ?? undefined }}
        aria-haspopup="menu"
        aria-expanded={open()}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          if (open()) {
            closeMenu();
          } else {
            void openMenu();
          }
        }}
      >
        <span class="block leading-[1.15]">{favorite().label}</span>
        <span
          class="block opacity-78 normal-case"
          aria-hidden="true"
        >
          <Icon
            name="heart"
            size="var(--ui-icon-size-lg)"
            filled={favorited()}
          />
        </span>
      </button>
      <Show when={open()}>
        <Dialog
          label={favorite().label}
          onClose={closeMenu}
          title={editingNote() ? texts.gallery.editFavoriteNote : favorite().label}
          variant="site"
          width="md"
        >
          <Show when={loadingState() === "loading"}>
            <WelcomeIcon embedded label={texts.common.status.loading} showIcon={false} />
          </Show>
          <Show when={loadingState() === "failed"}>
            <TouchGalleryFavoriteStatus text={texts.common.status.failed} />
          </Show>
          <Show when={loadingState() === "idle"}>
            <Show
              when={editingNote()}
              fallback={
                <>
                  <For each={options().filter((option) => option.value !== "favdel")}>
                    {(option) => (
                      <TouchGalleryFavoriteOption
                        option={option}
                        onSelect={() => void updateFavorite(option)}
                      />
                    )}</For>
                  <button
                    type="button"
                    class={`${GALLERY_FAVORITE_ROW_CLASS} cursor-pointer`}
                    onClick={() => setEditingNote(true)}
                  >
                    <span class="flex-none ehp-color-site-text" aria-hidden="true">
                      <Icon name="edit" size={GALLERY_FAVORITE_ICON_SIZE} />
                    </span>
                    <span>{texts.gallery.editFavoriteNote}</span>
                  </button>
                  <For each={options().filter((option) => option.value === "favdel")}>
                    {(option) => (
                      <TouchGalleryFavoriteOption
                        option={option}
                        onSelect={() => void updateFavorite(option)}
                      />
                    )}</For>
                </>
              }
            >
              <div class="flex flex-col ui-gap-md ui-pt-lg ui-px-lg">
                <textarea
                  class="box-border min-h-[calc(var(--ui-control-size-xl)*3)] w-full resize-y ui-rounded-md border ehp-color-site-border bg-[var(--color-site-surface)] ui-p-md ehp-color-site-text font-inherit textsize-md leading-[1.4]"
                  value={noteDraft()}
                  onInput={(event) => setNoteDraft(event.currentTarget.value)}
                />
                <div class="grid grid-cols-1 ui-gap-md">
                  <button
                    type="button"
                    class="min-h-[var(--ui-control-size-md)] ui-rounded-md border border-[var(--color-site-accent)] bg-[var(--color-site-accent)] text-[var(--color-site-surface)] font-inherit textsize-md font-700"
                    onClick={() => setEditingNote(false)}
                  >
                    {texts.common.actions.confirm}
                  </button>
                </div>
              </div>
            </Show>
          </Show>
        </Dialog>
      </Show>
    </div>
  );
}

function TouchGalleryFavoriteStatus(props: { text: string }) {
  return (
    <div class={GALLERY_FAVORITE_ROW_CLASS}>
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
      class={`${GALLERY_FAVORITE_ROW_CLASS} cursor-pointer`}
      aria-pressed={props.option.selected}
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        props.onSelect();
      }}
    >
      <span
        class="flex-none ehp-color-site-text"
        style={{ color: props.option.color ?? undefined }}
        aria-hidden="true"
      >
        <Icon
          name="heart"
          size={GALLERY_FAVORITE_ICON_SIZE}
          filled={props.option.value !== "favdel"}
        />
      </span>
      <span>{props.option.label}</span>
      <span
        class={`ml-auto flex-none ehp-color-site-text ${props.option.selected ? "visible" : "invisible"}`}
        style={{ color: props.option.color ?? undefined }}
        aria-hidden="true"
      >
        <Icon name="check" size="var(--ui-icon-size-sm)" />
      </span>
    </button>
  );
}

function ratingFromPointer(clientX: number, element: HTMLElement): number {
  const rect = element.getBoundingClientRect();
  const progress = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  return Math.max(0.5, Math.ceil(progress * 10) / 2);
}
