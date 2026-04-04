import type { Mode } from "../types.ts";
import { getEsbuild, stopEsbuild as stopSharedEsbuild } from "./esbuild.ts";

async function compileTypeScript(
  path: string,
  mode: Mode,
  externals?: string[],
) {
  const esbuild = await getEsbuild();

  // Reference: https://esbuild.github.io/api/
  const result = await esbuild.build({
    entryPoints: [path],
    // TODO: Add source maps for production?
    // sourcemap: mode === "production",
    minify: mode === "production",
    bundle: true,
    format: "esm",
    // platform: "node" is needed because of "node:path" style imports
    platform: "node",
    target: ["esnext"],
    treeShaking: true,
    write: false,
    external: externals,
  }).catch((err: string) => console.error(err));

  if (!result) {
    return "";
  }

  const output = result.outputFiles;

  if (!output || output.length < 1) {
    console.error("esbuild didn't output anything!");

    return "";
  }

  return output[0].text;
}

function stopEsbuild() {
  return stopSharedEsbuild();
}

export { compileTypeScript, stopEsbuild };
