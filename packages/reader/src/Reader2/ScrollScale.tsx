import type { Accessor, JSX } from "solid-js";
import type { ReadDirection, ReaderScrollSizeScale, ReaderSettingsState } from "../kit/interfaces";
import type { ReaderViewportSize } from "./Viewport";

export interface ReaderScrollScale {
  /** Fit-relative layout scale; null is fit, unlike the absolute image scale used by the controls. */
  value: Accessor<ReaderScrollSizeScale>;
  /** Absolute image scale as a percentage; null until the reference image has dimensions. */
  percent: Accessor<number | null>;
  adjusting: Accessor<boolean>;
  /** Begin adjustment with a snapshot that can be restored on cancellation. */
  open(): void;
  /** Change absolute image scale: 1 means one image pixel per CSS pixel. */
  resize(imageScale: number): void;
  /** Select a sizing rule instead of an explicit image scale. */
  selectPreset(preset: "fit" | "fill" | "one-to-one"): void;
  /** Keep this axis's temporary scale and close the adjustment controls. */
  apply(): void;
  /** Also update this axis's persisted default through the existing settings notifications. */
  applyGlobally(): void;
  /** Restore the adjustment snapshot and close the controls. */
  cancel(): void;
}

/**
 * Retains each axis's temporary scale and owns adjustment rollback for one Reader mount.
 * Gestures, layout and adjustment controls use the same scale without sharing pinch snapshots.
 */
export declare function createReaderScrollScale(options: {
  settings: ReaderSettingsState;
  direction: Accessor<ReadDirection>;
  /** Read-only measured geometry; scale adjustment cannot resize the container. */
  viewportSize: Accessor<ReaderViewportSize | null>;
  /** Dimensions of the initial reference page in image pixels; retain the first available size. */
  referenceImageSize: Accessor<{ width: number; height: number } | null>;
}): ReaderScrollScale;

/** Owns adjustment-control input; uses Context.scrollScale for presets, application and rollback. */
export declare function ReaderScrollScaleControls(): JSX.Element;
