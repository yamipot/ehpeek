import { cpSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { context } from "esbuild";
import { solidPlugin } from "esbuild-plugin-solid";

const dir = path.dirname(fileURLToPath(import.meta.url));
const source = path.join(dir, "examples/basic");
const output = path.join(dir, "dist/example");
mkdirSync(output, { recursive: true });
for (const file of ["index.html", "example.css"])
  cpSync(path.join(source, file), path.join(output, file));
const ctx = await context({
  entryPoints: [path.join(source, "main.tsx")],
  outfile: path.join(output, "main.js"),
  bundle: true,
  format: "esm",
  target: "es2020",
  plugins: [solidPlugin()],
});
await ctx.rebuild();
if (process.argv.includes("--serve")) {
  const server = await ctx.serve({
    servedir: output,
    host: "127.0.0.1",
    port: 4173,
  });
  console.log(`Reader example: http://127.0.0.1:${server.port}`);
} else {
  await ctx.dispose();
  console.log("[reader] built example");
}
