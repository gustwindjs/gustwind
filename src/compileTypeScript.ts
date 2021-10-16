import { build } from "esbuild";
import { getJson } from "./utils.ts";
import * as importMapPlugin from "./esbuildImportMapPlugin.ts";
import type { Mode } from "../types.ts";

const importMapName = "import_map.json";
const importMap = await getJson<{ imports: Record<string, string> }>(
  importMapName,
);

importMapPlugin.load(importMap);

async function compileTypeScript(path: string, mode: Mode) {
  // Reference: https://esbuild.github.io/api/
  const result = await build({
    entryPoints: [path],
    // TODO: Add source maps for production?
    // sourcemap: mode === "production",
    minify: mode === "production",
    bundle: true,
    format: "esm",
    target: ["esnext"],
    plugins: [importMapPlugin.plugin()],
    write: false,
  });
  const output = result.outputFiles;

  if (output.length < 1) {
    console.error("esbuild didn't output anything!");

    return "";
  }

  return output[0].text;
}

export { compileTypeScript };
