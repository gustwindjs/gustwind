import * as esbuild from "https://deno.land/x/esbuild@v0.16.10/mod.js";
import type { Mode } from "../types.ts";

async function transformTypeScript(source: string, mode: Mode) {
  // Reference: https://esbuild.github.io/api/
  const result = await esbuild.transform(source, {
    // TODO: Add source maps for production?
    // sourcemap: mode === "production",
    minify: mode === "production",
    // TODO: How to force transform to bundle?
    // bundle: true,
    format: "esm",
    target: ["esnext"],
    treeShaking: true,
    // external: externals,
  }).catch((err) => console.error(err));

  if (!result) {
    return "";
  }

  return result.code;
}

export { transformTypeScript };
