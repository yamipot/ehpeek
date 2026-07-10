import { h } from "../jsx";
import texts from "../texts.json";
import settingsMenuCss from "./SettingsMenu.css";

const STYLE_ID = "ehpeek-settings-style";
const SETTINGS_BUTTON_CLASS = "block w-full py-7px px-10px border color-border rounded-3px bg-transparent color-accent cursor-pointer font-inherit text-center";
const SETTINGS_ITEM_CLASS = "flex w-full items-center justify-between gap-16px min-h-52px py-10px px-12px border-0 border-b border-b-[rgba(255,255,255,0.1)] rounded-3px bg-transparent color-text cursor-pointer font-inherit text-left";

export type SettingsMenuState = {
  readerEnabled: boolean;
  enhanceThumbsGridsEnabled: boolean;
  enhanceSearchGridsEnabled: boolean;
  touchUiEnabled: boolean;
};

function settingsMenuDom(
  triggerTagName: "a" | "button",
  handlers: {
    onApplyClick: (event: MouseEvent) => void;
    onCloseClick: (event: MouseEvent) => void;
    onEnhanceSearchClick: (event: MouseEvent) => void;
    onEnhanceThumbsClick: (event: MouseEvent) => void;
    onReaderClick: (event: MouseEvent) => void;
    onTouchUiClick: (event: MouseEvent) => void;
    onTriggerClick: (event: MouseEvent) => void;
  },
) {
  let trigger!: HTMLElement;
  let readerSetting!: HTMLButtonElement;
  let enhanceSearchGridsSetting!: HTMLButtonElement;
  let enhanceThumbsGridsSetting!: HTMLButtonElement;
  let touchUiSetting!: HTMLButtonElement;
  let applyButton!: HTMLButtonElement;
  let closeButton!: HTMLButtonElement;

  const switchItemDom = (
    onClick: (event: MouseEvent) => void,
    assign: (node: HTMLButtonElement) => void,
  ) => (
    <button
      type="button"
      className={`ehpeek-settings-item ${SETTINGS_ITEM_CLASS}`}
      role="switch"
      onClick={onClick}
      ref={(node: HTMLElement) => assign(node as HTMLButtonElement)}
    />
  );

  const actionButtonDom = (
    className: string,
    onClick: (event: MouseEvent) => void,
    assign: (node: HTMLButtonElement) => void,
  ) => (
    <button
      type="button"
      className={`${className} ${SETTINGS_BUTTON_CLASS}`}
      onClick={onClick}
      ref={(node: HTMLElement) => assign(node as HTMLButtonElement)}
    />
  );

  const root = triggerTagName === "a"
    ? (
      <div className="ehpeek-settings-root">
        <a
          className="ehpeek-settings-trigger"
          href="#"
          onClick={handlers.onTriggerClick}
          ref={(node: HTMLElement) => {
            trigger = node;
          }}
        />
      </div>
    ) as HTMLElement
    : (
      <span className="ehpeek-settings-root">
        <button
          type="button"
          className="ehpeek-settings-trigger"
          onClick={handlers.onTriggerClick}
          ref={(node: HTMLElement) => {
            trigger = node;
          }}
        />
      </span>
    ) as HTMLElement;
  const menu = (
    <div className="ehpeek-settings-menu fixed z-[2147483646] min-w-260px p-8px border color-border rounded-4px color-elevated color-text textsize-md leading-[1.2]" hidden>
      {switchItemDom(handlers.onReaderClick, (node) => {
        readerSetting = node;
      })}
      {switchItemDom(handlers.onEnhanceSearchClick, (node) => {
        enhanceSearchGridsSetting = node;
      })}
      {switchItemDom(handlers.onEnhanceThumbsClick, (node) => {
        enhanceThumbsGridsSetting = node;
      })}
      {switchItemDom(handlers.onTouchUiClick, (node) => {
        touchUiSetting = node;
      })}
      <div className="ehpeek-settings-actions grid grid-cols-[1fr_1fr] gap-8px mt-6px">
        {actionButtonDom("ehpeek-settings-apply", handlers.onApplyClick, (node) => {
          applyButton = node;
        })}
        {actionButtonDom("ehpeek-settings-close", handlers.onCloseClick, (node) => {
          closeButton = node;
        })}
      </div>
    </div>
  ) as HTMLElement;

  const updateSwitch = (button: HTMLButtonElement, checked: boolean, label: string) => {
    button.setAttribute("aria-checked", String(checked));
    button.textContent = label;
    button.removeAttribute("title");
  };

  return {
    root,
    contains(target: Element) {
      return root.contains(target) || menu.contains(target);
    },
    isOpen() {
      return !menu.hidden;
    },
    mount(parent: Element) {
      parent.append(root);
      document.body.append(menu);
    },
    position() {
      if (menu.hidden) {
        return;
      }

      menu.style.top = "24px";
      menu.style.right = "24px";
      menu.style.left = "";
    },
    setOpen(open: boolean) {
      menu.hidden = !open;
      trigger.setAttribute("aria-expanded", String(open));
      trigger.setAttribute("aria-haspopup", "menu");
    },
    update(draft: SettingsMenuState, labels: {
      apply: string;
      close: string;
      enhanceSearch: string;
      enhanceThumbs: string;
      reader: string;
      touchUi: string;
    }) {
      trigger.textContent = texts.settings.menuLabel;
      updateSwitch(readerSetting, draft.readerEnabled, labels.reader);
      updateSwitch(enhanceSearchGridsSetting, draft.enhanceSearchGridsEnabled, labels.enhanceSearch);
      updateSwitch(enhanceThumbsGridsSetting, draft.enhanceThumbsGridsEnabled, labels.enhanceThumbs);
      updateSwitch(touchUiSetting, draft.touchUiEnabled, labels.touchUi);
      applyButton.textContent = labels.apply;
      closeButton.textContent = labels.close;
    },
  };
}

export class SettingsMenu {
  readonly root: HTMLElement;
  private readonly dom: ReturnType<typeof settingsMenuDom>;
  private draft: SettingsMenuState;

  constructor(
    triggerTagName: "a" | "button",
    private readonly state: () => SettingsMenuState,
    private readonly handlers: {
      onApply: (state: SettingsMenuState) => void;
    },
  ) {
    this.draft = { ...this.state() };
    this.dom = settingsMenuDom(triggerTagName, {
      onApplyClick: (event) => {
        event.stopPropagation();
        this.apply();
      },
      onCloseClick: (event) => {
        event.stopPropagation();
        this.close();
      },
      onEnhanceSearchClick: (event) => {
        event.stopPropagation();
        this.draft.enhanceSearchGridsEnabled = !this.draft.enhanceSearchGridsEnabled;
        this.update();
      },
      onEnhanceThumbsClick: (event) => {
        event.stopPropagation();
        this.draft.enhanceThumbsGridsEnabled = !this.draft.enhanceThumbsGridsEnabled;
        this.update();
      },
      onReaderClick: (event) => {
        event.stopPropagation();
        this.draft.readerEnabled = !this.draft.readerEnabled;
        this.update();
      },
      onTouchUiClick: (event) => {
        event.stopPropagation();
        this.draft.touchUiEnabled = !this.draft.touchUiEnabled;
        this.update();
      },
      onTriggerClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.toggle();
      },
    });
    this.root = this.dom.root;
    this.update();
  }

  mount(parent: Element): void {
    ensureSettingsStyle();
    this.dom.mount(parent);
    this.bindGlobalEvents();
    this.update();
  }

  open(): void {
    this.resetDraft();
    this.dom.setOpen(true);
    this.update();
    this.dom.position();
  }

  close(): void {
    if (!this.dom.isOpen()) {
      return;
    }

    this.dom.setOpen(false);
    this.resetDraft();
    this.update();
  }

  update(): void {
    this.dom.update(this.draft, {
      apply: texts.settings.apply,
      close: texts.settings.close,
      enhanceSearch: this.draft.enhanceSearchGridsEnabled ? texts.settings.enhanceSearchOn : texts.settings.enhanceSearchOff,
      enhanceThumbs: this.draft.enhanceThumbsGridsEnabled ? texts.settings.enhanceThumbsOn : texts.settings.enhanceThumbsOff,
      reader: this.draft.readerEnabled ? texts.settings.readerOn : texts.settings.readerOff,
      touchUi: this.draft.touchUiEnabled ? texts.settings.touchUiOn : texts.settings.touchUiOff,
    });

    this.dom.position();
  }

  private toggle(): void {
    if (!this.dom.isOpen()) {
      this.resetDraft();
    }

    this.dom.setOpen(!this.dom.isOpen());
    this.update();

    if (this.dom.isOpen()) {
      this.dom.position();
    }
  }

  private resetDraft(): void {
    this.draft = { ...this.state() };
  }

  private apply(): void {
    this.handlers.onApply({ ...this.draft });
  }

  private bindGlobalEvents(): void {
    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && this.dom.contains(event.target)) {
        return;
      }

      this.close();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.close();
      }
    });
    window.addEventListener("resize", () => this.dom.position());
    window.addEventListener("scroll", () => this.dom.position(), true);
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
