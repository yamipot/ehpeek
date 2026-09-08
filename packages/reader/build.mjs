import { mkdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import {
  generateCss,
  readSourceFiles,
  readSpectrumUiSizes,
  variantGroupBabelPlugin,
} from "./build-support.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const css = await generateCss([path.join(dir, "src")]);
const sizes = readSpectrumUiSizes();
const entries = readSourceFiles(path.join(dir, "src")).filter(
  (file) => /\.tsx?$/.test(file) && !file.endsWith(".d.ts"),
);
const outputDir = path.join(dir, "dist");
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });
await build({
  entryPoints: entries,
  outbase: path.join(dir, "src"),
  outdir: outputDir,
  bundle: true,
  splitting: true,
  format: "esm",
  target: "es2020",
  external: ["solid-js", "solid-js/*", "lucide-solid", "lucide-solid/*"],
  loader: { ".css": "text" },
  plugins: [
    solidPlugin({ babel: { plugins: [variantGroupBabelPlugin] } }),
    {
      name: "reader-resources",
      setup(build) {
        build.onResolve({ filter: /^reader:(uno.css|ui-sizes)$/ }, (args) => ({
          path: args.path,
          namespace: "reader",
        }));
        build.onLoad({ filter: /.*/, namespace: "reader" }, (args) =>
          args.path === "reader:uno.css"
            ? { contents: css, loader: "text" }
            : { contents: JSON.stringify(sizes), loader: "json" },
        );
      },
    },
  ],
});
console.log("[reader] built dist");
