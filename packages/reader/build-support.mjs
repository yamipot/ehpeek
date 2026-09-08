import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGenerator, expandVariantGroup } from "unocss";
import unoConfig from "./uno.config.mjs";

export async function generateCss(sourceDir, config = unoConfig) {
  const generator = await createGenerator(config);
  const content = readSourceFiles(sourceDir).map(file => readFileSync(file, "utf8")).join("\n");
  return (await generator.generate(expandVariantGroup(content), { preflights: true })).css;
}

export function readSourceFiles(dir) {
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


export function readSpectrumUiSizes() {
  // Only selected upstream values enter the userscript; the token package remains a build dependency.
  const layout = readSpectrumTokenFile("layout.json");
  const typography = readSpectrumTokenFile("typography.json");
  const resolveDesktop = (tokens, keys) => Object.fromEntries(
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


export function variantGroupBabelPlugin() {
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
