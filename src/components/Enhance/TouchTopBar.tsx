import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as eh from "../../eh/dom";
import texts from "../../texts.json";

const TOUCH_ICON_BUTTON_CLASS = "inline-flex control-icon border-0 bg-transparent color-text text-28px leading-1 no-underline";
export const TOUCH_TOP_BAR_MENU_ITEM_CLASS =
  "ehpeek-touch-top-bar-menu-item block box-border w-full min-h-[var(--ehpeek-control-touch-min-height)] py-18px px-24px touch:px-26px border-0 border-b color-border-subtle-b bg-transparent color-text text-left no-underline text-28px touch:text-30px leading-[1.2]";

function TouchTopBarMenu(props: { navItems: HTMLElement[]; onSettingsMenuOpen: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const navItemsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const navItems = navItemsRef.current;

    if (!navItems) {
      return;
    }

    navItems.replaceChildren(...props.navItems.map((item) => item.cloneNode(true)));
  }, [open, props.navItems]);

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
    <div ref={rootRef} className="ehpeek-touch-top-bar-menu relative">
      <button
        type="button"
        className={`ehpeek-touch-top-bar-menu-button ${TOUCH_ICON_BUTTON_CLASS}`}
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
        <div
          className="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-[2147483645] flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border color-border rounded-4px color-elevated"
        >
          <div ref={navItemsRef} className="contents" />
          <button
            type="button"
            className={TOUCH_TOP_BAR_MENU_ITEM_CLASS}
            onClick={(event: MouseEvent) => {
              event.preventDefault();
              event.stopPropagation();
              setOpen(false);
              props.onSettingsMenuOpen();
            }}
          >
            {texts.settings.menuLabel}
          </button>
        </div>
      )}
    </div>
  );
}

export function TouchTopBar(props: { info: eh.TouchTopBarInfo; onSettingsMenuOpen: () => void }) {
  return (
    <nav className="ehpeek-touch-top-bar relative z-[2147483640] flex box-border w-full min-h-56px items-center justify-between py-6px px-[max(16px,env(safe-area-inset-right,0px))] color-surface color-text font-sans">
      <a className={`ehpeek-touch-top-bar-home ${TOUCH_ICON_BUTTON_CLASS}`} href={props.info.homeHref}>
        ⌂
      </a>
      <TouchTopBarMenu navItems={props.info.navItems} onSettingsMenuOpen={props.onSettingsMenuOpen} />
    </nav>
  );
}
