import { defineConfig, presetWind3, transformerVariantGroup } from "unocss";

const ehpTheme = {
  colors: {
    accent: "#4da3ff",
    border: "rgba(15, 15, 15, 0.92)",
    foreground: "#f3f3f3",
    track: "rgba(255, 255, 255, 0.34)",
  },
};

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerVariantGroup()],
  theme: {
    colors: {
      ehp: ehpTheme.colors,
    },
  },
  variants: [
    mediaVariant("coarse", "(pointer: coarse)"),
    mediaVariant("desktop", "(min-width: 760px)"),
    mediaVariant("landscape", "(orientation: landscape)"),
    mediaVariant("coarse-landscape", "(orientation: landscape) and (pointer: coarse)"),
    selectVariant("touch", (s) => `html[data-ehpeek-touch-ui="true"] ${s}`),
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
  --ehp-color-accent: ${ehpTheme.colors.accent};
  --ehp-color-border: ${ehpTheme.colors.border};
  --ehp-color-foreground: ${ehpTheme.colors.foreground};
  --ehp-color-track: ${ehpTheme.colors.track};
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
    "color-reader-badge": "bg-[rgba(15,15,15,0.34)]",
    "color-reader-text": "text-[var(--ehpeek-color-reader-text)]",
    "color-search-swipe": "bg-[rgba(64,64,64,0.88)] text-[rgba(255,255,255,0.96)] border-[rgba(255,255,255,0.34)] shadow-[0_6px_20px_rgba(0,0,0,0.42)]",
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
    "control-scroll-hidden": "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    "control-tag": "inline-flex max-w-full min-h-[var(--ehpeek-control-tag-min-height)] items-center overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--ehpeek-control-radius-pill)] px-21px no-underline",
    "control-tag-group": "min-h-34px overflow-hidden text-ellipsis whitespace-nowrap rounded-[var(--ehpeek-control-radius-pill)] py-7px px-10px text-center lowercase",
    "control-touch-menu-item": "block box-border w-full min-h-[var(--ehpeek-control-menu-item-min-height)] py-14px px-18px border-0 border-b color-border-subtle-b bg-transparent color-text text-left no-underline",
    "textsize-lg": "text-26px touch:text-30px",
    "textsize-md": "text-20px touch:text-26px",
    "textsize-sm": "text-14px touch:text-20px",
    "textsize-xs": "text-11px touch:text-14px",
  },
});

function selectVariant(prefix, fSelect) {
  return (matcher) => {
    const marker = `${prefix}:`;

    if (!matcher.startsWith(marker)) {
      return matcher;
    }

    return {
      matcher: matcher.slice(marker.length),
      selector: (selector) => fSelect(selector),
    };
  };
}


function mediaVariant(prefix, media) {
  return (matcher) => {
    const marker = `${prefix}:`;

    if (!matcher.startsWith(marker)) {
      return matcher;
    }

    return {
      matcher: matcher.slice(marker.length),
      parent: `@media ${media}`,
    };
  };
}
