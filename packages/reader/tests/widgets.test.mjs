import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const result = await build({
  stdin: {
    contents: `
      import { renderToString } from "solid-js/web";
      import { PositionBar } from "./src/kit/Widgets/PositionBar";
      export { listenForOutsidePress } from "./src/kit/helpers";
      export const renderPositionBar = props => renderToString(() => PositionBar(props));
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

test("position bar mirrors track position in reverse direction without changing the reading page", () => {
  const props = { ariaLabel: "Page", currentValue: 3, maxValue: 9, onInput() {} };
  const vertical = widgets.renderPositionBar({
    ...props, axis: "vertical",
  });
  assert.match(vertical, /aria-valuenow="3"/);
  assert.match(vertical, /top:25%/);
  const horizontal = widgets.renderPositionBar({
    ...props, axis: "horizontal", reversed: true,
  });
  assert.match(horizontal, /left:75%/);
  assert.match(horizontal, /aria-valuenow="3"/);
});
