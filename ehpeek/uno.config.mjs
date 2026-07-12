import { defineConfig, presetWind3 } from "unocss";

export default defineConfig({
  presets: [presetWind3()],
  variants: [
    (matcher) => {
      const prefix = "touch:";

      if (!matcher.startsWith(prefix)) {
        return matcher;
      }

      return {
        matcher: matcher.slice(prefix.length),
        selector: (selector) => `html.ehpeek-touch-ui ${selector}`,
      };
    },
  ],
  preflights: [
    {
      getCSS: () => `
:root {
  --ehpeek-color-accent: #f0b35a;
  --ehpeek-color-border: #8d7454;
  --ehpeek-color-border-soft: rgba(255, 255, 255, 0.18);
  --ehpeek-color-border-subtle: rgba(255, 255, 255, 0.1);
  --ehpeek-color-accent-hover-bg: rgba(240, 179, 90, 0.12);
  --ehpeek-color-elevated: #3f4249;
  --ehpeek-color-item-hover: rgba(255, 255, 255, 0.08);
  --ehpeek-color-reader-text: #f3f3f3;
  --ehpeek-color-state-off: #8c8f96;
  --ehpeek-color-state-on: #4ec46a;
  --ehpeek-color-surface: #4f535b;
  --ehpeek-color-text: #f1f1f1;
  --ehpeek-control-action-min-height: 52px;
  --ehpeek-control-action-padding-x: 12px;
  --ehpeek-control-action-padding-y: 10px;
  --ehpeek-control-btn-padding-x: 10px;
  --ehpeek-control-btn-padding-y: 7px;
  --ehpeek-control-compact-padding-x: 8px;
  --ehpeek-control-compact-padding-y: 4px;
  --ehpeek-control-icon-size: 44px;
  --ehpeek-control-menu-item-min-height: 56px;
  --ehpeek-control-page-size: 34px;
  --ehpeek-control-primary-height: 87px;
  --ehpeek-control-primary-gap: 10px;
  --ehpeek-control-radius-pill: 999px;
  --ehpeek-control-radius-md: 4px;
  --ehpeek-control-radius-reader: 6px;
  --ehpeek-control-radius-sm: 3px;
  --ehpeek-control-reader-button-height: 40px;
  --ehpeek-control-reader-button-width: 46px;
  --ehpeek-control-tag-min-height: 51px;
  --ehpeek-control-toggle-dot-size: 10px;
  --ehpeek-control-toggle-dot-touch-size: 18px;
  --ehpeek-control-touch-min-height: 80px;
}

.ehpeek-ui-state-dot::after {
  content: "";
  flex: 0 0 auto;
  width: var(--ehpeek-control-toggle-dot-size);
  height: var(--ehpeek-control-toggle-dot-size);
  border-radius: var(--ehpeek-control-radius-pill);
  background: var(--ehpeek-color-state-on);
}

.ehpeek-ui-state-dot[aria-checked="false"]::after {
  background: var(--ehpeek-color-state-off);
}

html.ehpeek-touch-ui .ehpeek-ui-state-dot::after {
  width: var(--ehpeek-control-toggle-dot-touch-size);
  height: var(--ehpeek-control-toggle-dot-touch-size);
}
`,
    },
  ],
  shortcuts: {
    "color-accent": "text-[var(--ehpeek-color-accent)]",
    "color-border": "border-[var(--ehpeek-color-border)]",
    "color-border-soft": "border-[var(--ehpeek-color-border-soft)]",
    "color-border-subtle-b": "border-b-[var(--ehpeek-color-border-subtle)]",
    "color-btn": "border color-border bg-transparent color-accent hover:bg-[var(--ehpeek-color-accent-hover-bg)]",
    "color-button-reader": "bg-[rgba(35,35,35,0.88)] text-[var(--ehpeek-color-reader-text)] border-[var(--ehpeek-color-border-soft)]",
    "color-elevated": "bg-[var(--ehpeek-color-elevated)] shadow-[0_8px_24px_rgba(0,0,0,0.38)]",
    "color-item-hover": "hover:bg-[var(--ehpeek-color-item-hover)]",
    "color-panel-primary": "bg-[var(--ehpeek-color-elevated)] shadow-[0_2px_10px_rgba(0,0,0,0.32)]",
    "color-panel-reader-btn": "bg-[rgba(18,18,18,0.82)] text-[#f5f5f5] border-[rgba(255,255,255,0.18)] hover:bg-[var(--ehpeek-color-accent-hover-bg)]",
    "color-progress-reader": "[accent-color:#f3f3f3]",
    "color-reader-badge": "bg-[rgba(15,15,15,0.34)]",
    "color-reader-text": "text-[var(--ehpeek-color-reader-text)]",
    "color-search-swipe": "bg-[rgba(16,16,16,0.38)] text-[rgba(255,255,255,0.88)] border-[var(--ehpeek-color-border-soft)]",
    "color-surface": "bg-[var(--ehpeek-color-surface)]",
    "color-tag": "border color-border bg-[var(--ehpeek-color-surface)] color-accent",
    "color-tag-group": "bg-[#5b3f5f] color-accent",
    "color-text": "text-[var(--ehpeek-color-text)]",
    "control-action": "min-h-[var(--ehpeek-control-action-min-height)] py-[var(--ehpeek-control-action-padding-y)] px-[var(--ehpeek-control-action-padding-x)] rounded-[var(--ehpeek-control-radius-sm)] touch:min-h-[var(--ehpeek-control-touch-min-height)] touch:py-18px touch:px-26px",
    "control-btn": "py-[var(--ehpeek-control-btn-padding-y)] px-[var(--ehpeek-control-btn-padding-x)] rounded-[var(--ehpeek-control-radius-sm)] touch:min-h-[var(--ehpeek-control-touch-min-height)] touch:py-18px touch:px-26px",
    "control-compact": "py-[var(--ehpeek-control-compact-padding-y)] px-[var(--ehpeek-control-compact-padding-x)] rounded-[var(--ehpeek-control-radius-md)]",
    "control-icon": "w-[var(--ehpeek-control-icon-size)] h-[var(--ehpeek-control-icon-size)] items-center justify-center",
    "control-page": "w-[var(--ehpeek-control-page-size)] h-[var(--ehpeek-control-page-size)] rounded-[var(--ehpeek-control-radius-md)] touch:w-38px touch:h-38px touch:rounded-[var(--ehpeek-control-radius-reader)]",
    "control-primary-action": "flex min-w-0 w-full h-full flex-col items-center justify-center gap-[var(--ehpeek-control-primary-gap)] py-[var(--ehpeek-control-action-padding-y)] px-15px border-0 bg-transparent color-accent text-center uppercase [touch-action:manipulation]",
    "control-reader-btn": "w-[var(--ehpeek-control-reader-button-width)] h-[var(--ehpeek-control-reader-button-height)] px-[var(--ehpeek-control-btn-padding-x)] py-0 rounded-[var(--ehpeek-control-radius-reader)]",
    "control-tag": "inline-flex max-w-full min-h-[var(--ehpeek-control-tag-min-height)] items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--ehpeek-control-radius-pill)] px-21px no-underline",
    "control-tag-group": "min-h-34px overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--ehpeek-control-radius-pill)] py-7px px-10px text-center lowercase",
    "control-touch-menu-item": "block box-border w-full min-h-[var(--ehpeek-control-menu-item-min-height)] py-14px px-18px border-0 border-b color-border-subtle-b bg-transparent color-text text-left no-underline",
    "control-range": "h-48px px-12px py-0",
    "textsize-lg": "text-26px touch:text-30px",
    "textsize-md": "text-20px touch:text-26px",
    "textsize-sm": "text-14px touch:text-20px",
    "textsize-xs": "text-11px touch:text-14px",
  },
});
