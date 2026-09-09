import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const result = await build({
  stdin: {
    contents: `
      import { renderToString } from "solid-js/web";
      import { Button, IconButton, IconLink } from "./src/kit/Widgets/Button";
      import { Popover } from "./src/kit/Widgets/Popover";
      import { PositionBar } from "./src/kit/Widgets/PositionBar";
      import { ProgressBar } from "./src/kit/Widgets/ProgressBar";
      export { widgetClass } from "./src/kit/helpers";
      export { listenForOutsidePress } from "./src/kit/helpers";
      export const renderButton = props => renderToString(() => Button(props));
      export const renderIconButton = props => renderToString(() => IconButton(props));
      export const renderIconLink = props => renderToString(() => IconLink(props));
      export const renderPopover = props => renderToString(() => Popover(props));
      export const renderPositionBar = props => renderToString(() => PositionBar(props));
      export const renderProgressBar = props => renderToString(() => ProgressBar(props));
    `,
    resolveDir: new URL("../", import.meta.url).pathname,
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  loader: { ".css": "text" },
  plugins: [
    {
      name: "render-without-document-styles",
      setup(build) {
        build.onResolve({ filter: /^\.\.\/\.\.\/styles$/ }, () => ({
          path: "styles",
          namespace: "test-styles",
        }));
        build.onLoad({ filter: /.*/, namespace: "test-styles" }, () => ({
          contents: "",
          loader: "js",
        }));
      },
    },
    solidPlugin({
      solid: { generate: "ssr" },
    }),
  ],
});
const widgets = await import(
  `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`
);

test("buttons preserve native attributes, content and a non-submit default", () => {
  const html = widgets.renderButton({
    type: undefined,
    disabled: true,
    "aria-label": "Download",
    class: "w-full",
    children: "Current image",
  });
  assert.match(html, /<button\b/);
  assert.doesNotMatch(html, /data-reader-ui/);
  assert.match(html, /type="button"/);
  assert.match(html, / disabled(?:[\s=>])/);
  assert.match(html, /aria-label="Download"/);
  assert.match(html, /w-full/);
  assert.match(html, /Current image/);
  assert.doesNotMatch(html, /variant=|disabled:\(/);
  assert.match(widgets.renderButton({ type: "submit" }), /type="submit"/);
  assert.match(widgets.renderButton({ variant: "option" }), /ehpeek-button--option/);
});

test("icon actions share sizing without turning links into buttons", () => {
  const props = { variant: "ghost", size: "xl", children: "Settings" };
  const button = widgets.renderIconButton({
    ...props,
    disabled: true,
    "aria-expanded": true,
  });
  const link = widgets.renderIconLink({
    ...props,
    href: "/settings",
    target: "_blank",
  });
  assert.match(button, /type="button"/);
  assert.match(button, /aria-expanded="true"/);
  assert.match(button, / disabled(?:[\s=>])/);
  assert.match(link, /<a\b/);
  assert.doesNotMatch(link, /data-reader-ui/);
  assert.match(link, /href="\/settings"/);
  assert.match(link, /target="_blank"/);
  assert.doesNotMatch(link, /<button|variant=|size="xl"/);
  assert.match(button, /ehpeek-icon-action--xl/);
  assert.match(link, /ehpeek-icon-action--xl/);
});

test("popover keeps caller placement, class toggles and contents", () => {
  const html = widgets.renderPopover({
    class: "absolute left-0",
    classList: { "right-0": true },
    role: "menu",
    onOutsidePress: () => {},
    children: "Navigation",
  });
  assert.match(html, /absolute left-0/);
  assert.match(html, /right-0/);
  assert.match(html, /role="menu"/);
  assert.doesNotMatch(html, /data-reader-ui/);
  assert.match(html, /Navigation/);
  assert.doesNotMatch(html, /onOutsidePress|outsideEvent/);
});

test("outside dismissal includes trigger and contents, and removes its listener", (t) => {
  class TestNode extends EventTarget {}
  const oldNode = globalThis.Node;
  globalThis.Node = TestNode;
  t.after(() => {
    if (oldNode === undefined) delete globalThis.Node;
    else globalThis.Node = oldNode;
  });
  const document = new TestNode();
  const trigger = new TestNode();
  const content = new TestNode();
  const outside = new TestNode();
  const events = [];
  const stop = widgets.listenForOutsidePress({
    document,
    event: "click",
    contains: (target) => target === trigger || target === content,
    onOutsidePress: (event) => events.push(event.target),
  });
  const dispatch = (type, target) => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, "target", { value: target });
    document.dispatchEvent(event);
    return event;
  };
  dispatch("click", trigger);
  dispatch("click", content);
  dispatch("pointerdown", outside);
  assert.deepEqual(events, []);
  dispatch("click", outside);
  assert.deepEqual(events, [outside]);
  stop();
  stop();
  dispatch("click", outside);
  assert.deepEqual(events, [outside]);

  const stopPointer = widgets.listenForOutsidePress({
    document,
    event: "pointerdown",
    contains: (target) => target === content,
    onOutsidePress: (event) => event.preventDefault(),
  });
  assert.equal(dispatch("pointerdown", content).defaultPrevented, false);
  assert.equal(dispatch("pointerdown", outside).defaultPrevented, true);
  stopPointer();
  assert.equal(dispatch("pointerdown", outside).defaultPrevented, false);
});

test("class changes preserve active toggles, including left-handed positioning", () => {
  let placement = "absolute left-0";
  let leftHanded = true;
  const props = {
    get class() {
      return placement;
    },
    get classList() {
      return { "!left-auto right-0 flex-row-reverse": leftHanded };
    },
  };
  assert.equal(
    widgets.widgetClass("z-overlay", props),
    "z-overlay absolute left-0 !left-auto right-0 flex-row-reverse",
  );
  placement = "fixed safe-left-sm";
  assert.equal(
    widgets.widgetClass("z-overlay", props),
    "z-overlay fixed safe-left-sm !left-auto right-0 flex-row-reverse",
  );
  leftHanded = false;
  assert.equal(
    widgets.widgetClass("z-overlay", props),
    "z-overlay fixed safe-left-sm",
  );
});


test("position bar exposes visual state without changing its logical progress", () => {
  const props = { ariaLabel: "Page", currentValue: 3, maxValue: 9, onInput() {} };
  const vertical = widgets.renderPositionBar({
    ...props, axis: "vertical", expanded: true, thickness: "narrow",
    trackVisible: false, visible: false, position: "fixed",
  });
  assert.match(vertical, /data-axis="vertical"/);
  assert.match(vertical, /data-expanded="true"/);
  assert.match(vertical, /data-thickness="narrow"/);
  assert.match(vertical, /data-position="fixed"/);
  assert.match(vertical, /data-visible="false"/);
  assert.match(vertical, /data-track-visible="false"/);
  assert.match(vertical, /data-draggable="true"/);
  assert.match(vertical, /aria-valuenow="3"/);
  assert.match(vertical, /top:25%/);
  const horizontal = widgets.renderPositionBar({
    ...props, axis: "horizontal", reversed: true,
  });
  assert.match(horizontal, /data-axis="horizontal"/);
  assert.match(horizontal, /data-thickness="normal"/);
  assert.match(horizontal, /left:75%/);
  assert.match(horizontal, /aria-valuenow="3"/);
  const disabled = widgets.renderPositionBar({ ...props, axis: "vertical", maxValue: 1 });
  assert.match(disabled, /data-draggable="false"/);
});

test("progress input preserves native range and caller layout attributes", () => {
  const html = widgets.renderProgressBar({
    min: 1, max: 12, step: 1, value: 3, direction: "rtl", class: "custom-progress",
  });
  assert.match(html, /type="range"/);
  assert.match(html, /ehpeek-progress-bar custom-progress/);
  assert.match(html, /min="1"/);
  assert.match(html, /max="12"/);
  assert.match(html, /step="1"/);
  assert.match(html, /dir="rtl"/);
});
