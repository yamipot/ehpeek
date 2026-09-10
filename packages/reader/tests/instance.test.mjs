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
      const port = progress(props.options.initialPageNum);
      const actions = {
        progress: port,
        gotoPage(pageNum) {
          port.publish(pageNum);
          props.callbacks.onProgress({ url: "/page/" + pageNum, aspectRatio: 1, pageNum });
        },
      };
      fixture.reader = actions;
      props.actionsRef(actions);
      onMount(() => {
        if (fixture.failOnMount) throw fixture.failOnMount;
        actions.gotoPage(props.options.initialPageNum);
      });
      onCleanup(() => { fixture.unmounts++; props.actionsRef(null); });
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
      export { createComponent, createSignal } from "solid-js";
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
    instance.settings.set(key, {
      ...instance.settings.value()[key],
      navigationMode: "paged", pagedDirection: "ltr", pageLayout: "double",
    });
  }
  assert.equal(document.querySelector("#ehpeek-reader"), reader);
  assert.equal(reader.dataset.navigationMode, "paged");
  assert.equal(reader.dataset.readDirection, "ltr");
  assert.equal(reader.dataset.pageLayout, "double");
  assert.equal(changes.length, 2);
  const button = label => {
    const found = [...reader.querySelectorAll("button")].find(btn => btn.getAttribute("aria-label") === label);
    assert.ok(found, label);
    return found;
  };
  // Opening the real toolbar must restore hit testing above the gesture canvas.
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
  assert.equal(window.getComputedStyle(controls).pointerEvents, "auto");
  assert.ok(Number(window.getComputedStyle(reader.querySelector(".ehpeek-reader-toolbar")).zIndex) >
    Number(window.getComputedStyle(reader.querySelector(".ehpeek-reader-canvas")).zIndex));
  button("Reading options").click();
  assert.ok(reader.querySelector(".ehpeek-reader-toolbar-more"));
  button("Paged mode").click();
  assert.equal(reader.dataset.navigationMode, "scroll");
  assert.equal(instance.settings.controls().navigationMode, "scroll");
  assert.equal(reader.dataset.readDirection, "ttb");
  assert.equal(changes.length, 3);

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
  assert.equal(instance.settings.value().scrollTtbScale, "fill");
  instance.settings.set("leftHandedControls", true);
  assert.match(scaleLabel(), /Fit/);
  instance.settings.set("scrollTtbScale", "one-to-one");
  assert.match(scaleLabel(), /1:1/);
  instance.settings.set("scrollHorizontalScale", null);
  assert.match(scaleLabel(), /1:1/);
  scaleAction("Fill");
  scaleAction("Set Default");
  assert.equal(instance.settings.value().scrollTtbScale, "fill");

  instance.settings.set("embeddedPreviewDirection", "ttb");
  const embedded = () => root.querySelector('.ehpeek-preview-host[data-embedded="true"] > .ehpeek-preview-panel');
  assert.ok(embedded().querySelector('[aria-label="Scroll Preview: top to bottom"]'));
  instance.settings.set("embeddedPreviewDirection", "ltr");
  assert.ok(embedded().querySelector('[aria-label="Scroll Preview: left to right"]'));
  instance.openPreview(2);
  const overlay = () => document.querySelector('.ehpeek-preview-host[data-embedded="false"] > .ehpeek-preview-panel');
  assert.ok(overlay());
  instance.settings.set("previewDirection", "rtl");
  assert.ok(overlay().querySelector('[aria-label="Scroll Preview: right to left"]'));
  instance.settings.set("previewDirection", "ttb");
  assert.ok(overlay().querySelector('[aria-label="Scroll Preview: top to bottom"]'));
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
  assert.equal("dispose" in instance, false);
  assert.equal("Preview" in instance, false);
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
  fixture.readerProps.callbacks.onOpenPreview(5);
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
  fixture.readerProps.callbacks.onOpenPreview(6);
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
  fixture.readerProps.callbacks.onOpenPreview(3);
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
  fixture.readerProps.callbacks.onClose();
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
