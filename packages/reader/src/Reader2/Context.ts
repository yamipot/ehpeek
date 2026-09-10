import type { Accessor, Context, Setter } from "solid-js";
import type {
  ContentSource,
  ReaderOrientation,
  ReaderCustomization,
  ReaderSettingsState,
} from "../kit/interfaces";
import type { ReaderPosition } from "./index";
import type { ReaderLoading } from "./loading";
import type { ReaderScrollScale } from "./ScrollScale";

/** One Reader subtree; viewport geometry and gesture snapshots stay with their owners. */
export interface ReaderContext {
  source: ContentSource;
  settings: ReaderSettingsState;
  /** Selects portrait or landscape preferences as the screen rotates. */
  orientation: Accessor<ReaderOrientation>;
  customization: ReaderCustomization;
  position: ReaderPosition;
  loading: ReaderLoading;
  scrollScale: ReaderScrollScale;
  /** Pairing choice for this mount only; it is not a persisted preference. */
  firstPageSeparate: [Accessor<boolean>, Setter<boolean>];
  disabled: Accessor<boolean>;
  /** Dismiss image zoom first, otherwise ask the host to close Reader. */
  close(): void;
  /** Open Preview at the displayed reading page. */
  openPreview(): void;
  /** Report end-screen activation and request closure. */
  finish(): void;
}

export declare const ReaderContextKey: Context<ReaderContext | undefined>;
export declare function useReaderContext(): ReaderContext;
