import assert from "node:assert/strict";
import { after, test } from "node:test";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import { Window } from "happy-dom";

// Keep Solid's real DOM ownership and portals; replace only the heavyweight views
// and browser fullscreen boundary so lifecycle regressions are reproducible in Node.
const window = new Window({ url: "https://reader.test/" });
const document = window.document;
for (const key of ["window", "document", "Node", "Element", "HTMLElement", "HTMLHeadElement", "ResizeObserver", "PointerEvent", "MouseEvent"])
  globalThis[key] = key === "window" ? window : window[key];
for (const key of ["getComputedStyle", "requestAnimationFrame", "cancelAnimationFrame"])
  globalThis[key] = window[key].bind(window);
after(() => window.close());

const mocks = {
  "test:fixture": `
    export const fixture = {};
    export function progress(initial) {
      let value = initial;
      const listeners = new Set();
      return {
        current: () => value,
        setProgress: next => { value = next; },
        subscribe: listener => {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        publish: next => {
          value = next;
          for (const listener of listeners) listener(next);
        },
        listeners,
      };
    }
  `,
  "./Reader/index": `
    import { createEffect, onCleanup, onMount } from "solid-js";
    import { fixture, progress } from "test:fixture";
    export function Reader(props) {
      if (fixture.failMount) throw fixture.failMount;
      fixture.mounts++;
      fixture.readerProps = props;
      const port = progress(props.initPage);
      const actions = {
        progress: port,
        gotoPage(pageNum) {
          port.publish(pageNum);
          props.onProgress({ url: "/page/" + pageNum, aspectRatio: 1, pageNum });
        },
      };
      fixture.reader = actions;
      props.ref(actions);
      onMount(() => {
        if (fixture.failOnMount) throw fixture.failOnMount;
        actions.gotoPage(props.initPage);
      });
      onCleanup(() => { fixture.unmounts++; props.ref(null); });
      createEffect(() => { fixture.fullscreen = props.fullscreenActive; });
      const element = document.createElement("div");
      element.dataset.testReader = "";
      fixture.readerElement = element;
      return element;
    }
  `,
  "./ReadingPreview": `
    import { createEffect, onCleanup } from "solid-js";
    import { fixture, progress } from "test:fixture";
    export function ReadingPreview(props) {
      fixture.previewMounts++;
      fixture.previewProps = props;
      fixture.preview = progress(props.initialProgress ?? null);
      props.progressRef(fixture.preview);
      createEffect(() => { fixture.openState = props.openState; });
      onCleanup(() => { fixture.previewUnmounts++; props.progressRef(null); });
      const element = document.createElement("div");
      element.dataset.testPreview = "";
      return element;
    }
  `,
  "./kit/Widgets/OverlayHost": `
    import { createComponent } from "solid-js";
    import { Portal } from "solid-js/web";
    import { fixture } from "test:fixture";
    export function createOverlayHost() { return fixture.host; }
    export function OverlayHostProvider(props) { return props.children; }
    export function OverlayPortal(props) {
      return createComponent(Portal, {
        mount: fixture.host.element,
        get children() { return props.children; },
      });
    }
  `,
  "./features/Viewport": `
    import { fixture } from "test:fixture";
    export function lockPageScroll() {
      fixture.scrollLocks++;
      return () => { fixture.scrollLocks--; };
    }
    export function lockPageThemeColor() {
      fixture.themeLocks++;
      return () => { fixture.themeLocks--; };
    }
  `,
  "./kit/ui": "export function applyUiScale() {}",
  "./styles": "",
};
const output = await build({
  stdin: {
    contents: `
      import { createComponent, createSignal, Show } from "solid-js";
      import { render } from "solid-js/web";
      import { ReadingView } from "./src/ReadingView";
      import { fixture } from "test:fixture";
      export { fixture };
      export function mount(options, props = {}) {
        return render(() => {
          const [visible, setVisible] = createSignal(true);
          fixture.setVisible = setVisible;
          return createComponent(Show, {
            get when() { return visible(); },
            get children() {
              return createComponent(ReadingView, {
                ...props, options,
                instanceRef: instance => { fixture.instance = instance; },
              });
            },
          });
        }, fixture.root);
      }
    `,
    resolveDir: new URL("../", import.meta.url).pathname,
  },
  bundle: true,
  write: false,
  platform: "browser",
  format: "esm",
  plugins: [
    {
      name: "instance-boundaries",
      setup(build) {
        build.onResolve({ filter: /.*/ }, args => {
          if (args.path in mocks) return { path: args.path, namespace: "instance-mock" };
        });
        build.onLoad({ filter: /.*/, namespace: "instance-mock" }, args => ({
          contents: mocks[args.path],
          loader: "js",
          resolveDir: new URL("../", import.meta.url).pathname,
        }));
      },
    },
    solidPlugin(),
  ],
});
const { fixture, mount } = await import(
  `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`
);

function setup(t) {
  for (const key of Object.keys(fixture)) delete fixture[key];
  Object.assign(fixture, {
    events: [], mounts: 0, unmounts: 0, previewMounts: 0, previewUnmounts: 0,
    scrollLocks: 0, themeLocks: 0,
  });
  document.body.replaceChildren();
  Object.defineProperty(document, "fullscreenEnabled", { configurable: true, value: true });
  fixture.root = document.createElement("div");
  const element = document.createElement("div");
  document.body.append(fixture.root, element);
  const listeners = new Set();
  let fullscreen = false;
  fixture.host = {
    element,
    uiScale: () => "small",
    fullscreen: {
      active: () => fullscreen,
      subscribe: callback => { listeners.add(callback); return () => listeners.delete(callback); },
      enter: async () => setFullscreen(true),
      exit: async () => setFullscreen(false),
    },
  };
  element.requestFullscreen = fixture.host.fullscreen.enter;
  function setFullscreen(active) {
    fullscreen = active;
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true, value: active ? element : null,
    });
    for (const callback of listeners) callback(active);
  }
  setFullscreen(false);
  const source = {
    totalPages: 20,
    initialPageNum: 1,
    aspectRatio: 1,
    initialPreviewItems: [],
    getPreviewItems: async () => [],
    getPages: async () => [],
    loadImage: async () => ({ imageUrl: "/image" }),
  };
  function start(options = {}, props = {}) {
    const unmount = mount({ source, host: fixture.host, ...options }, props);
    t.after(async () => { unmount(); await settle(); });
    return { instance: fixture.instance, unmount };
  }
  return { source, host: fixture.host, setFullscreen, listeners, start };
}
const settle = () => new Promise(resolve => setImmediate(resolve));

const actualOutput = await build({
  stdin: {
    contents: `
      export { ReadingView } from "@ehpeek/reader";
      export { Reader } from "./dist/Reader/index.js";
      export { createReaderSettings } from "./dist/features/ReaderSettings.js";
      export { createReaderLoading } from "./dist/Reader/loading.js";
      export { createComponent, createSignal, createRoot } from "solid-js";
      export { render } from "solid-js/web";
    `,
    resolveDir: new URL("../", import.meta.url).pathname,
  },
  bundle: true, write: false, platform: "browser", format: "esm",
});
const actual = await import(
  `data:text/javascript;base64,${Buffer.from(actualOutput.outputFiles[0].text).toString("base64")}`
);

function mountActual(t, options = {}, props = {}) {
  document.body.replaceChildren();
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  const root = document.createElement("div");
  document.body.append(root);
  const source = {
    totalPages: 10, initialPageNum: 1, aspectRatio: 1, initialPreviewItems: [],
    getPreviewItems: async () => [],
    getPages: async numbers => numbers.map(pageNum => ({ pageNum, url: "/page/" + pageNum, aspectRatio: 1 })),
    loadImage: () => new Promise(() => {}),
  };
  let instance, setDisabled;
  const dispose = actual.render(() => {
    const [disabled, set] = actual.createSignal(false);
    setDisabled = set;
    return actual.createComponent(actual.ReadingView, {
      ...props, options: { source, ...options },
      get disabled() { return disabled(); },
      instanceRef: value => { instance = value; },
    });
  }, root);
  t.after(async () => { dispose(); await settle(); });
  return { instance, root, setDisabled, dispose };
}


function mountReader(t, overrides = {}, initialSettings = {}) {
  document.body.replaceChildren();
  const root = document.createElement("div");
  document.body.append(root);
  const changes = [];
  const source = {
    totalPages: 40, initialPageNum: 1, aspectRatio: 1, initialPreviewItems: [],
    getPreviewItems: async () => [],
    getPages: async numbers => numbers.map(pageNum => ({ pageNum, url: "/page/" + pageNum, aspectRatio: 1 })),
    loadImage: () => new Promise(() => {}),
    ...overrides,
  };
  const settings = actual.createReaderSettings(initialSettings);
  let reader, setDisabled;
  const dispose = actual.render(() => {
    const [disabled, set] = actual.createSignal(false);
    setDisabled = set;
    return actual.createComponent(actual.Reader, {
      source, settings, fullscreenActive: false,
      get disabled() { return disabled(); },
      ref: value => { reader = value; },
      onProgress: page => changes.push(page.pageNum),
      onClose: () => true, onEnd() {}, onOpenPreview() {}, onToggleFullscreen() {},
    });
  }, root);
  t.after(async () => { dispose(); await settle(); });
  return { reader, root, changes, settings, setDisabled, dispose };
}

test("Reader preserves silent sync through delayed metadata and publishes the next local destination", async t => {
  const pending = new Map();
  const { reader, changes } = mountReader(t, {
    initialPageNum: 2,
    getPages: numbers => new Promise(resolve => pending.set(numbers[0], resolve)),
  });
  const resolvePage = pageNum => {
    assert.ok(pending.has(pageNum));
    pending.get(pageNum)([{ pageNum, url: "/page/" + pageNum, aspectRatio: 1 }]);
  };
  reader.progress.setProgress(5);
  resolvePage(2);
  resolvePage(5);
  await settle();
  assert.equal(reader.progress.current(), 5);
  assert.deepEqual(changes, []);
  reader.gotoPage(6);
  assert.deepEqual(changes, []);
  resolvePage(6);
  await settle();
  assert.deepEqual(changes, [6]);
  reader.gotoPage(6);
  await settle();
  assert.deepEqual(changes, [6]);
});

test("Reader seek previews defer requests and progress; disable cancels the idle commit", async t => {
  const requested = [];
  const { reader, root, changes, setDisabled } = mountReader(t, {
    getPages: async numbers => {
      requested.push(...numbers);
      return numbers.map(pageNum => ({ pageNum, url: "/page/" + pageNum, aspectRatio: 1 }));
    },
  });
  await settle();
  changes.length = 0;
  const input = root.querySelector(".ehpeek-reader-progress-input");
  const seek = pageNum => {
    pointer(input, "pointerdown");
    input.value = String(pageNum);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  };
  seek(7);
  assert.equal(reader.progress.current(), 7);
  assert.deepEqual(changes, []);
  input.dispatchEvent(new window.Event("change", { bubbles: true }));
  await settle();
  assert.deepEqual(changes, [7]);
  changes.length = 0;
  seek(30);
  await settle();
  assert.equal(reader.progress.current(), 30);
  assert.equal(requested.includes(30), false);
  assert.deepEqual(changes, []);
  setDisabled(true);
  await new Promise(resolve => setTimeout(resolve, 220));
  assert.deepEqual(changes, []);
  reader.progress.setProgress(4);
  await settle();
  assert.equal(reader.progress.current(), 4);
  assert.deepEqual(changes, []);
});

test("Reader paged turns accumulate targets and cannot commit after silent sync or disable", async t => {
  const originalRequest = window.requestAnimationFrame, originalCancel = window.cancelAnimationFrame;
  const frames = new Map();
  let nextId = 1, now = performance.now();
  window.requestAnimationFrame = callback => { const id = nextId++; frames.set(id, callback); return id; };
  window.cancelAnimationFrame = id => { frames.delete(id); };
  t.after(() => { window.requestAnimationFrame = originalRequest; window.cancelAnimationFrame = originalCancel; });
  const flush = async () => {
    for (let step = 0; step < 12; step++) {
      await settle();
      const callbacks = [...frames.values()];
      frames.clear();
      now += 32;
      for (const callback of callbacks) callback(now);
    }
    await settle();
  };
  const controls = { navigationMode: "paged", scrollDirection: "ttb", pagedDirection: "ltr", pageLayout: "double", rightTapAction: "previous" };
  const { reader, changes, setDisabled } = mountReader(t, {}, { portraitControls: controls, landscapeControls: controls });
  await flush();
  changes.length = 0;
  keydown("ArrowLeft");
  keydown("ArrowLeft");
  await flush();
  assert.equal(reader.progress.current(), 5);
  assert.deepEqual(changes, [5]);
  changes.length = 0;
  keydown("ArrowLeft");
  reader.progress.setProgress(4);
  await flush();
  assert.equal(reader.progress.current(), 3);
  assert.deepEqual(changes, []);
  keydown("ArrowLeft");
  setDisabled(true);
  await flush();
  assert.equal(reader.progress.current(), 3);
  assert.deepEqual(changes, []);
});

test("Reader loading owns retry, progressive images, decoded retention and abort", async t => {
  let loader, dispose, signal, failMetadata = true;
  const [requestedPage, setRequestedPage] = actual.createSignal(1);
  actual.createRoot(cleanup => {
    dispose = cleanup;
    loader = actual.createReaderLoading({
      source: {
        totalPages: 4, initialPageNum: 1, aspectRatio: 1, initialPreviewItems: [],
        getPreviewItems: async () => [],
        getPages: async (numbers, abortSignal) => {
          signal = abortSignal;
          if (failMetadata) throw new Error("metadata failed");
          return numbers.map(pageNum => ({ pageNum, url: "/page/" + pageNum, aspectRatio: 1 }));
        },
        loadImage: async page => ({
          imageUrl: "https://reader.test/image/" + page.pageNum, width: 100, height: 100, displayWhileLoading: true,
        }),
      },
      requestedPage, priorityPages: () => [requestedPage()], firstVisiblePage: () => null,
      seeking: () => false, closing: () => false, renderWindowSize: 0, decodedImageCacheLimit: 0,
    });
  });
  t.after(dispose);
  await settle();
  assert.equal(loader.page(1).status, "error");
  failMetadata = false;
  loader.retry(1);
  await new Promise(resolve => setTimeout(resolve, 20));
  assert.ok(loader.page(1).page);
  assert.equal(loader.page(1).status, "loading");
  const element = loader.page(1).element;
  assert.ok(element);
  Object.defineProperty(element, "naturalWidth", { value: 100 });
  Object.defineProperty(element, "naturalHeight", { value: 100 });
  element.decode = async () => {};
  element.dispatchEvent(new window.Event("load"));
  await settle();
  assert.equal(loader.page(1).status, "ready");
  setRequestedPage(3);
  assert.equal(loader.page(1).element, null);
  assert.equal(loader.page(1).image, null);
  assert.equal(element.hasAttribute("src"), false);
  dispose();
  assert.equal(signal.aborted, true);
});

test("Reader accepts native scrolling without writing a second reading position during window replacement", async t => {
  const originalBounds = window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains("ehpeek-reader-scroller")) return new window.DOMRect(0, 0, 400, 600);
    if (this.classList.contains("ehpeek-page")) {
      const scroller = this.closest(".ehpeek-reader-scroller");
      const first = Number(scroller.querySelector(".ehpeek-page").dataset.ehpeekPageNum);
      const page = Number(this.dataset.ehpeekPageNum);
      return new window.DOMRect(0, (page - first) * 100 - scroller.scrollTop, 400, 100);
    }
    return originalBounds.call(this);
  };
  t.after(() => { window.HTMLElement.prototype.getBoundingClientRect = originalBounds; });
  const { reader, root, changes } = mountReader(t);
  const frames = () => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
  await settle();
  await frames();
  await frames();
  changes.length = 0;
  const scroller = root.querySelector(".ehpeek-reader-scroller");
  assert.equal(scroller.scrollTop, 1000);
  scroller.scrollTop += 300;
  scroller.dispatchEvent(new window.Event("scroll"));
  await frames();
  await settle();
  assert.equal(reader.progress.current(), 4);
  assert.deepEqual(changes, [4]);
  await frames();
  assert.equal(reader.progress.current(), 4);
  assert.deepEqual(changes, [4]);
});

test("Reader native scrolling cannot enter window padding beyond the first page or end screen", async t => {
  for (const direction of ["ttb", "ltr", "rtl"]) {
    await t.test(direction, async t => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const originalBounds = window.HTMLElement.prototype.getBoundingClientRect;
      window.HTMLElement.prototype.getBoundingClientRect = function () {
        if (this.classList.contains("ehpeek-reader-scroller")) return new window.DOMRect(0, 0, width, height);
        if (this.classList.contains("ehpeek-page")) {
          const scroller = this.closest(".ehpeek-reader-scroller");
          const nodes = [...scroller.querySelectorAll(".ehpeek-page")];
          const index = direction === "rtl" ? nodes.length - 1 - nodes.indexOf(this) : nodes.indexOf(this);
          return new window.DOMRect(
            direction === "ttb" ? 0 : index * width - scroller.scrollLeft,
            direction === "ttb" ? index * height - scroller.scrollTop : 0,
            width, height,
          );
        }
        return originalBounds.call(this);
      };
      t.after(() => { window.HTMLElement.prototype.getBoundingClientRect = originalBounds; });
      const controls = { navigationMode: "scroll", scrollDirection: direction };
      const { reader, root } = mountReader(t, { totalPages: 3, initialPageNum: 3 }, {
        portraitControls: controls, landscapeControls: controls,
      });
      const frames = () => new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      await settle();
      await frames();
      await frames();
      const scroller = root.querySelector(".ehpeek-reader-scroller");
      const offset = direction === "ttb" ? "scrollTop" : "scrollLeft";
      const advance = (direction === "ttb" ? height : width) * (direction === "rtl" ? -1 : 1);
      const pageRect = page => scroller.querySelector(`[data-ehpeek-page-num="${page}"]`).getBoundingClientRect();
      scroller[offset] += advance * 5;
      scroller.dispatchEvent(new window.Event("scroll"));
      assert.equal(direction === "ttb" ? pageRect(4).bottom : pageRect(4).right, direction === "ttb" ? height : width);
      await frames();
      await settle();
      assert.equal(reader.progress.current(), 4);

      reader.gotoPage(1);
      await settle();
      await frames();
      await frames();
      scroller[offset] -= advance * 5;
      scroller.dispatchEvent(new window.Event("scroll"));
      assert.equal(direction === "ttb" ? pageRect(1).top : pageRect(1).left, 0);
      await frames();
      await settle();
      assert.equal(reader.progress.current(), 1);
    });
  }
});

function labelledButton(root, label) {
  const button = [...root.querySelectorAll("button")].find(button => button.getAttribute("aria-label") === label);
  assert.ok(button, label);
  return button;
}
function keydown(key) {
  document.body.dispatchEvent(new window.KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}
function pointer(target, type, x = 200, y = 100) {
  target.dispatchEvent(new window.PointerEvent(type, {
    bubbles: true, pointerId: 1, pointerType: "mouse", button: 0, clientX: x, clientY: y,
  }));
}

test("Reader preview swipe restores page alignment before coverage and retains it after closing Preview", async t => {
  const originalBounds = window.HTMLElement.prototype.getBoundingClientRect;
  window.HTMLElement.prototype.getBoundingClientRect = function () {
    if (this.classList.contains("ehpeek-reader-scroller")) return new window.DOMRect(0, 0, 400, 600);
    if (this.classList.contains("ehpeek-page")) {
      const scroller = this.closest(".ehpeek-reader-scroller");
      const nodes = [...scroller.querySelectorAll(".ehpeek-page")];
      const index = scroller.dataset.readDirection === "rtl" ? nodes.length - 1 - nodes.indexOf(this) : nodes.indexOf(this);
      return new window.DOMRect(index * 400 - scroller.scrollLeft, 0, 400, 600);
    }
    return originalBounds.call(this);
  };
  t.after(() => { window.HTMLElement.prototype.getBoundingClientRect = originalBounds; });
  for (const direction of ["ltr", "rtl"]) {
    await t.test(direction, async t => {
      const { instance } = mountActual(t);
      for (const controls of [instance.settings.portraitControls, instance.settings.landscapeControls]) {
        controls.navigationMode.set("paged");
        controls.pagedDirection.set(direction);
        controls.pageLayout.set("single");
      }
      await instance.open(2);
      await settle();
      const reader = document.querySelector("#ehpeek-reader");
      const scroller = reader.querySelector(".ehpeek-reader-scroller");
      const aligned = scroller.scrollLeft;
      pointer(scroller, "pointerdown", 200, 100);
      document.dispatchEvent(new window.MouseEvent("mousemove", { bubbles: true, clientX: 220, clientY: 180 }));
      assert.equal(scroller.scrollLeft, aligned - 20);
      pointer(document, "pointerup", 220, 180);
      await settle();
      assert.equal(instance.activeView, "preview");
      assert.equal(reader.inert, true);
      assert.equal(scroller.scrollLeft, aligned);
      labelledButton(document.querySelector('.ehpeek-preview-host[data-embedded="false"] > .ehpeek-preview-panel'), "Close").click();
      await settle();
      assert.equal(instance.activeView, "reader");
      assert.equal(reader.inert, false);
      assert.equal(scroller.scrollLeft, aligned);
      assert.equal(instance.progress(), 2);
    });
  }
});

test("covered Reader ignores keyboard, wheel, buttons and a pointer released after coverage", async t => {
  const { instance } = mountActual(t);
  await instance.open(2);
  const reader = document.querySelector("#ehpeek-reader");
  const scroller = reader.querySelector(".ehpeek-reader-scroller");
  scroller.getBoundingClientRect = () => new window.DOMRect(0, 0, 400, 600);
  pointer(scroller, "pointerdown");
  instance.openPreview(2);
  assert.equal(reader.inert, true);
  assert.equal(window.getComputedStyle(scroller).overflow, "hidden");
  pointer(document, "pointerup");
  keydown("ArrowDown");
  scroller.dispatchEvent(new window.WheelEvent("wheel", { deltaY: 100, bubbles: true, cancelable: true }));
  labelledButton(reader, "Close").click();
  assert.equal(instance.progress(), 2);
  assert.equal(instance.activeView, "preview");
  assert.equal(reader.querySelector(".ehpeek-reader-toolbar-controls").hidden, true);
  labelledButton(document.querySelector('.ehpeek-preview-host[data-embedded="false"] > .ehpeek-preview-panel'), "Close").click();
  await settle();
  assert.equal(reader.inert, false);
  assert.equal(document.querySelector("#ehpeek-reader"), reader);
  keydown("ArrowDown");
  assert.equal(instance.progress(), 3);
});

test("public open switches from Preview with and without history, without a return callback", async t => {
  for (const withHistory of [false, true]) {
    await t.test(withHistory ? "history" : "local", async t => {
      let pop, depth = 0;
      const returns = [];
      const history = {
        push: value => { depth = value; },
        back: count => { depth -= count; queueMicrotask(() => pop(depth)); },
        subscribe: fn => { pop = fn; return () => {}; },
      };
      const { instance } = mountActual(t, {
        history: withHistory ? history : undefined,
        onPreviewClosed: page => returns.push(page),
      });
      instance.openPreview(2);
      await instance.open(3);
      const reader = document.querySelector("#ehpeek-reader");
      assert.equal(instance.activeView, "reader");
      assert.equal(document.querySelector('.ehpeek-preview-host[data-embedded="false"] > .ehpeek-preview-panel'), null);
      instance.openPreview(3);
      await instance.open(5);
      assert.equal(document.querySelector("#ehpeek-reader"), reader);
      assert.equal(instance.progress(), 5);
      assert.equal(instance.activeView, "reader");
      assert.equal(document.querySelector('.ehpeek-preview-host[data-embedded="false"] > .ehpeek-preview-panel'), null);
      assert.deepEqual(returns, []);
      if (withHistory) assert.equal(depth, 1);
    });
  }
});

test("disabled input preserves programmatic navigation and separately gates side-by-side Preview", async t => {
  const placement = {
    coversPreview: false,
    container: {
      available: () => true, bounds: () => ({ left: 0, top: 0, width: 400, height: 600 }),
      listen: () => () => {},
    },
  };
  const { instance, root, setDisabled } = mountActual(t, { placement: () => placement }, { embeddedPreview: true });
  await instance.open(2);
  const reader = document.querySelector("#ehpeek-reader");
  const embedded = root.querySelector('.ehpeek-preview-host[data-embedded="true"] > .ehpeek-preview-panel');
  assert.equal(reader.inert, false);
  assert.equal(embedded.inert, false);
  const scroller = reader.querySelector(".ehpeek-reader-scroller");
  scroller.getBoundingClientRect = () => new window.DOMRect(0, 0, 400, 600);
  pointer(scroller, "pointerdown"); pointer(document, "pointerup");
  labelledButton(reader, "Help").click();
  assert.ok(document.querySelector(".ehpeek-dialog"));
  setDisabled(true);
  assert.equal(reader.inert, true);
  assert.equal(embedded.inert, true);
  assert.equal(document.querySelector(".ehpeek-dialog"), null);
  keydown("ArrowDown");
  assert.equal(instance.progress(), 2);
  await instance.open(4);
  assert.equal(instance.progress(), 4);
  assert.equal(document.querySelector("#ehpeek-reader"), reader);
  instance.openPreview(4);
  const overlay = document.querySelector('.ehpeek-preview-host[data-embedded="false"] > .ehpeek-preview-panel');
  assert.equal(overlay.inert, true);
  labelledButton(overlay, "Close").click();
  assert.equal(instance.activeView, "preview");
  setDisabled(false);
  assert.equal(overlay.inert, false);
  assert.equal(embedded.inert, true);
  assert.equal(reader.inert, true);
  const previewScroller = overlay.querySelector(".ehpeek-preview-scroller");
  pointer(previewScroller, "pointerdown");
  document.dispatchEvent(new window.MouseEvent("mousemove", { bubbles: true, clientX: 200, clientY: 50 }));
  setDisabled(true);
  const stoppedOffset = previewScroller.scrollTop;
  document.dispatchEvent(new window.MouseEvent("mousemove", { bubbles: true, clientX: 200, clientY: 0 }));
  pointer(document, "pointerup", 200, 0);
  assert.equal(previewScroller.scrollTop, stoppedOffset);
  setDisabled(false);
  labelledButton(overlay, "Close").click();
  await settle();
  assert.equal(reader.inert, false);
  assert.equal(embedded.inert, false);
});

test("history returns notify the current preview page, but closing the whole reader does not", async t => {
  const env = setup(t);
  let pop;
  const returns = [];
  let readerCloses = 0;
  const { instance } = env.start({
    history: { push() {}, back() {}, subscribe: fn => { pop = fn; return () => {}; } },
    onPreviewClosed: page => returns.push(page),
    onReaderClosed: () => { readerCloses++; },
  });
  await instance.open(2);
  instance.openPreview(3);
  fixture.previewProps.onReturnPageChange(8);
  pop(1);
  await settle();
  assert.deepEqual(returns, [8]);
  assert.equal(instance.activeView, "reader");
  instance.openPreview(5);
  pop(0);
  await settle();
  assert.deepEqual(returns, [8]);
  assert.equal(readerCloses, 1);
  assert.equal(instance.activeView, null);
});

test("unmount releases an open waiting for the Preview history entry to close", async t => {
  const env = setup(t);
  let backs = 0;
  const { instance, unmount } = env.start({
    history: { push() {}, back() { backs++; }, subscribe: () => () => {} },
  });
  instance.openPreview(2);
  const opening = instance.open(3);
  await settle();
  assert.equal(backs, 1);
  assert.equal(fixture.mounts, 0);
  unmount();
  await opening;
  assert.equal(fixture.mounts, 0);
  assert.equal(instance.activeView, null);
});

test("mounted public Reader and Preview respond to instance settings without view mocks", async t => {
  document.body.replaceChildren();
  Object.defineProperty(document, "fullscreenElement", { configurable: true, value: null });
  const root = document.createElement("div");
  document.body.append(root);
  let instance;
  const changes = [];
  const source = {
    totalPages: 3, initialPageNum: 1, aspectRatio: 1,
    initialPreviewItems: [],
    getPreviewItems: async () => [],
    getPages: async numbers => numbers.map(pageNum => ({
      pageNum, url: "/page/" + pageNum, aspectRatio: 1,
    })),
    loadImage: () => new Promise(() => {}),
  };
  const dispose = actual.render(() => actual.createComponent(actual.ReadingView, {
    options: {
      source,
      onSettingChange: {
        portraitControls: next => changes.push(next),
        landscapeControls: next => changes.push(next),
      },
    },
    embeddedPreview: true,
    instanceRef: value => { instance = value; },
  }), root);
  t.after(async () => { dispose(); await settle(); });
  await instance.open(1);
  const reader = document.querySelector("#ehpeek-reader");
  assert.ok(reader);
  assert.equal(reader.dataset.navigationMode, "scroll");
  for (const key of ["portraitControls", "landscapeControls"]) {
    instance.settings[key].navigationMode.set("paged");
    instance.settings[key].pagedDirection.set("ltr");
    instance.settings[key].pageLayout.set("double");
  }
  assert.equal(document.querySelector("#ehpeek-reader"), reader);
  assert.equal(reader.dataset.navigationMode, "paged");
  assert.equal(reader.dataset.readDirection, "ltr");
  assert.equal(reader.dataset.pageLayout, "double");
  assert.equal(changes.length, 6);
  const button = label => {
    const found = [...reader.querySelectorAll("button")].find(btn => btn.getAttribute("aria-label") === label);
    assert.ok(found, label);
    return found;
  };
  const scroller = reader.querySelector(".ehpeek-reader-scroller");
  scroller.getBoundingClientRect = () => new window.DOMRect(0, 0, 400, 600);
  scroller.dispatchEvent(new window.PointerEvent("pointerdown", {
    bubbles: true, pointerId: 1, pointerType: "mouse", button: 0, clientX: 200, clientY: 100,
  }));
  document.dispatchEvent(new window.PointerEvent("pointerup", {
    bubbles: true, pointerId: 1, pointerType: "mouse", button: 0, clientX: 200, clientY: 100,
  }));
  const controls = reader.querySelector(".ehpeek-reader-toolbar-controls");
  assert.equal(controls.hidden, false);
  button("Reading options").click();
  assert.ok(reader.querySelector(".ehpeek-reader-toolbar-more"));
  button("Paged mode").click();
  assert.equal(reader.dataset.navigationMode, "scroll");
  const orientation = window.matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait";
  assert.equal(instance.settings[`${orientation}Controls`].navigationMode.value(), "scroll");
  assert.equal(reader.dataset.readDirection, "ttb");
  assert.equal(changes.length, 7);

  button("Adjust Scroll viewport size").click();
  const scaleLabel = () => reader.querySelector(".ehpeek-reader-scale-label").textContent;
  const scaleAction = text => {
    const target = [...reader.querySelectorAll(".ehpeek-reader-scale-toolbar button")]
      .find(btn => btn.textContent === text);
    assert.ok(target, text);
    target.click();
  };
  assert.match(scaleLabel(), /Fill/);
  scaleAction("Fit");
  assert.match(scaleLabel(), /Fit/);
  assert.equal(instance.settings.scrollTtbScale.value(), "fill");
  instance.settings.leftHandedControls.set(true);
  assert.match(scaleLabel(), /Fit/);
  instance.settings.scrollTtbScale.set("one-to-one");
  assert.match(scaleLabel(), /1:1/);
  instance.settings.scrollHorizontalScale.set(null);
  assert.match(scaleLabel(), /1:1/);
  scaleAction("Fill");
  scaleAction("Set Default");
  assert.equal(instance.settings.scrollTtbScale.value(), "fill");

  instance.settings.embeddedPreviewDirection.set("ttb");
  const embedded = () => root.querySelector('.ehpeek-preview-host[data-embedded="true"] > .ehpeek-preview-panel');
  assert.ok(embedded().querySelector('[aria-label="Scroll Preview: top to bottom"]'));
  instance.settings.embeddedPreviewDirection.set("ltr");
  assert.ok(embedded().querySelector('[aria-label="Scroll Preview: left to right"]'));
  instance.openPreview(2);
  const overlay = () => document.querySelector('.ehpeek-preview-host[data-embedded="false"] > .ehpeek-preview-panel');
  assert.ok(overlay());
  instance.settings.previewDirection.set("rtl");
  assert.ok(overlay().querySelector('[aria-label="Scroll Preview: right to left"]'));
  instance.settings.previewDirection.set("ttb");
  assert.ok(overlay().querySelector('[aria-label="Scroll Preview: top to bottom"]'));
});


test("Reader follows the selected orientation's individual settings after rotation", async t => {
  const matchMedia = window.matchMedia;
  let landscape = false;
  window.matchMedia = query => query === "(orientation: landscape)"
    ? { matches: landscape }
    : matchMedia.call(window, query);
  t.after(() => { window.matchMedia = matchMedia; });
  const { instance } = mountActual(t);
  await instance.open(1);
  const reader = document.querySelector("#ehpeek-reader");
  const { portraitControls: portrait, landscapeControls: wide } = instance.settings;
  wide.navigationMode.set("paged");
  wide.pagedDirection.set("ltr");
  assert.equal(reader.dataset.navigationMode, "scroll");
  assert.equal(reader.dataset.readDirection, "ttb");
  landscape = true;
  window.dispatchEvent(new window.Event("resize"));
  assert.equal(reader.dataset.navigationMode, "paged");
  assert.equal(reader.dataset.readDirection, "ltr");
  wide.pagedDirection.set("rtl");
  assert.equal(reader.dataset.readDirection, "rtl");
  portrait.scrollDirection.set("ltr");
  assert.equal(reader.dataset.readDirection, "rtl");
  landscape = false;
  window.dispatchEvent(new window.Event("resize"));
  assert.equal(reader.dataset.navigationMode, "scroll");
  assert.equal(reader.dataset.readDirection, "ltr");
  portrait.scrollDirection.set("ttb");
  assert.equal(reader.dataset.readDirection, "ttb");
});

test("embedded preview returns to the existing reader and retains progress sync", async t => {
  const env = setup(t);
  let boundsListener;
  let width = 400;
  const { instance, unmount } = env.start({
    initialProgress: 2,
    placement: () => ({
      coversPreview: true,
      container: {
        available: () => true,
        bounds: () => ({ left: 10, top: 20, width, height: 600 }),
        listen: callback => { boundsListener = callback; return () => { boundsListener = null; }; },
      },
    }),
  }, { embeddedPreview: true });
  assert.equal(instance.activeView, null);
  assert.equal(fixture.preview.current(), 2);
  await instance.open(4);
  assert.equal(instance.activeView, "reader");
  assert.equal(fixture.readerProps.disabled, false);
  assert.equal(fixture.previewProps.embeddedDisabled, true);
  assert.equal(fixture.preview.current(), 4);
  const mounted = fixture.readerElement.parentElement;
  assert.equal(mounted.style.width, "400px");
  width = 500;
  boundsListener.onBoundsChange();
  assert.equal(mounted.style.width, "500px");
  env.setFullscreen(true);
  assert.equal(mounted.style.width, "");
  assert.equal(fixture.fullscreen, true);
  env.setFullscreen(false);
  assert.equal(mounted.style.width, "500px");
  fixture.reader.gotoPage(5);
  assert.equal(instance.progress(), 5);
  assert.equal(fixture.preview.current(), 5);
  fixture.readerProps.onOpenPreview(5);
  assert.equal(instance.activeView, "preview");
  assert.equal(fixture.readerProps.disabled, true);
  assert.equal(fixture.previewProps.embeddedDisabled, false);
  assert.equal(mounted.style.visibility, "hidden");
  assert.deepEqual(fixture.openState, { mode: "embedded", pageNum: 5 });
  fixture.previewProps.onClose(5);
  await settle();
  assert.equal(instance.activeView, "reader");
  assert.equal(mounted.style.visibility, "");
  fixture.reader.gotoPage(6);
  assert.equal(fixture.preview.current(), 6);
  fixture.readerProps.onOpenPreview(6);
  fixture.previewProps.onSelectPage(8);
  await settle();
  assert.equal(instance.activeView, "reader");
  assert.equal(fixture.reader.progress.current(), 8);
  assert.equal(fixture.mounts, 1);
  assert.equal(fixture.previewMounts, 1);
  unmount();
  await settle();
  assert.equal(fixture.instance, null);
  assert.equal(instance.activeView, null);
  assert.equal(fixture.unmounts, 1);
  assert.equal(fixture.previewUnmounts, 1);
  assert.equal(fixture.reader.progress.listeners.size, 0);
  assert.equal(fixture.scrollLocks, 0);
  assert.equal(fixture.themeLocks, 0);
  assert.equal(boundsListener, null);
  assert.equal(env.listeners.size, 0);
  assert.equal(env.host.element.isConnected, true);
  assert.equal(env.host.element.childElementCount, 0);
});

test("overlay preview respects history closure and browser fullscreen exit", async t => {
  const env = setup(t);
  let pop;
  const history = {
    push: (depth, view) => fixture.events.push(["push", depth, view]),
    back: count => fixture.events.push(["back", count]),
    subscribe: callback => { pop = callback; return () => { pop = null; }; },
  };
  const { instance, unmount } = env.start({
    history, fullscreenOnOpen: true, exitOnFullscreenExit: true,
  });
  await instance.open(3, true);
  assert.equal(env.host.fullscreen.active(), true);
  fixture.readerProps.onOpenPreview(3);
  assert.deepEqual(fixture.openState, { mode: "overlay", pageNum: 3 });
  fixture.previewProps.onClose(3);
  assert.equal(instance.activeView, "preview");
  assert.deepEqual(fixture.events.at(-1), ["back", 1]);
  pop(1);
  await settle();
  assert.equal(instance.activeView, "reader");
  assert.equal(fixture.openState, null);
  fixture.reader.gotoPage(7);
  assert.equal(fixture.preview.current(), 7);
  env.setFullscreen(false);
  assert.deepEqual(fixture.events.at(-1), ["back", 1]);
  pop(0);
  await settle();
  assert.equal(instance.activeView, null);
  assert.equal(fixture.scrollLocks, 0);
  unmount();
  await settle();
  assert.equal(pop, null);
});

test("concurrent opens share one mount and a pending open cannot outlive unmount", async t => {
  const env = setup(t);
  let release;
  const firstView = env.start({
    beforeOpen: () => new Promise(resolve => { release = resolve; }),
  });
  const first = firstView.instance.open(2);
  const second = firstView.instance.open(9);
  release(true);
  await Promise.all([first, second]);
  assert.equal(fixture.mounts, 1);
  assert.equal(fixture.reader.progress.current(), 9);
  firstView.unmount();
  await settle();
  const other = env.start({
    beforeOpen: () => new Promise(resolve => { release = resolve; }),
  });
  const pending = other.instance.open(5);
  other.unmount();
  release(true);
  await pending;
  await settle();
  assert.equal(other.instance.activeView, null);
  assert.equal(fixture.mounts, 1);
  assert.equal(fixture.scrollLocks, 0);
});

test("failed reader mount rolls back its view and can be reopened", async t => {
  const env = setup(t);
  fixture.failMount = new Error("mount failed");
  const mounts = [];
  const { instance } = env.start({ onReaderMount: mounted => mounts.push(mounted) });
  await assert.rejects(instance.open(2), /mount failed/);
  assert.equal(instance.activeView, null);
  assert.deepEqual(mounts, [true, false]);
  assert.equal(fixture.scrollLocks, 0);
  assert.equal(fixture.themeLocks, 0);
  assert.equal(env.host.element.childElementCount, 0);
  fixture.failMount = null;
  await instance.open(3);
  assert.equal(instance.activeView, "reader");
  assert.equal(fixture.mounts, 1);
});

test("parent conditional unmount cleans both views and removes its owned host", async t => {
  const env = setup(t);
  const { instance } = env.start({ host: undefined });
  await instance.open();
  instance.openPreview(5);
  fixture.setVisible(false);
  await settle();
  assert.equal(fixture.instance, null);
  assert.equal(env.host.element.isConnected, false);
  assert.equal(fixture.root.childElementCount, 0);
  assert.equal(fixture.scrollLocks, 0);
  assert.equal(fixture.themeLocks, 0);
  assert.equal(fixture.previewUnmounts, 1);
  assert.equal(fixture.unmounts, 1);
  assert.equal(env.listeners.size, 0);
});

test("reader initialization failure rejects open and releases locks and subscriptions", async t => {
  const env = setup(t);
  fixture.failOnMount = new Error("init failed");
  const { instance } = env.start();
  await assert.rejects(instance.open(), /init failed/);
  assert.equal(instance.activeView, null);
  assert.equal(fixture.scrollLocks, 0);
  assert.equal(fixture.themeLocks, 0);
  assert.equal(fixture.reader.progress.listeners.size, 0);
});

test("closing and reopening reader reconnects progress without remounting preview", async t => {
  const env = setup(t);
  const { instance } = env.start();
  await instance.open(2);
  const previous = fixture.reader.progress;
  fixture.reader.gotoPage(3);
  fixture.readerProps.onClose();
  await settle();
  assert.equal(instance.activeView, null);
  assert.equal(previous.listeners.size, 0);
  assert.equal(fixture.openState, null);
  await instance.open(4);
  fixture.reader.gotoPage(6);
  assert.equal(fixture.preview.current(), 6);
  previous.publish(10);
  assert.equal(fixture.preview.current(), 6);
  assert.equal(fixture.previewMounts, 1);
  assert.equal(fixture.mounts, 2);
});
