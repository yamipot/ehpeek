import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { build, transform } from "esbuild";
import { createGenerator } from "unocss";
import hostConfig, { readerUnoConfig as readerConfig } from "../../ehpeek/uno.config.mjs";

test("package entry points resolve built files without exposing reader internals", () => {
  const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  assert.deepEqual(Object.keys(packageJson.exports), [".", "./interfaces", "./kit/Widgets", "./kit/*"]);
  const publicPaths = [
    ".", "./interfaces", "./kit/Widgets", "./kit/Widgets/Button",
    "./kit/PointerGesture", "./kit/animation", "./kit/helpers", "./kit/ui", "./kit/i18n",
  ];
  for (const key of publicPaths) {
    const entry = packageJson.exports[key] ?? Object.fromEntries(
      Object.entries(packageJson.exports["./kit/*"]).map(([condition, target]) => [
        condition, target.replace("*", key.slice("./kit/".length)),
      ]),
    );
    const specifier = key === "." ? "@ehpeek/reader" : `@ehpeek/reader/${key.slice(2)}`;
    const target = new URL(`../${entry.default}`, import.meta.url);
    assert.equal(import.meta.resolve(specifier), target.href);
    assert.ok(existsSync(target), specifier);
    assert.ok(existsSync(new URL(`../${entry.types}`, import.meta.url)), `${specifier} types`);
  }
  for (const path of [
    "components/Reader/session", "components/Reader/ViewportCanvas",
    "Reader", "Reader/session", "Reader/ViewportCanvas", "ScrollPreview",
    "components/Widgets/classes", "components/Widgets/PriorityLoadQueue",
    "features/ReadProgressSyncer", "features/ReaderSettings", "features/Viewport", "App/viewport",
    "settings", "widgets", "gestures", "utils", "ui", "createReader",
  ]) {
    assert.throws(() => import.meta.resolve(`@ehpeek/reader/${path}`), {
      code: "ERR_PACKAGE_PATH_NOT_EXPORTED",
    });
  }
});

test("the main entry exposes the complete reader, not its implementation pieces", async () => {
  const output = await build({
    stdin: {
      contents: 'export * from "@ehpeek/reader";',
      resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    format: "esm",
    metafile: true,
  });
  assert.deepEqual(Object.values(output.metafile.outputs)[0].exports.sort(), ["ReadingView"]);
});

test("reader utilities preserve selector variants without affecting host utilities", async () => {
  const tokens =
    "flex ui-px-md px-0 before:block hover:bg-red-500 [&>span]:mb-0 [#ehpeek-reader_&]:hidden container animate-spin";
  const reader = await createGenerator(readerConfig);
  const host = await createGenerator(hostConfig);
  const readerCss = (await reader.generate(tokens)).css;
  const hostCss = (await host.generate(tokens)).css;
  assert.match(readerCss, /\.flex\[data-reader-ui\]\{display:flex/);
  assert.match(readerCss, /\.ui-px-md\[data-reader-ui\]\{/);
  assert.doesNotMatch(readerCss, /\[data-reader-ui\]\[data-reader-ui\]/);
  assert.match(readerCss, /\[data-reader-ui\]::before\{display:block/);
  assert.match(readerCss, /\[data-reader-ui\]>span\{margin-bottom:0/);
  assert.match(readerCss, /\.container\[data-reader-ui\]\{width:100%/);
  assert.match(readerCss, /--reader-bg-opacity/);
  assert.doesNotMatch(readerCss, /--un-|ehpeek-ui-state|@keyframes spin/);
  assert.match(hostCss, /\.flex\{display:flex/);
  assert.match(hostCss, /--un-bg-opacity/);
  assert.doesNotMatch(hostCss, /data-reader-ui|--reader-|data-reader-pointer/);
});

test("EhPeek builds only its own source, with no reader build imports", () => {
  assert.equal(existsSync(new URL("../uno.config.mjs", import.meta.url)), false);
  assert.equal(existsSync(new URL("../../../build/ui-uno.mjs", import.meta.url)), false);
  for (const file of ["build.mjs", "uno.config.mjs"]) {
    const source = readFileSync(
      new URL(`../../ehpeek/${file}`, import.meta.url),
      "utf8",
    );
    assert.doesNotMatch(source, /reader\/(?:src|build|uno)/);
  }
});

test("shared widget CSS covers all controls without Uno implementation dependencies", async () => {
  const css = readFileSync(
    new URL("../src/reader.css", import.meta.url), "utf8",
  );
  const result = await transform(css, { loader: "css" });
  assert.deepEqual(result.warnings, []);
  assert.doesNotMatch(css, /@apply|--un-|--reader-|data-reader-ui/);
  for (const name of [
    "button", "dialog", "icon", "launcher-button", "popover",
    "position-bar", "progress-bar", "swipe-indicator",
  ]) {
    assert.ok(css.includes(`.ehpeek-${name} {`), name);
  }
  assert.match(css, /html\[data-reader-pointer="mouse"\] \.ehpeek-icon-action--ghost:disabled:hover/);
  assert.match(css, /\.ehpeek-icon-action--surface:enabled:active/);
});

test("a built widget installs its styles and pointer tracking without Uno in the consumer", async (t) => {
  const output = await build({
    stdin: {
      contents: `
        export { Button } from "@ehpeek/reader/kit/Widgets";
        export { Popover } from "@ehpeek/reader/kit/Widgets";
      `,
      resolveDir: new URL("../", import.meta.url).pathname,
    },
    bundle: true,
    write: false,
    platform: "browser",
    format: "esm",
    metafile: true,
  });
  const inputs = Object.keys(output.metafile.inputs);
  assert.ok(inputs.some((file) => file.includes("/dist/")));
  assert.ok(
    inputs.every((file) => !file.includes("packages/reader/src/") && !file.includes("unocss")),
  );

  const styles = new Map();
  const document = new EventTarget();
  document.documentElement = { dataset: {} };
  document.getElementById = (id) => styles.get(id);
  document.createElement = (tag) => {
    assert.equal(tag, "style");
    return { id: "", textContent: "" };
  };
  const appended = [];
  document.head = { append: (style) => {
    appended.push(style.id);
    styles.set(style.id, style);
  } };
  const previousDocument = globalThis.document;
  const previousWindow = globalThis.window;
  globalThis.document = document;
  globalThis.window = { document };
  t.after(() => {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });
  const widget = await import(
    `data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString("base64")}`
  );
  assert.equal(typeof widget.Button, "function");
  assert.equal(typeof widget.Popover, "function");
  const css = styles.get("ehpeek-reader-utilities").textContent;
  assert.match(css, /data-reader-ui/);
  // Toolbar controls must restore hit testing inside their click-through wrapper.
  assert.match(css, /\.pointer-events-auto\[data-reader-ui\]\{pointer-events:auto;\}/);
  const buttonCss = styles.get("ehpeek-reader-style").textContent;
  assert.match(buttonCss, /\.ehpeek-button--control/);
  assert.match(buttonCss, /color-icon-button-hover/);
  assert.doesNotMatch(buttonCss, /data-reader-ui|--reader-|--un-/);
  assert.ok(styles.has("ehpeek-reader-theme"));
  assert.deepEqual(appended, [
    "ehpeek-reader-utilities", "ehpeek-reader-theme",
    "ehpeek-reader-style",
  ]);
  assert.match(styles.get("ehpeek-reader-style").textContent, /#ehpeek-reader/);
  for (const [pointerType, expected] of [
    ["mouse", "mouse"],
    ["touch", "touch"],
    ["pen", "touch"],
  ]) {
    const event = new Event("pointerover");
    Object.defineProperty(event, "pointerType", { value: pointerType });
    document.dispatchEvent(event);
    assert.equal(document.documentElement.dataset.readerPointer, expected);
  }
});
