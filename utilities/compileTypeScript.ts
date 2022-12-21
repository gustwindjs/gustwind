import { esbuild } from "../server-deps.ts";
import type { Mode } from "../types.ts";

async function compileTypeScript(path: string, mode: Mode) {
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
    // TODO: This is a bad coupling. Externals should be
    // configurable per script.
    external: ["/twindSetup.js"],
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
