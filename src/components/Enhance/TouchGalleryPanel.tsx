import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as eh from "../../eh/dom";
import type { GalleryFavoriteInfo, GalleryFavoriteOption, GalleryInfo, GalleryTagGroup } from "../../eh/dom";
import { requestText } from "../../utils";
import { DomNode, DomNodes } from "./Misc";

export const TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS = "ehpeek-touch-gallery-actions-menu-item block box-border w-full min-h-lg py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline text-21px leading-[1.2]";

export function TouchGalleryPanel(props: {
  onPrimaryActionMount: (mount: HTMLElement | null) => void;
  source: GalleryInfo;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const categoryClassName =
    "ehpeek-touch-gallery-category min-w-0 self-center overflow-hidden text-ellipsis whitespace-nowrap py-sm px-md text-17px font-700 leading-[1.1] uppercase " +
    (props.source.categoryClassName || "ehp-color-site-page ehp-color-site-accent");

  useEffect(() => {
    if (rootRef.current) {
      prepareRatingScale(rootRef.current);
    }
  }, []);

  return (
    <section ref={rootRef} className="ehpeek-touch-gallery flex box-border w-full flex-col mb-md ehp-color-site-text font-sans">
      <div className="ehpeek-touch-gallery-hero relative grid h-[clamp(260px,42vh,340px)] pt-lg pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-surface ehp-color-site-text">
        <div className="ehpeek-touch-gallery-summary grid h-full min-h-0 grid-cols-[36%_minmax(0,1fr)] gap-lg items-start">
          <div className="ehpeek-touch-gallery-cover flex self-center justify-self-center w-auto max-w-full h-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden">
            <DomNode node={props.source.cover} />
          </div>
          <div className="ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 min-h-0 flex-col items-start gap-md pt-2px">
            <div className="ehpeek-touch-gallery-heading flex min-w-0 min-h-0 w-full flex-col gap-sm items-start overflow-hidden">
              <div
                className="ehpeek-touch-gallery-title-main line-clamp-4 overflow-hidden text-22px text-[clamp(22px,5.9vw,32px)] font-400 leading-[1.1] text-left break-anywhere"
                title={props.source.titleMain}
              >
                {props.source.titleMain}
              </div>
              <div
                className="ehpeek-touch-gallery-title-sub line-clamp-3 overflow-hidden opacity-88 text-[clamp(17px,4.6vw,25px)] leading-[1.15] text-left break-anywhere"
                title={props.source.titleSub}
              >
                {props.source.titleSub}
              </div>
            </div>
            <div className="ehpeek-touch-gallery-category-row flex w-full min-h-64px gap-xs items-center mt-auto">
              <div className={categoryClassName}>{props.source.category}</div>
              <DomNode node={props.source.rating} />
            </div>
          </div>
        </div>
      </div>
      <div className="ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-87px mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-visible rounded-xs bg-[var(--color-site-elevated)] shadow-[0_2px_10px_var(--color-shadow-panel)]">
        <TouchGalleryFavoriteButton source={props.source.favorite} />
        <div
          className="ehpeek-touch-gallery-primary-actions flex min-w-0 border-l border-[var(--color-site-border-subtle)]"
          ref={(node: HTMLElement | null) => {
            props.onPrimaryActionMount(node);
          }}
        />
      </div>
      <div className="ehpeek-touch-gallery-content flex flex-col gap-lg pt-xl pr-[max(16px,env(safe-area-inset-right,0px))] pb-lg pl-[max(16px,env(safe-area-inset-left,0px))] ehp-color-site-page ehp-color-site-text">
        <div className="ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-md gap-x-lg items-center text-27px leading-[1.2] text-center">
          {props.source.summary.map((item) => (
            <div className="ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal">
              {item.value}
            </div>
          ))}
          <TouchGalleryActionsMenu actions={props.source.actions} />
        </div>
        {props.source.tagGroups.length > 0 && (
          <div className="ehpeek-touch-gallery-tag-groups flex flex-col gap-md pt-2px">
            {props.source.tagGroups.map((group) => (
              <TouchGalleryTagGroup group={group} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function TouchGalleryActionsMenu(props: { actions: HTMLElement[] }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && rootRef.current?.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  return (
    <div ref={rootRef} className="ehpeek-touch-gallery-actions-menu relative flex min-w-0 items-center justify-center">
      <button
        type="button"
        className="ehpeek-touch-gallery-actions-menu-button inline-flex w-md h-md items-center justify-center border-0 bg-transparent ehp-color-site-text text-28px leading-1"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen(!open);
        }}
      >
        ⋮
      </button>
      {open && (
        <div className="ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-overlay flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
          <DomNodes nodes={props.actions} clone />
        </div>
      )}
    </div>
  );
}

function TouchGalleryTagGroup(props: { group: GalleryTagGroup }) {
  return (
    <section className="ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(76px,20%)_minmax(0,1fr)] gap-sm items-start">
      <div className="ehpeek-touch-gallery-tag-group-name min-h-sm overflow-hidden text-ellipsis whitespace-nowrap rounded-xl bg-[var(--color-site-elevated)] py-sm px-md text-center lowercase ehp-color-site-accent textsize-lg font-600">
        {props.group.namespace}
      </div>
      <div className="ehpeek-touch-gallery-tags flex flex-wrap gap-sm">
        {props.group.tags.map((tag) => (
          <a
            className="ehpeek-touch-gallery-tag inline-flex max-w-full min-h-lg items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-xl border border-[var(--color-site-border-subtle)] bg-[var(--color-site-surface)] px-lg no-underline ehp-color-site-text textsize-lg transition-[border-color,background-color,color] duration-120 hover:border-[var(--color-site-border)] hover:bg-[var(--color-site-accent-hover)] hover:ehp-color-site-accent"
            href={tag.href}
            style={tag.appearance}
          >
            {tag.label}
          </a>
        ))}
      </div>
    </section>
  );
}

function TouchGalleryFavoriteButton(props: { source: GalleryFavoriteInfo }) {
  const [favorite, setFavorite] = useState(() => ({ ...props.source }));
  const [open, setOpen] = useState(false);
  const [loadingState, setLoadingState] = useState<"idle" | "loading" | "failed">("idle");
  const [options, setOptions] = useState<GalleryFavoriteOption[]>([]);
  const rootRef = useRef<HTMLDivElement>(null);
  const favorited = favorite.favorited;

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && rootRef.current?.contains(event.target)) {
        return;
      }

      setOpen(false);
    };

    document.addEventListener("click", onClick);

    return () => {
      document.removeEventListener("click", onClick);
    };
  }, []);

  const openMenu = async () => {
    if (!favorite.actionUrl) {
      return;
    }

    setOpen(true);
    setLoadingState("loading");

    try {
      const html = await requestText(favorite.actionUrl);
      const doc = new DOMParser().parseFromString(html, "text/html");
      setOptions(eh.parseGalleryFavoriteOptions(doc, favorite.favorited));
      setLoadingState("idle");
    } catch (error) {
      console.error("[ehpeek]", error);
      setLoadingState("failed");
    }
  };

  return (
    <div ref={rootRef} className="ehpeek-touch-gallery-favorite-menu relative z-2 min-w-0">
      <button
        type="button"
        className={`ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button flex min-w-0 w-full h-full min-h-xl flex-col items-center justify-center gap-md py-md px-lg border-0 bg-transparent ehp-color-site-accent text-center uppercase [touch-action:manipulation] textsize-xl font-700 normal-case ${favorited ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          if (open) {
            setOpen(false);
          } else {
            void openMenu();
          }
        }}
      >
        <span className="block leading-[1.15]">{favorite.label}</span>
        <span
          className={`ehpeek-touch-gallery-favorite-icon block mt-2px textsize-lg font-600 opacity-78 normal-case leading-[1.15] ${favorited ? "ehp-color-site-accent" : "ehp-color-site-text"}`}
          aria-hidden="true"
        >
          {favorited ? "♥" : "♡"}
        </span>
      </button>
      {open && (
        <div className="ehpeek-touch-gallery-favorite-panel absolute top-[calc(100%+8px)] left-0 z-overlay flex w-[min(86vw,360px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated">
          {loadingState === "loading" && <TouchGalleryFavoriteStatus text="Loading..." />}
          {loadingState === "failed" && <TouchGalleryFavoriteStatus text="Failed" />}
          {loadingState === "idle" &&
            options.map((option) => (
              <TouchGalleryFavoriteOption
                actionUrl={favorite.actionUrl}
                option={option}
                onApplied={() => {
                  setFavorite({
                    ...favorite,
                    favorited: option.value !== "favdel",
                    label: option.value === "favdel" ? "Not Favorited" : option.label,
                  });
                  setOpen(false);
                }}
              />
            ))}
        </div>
      )}
    </div>
  );
}

function TouchGalleryFavoriteStatus(props: { text: string }) {
  return (
    <div className="ehpeek-touch-gallery-favorite-loading flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit text-21px leading-[1.2] text-left">
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
      className={`ehpeek-touch-gallery-favorite-option flex min-h-lg items-center gap-md py-md px-lg border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text font-inherit text-21px leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`}
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
        className={`ehpeek-touch-gallery-favorite-option-icon flex-none text-24px leading-1 ${props.option.value === "favdel" ? "ehp-color-site-text" : "ehp-color-site-accent"}`}
        aria-hidden="true"
      >
        {props.option.value === "favdel" ? "♡" : "♥"}
      </span>
      <span>{props.option.label}</span>
      <span
        className={`ml-auto flex-none ehp-color-site-accent text-24px font-700 leading-1 ${props.option.selected ? "visible" : "invisible"}`}
        aria-hidden="true"
      >
        ✓
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

function prepareRatingScale(root: HTMLElement): void {
  const wrapper = root.querySelector<HTMLElement>(".ehpeek-touch-gallery-rating");
  const scaler = root.querySelector<HTMLElement>(".ehpeek-touch-gallery-rating-scale");

  if (!wrapper || !scaler) {
    return;
  }

  const wrapperWidth = wrapper.getBoundingClientRect().width;
  const scalerRect = scaler.getBoundingClientRect();
  const scale = scalerRect.width > 0 && wrapperWidth > 0 ? Math.min(2, Math.max(1, wrapperWidth / scalerRect.width)) : 1;

  wrapper.style.setProperty("--rating-scale", String(scale));
  wrapper.style.setProperty("--rating-height", `${Math.ceil(scalerRect.height * scale)}px`);
}
