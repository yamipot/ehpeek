import assert from "node:assert/strict";
import { test } from "node:test";
import { existsSync, readFileSync } from "node:fs";
import { build, transform } from "esbuild";
import ts from "typescript";
import { dirname, resolve, sep } from "node:path";

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

test("Reader build and styles have no Uno or EhPeek dependency", () => {
  for (const file of ["build.mjs", "src/styles.ts"]) {
    const source = readFileSync(new URL("../" + file, import.meta.url), "utf8");
    assert.doesNotMatch(source, /unocss|reader:uno|reader:styles|readerUiBabelPlugin|variantGroup|\.\.\/ehpeek/);
  }
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
  assert.doesNotMatch(css, /@apply|--un-|--reader-bg-opacity|data-reader-ui/);
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
  assert.equal(styles.has("ehpeek-reader-utilities"), false);
  const buttonCss = styles.get("ehpeek-reader-style").textContent;
  assert.match(buttonCss, /\.ehpeek-button--control/);
  assert.match(buttonCss, /color-icon-button-hover/);
  assert.doesNotMatch(buttonCss, /data-reader-ui|--reader-bg-opacity|--un-/);
  assert.ok(styles.has("ehpeek-reader-theme"));
  assert.deepEqual(appended, [
    "ehpeek-reader-theme",
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

test("public declarations resolve using only files shipped in the package", () => {
  const root = new URL("../", import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
  assert.deepEqual(manifest.files, ["dist"]);
  for (const locale of ["en", "ja", "zh-CN"]) {
    assert.equal(
      readFileSync(resolve(root, "dist/locales", locale + ".json"), "utf8"),
      readFileSync(resolve(root, "src/locales", locale + ".json"), "utf8"),
    );
  }
  const shipped = manifest.files.map(file => resolve(root, file));
  const options = {
    noEmit: true, strict: true, noUncheckedIndexedAccess: true,
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.Preserve, jsxImportSource: "solid-js",
  };
  const host = ts.createCompilerHost(options);
  const allowed = path => !path.startsWith(root) ||
    path === resolve(root, "package.json") ||
    path === resolve(root, "tests/consumer.tsx") ||
    shipped.some(file => path === file || path.startsWith(file + sep)) ||
    path.startsWith(resolve(root, "node_modules") + sep);
  const read = host.readFile.bind(host);
  const exists = host.fileExists.bind(host);
  host.readFile = path => allowed(resolve(path)) ? read(path) : undefined;
  host.fileExists = path => allowed(resolve(path)) && exists(path);
  const program = ts.createProgram([resolve(root, "tests/consumer.tsx")], options, host);
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(diagnostics.map(d => ({
    file: d.file && dirname(d.file.fileName),
    message: ts.flattenDiagnosticMessageText(d.messageText, "\n"),
  })), []);
});
