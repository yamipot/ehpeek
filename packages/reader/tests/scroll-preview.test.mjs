import assert from "node:assert/strict";
import { after, test } from "node:test";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import { Window } from "happy-dom";

const window = new Window({ url: "https://preview.test/" });
const document = window.document;
for (const key of [
  "window", "document", "Node", "Element", "HTMLElement", "HTMLHeadElement", "HTMLImageElement",
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
      import { createComponent, createSignal, mergeProps } from "solid-js";
      import { createStore } from "solid-js/store";
      import { render } from "solid-js/web";
      import { ScrollPreview } from "./src/ScrollPreview/index";
      import { ComposedPreview } from "./tests/fixtures/preview-composition";
      import { ReadingView } from "@ehpeek/reader";
      import { PreviewDecodeCache } from "./src/ScrollPreview/DecodeCache";
      import { createPreviewCache } from "./src/features/PreviewCache";

      export function mount(root, source, callbacks = {}) {
        const cache = createPreviewCache(source);
        const decodeCache = new PreviewDecodeCache(1024 * 1024, 20);
        const settings = createStore({
          direction: callbacks.direction ?? "ttb",
          crossCount: callbacks.crossCount ?? null,
        });
        const [visible, setVisible] = createSignal(true);
        const [disabled, setDisabled] = createSignal(false);
        const [fitContentHeight, setFitContentHeight] = createSignal(callbacks.fitContentHeight ?? false);
        const [accent, setAccent] = createSignal("red");
        const [viewportVisible, setViewportVisible] = createSignal(true);
        let reference = null;
        const props = {
          previewCache: cache,
          decodeCache,
          settings,
          initPage: callbacks.initPage ?? 1,
          initialProgress: callbacks.initialProgress ?? null,
          get visible() { return visible(); },
          get disabled() { return disabled(); },
          get fitContentHeight() { return fitContentHeight(); },
          leftHanded: false,
          ref: value => { reference = value; callbacks.onRef?.(value); },
          onSelectPage: page => callbacks.onSelect?.(page),
          onResize: page => callbacks.onResize?.(page),
          onClose: page => callbacks.onClose?.(page),
          onError: error => callbacks.onError?.(error),
        };
        const dispose = render(() => callbacks.composed
          ? createComponent(ComposedPreview, mergeProps(props, {
              get accent() { return accent(); },
              get viewportVisible() { return viewportVisible(); },
            }))
          : createComponent(ScrollPreview, props), root);
        return {
          cache, decodeCache, settings, setVisible, setDisabled, setFitContentHeight, setAccent, setViewportVisible,
          reference: () => reference,
          dispose() { dispose(); cache.dispose(); decodeCache.dispose(); },
        };
      }

      export function mountReading(root, source, callbacks = {}) {
        let instance;
        const dispose = render(() => createComponent(ReadingView, {
          options: {
            source,
            initialProgress: 2,
            settings: { embeddedPreviewDirection: "ttb", previewDirection: "ttb" },
            placement: () => ({
              coversPreview: callbacks.coversPreview ?? false,
              container: {
                available: () => true,
                bounds: () => ({ left: 0, top: 0, width: 400, height: 600 }),
                listen: () => () => {},
              },
            }),
            onPreviewClosed: callbacks.onPreviewClosed,
            onSettingChange: callbacks.onSettingChange,
          },
          embeddedPreview: true,
          fillPreviewContainer: () => true,
          instanceRef: value => { instance = value; },
        }), root);
        return { instance, dispose };
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
const nextFrame = () => new Promise(resolve => window.requestAnimationFrame(resolve));

function button(root, label) {
  const target = [...root.querySelectorAll("button")].find(item => item.getAttribute("aria-label") === label);
  assert.ok(target, label);
  return target;
}

test("Content-height fitting can return to the container's full height", async t => {
  document.body.replaceChildren();
  const originalHeight = Object.getOwnPropertyDescriptor(window.HTMLElement.prototype, "clientHeight");
  Object.defineProperty(window.HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      if (this.classList.contains("ehpeek-preview-panel")) return Number.parseFloat(this.style.height) || 430;
      if (this.classList.contains("ehpeek-preview-scroller")) return this.closest(".ehpeek-preview-panel").clientHeight - 30;
      return 0;
    },
  });
  const root = document.createElement("div");
  document.body.append(root);
  const mounted = preview.mount(root, source(3), { fitContentHeight: true });
  t.after(() => {
    mounted.dispose();
    Object.defineProperty(window.HTMLElement.prototype, "clientHeight", originalHeight);
  });
  await nextFrame();
  const panel = root.querySelector(".ehpeek-preview-panel");
  const fittedHeight = panel.clientHeight;
  assert.ok(fittedHeight > 30 && fittedHeight < 430);
  mounted.setFitContentHeight(false);
  await nextFrame();
  assert.equal(panel.style.height, "");
  assert.equal(panel.clientHeight, 430);
  mounted.setFitContentHeight(true);
  await nextFrame();
  assert.equal(panel.clientHeight, fittedHeight);
  mounted.settings[1]("direction", "ltr");
  await nextFrame();
  assert.ok(panel.clientHeight <= 430);
  assertVisible(root, 2);
});

test("ReadingView shares highlights but retains independent Preview viewports across enlargement", async t => {
  document.body.replaceChildren();
  const root = document.createElement("div");
  document.body.append(root);
  const returns = [];
  const directions = [];
  const mounted = preview.mountReading(root, {
    ...source(90),
    getPages: async pages => pages.map(pageNum => ({ pageNum, url: `/page/${pageNum}`, aspectRatio: 1.5 })),
    loadImage: () => new Promise(() => {}),
  }, {
    onPreviewClosed: page => returns.push(page),
    onSettingChange: { embeddedPreviewDirection: next => directions.push(next) },
  });
  t.after(async () => { mounted.dispose(); await settle(); });
  const inline = root.querySelector(".ehpeek-preview-panel");
  await nextFrame();
  await mounted.instance.open(25);
  await nextFrame();
  assertVisible(inline, 25);
  assert.ok(inline.querySelector('a[aria-current="page"][href="/page/25"]'));
  const inlineScroller = inline.querySelector(".ehpeek-preview-scroller");
  const inlineOffset = inlineScroller.scrollTop;

  button(inline, "Open full-screen Scroll Preview").click();
  await nextFrame();
  const overlay = document.querySelector('.ehpeek-preview-host[data-embedded="false"] > .ehpeek-preview-panel');
  assert.ok(overlay.querySelector('a[aria-current="page"][href="/page/25"]'));
  assert.equal(inline.inert, true);
  assertVisible(overlay, 25);
  const overlayScroller = overlay.querySelector(".ehpeek-preview-scroller");
  overlayScroller.scrollTop = 4800;
  overlayScroller.dispatchEvent(new window.Event("scroll"));
  await nextFrame();
  assert.equal(inlineScroller.scrollTop, inlineOffset);
  const rangeBeforeClose = visibleRange(overlay);
  button(overlay, "Close").click();
  await settle();
  assert.equal(mounted.instance.activeView, "reader");
  assert.equal(root.querySelector(".ehpeek-preview-panel"), inline);
  assert.equal(inline.inert, false);
  assert.ok(returns[0] >= rangeBeforeClose.first && returns[0] <= rangeBeforeClose.last);

  await mounted.instance.open(55);
  await nextFrame();
  assertVisible(inline, 55);
  assert.ok(inline.querySelector('a[aria-current="page"][href="/page/55"]'));
  const previousConfirm = window.confirm;
  window.confirm = () => true;
  t.after(() => { window.confirm = previousConfirm; });
  button(inline, "Scroll Preview: top to bottom").click();
  await nextFrame();
  assert.deepEqual(directions, ["ltr"]);
  assert.equal(mounted.instance.settings.value().embeddedPreviewDirection, "ltr");
  assertVisible(inline, 55);
});

test("Reader-covered inline Preview reuses its expand button and returns with Escape", async t => {
  document.body.replaceChildren();
  const root = document.createElement("div");
  document.body.append(root);
  const mounted = preview.mountReading(root, {
    ...source(30),
    getPages: async pages => pages.map(pageNum => ({ pageNum, url: `/page/${pageNum}`, aspectRatio: 1.5 })),
    loadImage: () => new Promise(() => {}),
  }, { coversPreview: true });
  t.after(async () => { mounted.dispose(); await settle(); });
  await mounted.instance.open(12);
  await nextFrame();
  const inline = root.querySelector(".ehpeek-preview-panel");
  const reader = document.querySelector("#ehpeek-reader");
  const readerScroller = reader.querySelector(".ehpeek-reader-scroller");
  readerScroller.getBoundingClientRect = () => new window.DOMRect(0, 0, 400, 600);
  readerScroller.dispatchEvent(new window.PointerEvent("pointerdown", {
    bubbles: true, pointerId: 1, pointerType: "mouse", button: 0, clientX: 200, clientY: 100,
  }));
  document.dispatchEvent(new window.PointerEvent("pointerup", {
    bubbles: true, pointerId: 1, pointerType: "mouse", button: 0, clientX: 200, clientY: 100,
  }));
  button(reader, "Scroll Preview").click();
  await nextFrame();
  assert.equal(root.querySelector(".ehpeek-preview-panel"), inline);
  assert.equal(inline.inert, false);
  assert.equal(document.querySelector('.ehpeek-preview-host[data-embedded="false"]'), null);
  assertVisible(inline, 12);
  button(inline, "Open full-screen Scroll Preview");
  assert.equal(inline.querySelector('button[aria-label="Close"]'), null);
  document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  await settle();
  assert.equal(mounted.instance.activeView, "reader");
  assert.equal(inline.inert, true);
  assert.equal(document.querySelector("#ehpeek-reader"), reader);
});

function visibleRange(root) {
  const range = root.querySelector(".ehpeek-preview-range").textContent.match(/(\d+)–(\d+)/);
  assert.ok(range, "The toolbar shows the viewport's visible pages");
  return { first: Number(range[1]), last: Number(range[2]) };
}

function assertVisible(root, page) {
  const { first, last } = visibleRange(root);
  assert.ok(first <= page && last >= page, `Page ${page} is within ${first}–${last}`);
}

test("Composed Preview connects wrapped parts and custom controls without caller wiring", async t => {
  const root = document.createElement("div");
  document.body.append(root);
  const closed = [];
  const mounted = preview.mount(root, source(120), {
    composed: true, initPage: 62, initialProgress: 62, crossCount: 4,
    onClose: page => closed.push(page),
  });
  t.after(() => { mounted.dispose(); root.remove(); });
  await nextFrame();

  const panel = root.querySelector(".ehpeek-preview-panel");
  const toolbar = root.querySelector(".ehpeek-preview-toolbar");
  const customButton = button(root, "Locate custom highlight");
  assert.equal(panel.firstElementChild.className, "custom-body");
  assert.equal(toolbar.parentElement.className, "custom-header");
  assert.ok(panel.classList.contains("custom-panel"));
  assert.ok(toolbar.classList.contains("custom-toolbar"));
  assertVisible(root, 62);

  button(root, "Zoom out").click();
  await nextFrame();
  assert.equal(mounted.settings[0].crossCount, 5);
  mounted.reference().scrollToPage(92);
  await nextFrame();
  assertVisible(root, 92);
  customButton.click();
  await nextFrame();
  assertVisible(root, 62);
  assert.equal(mounted.reference().progress.current(), 62);

  mounted.setAccent("blue");
  assert.equal(panel.style.color, "blue");
  assert.equal(toolbar.style.color, "blue");
  assert.equal(root.querySelector(".custom-viewport").style.borderColor, "blue");
  const oldScroller = root.querySelector(".ehpeek-preview-scroller");
  mounted.settings[1]("direction", "rtl");
  await nextFrame();
  assert.notEqual(root.querySelector(".ehpeek-preview-scroller"), oldScroller);
  assert.equal(root.querySelector(".ehpeek-preview-toolbar"), toolbar);
  assert.equal(button(root, "Locate custom highlight"), customButton);
  assert.equal(root.querySelector(".custom-viewport").style.borderColor, "blue");
  assertVisible(root, 62);

  mounted.setDisabled(true);
  mounted.reference().scrollToPage(92);
  await nextFrame();
  customButton.click();
  button(root, "Close").click();
  assertVisible(root, 92);
  assert.deepEqual(closed, []);
  mounted.setDisabled(false);
  button(root, "Close").click();
  assert.deepEqual(closed, [mounted.reference().currentPage()]);
});

test("Composed instances retain independent positions when a viewport is temporarily removed", async t => {
  const firstRoot = document.createElement("div");
  const secondRoot = document.createElement("div");
  document.body.append(firstRoot, secondRoot);
  const first = preview.mount(firstRoot, source(120), { composed: true, initPage: 62, initialProgress: 62 });
  const second = preview.mount(secondRoot, source(120), { composed: true, initPage: 12, initialProgress: 12 });
  t.after(() => { first.dispose(); second.dispose(); firstRoot.remove(); secondRoot.remove(); });
  await nextFrame();
  first.reference().scrollToPage(82);
  await nextFrame();
  const retainedPage = first.reference().currentPage();
  first.setViewportVisible(false);
  assert.equal(first.reference().currentPage(), retainedPage);
  assert.equal(firstRoot.querySelector(".ehpeek-preview-viewport"), null);
  assert.equal(button(firstRoot, "Zoom in").disabled, true);
  first.setViewportVisible(true);
  await nextFrame();
  assertVisible(firstRoot, retainedPage);
  button(firstRoot, "Locate custom highlight").click();
  await nextFrame();
  assertVisible(firstRoot, 62);
  assertVisible(secondRoot, 12);
  assert.equal(second.reference().progress.current(), 12);
});

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

test("Toolbar zoom, positioning and direction changes share the viewport without changing progress", async t => {
  const root = document.createElement("div");
  document.body.append(root);
  const mounted = preview.mount(root, source(120), {
    initPage: 62, initialProgress: 62, crossCount: 4,
  });
  t.after(() => { mounted.dispose(); root.remove(); });
  await nextFrame();

  const panel = root.querySelector(".ehpeek-preview-panel");
  assert.equal(root.querySelector(".ehpeek-preview-toolbar").parentElement, panel);
  assertVisible(root, 62);
  root.querySelector('button[aria-label="Zoom out"]').click();
  await nextFrame();
  assert.equal(mounted.settings[0].crossCount, 5);
  assertVisible(root, 62);
  assert.equal(mounted.reference().progress.current(), 62);

  mounted.reference().scrollToPage(82);
  await nextFrame();
  assertVisible(root, 82);
  const retainedPage = mounted.reference().currentPage();
  for (const direction of ["rtl", "ltr", "ttb"]) {
    mounted.settings[1]("direction", direction);
    await nextFrame();
    assertVisible(root, retainedPage);
    assert.equal(root.querySelector('[role="scrollbar"]').getAttribute("aria-orientation"),
      direction === "ttb" ? "vertical" : "horizontal");
    assert.equal(mounted.reference().progress.current(), 62);
  }

  const beforeHide = visibleRange(root);
  mounted.setVisible(false);
  mounted.setVisible(true);
  await nextFrame();
  assert.deepEqual(visibleRange(root), beforeHide);
});

test("Native scroll updates the toolbar and retained page in all reading directions", async t => {
  const root = document.createElement("div");
  document.body.append(root);
  const mounted = preview.mount(root, source(120), { crossCount: 3, initialProgress: 2 });
  t.after(() => { mounted.dispose(); root.remove(); });
  for (const direction of ["ttb", "ltr", "rtl"]) {
    mounted.settings[1]("direction", direction);
    await nextFrame();
    mounted.reference().scrollToPage(62);
    await nextFrame();
    const before = mounted.reference().currentPage();
    const scroller = root.querySelector(".ehpeek-preview-scroller");
    if (direction === "ttb") scroller.scrollTop += 400;
    else scroller.scrollLeft += direction === "rtl" ? -600 : 600;
    scroller.dispatchEvent(new window.Event("scroll"));
    await nextFrame();
    assert.ok(mounted.reference().currentPage() > before, direction);
    assertVisible(root, mounted.reference().currentPage());
    assert.equal(mounted.reference().progress.current(), 2);
  }
});

function touch(target, type, id, x, y = 100) {
  target.dispatchEvent(new window.PointerEvent(type, {
    pointerId: id, pointerType: "touch", clientX: x, clientY: y,
    bubbles: true, cancelable: true,
  }));
}

test("A pinch changes settings while retaining its original highlighted page", async t => {
  const root = document.createElement("div");
  document.body.append(root);
  const mounted = preview.mount(root, source(120), {
    initPage: 62, initialProgress: 62, crossCount: 6,
  });
  t.after(() => { mounted.dispose(); root.remove(); });
  await nextFrame();
  const scroller = root.querySelector(".ehpeek-preview-scroller");
  touch(scroller, "pointerdown", 1, 100);
  touch(scroller, "pointerdown", 2, 200);
  touch(document, "pointermove", 2, 300);
  await nextFrame();
  assert.equal(mounted.settings[0].crossCount, 3);
  assertVisible(root, 62);
  touch(document, "pointermove", 2, 150);
  await nextFrame();
  assert.equal(mounted.settings[0].crossCount, 12);
  assertVisible(root, 62);
  touch(document, "pointerup", 2, 150);
  touch(document, "pointerup", 1, 100);
  assert.equal(mounted.reference().progress.current(), 62);
});

test("Arriving thumbnail sizes wait for the active gesture before reflowing around the same page", { timeout: 2000 }, async t => {
  const content = source(120);
  const items = content.initialPreviewItems;
  content.initialPreviewItems = items.slice(0, 3);
  let centerRequested;
  const requestReady = new Promise(resolve => { centerRequested = resolve; });
  content.getPreviewItems = pages => new Promise(resolve => {
    if (pages.includes(62)) centerRequested({ pages, resolve });
  });
  const root = document.createElement("div");
  document.body.append(root);
  const mounted = preview.mount(root, content, { initPage: 62, crossCount: 4 });
  t.after(() => { mounted.dispose(); root.remove(); });
  await nextFrame();
  const request = await requestReady;
  assert.ok(root.querySelector(".ehpeek-preview-loading"));
  const scroller = root.querySelector(".ehpeek-preview-scroller");
  const canvas = root.querySelector(".ehpeek-preview-canvas");
  const oldHeight = canvas.style.height;
  const oldPage = mounted.reference().currentPage();
  touch(scroller, "pointerdown", 1, 100);
  touch(scroller, "pointerdown", 2, 200);
  request.resolve(request.pages.map(page => ({
    ...items[page - 1], aspectRatio: 3,
    thumbnail: { ...items[page - 1].thumbnail, height: 240 },
  })));
  await settle();
  await nextFrame();
  assert.equal(canvas.style.height, oldHeight);
  touch(document, "pointerup", 2, 200);
  touch(document, "pointerup", 1, 100);
  await nextFrame();
  assert.notEqual(canvas.style.height, oldHeight);
  assert.equal(mounted.reference().currentPage(), oldPage);
  assert.equal(mounted.reference().progress.current(), null);
});

test("Drag-to-close owns its animation and cancels it when the Preview becomes disabled", async t => {
  const animations = [];
  const originalAnimate = window.HTMLElement.prototype.animate;
  window.HTMLElement.prototype.animate = function (keyframes) {
    let finish;
    const animation = {
      keyframes, target: this, cancelled: false,
      finished: new Promise(resolve => { finish = resolve; }),
      finish() { finish(); },
      cancel() { this.cancelled = true; },
    };
    animations.push(animation);
    return animation;
  };
  const root = document.createElement("div");
  document.body.append(root);
  const closed = [];
  const mounted = preview.mount(root, source(120), { onClose: page => closed.push(page) });
  t.after(() => {
    mounted.dispose(); root.remove();
    window.HTMLElement.prototype.animate = originalAnimate;
  });
  await nextFrame();
  const scroller = root.querySelector(".ehpeek-preview-scroller");
  const panel = root.querySelector(".ehpeek-preview-panel");
  const drag = () => {
    scroller.dispatchEvent(new window.PointerEvent("pointerdown", {
      pointerId: 1, pointerType: "touch", clientX: 0, clientY: 0, bubbles: true,
    }));
    document.dispatchEvent(new window.PointerEvent("pointermove", {
      pointerId: 1, pointerType: "touch", clientX: 200, clientY: 0, bubbles: true,
    }));
    assert.match(panel.style.transform, /translate3d\(200px, 0px, 0\)/);
    document.dispatchEvent(new window.PointerEvent("pointerup", {
      pointerId: 1, pointerType: "touch", clientX: 200, clientY: 0, bubbles: true,
    }));
  };

  drag();
  assert.equal(animations.at(-1).target, panel);
  assert.equal(closed.length, 0);
  mounted.setDisabled(true);
  assert.equal(animations.at(-1).cancelled, true);
  assert.equal(panel.style.transform, "");
  animations.at(-1).finish();
  await settle();
  assert.equal(closed.length, 0);

  mounted.setDisabled(false);
  drag();
  animations.at(-1).finish();
  await settle();
  assert.deepEqual(closed, [mounted.reference().currentPage()]);
});
