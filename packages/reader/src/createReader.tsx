import {
  createSignal,
  createEffect,
  onCleanup,
  untrack,
  type Accessor,
} from "solid-js";
import { ScrollPreview } from "./components/ScrollPreview";
import {
  createReaderSettings,
  type ReaderSettings,
  type SettingCallbacks,
  type ReadDirection,
} from "./settings";
import { createPreviewCache } from "./PreviewCache";
import {
  type ReadProgressPort,
  ReadProgressSyncer,
} from "./ReadProgressSyncer";
import {
  ReaderPresentation,
  type ReaderPresentationOptions,
} from "./ReaderPresentation";
import { createOverlayHost, OverlayHostProvider } from "./App/OverlayHost";
import type { ReaderTexts } from "./i18n";
import { applyUiScale, type UiScale } from "./ui";

export type ReaderInstanceOptions = Omit<
  ReaderPresentationOptions,
  "settings" | "host" | "onProgress" | "onError" | "onReaderActions"
> & {
  settings?: Partial<ReaderSettings>;
  onSettingChange?: SettingCallbacks;
  host?: ReaderPresentationOptions["host"];
  texts?: ReaderTexts;
  uiScale?: UiScale;
  initialProgress?: number | null;
  onProgress?: ReaderPresentationOptions["onProgress"];
  onError?: (error: unknown) => void;
};
export type ReaderInstance = ReturnType<typeof createReader>;

export function createReader(options: ReaderInstanceOptions) {
  if (
    !Number.isSafeInteger(options.source.totalPages) ||
    options.source.totalPages < 1
  ) {
    throw new RangeError("A reader needs a positive, finite number of pages.");
  }
  const host =
    options.host ??
    createOverlayHost(document.body, options.uiScale, options.texts);
  const settings = createReaderSettings(
    options.settings,
    options.onSettingChange,
  );
  const cache = createPreviewCache(options.source);
  let readerProgress: ReadProgressPort | null = null;
  let previewProgress: ReadProgressPort | null = null;
  let syncer: ReadProgressSyncer | null = null;
  const connectProgress = () => {
    syncer?.dispose();
    syncer =
      readerProgress && previewProgress
        ? new ReadProgressSyncer(readerProgress, previewProgress)
        : null;
  };
  const [progress, setProgress] = createSignal(options.initialProgress ?? null);
  const onError =
    options.onError ??
    ((error: unknown) => {
      console.error("[reader]", error);
    });
  const presentation = new ReaderPresentation({
    ...options,
    host,
    settings,
    onError,
    onReaderActions: (actions) => {
      readerProgress = actions?.progress ?? null;
      connectProgress();
    },
    onProgress: (page) => {
      if (page.pageNum) {
        setProgress(page.pageNum);
      }
      options.onProgress?.(page);
    },
  });

  function Preview(props: {
    embedded?: boolean;
    fillContainer?: Accessor<boolean>;
    embeddedDirection?: ReadDirection;
    leftHandedControls?: boolean;
  }) {
    let root!: HTMLDivElement;
    createEffect(() => applyUiScale(host.uiScale(), root));
    createEffect(() => {
      if (props.embeddedDirection !== undefined)
        settings.set("embeddedPreviewDirection", props.embeddedDirection);
      if (props.leftHandedControls !== undefined)
        settings.set("leftHandedControls", props.leftHandedControls);
    });
    return (
      <OverlayHostProvider host={host}>
        <div
          ref={root}
          class="ehpeek-ui-root contents"
          onPointerOver={(event) => {
            root.dataset.readerPointer =
              event.pointerType === "mouse" ? "mouse" : "touch";
          }}
        >
          <ScrollPreview
            actionsRef={(actions) => {
              presentation.attachPreview(actions);
              previewProgress = actions?.progress ?? null;
              connectProgress();
              const page = progress();
              if (page !== null) actions?.progress.setProgress(page);
            }}
            initialProgress={options.initialProgress}
            embeddedDirection={settings.value().embeddedPreviewDirection}
            fillEmbeddedContainer={props.fillContainer ?? (() => false)}
            leftHandedControls={() => settings.value().leftHandedControls}
            onClose={(page) => presentation.requestClosePreview(page)}
            onOpenOverlay={(page) => presentation.openPreview(page)}
            onSelectPage={(_url, page) => presentation.selectPage(page)}
            onLoadError={onError}
            onEmbeddedDirectionChange={(direction) =>
              settings.set("embeddedPreviewDirection", direction)
            }
            onReadDirectionChange={(direction) =>
              settings.set("previewDirection", direction)
            }
            previewCache={cache}
            readDirection={settings.value().previewDirection}
            replaceOriginalPreview={props.embedded ?? false}
          />
        </div>
      </OverlayHostProvider>
    );
  }
  return {
    Preview,
    settings,
    progress,
    presentation,
    open: (pageNum = options.source.initialPageNum, fullscreen = false) =>
      presentation.openReader(pageNum, fullscreen),
    openPreview: (pageNum = progress() ?? options.source.initialPageNum) =>
      presentation.openPreview(pageNum),
    dispose: async () => {
      syncer?.dispose();
      cache.dispose();
      try {
        await presentation.dispose();
      } finally {
        if (!options.host) host.element.remove();
      }
    },
  };
}

/** Complete default UI; mounting this alone supplies both views and their interaction. */
export function ReadingView(props: {
  options: ReaderInstanceOptions;
  embeddedPreview?: boolean;
  fillPreviewContainer?: Accessor<boolean>;
  instanceRef?: (instance: ReaderInstance) => void;
}) {
  const instance = createReader(untrack(() => props.options));
  untrack(() => props.instanceRef)?.(instance);
  onCleanup(() => {
    void instance.dispose();
  });
  return (
    <instance.Preview
      embedded={props.embeddedPreview}
      fillContainer={props.fillPreviewContainer}
    />
  );
}
