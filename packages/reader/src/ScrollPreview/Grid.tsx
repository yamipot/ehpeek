import { createEffect, For, onCleanup, Show } from "solid-js";
import { Icon } from "../kit/Widgets/Icon";
import { useScrollPreviewContext } from "./Context";
import type { PreviewTilePlacement } from "./layout";

export type { PreviewTilePlacement } from "./layout";

export interface PreviewTileProps extends PreviewTilePlacement {
  /** Upper bound on enlargement relative to the thumbnail's intrinsic dimensions. */
  maximumScale: number;
}

export interface PreviewGridProps {
  /** Full scrollable content dimensions in CSS pixels, including unrendered images. */
  contentSize: { width: number; height: number };
  /** Only visible and overscan tiles, with geometry already calculated by the viewport. */
  tiles: readonly PreviewTilePlacement[];
  /** Enlargement limit applied to every tile, relative to intrinsic dimensions. */
  maximumScale: number;
}

export function PreviewGrid(props: PreviewGridProps) {
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
          maximumScale={props.maximumScale}
        />
      )}</For>
    </div>
  );
}

export function PreviewTile(props: PreviewTileProps) {
  const ctx = useScrollPreviewContext();
  const failed = () => ctx.loading.failedBatches().has(ctx.previewCache.batchForPage(props.pageNum));
  const item = () => {
    ctx.previewCache.version();
    return ctx.previewCache.item(props.pageNum);
  };
  let releaseDecodedImage: (() => void) | null = null;

  createEffect(() => {
    releaseDecodedImage?.();
    const current = item();
    releaseDecodedImage = current?.thumbnail.url
      ? ctx.decodeCache.retain(current.thumbnail.url)
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
              disabled={!failed()}
              onClick={() => ctx.loading.retry(props.pageNum)}
            >
              <Show when={failed()}>
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
                  aria-current={ctx.progress.current() === props.pageNum ? "page" : undefined}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    ctx.selectPage(props.pageNum);
                  }}
                />
                <Show when={ctx.progress.current() === props.pageNum}>
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
