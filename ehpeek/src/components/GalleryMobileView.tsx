import { h } from "../jsx";
import texts from "../texts.json";
import galleryMobileViewCss from "./GalleryMobileView.css";

const STYLE_ID = "ehpeek-gallery-mobile-style";
const MOBILE_QUERY = "(max-width: 760px), (pointer: coarse)";

type SummaryItem = {
  value: string;
};

type GalleryMobileSource = {
  anchor: HTMLElement | null;
  titleMain: string;
  titleSub: string;
  category: string;
  cover: HTMLElement | null;
  summary: SummaryItem[];
  actions: HTMLElement[];
  rating: HTMLElement | null;
  tagGroups: TagGroup[];
  navItems: HTMLElement[];
};

type TagGroup = {
  namespace: string;
  tags: HTMLElement[];
};

export class GalleryMobileView {
  constructor(private readonly handlers: { onOpenSettings: () => void }) {}

  install(): void {
    ensureGalleryMobileStyle();

    if (!this.isActive()) {
      return;
    }

    if (document.querySelector(".ehpeek-mobile-gallery")) {
      return;
    }

    const source = this.readSource();

    if (!source.anchor) {
      return;
    }

    const shell = this.createShell(source);
    this.prepareRatingScale(shell);
    document.body.prepend(shell);
  }

  mountContinueButton(button: HTMLButtonElement): boolean {
    if (!this.isActive()) {
      return false;
    }

    const actions = document.querySelector<HTMLElement>(".ehpeek-mobile-gallery-primary-actions");

    if (!actions) {
      return false;
    }

    actions.append(button);
    return true;
  }

  private createShell(source: GalleryMobileSource): HTMLElement {
    const cover = <div className="ehpeek-mobile-gallery-cover" />;
    const menuButton = this.createMenuButton(source.navItems);
    const homeButton = this.createHomeButton(source.navItems);
    const category = textBlock("ehpeek-mobile-gallery-category", source.category);
    const categoryRow = <div className="ehpeek-mobile-gallery-category-row" />;
    const heading = (
      <div className="ehpeek-mobile-gallery-heading">
        {textBlock("ehpeek-mobile-gallery-title-main", source.titleMain)}
        {textBlock("ehpeek-mobile-gallery-title-sub", source.titleSub)}
      </div>
    );
    const primaryActions = <div className="ehpeek-mobile-gallery-primary-actions" />;
    const meta = <div className="ehpeek-mobile-gallery-meta" />;
    const tagGroups = <div className="ehpeek-mobile-gallery-tag-groups" />;
    const content = <div className="ehpeek-mobile-gallery-content" />;

    if (source.cover) {
      cover.append(source.cover);
    }

    for (const item of source.summary) {
      meta.append(textBlock("ehpeek-mobile-gallery-meta-value", item.value));
    }
    meta.append(this.createActionsMenu(source.actions));

    categoryRow.append(category);

    if (source.rating) {
      categoryRow.append(source.rating);
    }

    content.append(meta);

    for (const group of source.tagGroups) {
      tagGroups.append(this.createTagGroup(group));
    }

    if (tagGroups.childNodes.length > 0) {
      content.append(tagGroups);
    }

    return (
      <section className="ehpeek-mobile-gallery">
        <div className="ehpeek-mobile-gallery-hero">
          <div className="ehpeek-mobile-gallery-topbar">
            {homeButton}
            {menuButton}
          </div>
          <div className="ehpeek-mobile-gallery-summary">
            {cover}
            <div className="ehpeek-mobile-gallery-hero-side">
            {heading}
            {categoryRow}
            </div>
          </div>
        </div>
        <div className="ehpeek-mobile-gallery-primary">
          {this.createDownloadButton()}
          {primaryActions}
        </div>
        {content}
      </section>
    ) as HTMLElement;
  }

  private readSource(): GalleryMobileSource {
    return {
      anchor: document.querySelector<HTMLElement>("#gmid"),
      titleMain: textOf("#gn"),
      titleSub: textOf("#gj"),
      category: textOf("#gdc"),
      cover: readCoverElement(),
      summary: readGallerySummary(),
      actions: readGalleryActions(),
      rating: readRatingElement(),
      tagGroups: readGalleryTagGroups(),
      navItems: readTopNavItems(),
    };
  }

  private createMenuButton(navItems: HTMLElement[]): HTMLElement {
    const menu = <div className="ehpeek-mobile-top-menu" /> as HTMLElement;
    const panel = <div className="ehpeek-mobile-top-menu-panel" hidden /> as HTMLElement;
    const button = (
      <button
        type="button"
        className="ehpeek-mobile-top-menu-button"
        aria-haspopup="menu"
        aria-expanded="false"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          panel.hidden = !panel.hidden;
          button.setAttribute("aria-expanded", String(!panel.hidden));
        }}
      >
        ⋮
      </button>
    ) as HTMLButtonElement;

    for (const item of navItems) {
      panel.append(item);
    }

    panel.append(
      <button
        type="button"
        className="ehpeek-mobile-top-menu-item"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          panel.hidden = true;
          button.setAttribute("aria-expanded", "false");
          this.handlers.onOpenSettings();
        }}
      >
        Ehpeek
      </button> as HTMLButtonElement,
    );

    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && menu.contains(event.target)) {
        return;
      }

      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    });

    menu.append(button, panel);
    return menu;
  }

  private createHomeButton(navItems: HTMLElement[]): HTMLAnchorElement {
    const firstLink = navItems.find((item): item is HTMLAnchorElement => item instanceof HTMLAnchorElement);
    const button = (
      <a className="ehpeek-mobile-home-button" href={firstLink?.href || "/"}>
        ⌂
      </a>
    ) as HTMLAnchorElement;

    return button;
  }

  private createActionsMenu(actions: HTMLElement[]): HTMLElement {
    const menu = <div className="ehpeek-mobile-actions-menu" /> as HTMLElement;
    const panel = <div className="ehpeek-mobile-actions-menu-panel" hidden /> as HTMLElement;
    const button = (
      <button
        type="button"
        className="ehpeek-mobile-actions-menu-button"
        aria-haspopup="menu"
        aria-expanded="false"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          panel.hidden = !panel.hidden;
          button.setAttribute("aria-expanded", String(!panel.hidden));
        }}
      >
        ⋮
      </button>
    ) as HTMLButtonElement;

    for (const action of actions) {
      action.classList.add("ehpeek-mobile-actions-menu-item");
      panel.append(action);
    }

    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && menu.contains(event.target)) {
        return;
      }

      panel.hidden = true;
      button.setAttribute("aria-expanded", "false");
    });

    menu.append(button, panel);
    return menu;
  }

  private createTagGroup(group: TagGroup): HTMLElement {
    const wrapper = <section className="ehpeek-mobile-gallery-tag-group" /> as HTMLElement;
    const tags = <div className="ehpeek-mobile-gallery-tags" /> as HTMLElement;

    wrapper.append(textBlock("ehpeek-mobile-gallery-tag-group-name", group.namespace));

    for (const tag of group.tags) {
      tags.append(tag);
    }

    wrapper.append(tags);
    return wrapper;
  }

  private createDownloadButton(): HTMLButtonElement {
    const button = (
      <button
        type="button"
        className="ehpeek-mobile-gallery-primary-button"
        onClick={() => {
          findDownloadAction()?.click();
        }}
      >
        {texts.reader.download}
      </button>
    ) as HTMLButtonElement;

    return button;
  }

  private isActive(): boolean {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  private prepareRatingScale(shell: HTMLElement): void {
    const wrapper = shell.querySelector<HTMLElement>(".ehpeek-mobile-gallery-rating");
    const scaler = shell.querySelector<HTMLElement>(".ehpeek-mobile-gallery-rating-scale");

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
}

function ensureGalleryMobileStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = galleryMobileViewCss;
  document.head.append(style);
}

function readGallerySummary(): SummaryItem[] {
  const meta = readGalleryMeta();
  const range = readShowingRange();
  const fields = [
    meta.get("language"),
    range?.total ? `${range.total} ${texts.reader.pages.toLowerCase()}` : undefined,
    meta.get("file size") ?? meta.get("size"),
    meta.get("favorited"),
    meta.get("posted") ?? meta.get("parent"),
  ];

  return fields
    .filter((value): value is string => Boolean(value))
    .slice(0, 6)
    .map((value) => ({ value }));
}

function readGalleryMeta(): Map<string, string> {
  const entries = Array.from(document.querySelectorAll<HTMLTableRowElement>("#gdd tr"))
    .map((row) => {
      const cells = Array.from(row.cells);
      const label = cells[0]?.textContent?.trim().replace(/:$/, "").toLowerCase() ?? "";
      const value = cells.slice(1).map((cell) => cell.textContent?.trim() ?? "").filter(Boolean).join(" ");

      return [label, value] as const;
    })
    .filter(([label, value]) => label && value);

  return new Map(entries);
}

function readShowingRange(): { total: number } | null {
  const text = document.querySelector(".gpc")?.textContent ?? "";
  const match = text.match(/[\d,]+\s*-\s*[\d,]+\s+of\s+([\d,]+)/i);
  const total = Number(match?.[1]?.replace(/,/g, "") ?? "");

  return Number.isFinite(total) && total > 0 ? { total } : null;
}

function readRatingElement(): HTMLElement | null {
  const element =
    document.querySelector<HTMLElement>("#gdr") ??
    document.querySelector<HTMLElement>("#rating") ??
    document.querySelector<HTMLElement>("#rating_label")?.parentElement ??
    null;

  if (!element) {
    return null;
  }

  const wrapper = <div className="ehpeek-mobile-gallery-rating" /> as HTMLElement;
  const scaler = <div className="ehpeek-mobile-gallery-rating-scale" /> as HTMLElement;

  scaler.append(element);
  wrapper.append(scaler);
  return wrapper;
}

function readGalleryActions(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']"))
    .map((item) => {
      const clone = item.cloneNode(true) as HTMLElement;
      clone.removeAttribute("id");
      return clone;
    })
    .slice(0, 6);
}

function readGalleryTagGroups(): TagGroup[] {
  const rows = Array.from(document.querySelectorAll<HTMLTableRowElement>("#taglist tr"));

  if (rows.length > 0) {
    return rows
      .map((row) => {
        const namespace = row.querySelector(".tc, td:first-child")?.textContent?.trim().replace(/:$/, "") || "tag";
        const tags = Array.from(row.querySelectorAll<HTMLAnchorElement>("a"))
          .map(cloneTag)
          .filter(Boolean)
          .slice(0, 30);

        return { namespace, tags };
      })
      .filter((group) => group.tags.length > 0);
  }

  const groups = new Map<string, HTMLElement[]>();

  for (const tag of Array.from(document.querySelectorAll<HTMLAnchorElement>("#taglist a")).slice(0, 60)) {
    const clone = cloneTag(tag);
    const tags = groups.get("tag") ?? [];
    tags.push(clone);
    groups.set("tag", tags);
  }

  return Array.from(groups, ([namespace, tags]) => ({ namespace, tags }));
}

function cloneTag(tag: HTMLAnchorElement): HTMLElement {
  const clone = tag.cloneNode(true) as HTMLElement;
  clone.removeAttribute("id");
  return clone;
}

function readTopNavItems(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLAnchorElement>("#nb a[href]")).map((link) => {
    const clone = link.cloneNode(true) as HTMLAnchorElement;
    clone.removeAttribute("id");
    clone.className = "ehpeek-mobile-top-menu-item";
    return clone;
  });
}

function findDownloadAction(): HTMLElement | null {
  const actions = Array.from(document.querySelectorAll<HTMLElement>("#gd5 a, #gd5 button, #gd5 input[type='button'], #gd5 input[type='submit']"));

  return actions.find((item) => /download|archive/i.test(item.textContent ?? item.getAttribute("value") ?? "")) ?? actions[0] ?? null;
}

function textOf(selector: string): string {
  return document.querySelector(selector)?.textContent?.trim() ?? "";
}

function readCoverElement(): HTMLElement | null {
  const source = document.querySelector<HTMLImageElement>("#gd1 img");
  const imageUrl = source?.currentSrc || source?.src || source?.getAttribute("src") || backgroundImageUrl(document.querySelector("#gd1"));

  if (!imageUrl) {
    return null;
  }

  const image = document.createElement("img");
  image.src = imageUrl;
  image.alt = "";
  image.decoding = "async";
  image.loading = "eager";
  return image;
}

function backgroundImageUrl(root: Element | null): string {
  if (!root) {
    return "";
  }

  for (const item of [root, ...Array.from(root.querySelectorAll<HTMLElement>("*"))]) {
    const backgroundImage = window.getComputedStyle(item).backgroundImage;
    const match = backgroundImage.match(/url\(["']?(.+?)["']?\)/);

    if (match?.[1]) {
      return match[1];
    }
  }

  return "";
}

function textBlock(className: string, text: string): HTMLElement {
  const element = <div className={className} /> as HTMLElement;
  element.textContent = text;
  return element;
}
