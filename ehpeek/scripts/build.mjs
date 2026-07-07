import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(packageDir, "package.json"), "utf-8"));

const metadata = [
  "// ==UserScript==",
  "// @name         ehpeek: E-H/ExH viewer",
  "// @namespace    ehpeek",
  `// @version      ${pkg.version}`,
  "// @description  A mobile-optimized E-H/ExH viewer",
  "// @match        *://e-hentai.org/*",
  "// @match        *://exhentai.org/*",
  "// @run-at       document-end",
  "// ==/UserScript==",
  "",
].join("\n");

mkdirSync(path.join(packageDir, "dist"), { recursive: true });

await build({
  entryPoints: [path.join(packageDir, "src/main.ts")],
  bundle: true,
  format: "iife",
  target: "es2020",
  charset: "utf8",
  banner: {
    js: metadata,
  },
  outfile: path.join(packageDir, "dist/ehpeek.user.js"),
});

console.log("[ehpeek] built dist/ehpeek.user.js");
