import { h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import * as eh from "../../eh/dom";
import texts from "../../texts.json";

const TOUCH_ICON_BUTTON_CLASS = "inline-flex w-md h-md items-center justify-center border-0 bg-transparent ehp-color-site-text text-28px leading-1 no-underline";
export const TOUCH_TOP_BAR_MENU_ITEM_CLASS =
  "ehpeek-touch-top-bar-menu-item block box-border w-full min-h-xl py-lg px-xl touch:px-xl border-0 border-b ehp-color-site-border-subtle-b bg-transparent ehp-color-site-text text-left no-underline text-28px touch:text-30px leading-[1.2]";

function TouchTopBarMenu(props: { navItems: HTMLElement[] }) {
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
          className="ehpeek-touch-top-bar-menu-panel absolute top-[calc(100%+8px)] right-0 z-overlay flex min-w-285px max-w-[min(78vw,320px)] flex-col overflow-hidden border ehp-color-site-border rounded-sm ehp-color-site-elevated"
        >
          <div ref={navItemsRef} className="contents" />
        </div>
      )}
    </div>
  );
}

export function TouchTopBar(props: { info: eh.TouchTopBarInfo; onSettingsMenuOpen: () => void }) {
  return (
    <nav className="ehpeek-touch-top-bar relative z-ui flex box-border w-full min-h-56px items-center justify-between py-sm px-[max(16px,env(safe-area-inset-right,0px))] ehp-color-site-surface ehp-color-site-text font-sans">
      <a className={`ehpeek-touch-top-bar-home ${TOUCH_ICON_BUTTON_CLASS}`} href={props.info.homeHref}>
        ⌂
      </a>
      <div className="flex items-center gap-2px">
        <button
          type="button"
          className={`ehpeek-touch-top-bar-settings ${TOUCH_ICON_BUTTON_CLASS}`}
          aria-label={texts.settings.openSettings}
          title={texts.settings.openSettings}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            props.onSettingsMenuOpen();
          }}
        >
          ⚙
        </button>
        <TouchTopBarMenu navItems={props.info.navItems} />
      </div>
    </nav>
  );
}
