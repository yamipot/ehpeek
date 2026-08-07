import spectrumUiSizes from "ehpeek:spectrum-ui-sizes";
import { uiStateStyle } from "./uiRoot";

const UI_SCALE_SELECTOR =
  '.ehpeek-ui-root, body.ehpeek-touch-gallery-page, .eh-syringe-lite-auto-complete-list';

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
  root?: HTMLElement,
  pixelFactor = 1,
): void {
  const factor = UI_SCALE_FACTORS[scale] * pixelFactor;

  if (!root) {
    applyGlobalUiScale(factor);
    return;
  }
  for (const [property, value] of uiScaleDeclarations(factor)) {
    root.style.setProperty(property, value);
  }
}

function applyGlobalUiScale(factor: number): void {
  const style = uiStateStyle();
  const declarations = uiScaleDeclarations(factor)
    .map(([property, value]) => `${property}:${value}`)
    .join(";");
  style.textContent = `${UI_SCALE_SELECTOR}{${declarations}}`;
}

function uiScaleDeclarations(factor: number): Array<readonly [string, string]> {
  return [
    ...sizeScaleDeclarations("--ui-control-size", spectrumUiSizes.control, factor),
    ...hitSizeScaleDeclarations(spectrumUiSizes.control, factor),
    ...sizeScaleDeclarations("--ui-font-size", spectrumUiSizes.font, factor),
    ...sizeScaleDeclarations("--ui-icon-size", spectrumUiSizes.icon, factor),
    ...sizeScaleDeclarations("--ui-space", spectrumUiSizes.space, factor),
    ...sizeScaleDeclarations("--ui-radius", spectrumUiSizes.radius, factor),
  ];
}

function sizeScaleDeclarations(
  prefix: string,
  values: UiSizeScale,
  factor: number,
): Array<readonly [string, string]> {
  return Object.entries(values).map(([name, value]) => [
    `${prefix}-${name}`,
    `${scaledPixelValue(value, factor)}px`,
  ] as const);
}

function hitSizeScaleDeclarations(
  values: UiSizeScale,
  factor: number,
): Array<readonly [string, string]> {
  return Object.entries(values).map(([name, value]) => [
    `--ui-hit-size-${name}`,
    `${Math.max(32, scaledPixelValue(value, factor))}px`,
  ] as const);
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
