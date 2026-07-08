import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(packageDir, "dist/ehpeek.user.js");
const texts = JSON.parse(readFileSync(path.join(packageDir, "src/texts.json"), "utf-8"));
const releaseBuild = process.env.EHPEEK_RELEASE_BUILD === "true";
const installUrl = userscriptInstallUrl();
const version = userscriptVersion();

const metadata = [
  "// ==UserScript==",
  `// @name         ehpeek: E-H/ExH viewer`,
  `// @namespace    ehpeek`,
  `// @version      ${version}`,
  `// @description  ${texts.description}`,
  "// @match        *://e-hentai.org/*",
  "// @match        *://exhentai.org/*",
  "// @run-at       document-end",
  `// @updateURL    ${installUrl}`,
  `// @downloadURL  ${installUrl}`,
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
  sourcemap: releaseBuild ? false : "linked",
  banner: {
    js: metadata,
  },
  outfile,
});

console.log("[ehpeek] built dist/ehpeek.user.js");

function commitTimeVersion() {
  return execFileSync("git", ["log", "-1", "--format=%cd", "--date=format-local:%y%m%d.%H%M"], {
    cwd: packageDir,
    encoding: "utf-8",
    env: {
      ...process.env,
      TZ: "Etc/GMT+4",
    },
  }).trim();
}

function userscriptVersion() {
  const baseVersion = commitTimeVersion();

  if (releaseBuild) {
    return baseVersion;
  }

  return `${baseVersion}-dev.${devTimeStamp()}`;
}

function userscriptInstallUrl() {
  if (releaseBuild) {
    return "https://github.com/yamipot/userscripts/raw/build-master/ehpeek.user.js";
  }

  return pathToFileURL(outfile).href;
}

function devTimeStamp() {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Etc/GMT+4",
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));

  return `${parts.year}${parts.month}${parts.day}.${parts.hour}${parts.minute}${parts.second}`;
}
