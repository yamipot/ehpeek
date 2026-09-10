import { createEffect, For, onCleanup, Show } from "solid-js";
import { Icon } from "../kit/Widgets/Icon";
import { useScrollPreview } from "./Context";
import type { PreviewTilePlacement } from "./layout";

export type { PreviewTilePlacement } from "./layout";

export interface PreviewTileProps extends PreviewTilePlacement {
  /** The batch failed to load, so the placeholder becomes a retry control. */
  failed: boolean;
  /** Upper bound on enlargement relative to the thumbnail's intrinsic dimensions. */
  maximumScale: number;
  retry(): void;
}

export interface PreviewGridProps {
  /** Full scrollable content dimensions in CSS pixels, including unrendered images. */
  contentSize: { width: number; height: number };
  /** Only visible and overscan tiles, with geometry already calculated by the viewport. */
  tiles: readonly PreviewTilePlacement[];
  /** Enlargement limit applied to every tile, relative to intrinsic dimensions. */
  maximumScale: number;
  failedBatches: ReadonlySet<number>;
  retry(pageNum: number): void;
}

export function PreviewGrid(props: PreviewGridProps) {
  const preview = useScrollPreview();
  return (
    <div
      class="ehpeek-preview-canvas"
      style={{
        height: `${props.contentSize.height}px`,
        width: `${props.contentSize.width}px`,
      }}
    >
      <For each={props.tiles}>{(tile) => (
        <PreviewTile
          {...tile}
          failed={props.failedBatches.has(preview.previewCache.batchForPage(tile.pageNum))}
          maximumScale={props.maximumScale}
          retry={() => props.retry(tile.pageNum)}
        />
      )}</For>
    </div>
  );
}

export function PreviewTile(props: PreviewTileProps) {
  const preview = useScrollPreview();
  const item = () => {
    preview.previewCache.version();
    return preview.previewCache.item(props.pageNum);
  };
  let releaseDecodedImage: (() => void) | null = null;

  createEffect(() => {
    releaseDecodedImage?.();
    const current = item();
    releaseDecodedImage = current?.thumbnail.url
      ? preview.decodeCache.retain(current.thumbnail.url)
      : null;
  });
  onCleanup(() => releaseDecodedImage?.());

  return (
    <div
      class="ehpeek-preview-slot"
      style={{
        height: `${props.height}px`,
        left: `${props.x}px`,
        top: `${props.y}px`,
        width: `${props.width}px`,
      }}
    >
      <div class="ehpeek-preview-tile" style={{ height: `${props.height}px` }}>
        <Show
          when={item()}
          keyed
          fallback={
            <button
              type="button"
              class="ehpeek-preview-placeholder"
              disabled={!props.failed}
              onClick={() => props.retry()}
            >
              <Show when={props.failed}>
                <Icon name="refresh" size="var(--ui-icon-size-lg)" />
              </Show>
              <span>{props.pageNum}</span>
            </button>
          }
        >
          {(loaded) => {
            const imageScale = () => Math.min(
              props.maximumScale,
              props.height / loaded.thumbnail.height,
              props.width / loaded.thumbnail.width,
            );
            return (
              <>
                <Show
                  when={loaded.thumbnail.kind === "background"}
                  fallback={
                    <img
                      class="ehpeek-preview-image"
                      src={loaded.thumbnail.url}
                      alt=""
                      width={loaded.thumbnail.width}
                      height={loaded.thumbnail.height}
                      style={{
                        height: `${loaded.thumbnail.height * imageScale()}px`,
                        width: `${loaded.thumbnail.width * imageScale()}px`,
                      }}
                      decoding="async"
                      draggable={false}
                    />
                  }
                >
                  <span
                    class="ehpeek-preview-image"
                    style={{
                      "background-image": `url(${JSON.stringify(loaded.thumbnail.url)})`,
                      "background-position": loaded.thumbnail.backgroundPosition,
                      "background-repeat": loaded.thumbnail.backgroundRepeat,
                      "background-size": loaded.thumbnail.backgroundSize,
                      height: `${loaded.thumbnail.height}px`,
                      transform: `scale(${imageScale()})`,
                      "transform-origin": "center",
                      width: `${loaded.thumbnail.width}px`,
                    }}
                    role="img"
                    aria-label={`Page ${loaded.pageNum}`}
                  />
                </Show>
                <a
                  class="ehpeek-preview-page-link"
                  href={loaded.pageUrl}
                  draggable={false}
                  aria-label={`Page ${loaded.pageNum}`}
                  aria-current={preview.progress.current() === props.pageNum ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    preview.selectPage(props.pageNum);
                  }}
                />
                <Show when={preview.progress.current() === props.pageNum}>
                  <span class="ehpeek-preview-highlight" aria-hidden="true" />
                </Show>
              </>
            );
          }}
        </Show>
      </div>
    </div>
  );
}
