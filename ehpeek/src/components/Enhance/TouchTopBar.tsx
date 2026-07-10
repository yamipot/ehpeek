import { h } from "../../jsx";
import * as eh from "../../eh/dom";
import touchTopBarCss from "./TouchTopBar.css";

const STYLE_ID = "ehpeek-touch-top-bar-style";
const TOUCH_ICON_BUTTON_CLASS = "inline-flex w-44px h-44px items-center justify-center border-0 bg-transparent color-text text-28px leading-1 no-underline";

function touchTopBarDom(info: eh.TouchTopBarInfo) {
  const menu = touchTopBarMenuDom(info.navItems);
  const root = (
    <nav className="ehpeek-touch-top-bar relative z-[2147483640] flex box-border w-full min-h-56px items-center justify-between color-surface color-text font-sans">
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
        className="ehpeek-touch-top-bar-menu-panel fixed top-[max(64px,calc(env(safe-area-inset-top,0px)+8px))] right-[max(24px,calc(env(safe-area-inset-right,0px)+24px))] z-[2147483645] flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border color-border rounded-4px color-elevated"
        hidden
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
  install(): void {
    ensureTouchTopBarStyle();
    eh.installTouchTopBarPageStyle();

    if (document.querySelector(".ehpeek-touch-top-bar")) {
      return;
    }

    const info = eh.readTouchTopBarInfo();

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

function ensureTouchTopBarStyle(): void {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = touchTopBarCss;
  document.head.append(style);
}
