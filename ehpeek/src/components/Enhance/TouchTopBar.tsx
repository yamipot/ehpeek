import { h } from "../../jsx";
import * as eh from "../../eh/dom";

const TOUCH_ICON_BUTTON_CLASS = "inline-flex control-icon border-0 bg-transparent color-text text-28px leading-1 no-underline";
export const TOUCH_TOP_BAR_MENU_ITEM_CLASS =
  "ehpeek-touch-top-bar-menu-item block box-border w-full min-h-[var(--ehpeek-control-touch-min-height)] py-18px px-24px touch:px-26px border-0 border-b color-border-subtle-b bg-transparent color-text text-left no-underline text-28px touch:text-30px leading-[1.2]";

function touchTopBarDom(info: eh.TouchTopBarInfo) {
  const menu = touchTopBarMenuDom(info.navItems);
  const root = (
    <nav className="ehpeek-touch-top-bar relative z-[2147483640] flex box-border w-full min-h-56px items-center justify-between py-6px px-[max(16px,env(safe-area-inset-right,0px))] color-surface color-text font-sans">
      <a className={`ehpeek-touch-top-bar-home ${TOUCH_ICON_BUTTON_CLASS}`} href={info.homeHref}>
        ⌂
      </a>
      {menu.element}
    </nav>
  ) as HTMLElement;

  return {
    root,
    closeMenu: menu.close,
    contains(target: Element) {
      return root.contains(target);
    },
  };
}

function touchTopBarMenuDom(navItems: HTMLElement[]) {
  let button!: HTMLButtonElement;
  let panel!: HTMLElement;
  const isOpen = () => panel.hidden === false;
  const setOpen = (open: boolean) => {
    panel.hidden = !open;
    panel.style.display = open ? "" : "none";
    button.setAttribute("aria-expanded", String(open));
  };
  const menu = (
    <div className="ehpeek-touch-top-bar-menu relative">
      <button
        type="button"
        className={`ehpeek-touch-top-bar-menu-button ${TOUCH_ICON_BUTTON_CLASS}`}
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
        className="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-[2147483645] flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border color-border rounded-4px color-elevated"
        hidden
        style="display: none;"
        ref={(node: HTMLElement) => {
          panel = node;
        }}
      />
    </div>
  ) as HTMLElement;

  panel.append(...navItems);
  panel.addEventListener(
    "click",
    (event) => {
      if (!(event.target instanceof Element) || !event.target.closest(".ehpeek-settings-trigger")) {
        return;
      }

      setOpen(false);
    },
    true,
  );

  return {
    element: menu,
    close() {
      setOpen(false);
    },
  };
}

export class TouchTopBar {
  constructor(private readonly menuItemClassName: string) {}

  install(): void {
    if (document.querySelector(".ehpeek-touch-top-bar")) {
      return;
    }

    const info = eh.readTouchTopBarInfo(this.menuItemClassName);

    if (!info.available) {
      return;
    }

    const dom = touchTopBarDom(info);
    document.addEventListener("click", (event) => {
      if (event.target instanceof Element && dom.contains(event.target)) {
        return;
      }

      dom.closeMenu();
    });

    if (!eh.mountTouchTopBar(dom.root)) {
      document.body.prepend(dom.root);
    }
  }
}
