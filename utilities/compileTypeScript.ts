import * as esbuild from "https://deno.land/x/esbuild@v0.19.4/mod.js";
import type { Mode } from "../types.ts";

async function compileTypeScript(
  path: string,
  mode: Mode,
  externals?: string[],
) {
  // Reference: https://esbuild.github.io/api/
  const result = await esbuild.build({
    entryPoints: [path],
    // TODO: Add source maps for production?
    // sourcemap: mode === "production",
    minify: mode === "production",
    bundle: true,
    format: "esm",
    target: ["esnext"],
    treeShaking: true,
    write: false,
    external: externals,
  }).catch((err) => console.error(err));

  if (!result) {
    return "";
  }

  const output = result.outputFiles;

  if (output.length < 1) {
    console.error("esbuild didn't output anything!");

    return "";
  }

  return output[0].text;
}

export { compileTypeScript };
