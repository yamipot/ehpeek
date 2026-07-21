import { defineConfig, presetWind3, transformerVariantGroup } from "unocss";

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerVariantGroup()],
  variants: [
    mediaVariant("coarse", "(pointer: coarse)"),
    mediaVariant("desktop", "(min-width: 760px)"),
    mediaVariant("landscape", "(orientation: landscape)"),
    mediaVariant("coarse-landscape", "(orientation: landscape) and (pointer: coarse)"),
  ],
  shortcuts: {
    "ehp-color-reader": "bg-[var(--color-reader-background)] text-[var(--color-reader-text)]",
    "ehp-color-spinner": "border-[var(--color-border)] border-t-[var(--color-accent)]",
    "ehp-color-text": "text-[var(--color-text)]",
    "ehp-color-site-accent": "text-[var(--color-site-accent)]",
    "ehp-color-site-border": "border-[var(--color-site-border)]",
    "ehp-color-site-border-subtle-b": "border-b-[var(--color-site-border-subtle)]",
    "ehp-color-site-elevated": "bg-[var(--color-site-elevated)] shadow-[0_8px_24px_var(--color-shadow-elevated)]",
    "ehp-color-site-page": "bg-[var(--color-site-page)]",
    "ehp-color-site-surface": "bg-[var(--color-site-surface)]",
    "ehp-color-site-text": "text-[var(--color-site-text)]",
    "z-ui": "z-1000",
    "z-overlay": "z-1100",
    "z-reader": "z-1200",
    ...pixelShortcuts(["w", "h", "min-h"], { xs: 24, sm: 32, md: 40, lg: 52, xl: 80 }),
    ...pixelShortcuts(
      ["p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml", "gap", "gap-x", "gap-y"],
      { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    ),
    ...pixelShortcuts(["rounded"], { xs: 3, sm: 4, md: 6, lg: 8, xl: 10 }),
    "scrollbar-hidden": "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    "textsize-xl": "text-[length:var(--font-size-xl)]",
    "textsize-lg": "text-[length:var(--font-size-lg)]",
    "textsize-md": "text-[length:var(--font-size-md)]",
    "textsize-sm": "text-[length:var(--font-size-sm)]",
    "textsize-xs": "text-[length:var(--font-size-xs)]",
  },
});

function pixelShortcuts(properties, sizes) {
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
