import spectrumUiSizes from "ehpeek:spectrum-ui-sizes";

const UI_SCALE_FACTORS = {
  xsmall: 0.8,
  small: 1,
  medium: 1.25,
  large: 1.5,
  xlarge: 1.8,
} as const;

export type UiScale = keyof typeof UI_SCALE_FACTORS;
export type UiSizeScale = Record<"xs" | "sm" | "md" | "lg" | "xl", string>;
export const UI_SCALE_NAMES = Object.freeze(
  Object.keys(UI_SCALE_FACTORS) as UiScale[],
);

export function nextUiScale(scale: UiScale): UiScale {
  const index = UI_SCALE_NAMES.indexOf(scale);
  return UI_SCALE_NAMES[(index + 1) % UI_SCALE_NAMES.length]!;
}

export function applyUiScale(
  scale: UiScale,
  root: HTMLElement = document.documentElement,
  pixelFactor = 1,
): void {
  const factor = UI_SCALE_FACTORS[scale] * pixelFactor;

  root.dataset.ehpeekUiScale = scale;
  applySizeScale(root, "--ui-control-size", spectrumUiSizes.control, factor);
  applyHitSizeScale(root, spectrumUiSizes.control, factor);
  applySizeScale(root, "--ui-font-size", spectrumUiSizes.font, factor);
  applySizeScale(root, "--ui-icon-size", spectrumUiSizes.icon, factor);
  applySizeScale(root, "--ui-space", spectrumUiSizes.space, factor);
  applySizeScale(root, "--ui-radius", spectrumUiSizes.radius, factor);
}

function applyHitSizeScale(
  root: HTMLElement,
  values: UiSizeScale,
  factor: number,
): void {
  for (const [name, value] of Object.entries(values)) {
    root.style.setProperty(
      `--ui-hit-size-${name}`,
      `${Math.max(32, scaledPixelValue(value, factor))}px`,
    );
  }
}

function applySizeScale(
  root: HTMLElement,
  prefix: string,
  values: UiSizeScale,
  factor: number,
): void {
  for (const [name, value] of Object.entries(values)) {
    root.style.setProperty(`${prefix}-${name}`, `${scaledPixelValue(value, factor)}px`);
  }
}

function scaledPixelValue(value: string, factor: number): number {
  return Math.round(pixelValue(value) * factor * 1000) / 1000;
}

function pixelValue(value: string): number {
  const pixels = /^([\d.]+)px$/.exec(value)?.[1];
  if (pixels === undefined) {
    throw new Error(`Expected a pixel UI size, received: ${value}`);
  }
  return Number(pixels);
}
