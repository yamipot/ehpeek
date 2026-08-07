import { defineConfig, presetWind3, transformerVariantGroup } from "unocss";

const SIZE_NAMES = ["xs", "sm", "md", "lg", "xl"];

export default defineConfig({
  presets: [presetWind3()],
  transformers: [transformerVariantGroup()],
  postprocess: [pointerHoverPostprocessor()],
  variants: [
    containerVariant("search-panel-compact", "(max-width: 540px)"),
    containerVariant("viewport-toolbar-compact", "(max-width: 430px)"),
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
    "z-dialog": "z-1400",
    ...pixelShortcuts(["w", "h", "min-h"], { xs: 24, sm: 32, md: 40, lg: 52, xl: 80 }),
    ...pixelShortcuts(
      ["p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml", "gap", "gap-x", "gap-y"],
      { xs: 4, sm: 8, md: 12, lg: 16, xl: 24 },
    ),
    ...pixelShortcuts(["rounded"], { xs: 3, sm: 4, md: 6, lg: 8, xl: 10 }),
    "scrollbar-hidden": "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden",
    "textsize-xl": "text-[length:var(--ui-font-size-xl)]",
    "textsize-lg": "text-[length:var(--ui-font-size-lg)]",
    "textsize-md": "text-[length:var(--ui-font-size-md)]",
    "textsize-sm": "text-[length:var(--ui-font-size-sm)]",
    "textsize-xs": "text-[length:var(--ui-font-size-xs)]",
    ...variableShortcuts(
      ["w", "h", "min-w", "min-h", "p", "px", "py", "pt", "pr", "pb", "pl", "m", "mx", "my", "mt", "mr", "mb", "ml", "gap", "gap-x", "gap-y"],
      "space",
    ),
    ...variableShortcuts(["rounded"], "radius"),
    ...hitSizeShortcuts(),
    ...safeAreaShortcuts({ sm: 8, md: 12, lg: 16 }),
  },
});

function pixelShortcuts(properties, sizes) {
  return Object.fromEntries(
    properties.flatMap((property) =>
      Object.entries(sizes).map(([name, size]) => [`${property}-${name}`, `${property}-${size}px`]),
    ),
  );
}

function variableShortcuts(properties, group) {
  return Object.fromEntries(
    properties.flatMap((property) =>
      SIZE_NAMES.map((name) => [
        `ui-${property}-${name}`,
        `${property}-[var(--ui-${group}-${name})]`,
      ]),
    ),
  );
}

function hitSizeShortcuts() {
  return Object.fromEntries(
    SIZE_NAMES.flatMap((name) => [
      [`ui-hit-w-${name}`, `w-[var(--ui-hit-size-${name})]`],
      [`ui-hit-h-${name}`, `h-[var(--ui-hit-size-${name})]`],
      [`ui-hit-min-w-${name}`, `min-w-[var(--ui-hit-size-${name})]`],
      [`ui-hit-min-h-${name}`, `min-h-[var(--ui-hit-size-${name})]`],
      [`ui-hit-square-${name}`, `w-[var(--ui-hit-size-${name})] h-[var(--ui-hit-size-${name})]`],
    ]),
  );
}

function safeAreaShortcuts(sizes) {
  const directions = {
    top: ["top", "pt", "mt"],
    right: ["right", "pr", "mr"],
    bottom: ["bottom", "pb", "mb"],
    left: ["left", "pl", "ml"],
  };
  return Object.fromEntries(
    Object.entries(sizes).flatMap(([name, size]) => [
      ...Object.entries(directions).flatMap(([direction, properties]) =>
        properties.map((property) => [
          `safe-${property}-${name}`,
          `${property}-[max(${size}px,env(safe-area-inset-${direction},0px))]`,
        ]),
      ),
      [
        `safe-px-${name}`,
        `pl-[max(${size}px,env(safe-area-inset-left,0px))] pr-[max(${size}px,env(safe-area-inset-right,0px))]`,
      ],
    ]),
  );
}

function containerVariant(prefix, condition) {
  return (matcher) => {
    const marker = `${prefix}:`;
    if (!matcher.startsWith(marker)) {
      return matcher;
    }
    return {
      matcher: matcher.slice(marker.length),
      parent: `@container ${condition}`,
    };
  };
}

function pointerHoverPostprocessor() {
  return (utility) => {
    if (utility.selector.includes(":hover")) {
      utility.selector =
        `:root[data-ehpeek-pointer="mouse"] ${utility.selector}`;
    }
  };
}
