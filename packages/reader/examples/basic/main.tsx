import { createSignal } from "solid-js";
import { render } from "solid-js/web";
import { ReadingView } from "@ehpeek/reader";
import type { ContentSource, ReaderInstance } from "@ehpeek/reader/interfaces";

const pages = Array.from({ length: 30 }, (_, index) => {
  const pageNum = index + 1;
  const width = pageNum % 5 === 0 ? 1200 : 800;
  const height = 1100;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="hsl(${index * 29} 35% 30%)"/><text x="50%" y="50%" text-anchor="middle" fill="white" font-family="sans-serif" font-size="100">${pageNum}</text></svg>`;
  return {
    pageNum,
    width,
    height,
    url: `data:image/svg+xml,${encodeURIComponent(svg)}`,
  };
});
const previewItems = pages.map((page) => ({
  aspectRatio: page.height / page.width,
  pageNum: page.pageNum,
  pageUrl: page.url,
  thumbnail: {
    backgroundPosition: "",
    backgroundRepeat: "",
    backgroundSize: "",
    kind: "image" as const,
    url: page.url,
    width: 160,
    height: (160 * page.height) / page.width,
  },
}));
const source: ContentSource = {
  totalPages: pages.length,
  initialPageNum: 1,
  aspectRatio: 1100 / 800,
  initialPreviewItems: previewItems,
  getPages: async (numbers) =>
    numbers.map((pageNum) => {
      const page = pages[pageNum - 1]!;
      return { pageNum, url: page.url, aspectRatio: page.height / page.width };
    }),
  getPreviewItems: async (numbers) =>
    numbers.map((pageNum) => previewItems[pageNum - 1]!),
  loadImage: async (page) => {
    const image = pages[page.pageNum! - 1]!;
    return { imageUrl: image.url, width: image.width, height: image.height };
  },
};

function Example() {
  const [reader, setReader] = createSignal<ReaderInstance | null>(null);
  const [progress, setProgress] = createSignal(1);
  const [setting, setSetting] = createSignal("No setting changes");
  return (
    <main class="reader-example">
      <header>
        <h1>Reader + Preview</h1>
        <button disabled={!reader()} onClick={() => void reader()?.open(progress())}>
          Open Reader
        </button>
        <button disabled={!reader()} onClick={() => reader()?.openPreview()}>Open Preview</button>
      </header>
      <div class="preview">
        <ReadingView
          embeddedPreview
          fillPreviewContainer={() => true}
          instanceRef={setReader}
          options={{
            source,
            onProgress: (page) => setProgress(page.pageNum ?? 1),
            settings: { embeddedPreviewDirection: "ttb" },
            onSettingChange: {
              portraitControls: (value) => setSetting(JSON.stringify(value)),
              landscapeControls: (value) => setSetting(JSON.stringify(value)),
              embeddedPreviewDirection: (value) => setSetting(value),
            },
          }}
        />
      </div>
      <output>
        Reader page: {progress()} · {setting()}
      </output>
    </main>
  );
}
render(() => <Example />, document.getElementById("app")!);
