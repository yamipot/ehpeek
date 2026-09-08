import { mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import { generateCss, readerUnoConfig, variantGroupBabelPlugin } from "../ehpeek/uno.config.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const css = await generateCss([path.join(dir, "src")], readerUnoConfig);
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
    solidPlugin({ babel: { plugins: [readerUiBabelPlugin, variantGroupBabelPlugin] } }),
    {
      name: "reader-resources",
      setup(build) {
        build.onResolve({ filter: /^reader:styles$/ }, () => ({ path: path.join(dir, "src/styles.ts") }));
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

function readSourceFiles(dir) {
  const output = [];

  for (const entry of readdirSync(dir)) {
    const file = path.join(dir, entry);
    const stat = statSync(file);

    if (stat.isDirectory()) {
      output.push(...readSourceFiles(file));
      continue;
    }

    if (/\.(css|ts|tsx)$/.test(file)) {
      output.push(file);
    }
  }

  return output;
}

function readSpectrumUiSizes() {
  // Only selected upstream values enter the userscript; the token package remains a build dependency.
  const layout = readSpectrumTokenFile("layout.json");
  const typography = readSpectrumTokenFile("typography.json");
  const resolveDesktop = (tokens, keys) =>
    Object.fromEntries(
      Object.entries(keys).map(([name, key]) => [
        name,
        tokens[key].sets.desktop.value,
      ]),
    );

  return {
    control: resolveDesktop(layout, {
      xs: "component-height-75",
      sm: "component-height-100",
      md: "component-height-200",
      lg: "component-height-300",
      xl: "component-height-400",
    }),
    font: resolveDesktop(typography, {
      xs: "font-size-25",
      sm: "font-size-100",
      md: "font-size-200",
      lg: "font-size-400",
      xl: "font-size-700",
    }),
    icon: resolveDesktop(layout, {
      xs: "workflow-icon-size-50",
      sm: "workflow-icon-size-75",
      md: "workflow-icon-size-100",
      lg: "workflow-icon-size-200",
      xl: "workflow-icon-size-300",
    }),
    space: { xs: "4px", sm: "8px", md: "12px", lg: "16px", xl: "24px" },
    radius: { xs: "3px", sm: "4px", md: "6px", lg: "8px", xl: "10px" },
  };
}

function readSpectrumTokenFile(fileName) {
  const file = fileURLToPath(
    import.meta.resolve(`@adobe/spectrum-tokens/src/${fileName}`),
  );
  return JSON.parse(readFileSync(file, "utf-8"));
}

// Stamp only DOM created by this package, including independently imported widgets.
function readerUiBabelPlugin({ types: t }) {
  return {
    visitor: {
      Program(program) {
        let createsUi = false;
        program.traverse({
          JSXOpeningElement(element) {
            const name = element.node.name;
            if (!t.isJSXIdentifier(name) || !/^[a-z]/.test(name.name)) return;
            element.node.attributes.push(
              t.jsxAttribute(
                t.jsxIdentifier("data-reader-ui"),
                t.stringLiteral(""),
              ),
            );
            createsUi = true;
          },
        });
        if (!createsUi) return;
        program.unshiftContainer(
          "body",
          t.importDeclaration([], t.stringLiteral("reader:styles")),
        );
      },
    },
  };
}
