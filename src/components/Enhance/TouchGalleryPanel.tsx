import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as eh from "../../eh/dom";
import type { GalleryFavoriteInfo, GalleryFavoriteOption, GalleryInfo, GalleryTagGroup } from "../../eh/dom";
import { requestText } from "../../utils";
import { DomNode, DomNodes } from "./Misc";

export const TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS = "ehpeek-touch-gallery-actions-menu-item control-touch-menu-item text-21px leading-[1.2]";
export const TOUCH_GALLERY_TAG_CLASS = "ehpeek-touch-gallery-tag control-tag color-tag text-23px";

export function TouchGalleryPanel(props: {
  onPrimaryActionMount: (mount: HTMLElement | null) => void;
  source: GalleryInfo;
}) {
  const rootRef = useRef<HTMLElement>(null);
  const categoryClassName =
    "ehpeek-touch-gallery-category min-w-0 self-center overflow-hidden text-ellipsis whitespace-nowrap py-6px px-12px text-17px font-700 leading-[1.1] uppercase " +
    (props.source.categoryClassName || "bg-[#34353b] color-accent");

  useEffect(() => {
    if (rootRef.current) {
      prepareRatingScale(rootRef.current);
    }
  }, []);

  return (
    <section ref={rootRef} className="ehpeek-touch-gallery flex box-border w-full flex-col mb-12px color-text font-sans">
      <div className="ehpeek-touch-gallery-hero relative grid h-[clamp(260px,42vh,340px)] pt-18px pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] color-surface color-text">
        <div className="ehpeek-touch-gallery-summary grid h-full min-h-0 grid-cols-[36%_minmax(0,1fr)] gap-18px items-start">
          <div className="ehpeek-touch-gallery-cover flex self-center justify-self-center w-auto max-w-full h-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden">
            <DomNode node={props.source.cover} />
          </div>
          <div className="ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 min-h-0 flex-col items-start gap-10px pt-2px">
            <div className="ehpeek-touch-gallery-heading flex min-w-0 min-h-0 w-full flex-col gap-6px items-start overflow-hidden">
              <div className="ehpeek-touch-gallery-title-main line-clamp-4 overflow-hidden text-22px text-[clamp(22px,5.9vw,32px)] font-400 leading-[1.1] text-left break-anywhere">
                {props.source.titleMain}
              </div>
              <div className="ehpeek-touch-gallery-title-sub line-clamp-3 overflow-hidden opacity-88 text-[clamp(17px,4.6vw,25px)] leading-[1.15] text-left break-anywhere">
                {props.source.titleSub}
              </div>
            </div>
            <div className="ehpeek-touch-gallery-category-row flex w-full min-h-64px gap-4px items-center mt-auto">
              <div className={categoryClassName}>{props.source.category}</div>
              <DomNode node={props.source.rating} />
            </div>
          </div>
        </div>
      </div>
      <div className="ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-[var(--ehpeek-control-primary-height)] mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-visible rounded-[var(--ehpeek-control-radius-sm)] color-panel-primary">
        <TouchGalleryFavoriteButton source={props.source.favorite} />
        <div
          className="ehpeek-touch-gallery-primary-actions flex min-w-0 border-l border-[rgba(255,255,255,0.12)]"
          ref={(node: HTMLElement | null) => {
            props.onPrimaryActionMount(node);
          }}
        />
      </div>
      <div className="ehpeek-touch-gallery-content flex flex-col gap-16px pt-28px pr-[max(16px,env(safe-area-inset-right,0px))] pb-18px pl-[max(16px,env(safe-area-inset-left,0px))] bg-[#34353b]">
        <div className="ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-14px gap-x-18px items-center text-27px leading-[1.2] text-center">
          {props.source.summary.map((item) => (
            <div className="ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal">
              {item.value}
            </div>
          ))}
          <TouchGalleryActionsMenu actions={props.source.actions} />
        </div>
        {props.source.tagGroups.length > 0 && (
          <div className="ehpeek-touch-gallery-tag-groups flex flex-col gap-10px pt-2px">
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
        className="ehpeek-touch-gallery-actions-menu-button inline-flex control-icon items-center justify-center border-0 bg-transparent color-text text-28px leading-1"
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
        <div className="ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-[2147483644] flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border color-border rounded-[var(--ehpeek-control-radius-md)] color-elevated">
          <DomNodes nodes={props.actions} clone />
        </div>
      )}
    </div>
  );
}

function TouchGalleryTagGroup(props: { group: GalleryTagGroup }) {
  return (
    <section className="ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(88px,28%)_minmax(0,1fr)] gap-8px items-start">
      <div className="ehpeek-touch-gallery-tag-group-name control-tag-group color-tag-group text-21px">
        {props.group.namespace}
      </div>
      <div className="ehpeek-touch-gallery-tags flex flex-wrap gap-8px">
        <DomNodes nodes={props.group.tags} clone />
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
      setOptions(eh.parseGalleryFavoriteOptions(doc));
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
        className={`ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button control-primary-action textsize-lg font-700 normal-case ${favorited ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`}
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
          className={`ehpeek-touch-gallery-favorite-icon block mt-2px textsize-md font-600 opacity-78 normal-case leading-[1.15] ${favorited ? "color-accent" : "text-[#111]"}`}
          aria-hidden="true"
        >
          {favorited ? "♥" : "♡"}
        </span>
      </button>
      {open && (
        <div className="ehpeek-touch-gallery-favorite-panel absolute top-[calc(100%+8px)] left-0 z-[2147483644] flex w-[min(86vw,360px)] flex-col overflow-hidden border color-border rounded-[var(--ehpeek-control-radius-md)] color-elevated">
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
    <div className="ehpeek-touch-gallery-favorite-loading flex min-h-[var(--ehpeek-control-menu-item-min-height)] items-center gap-12px py-14px px-18px border-0 border-b color-border-subtle-b bg-transparent color-text font-inherit text-21px leading-[1.2] text-left">
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
      className={`ehpeek-touch-gallery-favorite-option flex min-h-[var(--ehpeek-control-menu-item-min-height)] items-center gap-12px py-14px px-18px border-0 border-b color-border-subtle-b bg-transparent color-text font-inherit text-21px leading-[1.2] text-left ${props.option.value === "favdel" ? "ehpeek-touch-gallery-favorite-option-remove" : ""}`}
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
        className={`ehpeek-touch-gallery-favorite-option-icon flex-none text-24px leading-1 ${props.option.value === "favdel" ? "text-[#111]" : "color-accent"}`}
        aria-hidden="true"
      >
        {props.option.value === "favdel" ? "♡" : "♥"}
      </span>
      <span>{props.option.label}</span>
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

  wrapper.style.setProperty("--ehpeek-rating-scale", String(scale));
  wrapper.style.setProperty("--ehpeek-rating-height", `${Math.ceil(scalerRect.height * scale)}px`);
}
