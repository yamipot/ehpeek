import { defineConfig, presetWind3 } from "unocss";

export default defineConfig({
  presets: [presetWind3()],
  shortcuts: {
    "color-accent": "text-[#f0b35a]",
    "color-border": "border-[#8d7454]",
    "color-dim-border": "border-[rgba(255,255,255,0.18)]",
    "color-elevated": "bg-[#3f4249] shadow-[0_8px_24px_rgba(0,0,0,0.38)]",
    "color-reader-accent": "[accent-color:#f3f3f3]",
    "color-reader-button": "bg-[rgba(35,35,35,0.88)] text-[#f3f3f3] border-[rgba(255,255,255,0.18)]",
    "color-reader-text": "text-[#f3f3f3]",
    "color-soft-panel": "bg-[rgba(18,18,18,0.82)] text-[#f5f5f5] border-[rgba(255,255,255,0.18)]",
    "color-surface": "bg-[#4f535b]",
    "color-text": "text-[#f1f1f1]",
    "textsize-lg": "text-28px",
    "textsize-md": "text-20px",
    "textsize-sm": "text-14px",
    "textsize-xs": "text-11px",
  },
});
