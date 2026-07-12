import { h } from "../../jsx";
import * as eh from "../../eh/dom";
import type { GalleryInfo, GalleryTagGroup } from "../../eh/dom";

export const TOUCH_GALLERY_ACTION_MENU_ITEM_CLASS = "ehpeek-touch-gallery-actions-menu-item control-touch-menu-item text-21px leading-[1.2]";
export const TOUCH_GALLERY_TAG_CLASS = "ehpeek-touch-gallery-tag control-tag color-tag text-23px";

function textBlockDom(className: string, text: string): HTMLElement {
  const element = <div className={className} /> as HTMLElement;
  element.textContent = text;
  return element;
}

function touchGalleryPanelDom(source: GalleryInfo) {
  let primaryActions!: HTMLElement;
  const category = textBlockDom(
    "ehpeek-touch-gallery-category min-w-0 self-center overflow-hidden text-ellipsis whitespace-nowrap py-6px px-12px text-17px font-700 leading-[1.1] uppercase " +
      (source.categoryClassName || "bg-[#34353b] color-accent"),
    source.category,
  );
  const root = (
    <section className="ehpeek-touch-gallery flex box-border w-full flex-col mb-12px color-text font-sans">
      <div className="ehpeek-touch-gallery-hero relative grid h-[clamp(260px,42vh,340px)] pt-18px pr-[max(16px,env(safe-area-inset-right,0px))] pb-48px pl-[max(16px,env(safe-area-inset-left,0px))] color-surface color-text">
        <div className="ehpeek-touch-gallery-summary grid h-full min-h-0 grid-cols-[36%_minmax(0,1fr)] gap-18px items-start">
          <div className="ehpeek-touch-gallery-cover flex self-center justify-self-center w-auto max-w-full h-full max-h-full aspect-[2/3] items-center justify-center overflow-hidden">
            {source.cover}
          </div>
          <div className="ehpeek-touch-gallery-hero-side flex self-stretch min-w-0 min-h-0 flex-col items-start gap-10px pt-2px">
            <div className="ehpeek-touch-gallery-heading flex min-w-0 min-h-0 w-full flex-col gap-6px items-start overflow-hidden">
              {textBlockDom("ehpeek-touch-gallery-title-main line-clamp-4 overflow-hidden text-22px text-[clamp(22px,5.9vw,32px)] font-400 leading-[1.1] text-left break-anywhere", source.titleMain)}
              {textBlockDom("ehpeek-touch-gallery-title-sub line-clamp-3 overflow-hidden opacity-88 text-[clamp(17px,4.6vw,25px)] leading-[1.15] text-left break-anywhere", source.titleSub)}
            </div>
            <div className="ehpeek-touch-gallery-category-row flex w-full min-h-64px gap-4px items-center mt-auto">
              {category}
              {source.rating}
            </div>
          </div>
        </div>
      </div>
      <div className="ehpeek-touch-gallery-primary relative z-1 grid grid-cols-[1fr_1fr] min-h-[var(--ehpeek-control-primary-height)] mt--18px mr-[max(14px,env(safe-area-inset-right,0px))] ml-[max(14px,env(safe-area-inset-left,0px))] overflow-hidden rounded-[var(--ehpeek-control-radius-sm)] color-panel-primary">
        {touchGalleryFavoriteButtonDom(source)}
        <div
          className="ehpeek-touch-gallery-primary-actions flex min-w-0 border-l border-[rgba(255,255,255,0.12)]"
          ref={(node: HTMLElement) => {
            primaryActions = node;
          }}
        />
      </div>
      <div className="ehpeek-touch-gallery-content flex flex-col gap-16px pt-28px pr-[max(16px,env(safe-area-inset-right,0px))] pb-18px pl-[max(16px,env(safe-area-inset-left,0px))] bg-[#34353b]">
        <div className="ehpeek-touch-gallery-meta grid grid-cols-[repeat(3,minmax(0,1fr))] gap-y-14px gap-x-18px items-center text-27px leading-[1.2] text-center">
          {source.summary.map((item) => textBlockDom("ehpeek-touch-gallery-meta-value line-clamp-2 min-w-0 overflow-hidden whitespace-normal break-normal", item.value))}
          {touchGalleryActionsMenuDom(source.actions)}
        </div>
        {source.tagGroups.length > 0 && (
          <div className="ehpeek-touch-gallery-tag-groups flex flex-col gap-10px pt-2px">
            {source.tagGroups.map((group) => touchGalleryTagGroupDom(group))}
          </div>
        )}
      </div>
    </section>
  ) as HTMLElement;

  return {
    root,
    mountContinueButton(button: HTMLButtonElement) {
      primaryActions.append(button);
    },
    prepareRatingScale() {
      prepareRatingScale(root);
    },
  };
}

function touchGalleryActionsMenuDom(actions: HTMLElement[]): HTMLElement {
  let button!: HTMLButtonElement;
  let panel!: HTMLElement;
  const isOpen = () => panel.hidden === false;
  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    panel.style.display = open ? "" : "none";
    button.setAttribute("aria-expanded", String(open));
  };
  const menu = (
    <div className="ehpeek-touch-gallery-actions-menu relative flex min-w-0 items-center justify-center">
      <button
        type="button"
        className="ehpeek-touch-gallery-actions-menu-button inline-flex control-icon items-center justify-center border-0 bg-transparent color-text text-28px leading-1"
        aria-haspopup="menu"
        aria-expanded="false"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          setOpen(!isOpen());
        }}
        ref={(node: HTMLElement) => {
          button = node as HTMLButtonElement;
        }}
      >
        ⋮
      </button>
      <div
        className="ehpeek-touch-gallery-actions-menu-panel absolute top-48px right-0 z-[2147483644] flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border color-border rounded-[var(--ehpeek-control-radius-md)] color-elevated"
        hidden
        style="display: none;"
        ref={(node: HTMLElement) => {
          panel = node;
        }}
      />
    </div>
  ) as HTMLElement;

  panel.append(...actions);

  document.addEventListener("click", (event) => {
    if (event.target instanceof Element && menu.contains(event.target)) {
      return;
    }

    setOpen(false);
  });

  return menu;
}

function touchGalleryTagGroupDom(group: GalleryTagGroup): HTMLElement {
  return (
    <section className="ehpeek-touch-gallery-tag-group grid grid-cols-[minmax(88px,28%)_minmax(0,1fr)] gap-8px items-start">
      {textBlockDom("ehpeek-touch-gallery-tag-group-name control-tag-group color-tag-group text-21px", group.namespace)}
      <div className="ehpeek-touch-gallery-tags flex flex-wrap gap-8px">
        {group.tags}
      </div>
    </section>
  ) as HTMLElement;
}

function touchGalleryFavoriteButtonDom(source: GalleryInfo): HTMLButtonElement {
  return (
    <button
      type="button"
      className={`ehpeek-touch-gallery-primary-button control-primary-action textsize-lg font-700 ${source.favorite.favorited ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`}
      onClick={() => {
        eh.clickGalleryFavoriteAction();
      }}
    >
      <span className={`ehpeek-touch-gallery-favorite-icon flex-none text-30px leading-1 ${source.favorite.favorited ? "color-accent" : "text-[#111]"}`} aria-hidden="true">
        {source.favorite.favorited ? "♥" : "♡"}
      </span>
      <span>{source.favorite.label}</span>
    </button>
  ) as HTMLButtonElement;
}

export class TouchGalleryPanel {
  private dom: ReturnType<typeof touchGalleryPanelDom> | null = null;

  constructor(
    private readonly actionMenuItemClassName: string,
    private readonly tagClassName: string,
  ) {}

  install(): void {
    eh.installTouchGalleryPanelPageStyle();

    if (document.querySelector(".ehpeek-touch-gallery")) {
      return;
    }

    const source = eh.readGalleryInfo(this.actionMenuItemClassName, this.tagClassName);

    if (!source.available) {
      return;
    }

    this.dom = touchGalleryPanelDom(source);
    this.dom.prepareRatingScale();

    if (!eh.mountTouchGalleryPanel(this.dom.root)) {
      document.body.prepend(this.dom.root);
    }
  }

  mountContinueButton(button: HTMLButtonElement): boolean {
    if (!this.dom) {
      return false;
    }

    this.dom.mountContinueButton(button);
    return true;
  }
}

function prepareRatingScale(shell: HTMLElement): void {
  const wrapper = shell.querySelector<HTMLElement>(".ehpeek-touch-gallery-rating");
  const scaler = shell.querySelector<HTMLElement>(".ehpeek-touch-gallery-rating-scale");

  if (!wrapper || !scaler) {
    return;
  }

  const previousStyle = {
    position: shell.style.position,
    visibility: shell.style.visibility,
    pointerEvents: shell.style.pointerEvents,
    left: shell.style.left,
    top: shell.style.top,
    width: shell.style.width,
  };

  shell.style.position = "absolute";
  shell.style.visibility = "hidden";
  shell.style.pointerEvents = "none";
  shell.style.left = "0";
  shell.style.top = "0";
  shell.style.width = "100%";
  document.body.append(shell);

  const wrapperWidth = wrapper.getBoundingClientRect().width;
  const scalerRect = scaler.getBoundingClientRect();
  const scale = scalerRect.width > 0 && wrapperWidth > 0 ? Math.min(2, Math.max(1, wrapperWidth / scalerRect.width)) : 1;

  wrapper.style.setProperty("--ehpeek-rating-scale", String(scale));
  wrapper.style.setProperty("--ehpeek-rating-height", `${Math.ceil(scalerRect.height * scale)}px`);
  shell.remove();

  shell.style.position = previousStyle.position;
  shell.style.visibility = previousStyle.visibility;
  shell.style.pointerEvents = previousStyle.pointerEvents;
  shell.style.left = previousStyle.left;
  shell.style.top = previousStyle.top;
  shell.style.width = previousStyle.width;
}
