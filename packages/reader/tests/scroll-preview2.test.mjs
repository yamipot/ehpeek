import assert from "node:assert/strict";
import { after, test } from "node:test";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import { Window } from "happy-dom";

const window = new Window({ url: "https://preview.test/" });
const document = window.document;
for (const key of [
  "window", "document", "Node", "Element", "HTMLElement", "HTMLImageElement",
  "Image", "ResizeObserver", "PointerEvent", "MouseEvent",
]) globalThis[key] = key === "window" ? window : window[key];
for (const key of ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"])
  globalThis[key] = window[key].bind(window);
Object.defineProperties(window.HTMLElement.prototype, {
  clientWidth: {
    configurable: true,
    get() { return this.classList.contains("ehpeek-preview-scroller") ? 600 : 0; },
  },
  clientHeight: {
    configurable: true,
    get() { return this.classList.contains("ehpeek-preview-scroller") ? 400 : 0; },
  },
});
after(() => window.close());

const output = await build({
  stdin: {
    contents: `
      import { createComponent, createSignal } from "solid-js";
      import { createStore } from "solid-js/store";
      import { render } from "solid-js/web";
      import { ScrollPreview } from "./src/ScrollPreview2/ScrollPreview";
      import { PreviewDecodeCache } from "./src/ScrollPreview2/DecodeCache";
      import { createPreviewCache } from "./src/features/PreviewCache";

      export function mount(root, source, callbacks = {}) {
        const cache = createPreviewCache(source);
        const decodeCache = new PreviewDecodeCache(1024 * 1024, 20);
        const settings = createStore({ direction: "ttb", crossCount: null });
        const [visible, setVisible] = createSignal(true);
        let reference = null;
        const dispose = render(() => createComponent(ScrollPreview, {
          previewCache: cache,
          decodeCache,
          settings,
          initPage: callbacks.initPage ?? 1,
          initialProgress: callbacks.initialProgress ?? null,
          get visible() { return visible(); },
          disabled: false,
          leftHanded: false,
          ref: value => { reference = value; callbacks.onRef?.(value); },
          onSelectPage: page => callbacks.onSelect?.(page),
          onResize: page => callbacks.onResize?.(page),
          onClose: page => callbacks.onClose?.(page),
          onError: error => callbacks.onError?.(error),
        }), root);
        return {
          cache, decodeCache, settings, setVisible,
          reference: () => reference,
          dispose() { dispose(); cache.dispose(); decodeCache.dispose(); },
        };
      }
    `,
    resolveDir: new URL("../", import.meta.url).pathname,
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  loader: { ".css": "text" },
  plugins: [solidPlugin()],
});
const preview = await import(
  `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`
);

function source(totalPages = 6) {
  const item = pageNum => ({
    aspectRatio: 1.5,
    pageNum,
    pageUrl: `/page/${pageNum}`,
    thumbnail: {
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      backgroundSize: "contain",
      height: 120,
      kind: "image",
      url: `/thumb/${pageNum}.jpg`,
      width: 80,
    },
  });
  return {
    totalPages,
    initialPageNum: 1,
    aspectRatio: 1.5,
    initialPreviewItems: Array.from({ length: totalPages }, (_, index) => item(index + 1)),
    getPreviewItems: async pages => pages.map(item),
    getPages: async () => [],
    loadImage: async () => ({ imageUrl: "" }),
  };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test("ScrollPreview instances isolate progress and expose local selection", async t => {
  document.body.replaceChildren();
  const firstRoot = document.createElement("div");
  const secondRoot = document.createElement("div");
  document.body.append(firstRoot, secondRoot);
  const selected = [];
  const refs = [];
  const first = preview.mount(firstRoot, source(), {
    initialProgress: 2,
    onSelect: page => selected.push(page),
    onRef: value => refs.push(value),
  });
  const second = preview.mount(secondRoot, source(), { initialProgress: 5 });
  t.after(() => {
    if (first.reference()) first.dispose();
    second.dispose();
  });
  await settle();

  let published = null;
  first.reference().progress.subscribe(page => { published = page; });
  first.reference().progress.setProgress(3);
  assert.equal(first.reference().progress.current(), 3);
  assert.equal(second.reference().progress.current(), 5);
  assert.equal(published, null);

  firstRoot.querySelector('a[href="/page/4"]').click();
  assert.equal(first.reference().progress.current(), 4);
  assert.equal(second.reference().progress.current(), 5);
  assert.equal(published, 4);
  assert.deepEqual(selected, [4]);

  first.setVisible(false);
  assert.equal(firstRoot.querySelector(".ehpeek-preview-panel").hidden, true);
  first.setVisible(true);
  assert.equal(firstRoot.querySelector(".ehpeek-preview-panel").hidden, false);
  first.dispose();
  assert.equal(refs.at(-1), null);
});

test("ScrollPreview reports the retained viewport page for host actions", async t => {
  document.body.replaceChildren();
  const root = document.createElement("div");
  document.body.append(root);
  const resized = [];
  const closed = [];
  const mounted = preview.mount(root, source(), {
    initPage: 4,
    onResize: page => resized.push(page),
    onClose: page => closed.push(page),
  });
  t.after(() => mounted.dispose());
  await settle();

  const buttons = [...root.querySelectorAll("button")];
  buttons.find(button => button.getAttribute("aria-label") === "Open full-screen Scroll Preview").click();
  buttons.find(button => button.getAttribute("aria-label") === "Close").click();
  document.dispatchEvent(new window.KeyboardEvent("keydown", {
    key: "Escape",
    bubbles: true,
    cancelable: true,
  }));
  assert.equal(resized.length, 1);
  assert.ok(resized[0] >= 1 && resized[0] <= 6);
  assert.equal(mounted.reference().currentPage(), resized[0]);
  assert.deepEqual(closed, [resized[0], resized[0]]);
});
