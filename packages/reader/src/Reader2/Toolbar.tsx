import type { JSX } from "solid-js";

export interface ReaderToolbarProps {
  /** Main tool visibility; help, options and download dialogs keep their own local state. */
  open: boolean;
  /** Show the browser-fullscreen status and the matching toggle action. */
  fullscreenActive: boolean;
  onToggleFullscreen(): void;
}

/**
 * Owns menus, download dialog, notices and the fullscreen clock.
 * Reads settings, reading position and image resources from this Reader's Context.
 * Downloads are derived from the displayed page/spread, not maintained as navigation state.
 */
export declare function ReaderToolbar(props: ReaderToolbarProps): JSX.Element;
