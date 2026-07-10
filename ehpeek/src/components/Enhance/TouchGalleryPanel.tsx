import { h } from "../../jsx";
import * as eh from "../../eh/dom";
import type { GalleryInfo, GalleryTagGroup } from "../../eh/dom";
import touchGalleryPanelCss from "./TouchGalleryPanel.css";

const STYLE_ID = "ehpeek-touch-gallery-panel-style";

function textBlockDom(className: string, text: string): HTMLElement {
  const element = <div className={className} /> as HTMLElement;
  element.textContent = text;
  return element;
}

function touchGalleryPanelDom(source: GalleryInfo) {
  let primaryActions!: HTMLElement;
  const category = textBlockDom(
    ["ehpeek-touch-gallery-category", source.categoryClassName || "ehpeek-touch-gallery-category-default"].join(" "),
    source.category,
  );
  const root = (
    <section className="ehpeek-touch-gallery">
      <div className="ehpeek-touch-gallery-hero">
        <div className="ehpeek-touch-gallery-summary">
          <div className="ehpeek-touch-gallery-cover">
            {source.cover}
          </div>
          <div className="ehpeek-touch-gallery-hero-side">
            <div className="ehpeek-touch-gallery-heading">
              {textBlockDom("ehpeek-touch-gallery-title-main", source.titleMain)}
              {textBlockDom("ehpeek-touch-gallery-title-sub", source.titleSub)}
            </div>
            <div className="ehpeek-touch-gallery-category-row">
              {category}
              {source.rating}
            </div>
          </div>
        </div>
      </div>
      <div className="ehpeek-touch-gallery-primary">
        {touchGalleryFavoriteButtonDom(source)}
        <div
          className="ehpeek-touch-gallery-primary-actions"
          ref={(node: HTMLElement) => {
            primaryActions = node;
          }}
        />
      </div>
      <div className="ehpeek-touch-gallery-content">
        <div className="ehpeek-touch-gallery-meta">
          {source.summary.map((item) => textBlockDom("ehpeek-touch-gallery-meta-value", item.value))}
          {touchGalleryActionsMenuDom(source.actions)}
        </div>
        {source.tagGroups.length > 0 && (
          <div className="ehpeek-touch-gallery-tag-groups">
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
    button.setAttribute("aria-expanded", String(open));
  };
  const menu = (
    <div className="ehpeek-touch-gallery-actions-menu">
      <button
        type="button"
        className="ehpeek-touch-gallery-actions-menu-button"
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
        className="ehpeek-touch-gallery-actions-menu-panel"
        hidden
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
    <section className="ehpeek-touch-gallery-tag-group">
      {textBlockDom("ehpeek-touch-gallery-tag-group-name", group.namespace)}
      <div className="ehpeek-touch-gallery-tags">
        {group.tags}
      </div>
    </section>
  ) as HTMLElement;
}

function touchGalleryFavoriteButtonDom(source: GalleryInfo): HTMLButtonElement {
  return (
    <button
      type="button"
      className={`ehpeek-touch-gallery-primary-button ehpeek-touch-gallery-favorite-button ${source.favorite.favorited ? "ehpeek-touch-gallery-favorite-on" : "ehpeek-touch-gallery-favorite-off"}`}
      onClick={() => {
        eh.clickGalleryFavoriteAction();
      }}
    >
      <span className="ehpeek-touch-gallery-favorite-icon" aria-hidden="true">
        {source.favorite.favorited ? "♥" : "♡"}
      </span>
      <span>{source.favorite.label}</span>
    </button>
  ) as HTMLButtonElement;
}

export class TouchGalleryPanel {
  private dom: ReturnType<typeof touchGalleryPanelDom> | null = null;

  install(): void {
    ensureTouchGalleryPanelStyle();
    eh.installTouchGalleryPanelPageStyle();

    if (document.querySelector(".ehpeek-touch-gallery")) {
      return;
    }

    const source = eh.readGalleryInfo();

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

function ensureTouchGalleryPanelStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = touchGalleryPanelCss;
  document.head.append(style);
}
