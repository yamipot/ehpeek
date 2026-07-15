import { Fragment, h } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";
import texts from "../texts.json";

export type SettingsMenuState = {
  readerEnabled: boolean;
  enhanceThumbsGridsEnabled: boolean;
  enhanceSearchGridsEnabled: boolean;
  touchUiEnabled: boolean;
};

const SETTINGS_ACTION_BUTTON_CLASS =
  "block w-full control-btn color-btn cursor-pointer font-inherit text-center textsize-md";
const SETTINGS_DOT_CLASS =
  "block flex-none w-[var(--ehpeek-control-toggle-dot-size)] h-[var(--ehpeek-control-toggle-dot-size)] touch:w-[var(--ehpeek-control-toggle-dot-touch-size)] touch:h-[var(--ehpeek-control-toggle-dot-touch-size)] rounded-[var(--ehpeek-control-radius-pill)]";

function SwitchButton(props: {
  checked: [boolean, string, string];
  onChange: (value: boolean) => void;
}) {
  const [initialChecked, labelOn, labelOff] = props.checked;
  const [checked, setChecked] = useState(initialChecked);
  const setValue = (value: boolean) => {
    setChecked(value);
    props.onChange(value);
  };

  return (
    <button
      type="button"
      className="flex w-full items-center justify-between gap-16px touch:gap-20px control-action border-0 border-b color-border-subtle-b bg-transparent color-text color-item-hover cursor-pointer font-inherit text-left textsize-md"
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        setValue(!checked);
      }}
    >
      <span>{checked ? labelOn : labelOff}</span>
      <span className={`${SETTINGS_DOT_CLASS} ${checked ? "bg-[var(--ehpeek-color-state-on)]" : "bg-[var(--ehpeek-color-state-off)]"}`} />
    </button>
  );
}

export function SettingsMenu(props: {
  open: boolean;
  initState: SettingsMenuState;
  onApply: (state: SettingsMenuState) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState(() => ({ ...props.initState }));
  const menuRef = useRef<HTMLDivElement>(null);
  const close = () => {
    props.onOpenChange(false);
  };

  useEffect(() => {
    if (props.open) {
      setDraft({ ...props.initState });
    }
  }, [props.open, props.initState]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!props.open) {
        return;
      }

      if (event.target instanceof Element && menuRef.current?.contains(event.target)) {
        return;
      }

      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (!props.open) {
        return;
      }

      if (event.key === "Escape") {
        close();
      }
    };

    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [props.open]);

  if (!props.open) {
    return <Fragment />;
  }

  return (
    <div ref={menuRef} className="ehpeek-settings-menu fixed top-24px right-24px z-[2147483646] min-w-260px touch:min-w-[min(92vw,520px)] p-8px border color-border rounded-4px color-elevated color-text textsize-md leading-[1.2]">
      <SwitchButton
        checked={[draft.readerEnabled, texts.settings.readerOn, texts.settings.readerOff]}
        onChange={(value) => {
          draft.readerEnabled = value;
        }}
      />
      <SwitchButton
        checked={[draft.enhanceSearchGridsEnabled, texts.settings.enhanceSearchOn, texts.settings.enhanceSearchOff]}
        onChange={(value) => {
          draft.enhanceSearchGridsEnabled = value;
        }}
      />
      <SwitchButton
        checked={[draft.enhanceThumbsGridsEnabled, texts.settings.enhanceThumbsOn, texts.settings.enhanceThumbsOff]}
        onChange={(value) => {
          draft.enhanceThumbsGridsEnabled = value;
        }}
      />
      <SwitchButton
        checked={[draft.touchUiEnabled, texts.settings.touchUiOn, texts.settings.touchUiOff]}
        onChange={(value) => {
          draft.touchUiEnabled = value;
        }}
      />
      <div className="ehpeek-settings-actions grid grid-cols-[1fr_1fr] gap-8px touch:gap-10px mt-6px touch:mt-8px">
        <button
          type="button"
          className={`ehpeek-settings-apply ${SETTINGS_ACTION_BUTTON_CLASS}`}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            props.onApply({ ...draft });
          }}
        >
          {texts.settings.apply}
        </button>
        <button
          type="button"
          className={`ehpeek-settings-close ${SETTINGS_ACTION_BUTTON_CLASS}`}
          onClick={(event: MouseEvent) => {
            event.stopPropagation();
            close();
          }}
        >
          {texts.settings.close}
        </button>
      </div>
    </div>
  );
}
