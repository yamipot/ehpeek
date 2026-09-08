import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import { generateCss, variantGroupBabelPlugin } from "../build-support.mjs";
import { createUiUnoConfig } from "../uno.config.mjs";

const result = await build({
  stdin: {
    contents: `
      import { renderToString } from "solid-js/web";
      import { Button, IconButton, IconLink } from "./src/components/Widgets/Button";
      import { Popover } from "./src/components/Widgets/Popover";
      export { widgetClass } from "./src/components/Widgets/classes";
      export { listenForOutsidePress } from "./src/components/Widgets/outsidePress";
      export const renderButton = props => renderToString(() => Button(props));
      export const renderIconButton = props => renderToString(() => IconButton(props));
      export const renderIconLink = props => renderToString(() => IconLink(props));
      export const renderPopover = props => renderToString(() => Popover(props));
    `,
    resolveDir: new URL("../", import.meta.url).pathname,
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  plugins: [
    solidPlugin({
      solid: { generate: "ssr" },
      babel: { plugins: [variantGroupBabelPlugin] },
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
  assert.match(html, /type="button"/);
  assert.match(html, / disabled(?:[\s=>])/);
  assert.match(html, /aria-label="Download"/);
  assert.match(html, /w-full/);
  assert.match(html, /Current image/);
  assert.doesNotMatch(html, /variant=|disabled:\(/);
  assert.match(widgets.renderButton({ type: "submit" }), /type="submit"/);
  assert.match(widgets.renderButton({ variant: "option" }), /flex-col/);
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
  assert.match(link, /href="\/settings"/);
  assert.match(link, /target="_blank"/);
  assert.doesNotMatch(link, /<button|variant=|size="xl"/);
  assert.match(button, /--ui-control-size-xl/);
  assert.match(link, /--ui-control-size-xl/);
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

test("shared widget hover styles can use the host pointer scope", async () => {
  const pointer = 'html[data-test-pointer="mouse"] .ehpeek-ui-root';
  const css = await generateCss(
    [new URL("../src/components/Widgets", import.meta.url).pathname],
    createUiUnoConfig(pointer),
  );
  const hoverRules = css.split("\n").filter((line) => line.includes(":hover"));
  assert.ok(
    hoverRules.some((line) => line.includes("--color-icon-button-hover")),
  );
  assert.ok(
    hoverRules.every((line) => line.startsWith(pointer)),
    "widget hover rules must use the host pointer scope",
  );
  assert.doesNotMatch(css, /data-reader-pointer/);
});
