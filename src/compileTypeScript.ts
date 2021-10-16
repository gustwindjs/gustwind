import { build } from "esbuild";
import * as importMapPlugin from "./esbuildImportMapPlugin.ts";
import type { ImportMap, Mode } from "../types.ts";

async function compileTypeScript(
  path: string,
  mode: Mode,
  importMap: ImportMap,
) {
  importMapPlugin.load(importMap);

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
