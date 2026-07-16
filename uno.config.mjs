import { defineConfig, presetWind3, transformerVariantGroup } from "unocss";

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerVariantGroup()],
  variants: [
    mediaVariant("coarse", "(pointer: coarse)"),
    mediaVariant("desktop", "(min-width: 760px)"),
    mediaVariant("landscape", "(orientation: landscape)"),
    mediaVariant("coarse-landscape", "(orientation: landscape) and (pointer: coarse)"),
    selectVariant("touch", (s) => `html[data-ehpeek-touch-ui="true"] ${s}`),
  ],
  shortcuts: {
    "ehp-color-button-reader": "bg-[var(--color-control)] text-[var(--color-text)] border-[var(--color-border)]",
    "ehp-color-overlay": "bg-[var(--color-elevated)] text-[var(--color-text)] border-[var(--color-border)] shadow-[0_6px_20px_var(--color-shadow-floating)]",
    "ehp-color-reader-badge": "bg-[var(--color-badge)]",
    "ehp-color-text": "text-[var(--color-text)]",
    "ehp-color-site-accent": "text-[var(--color-site-accent)]",
    "ehp-color-site-border": "border-[var(--color-site-border)]",
    "ehp-color-site-border-subtle-b": "border-b-[var(--color-site-border-subtle)]",
    "ehp-color-site-btn": "border ehp-color-site-border bg-transparent ehp-color-site-accent hover:bg-[var(--color-site-accent-hover)]",
    "ehp-color-site-elevated": "bg-[var(--color-site-elevated)] shadow-[0_8px_24px_var(--color-shadow-elevated)]",
    "ehp-color-site-item-hover": "hover:bg-[var(--color-site-item-hover)]",
    "ehp-color-site-panel-primary": "bg-[var(--color-site-elevated)] shadow-[0_2px_10px_var(--color-shadow-panel)]",
    "ehp-color-site-surface": "bg-[var(--color-site-surface)]",
    "ehp-color-site-swipe": "bg-[var(--color-site-swipe-background)] text-[var(--color-site-text)] border-[var(--color-site-swipe-border)] shadow-[0_6px_20px_var(--color-shadow-floating)]",
    "ehp-color-site-tag": "border ehp-color-site-border bg-[var(--color-site-surface)] ehp-color-site-text hover:ehp-color-site-accent",
    "ehp-color-site-tag-group": "bg-[var(--color-site-elevated)] ehp-color-site-accent",
    "ehp-color-site-text": "text-[var(--color-site-text)]",
    "z-ui": "z-1000",
    "z-overlay": "z-1100",
    "z-reader": "z-1200",
    ...sizedShortcuts(["w", "h", "min-h"], { xs: 24, sm: 32, md: 40, lg: 52, xl: 80 }),
    ...sizedShortcuts(["p", "px", "py"], { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 }),
    ...sizedShortcuts(["rounded"], { xs: 3, sm: 4, md: 6, lg: 8, xl: 10 }),
    "control-scroll-hidden": "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    "textsize-xl": "text-26px touch:text-30px",
    "textsize-lg": "text-20px touch:text-23px",
    "textsize-md": "text-14px touch:text-20px",
    "textsize-sm": "text-11px touch:text-14px",
    "textsize-xs": "text-9px touch:text-11px",
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

function sizedShortcuts(properties, sizes) {
  return Object.fromEntries(
    properties.flatMap((property) =>
      Object.entries(sizes).map(([name, size]) => [`${property}-${name}`, `${property}-${size}px`]),
    ),
  );
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
