import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";
import { createGenerator, expandVariantGroup } from "unocss";
import unoConfig from "./uno.config.mjs";

const packageDir = path.dirname(fileURLToPath(import.meta.url));
const outfile = path.join(packageDir, "dist/ehpeek.user.js");
const texts = JSON.parse(readFileSync(path.join(packageDir, "src/texts.json"), "utf-8"));
const releaseBuild = process.env.EHPEEK_RELEASE_BUILD === "true";
const releaseBranch = process.env.EHPEEK_RELEASE_BRANCH || "master";
const debugBuild = process.env.EHPEEK_DEBUG === "true";
const installUrl = userscriptInstallUrl();
const version = userscriptVersion();
const unoCss = await generateUnoCss();
const spectrumUiScales = readSpectrumUiScales();
const projectIconUrl = "https://raw.githubusercontent.com/yamipot/ehpeek/master/icon.svg";

const metadata = [
  "// ==UserScript==",
  `// @name         EhPeek`,
  `// @version      ${version}`,
  `// @description  ${texts.description}`,
  `// @icon         ${projectIconUrl}`,
  `// @icon64       ${projectIconUrl}`,
  `// @license      MIT`,
  `// @namespace    https://github.com/yamipot/ehpeek`,
  `// @homepage     https://github.com/yamipot/ehpeek`,
  `// @supportURL   https://github.com/yamipot/ehpeek/issues`,
  "// @match        *://exhentai.org/*",
  "// @match        *://exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*",
  "// @match        *://e-hentai.org/*",
  "// @match        *://*.exhentai.org/*",
  "// @match        *://*.exhentai55ld2wyap5juskbm67czulomrouspdacjamjeloj7ugjbsad.onion/*",
  "// @match        *://*.e-hentai.org/*",
  "// @match        *://*.hath.network/*",
  "// @exclude      *://forums.e-hentai.org/*",
  "// @grant        GM_getValue",
  "// @grant        GM_setValue",
  "// @grant        GM_deleteValue",
  "// @grant        GM_listValues",
  "// @grant        GM_registerMenuCommand",
  "// @grant        GM_download",
  "// @run-at       document-start",
  `// @updateURL    ${installUrl}`,
  `// @downloadURL  ${installUrl}`,
  "// ==/UserScript==",
  "",
].join("\n");

mkdirSync(path.join(packageDir, "dist"), { recursive: true });

await build({
  entryPoints: [path.join(packageDir, "src/App/index.tsx")],
  bundle: true,
  format: "iife",
  target: "es2020",
  charset: "utf8",
  loader: {
    ".css": "text",
  },
  plugins: [
    solidPlugin({
      babel: {
        plugins: [variantGroupBabelPlugin],
      },
    }),
    unoCssPlugin(unoCss),
    spectrumUiScalePlugin(spectrumUiScales),
  ],
  minifySyntax: !debugBuild,
  sourcemap: releaseBuild ? false : "linked",
  banner: {
    js: metadata,
  },
  define: {
    __EHPEEK_DEBUG__: JSON.stringify(debugBuild),
    __EHPEEK_VERSION__: JSON.stringify(version),
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
  const overrideUrl = process.env.EHPEEK_INSTALL_URL?.trim();
  if (overrideUrl) {
    return overrideUrl;
  }

  if (releaseBuild) {
    const sourceBranch = releaseBranch.replace(/[^a-zA-Z0-9._-]+/g, "-");
    return `https://github.com/yamipot/ehpeek/raw/build-${sourceBranch}/ehpeek.user.js`;
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
    hour12: false,
  });
  const parts = Object.fromEntries(formatter.formatToParts(new Date()).map((part) => [part.type, part.value]));

  return `${parts.year}${parts.month}${parts.day}.${parts.hour}${parts.minute}`;
}

async function generateUnoCss() {
  const generator = await createGenerator(unoConfig);
  const content = readSourceFiles(path.join(packageDir, "src"))
    .map((file) => readFileSync(file, "utf-8"))
    .join("\n");
  const result = await generator.generate(expandVariantGroup(content), { preflights: true });

  return result.css;
}

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

function unoCssPlugin(css) {
  return {
    name: "ehpeek-uno-css",
    setup(build) {
      build.onResolve({ filter: /^ehpeek:uno\.css$/ }, (args) => ({
        namespace: "ehpeek-uno-css",
        path: args.path,
      }));
      build.onLoad({ filter: /.*/, namespace: "ehpeek-uno-css" }, () => ({
        contents: css,
        loader: "text",
      }));
    },
  };
}

function readSpectrumUiScales() {
  // Only selected upstream values enter the userscript; the token package remains a build dependency.
  const layout = readSpectrumTokenFile("layout.json");
  const layoutComponent = readSpectrumTokenFile("layout-component.json");
  const typography = readSpectrumTokenFile("typography.json");
  const table = {
    small: {
      set: "desktop",
      control: {
        xs: "component-height-75",
        sm: "component-height-100",
        md: "component-height-200",
        lg: "component-height-300",
        xl: "component-height-400",
      },
      font: {
        xs: "font-size-25",
        sm: "font-size-100",
        md: "font-size-200",
        prominent: "font-size-300",
        title: "font-size-400",
        lg: "font-size-500",
        xl: "font-size-700",
      },
      icon: {
        sm: "workflow-icon-size-75",
        md: "workflow-icon-size-100",
        lg: "workflow-icon-size-200",
        xl: "workflow-icon-size-300",
      },
      statusDot: {
        md: "status-light-dot-size-medium",
        lg: "status-light-dot-size-large",
      },
    },
    medium: {
      set: "desktop",
      control: {
        xs: "component-height-100",
        sm: "component-height-200",
        md: "component-height-300",
        lg: "component-height-400",
        xl: "component-height-500",
      },
      font: {
        xs: "font-size-50",
        sm: "font-size-200",
        md: "font-size-400",
        prominent: "font-size-500",
        title: "font-size-600",
        lg: "font-size-700",
        xl: "font-size-900",
      },
      icon: {
        sm: "workflow-icon-size-100",
        md: "workflow-icon-size-200",
        lg: "workflow-icon-size-300",
        xl: "workflow-icon-size-300",
      },
      statusDot: {
        md: "status-light-dot-size-large",
        lg: "status-light-dot-size-extra-large",
      },
    },
    large: {
      set: "mobile",
      control: {
        xs: "component-height-100",
        sm: "component-height-200",
        md: "component-height-300",
        lg: "component-height-400",
        xl: "component-height-500",
      },
      font: {
        xs: "font-size-50",
        sm: "font-size-200",
        md: "font-size-400",
        prominent: "font-size-500",
        title: "font-size-600",
        lg: "font-size-700",
        xl: "font-size-900",
      },
      icon: {
        sm: "workflow-icon-size-100",
        md: "workflow-icon-size-200",
        lg: "workflow-icon-size-300",
        xl: "workflow-icon-size-300",
      },
      statusDot: {
        md: "status-light-dot-size-large",
        lg: "status-light-dot-size-extra-large",
      },
    },
  };
  const resolve = (tokens, keys, set) => Object.fromEntries(
    Object.entries(keys).map(([name, key]) => [
      name,
      tokens[key].sets[set].value,
    ]),
  );

  const resolved = Object.fromEntries(
    Object.entries(table).map(([name, definition]) => [
      name,
      {
        control: resolve(layout, definition.control, definition.set),
        font: resolve(typography, definition.font, definition.set),
        icon: resolve(layout, definition.icon, definition.set),
        statusDot: resolve(
          layoutComponent,
          definition.statusDot,
          definition.set,
        ),
      },
    ]),
  );
  return {
    xsmall: scaleSpectrumUiValues(resolved.small, 0.8),
    ...resolved,
    xlarge: scaleSpectrumUiValues(resolved.large, 1.25),
  };
}

function scaleSpectrumUiValues(groups, factor) {
  return Object.fromEntries(
    Object.entries(groups).map(([group, values]) => [
      group,
      Object.fromEntries(
        Object.entries(values).map(([name, value]) => {
          const pixels = /^([\d.]+)px$/.exec(value)?.[1];
          const scaled = pixels === undefined
            ? value
            : `${Math.round(Number(pixels) * factor * 1000) / 1000}px`;
          return [name, scaled];
        }),
      ),
    ]),
  );
}

function readSpectrumTokenFile(fileName) {
  const file = fileURLToPath(
    import.meta.resolve(`@adobe/spectrum-tokens/src/${fileName}`),
  );
  return JSON.parse(readFileSync(file, "utf-8"));
}

function spectrumUiScalePlugin(scales) {
  return {
    name: "ehpeek-spectrum-ui-scales",
    setup(build) {
      build.onResolve({ filter: /^ehpeek:spectrum-ui-scales$/ }, (args) => ({
        namespace: "ehpeek-spectrum-ui-scales",
        path: args.path,
      }));
      build.onLoad(
        { filter: /.*/, namespace: "ehpeek-spectrum-ui-scales" },
        () => ({
          contents: JSON.stringify(scales),
          loader: "json",
        }),
      );
    },
  };
}

function variantGroupBabelPlugin() {
  const expandStringLiteral = (path) => {
    path.node.value = expandVariantGroup(path.node.value);
  };
  const expandTemplateElement = (path) => {
    path.node.value.raw = expandVariantGroup(path.node.value.raw);
    if (path.node.value.cooked !== undefined) {
      path.node.value.cooked = expandVariantGroup(path.node.value.cooked);
    }
  };

  return {
    visitor: {
      Program(path) {
        path.traverse({
          StringLiteral: expandStringLiteral,
          TemplateElement: expandTemplateElement,
        });
      },
    },
  };
}
