import spectrumUiScales from "ehpeek:spectrum-ui-scales";
import type { UiScale } from "../state";

export function applyUiScale(
  scale: UiScale,
  root: HTMLElement = document.documentElement,
  factor = 1,
): void {
  const values = spectrumUiScales[scale];

  root.dataset.ehpeekUiScale = scale;
  applySizeScale(root, "--ui-control-size", values.control, factor);
  applySizeScale(root, "--ui-font-size", values.font, factor);
  applySizeScale(root, "--ui-icon-size", values.icon, factor);
  applySizeScale(root, "--ui-status-dot-size", values.statusDot, factor);
}

function applySizeScale(
  root: HTMLElement,
  prefix: string,
  values: Record<string, string>,
  factor: number,
): void {
  for (const [name, value] of Object.entries(values)) {
    const pixels = /^([\d.]+)px$/.exec(value)?.[1];
    root.style.setProperty(
      `${prefix}-${name}`,
      pixels === undefined ? value : `${Number(pixels) * factor}px`,
    );
  }
}
