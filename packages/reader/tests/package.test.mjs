import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { dirname, resolve, sep } from "node:path";

test("TypeScript consumers can use the published package without the library source tree", () => {
  const root = new URL("../", import.meta.url).pathname;
  const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
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
