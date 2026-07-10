import { h } from "../jsx";
import texts from "../texts.json";
import settingsMenuCss from "./SettingsMenu.css";

const STYLE_ID = "ehpeek-settings-style";

export type SettingsMenuState = {
  readerEnabled: boolean;
  enhanceGalleryThumbsEnabled: boolean;
  enhanceSearchPageEnabled: boolean;
};

export class SettingsMenu {
  readonly root: HTMLElement;
  private readonly trigger: HTMLElement;
  private readonly menu: HTMLElement;
  private readonly readerSetting: HTMLButtonElement;
  private readonly enhanceGalleryThumbsSetting: HTMLButtonElement;
  private readonly enhanceSearchPageSetting: HTMLButtonElement;

  constructor(
    triggerTagName: "a" | "button",
    private readonly state: () => SettingsMenuState,
    private readonly handlers: {
      onReaderToggle: () => void;
      onEnhanceGalleryThumbsToggle: () => void;
      onEnhanceSearchPageToggle: () => void;
    },
  ) {
    this.root = document.createElement(triggerTagName === "a" ? "div" : "span");
    this.root.className = "ehpeek-settings-root";

    this.trigger = this.createTrigger(triggerTagName);
    this.menu = <div className="ehpeek-settings-menu" hidden /> as HTMLElement;
    this.readerSetting = this.createSwitchButton(() => {
      this.handlers.onReaderToggle();
    });
    this.enhanceGalleryThumbsSetting = this.createSwitchButton(() => {
      this.handlers.onEnhanceGalleryThumbsToggle();
      this.update();
    });
    this.enhanceSearchPageSetting = this.createSwitchButton(() => {
      this.handlers.onEnhanceSearchPageToggle();
      this.update();
    });

    this.menu.append(this.readerSetting, this.enhanceGalleryThumbsSetting, this.enhanceSearchPageSetting);
    this.root.append(this.trigger, this.menu);
    this.update();
  }

  mount(parent: Element): void {
    ensureSettingsStyle();
    parent.append(this.root);
    this.bindGlobalEvents();
    this.update();
  }

  open(): void {
    this.menu.hidden = false;
    this.update();
    this.position();
  }

  close(): void {
    if (this.menu.hidden) {
      return;
    }

    this.menu.hidden = true;
    this.update();
  }

  update(): void {
    const current = this.state();

    this.trigger.textContent = texts.settings.menuLabel;
    this.trigger.setAttribute("aria-expanded", String(!this.menu.hidden));
    this.trigger.setAttribute("aria-haspopup", "menu");

    this.updateSwitch(
      this.readerSetting,
      current.readerEnabled,
      current.readerEnabled ? texts.settings.readerOn : texts.settings.readerOff,
      current.readerEnabled ? texts.settings.disableReader : texts.settings.enableReader,
    );
    this.updateSwitch(
      this.enhanceGalleryThumbsSetting,
      current.enhanceGalleryThumbsEnabled,
      current.enhanceGalleryThumbsEnabled ? texts.settings.enhanceGalleryThumbsOn : texts.settings.enhanceGalleryThumbsOff,
      current.enhanceGalleryThumbsEnabled ? texts.settings.disableEnhanceGalleryThumbs : texts.settings.enableEnhanceGalleryThumbs,
    );
    this.updateSwitch(
      this.enhanceSearchPageSetting,
      current.enhanceSearchPageEnabled,
      current.enhanceSearchPageEnabled ? texts.settings.enhanceSearchPageOn : texts.settings.enhanceSearchPageOff,
      current.enhanceSearchPageEnabled ? texts.settings.disableEnhanceSearchPage : texts.settings.enableEnhanceSearchPage,
    );

    this.position();
  }

  private createTrigger(tagName: "a" | "button"): HTMLElement {
    const trigger = document.createElement(tagName);
    trigger.className = "ehpeek-settings-trigger";

    if (trigger instanceof HTMLAnchorElement) {
      trigger.href = "#";
    } else {
      trigger.type = "button";
    }

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.toggle();
    });

    return trigger;
  }

  private createSwitchButton(onClick: () => void): HTMLButtonElement {
    const button = (
      <button
        type="button"
        className="ehpeek-settings-item"
        role="switch"
        onClick={(event: MouseEvent) => {
          event.stopPropagation();
          onClick();
        }}
      />
    ) as HTMLButtonElement;

    return button;
  }

  private updateSwitch(button: HTMLButtonElement, checked: boolean, label: string, title: string): void {
    button.setAttribute("aria-checked", String(checked));
    button.textContent = label;
    button.title = title;
  }

  private toggle(): void {
    this.menu.hidden = !this.menu.hidden;
    this.update();

    if (!this.menu.hidden) {
      this.position();
    }
  }

  private position(): void {
    if (this.menu.hidden) {
      return;
    }

    this.menu.style.top = "8px";
    this.menu.style.right = "8px";
    this.menu.style.left = "";
  }

  private bindGlobalEvents(): void {
    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && this.root.contains(event.target)) {
        return;
      }

      this.close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.close();
      }
    });
    window.addEventListener("resize", () => this.position());
    window.addEventListener("scroll", () => this.position(), true);
  }
}

function ensureSettingsStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = settingsMenuCss;
  document.head.append(style);
}
