import { build } from "esbuild";
import { getJson } from "./utils.ts";
import * as importMapPlugin from "./esbuildImportMapPlugin.ts";

const importMapName = "import_map.json";
const importMap = await getJson<{ imports: Record<string, string> }>(
  importMapName,
);

importMapPlugin.load(importMap);

async function compileTypeScript(path: string) {
  // Reference: https://esbuild.github.io/api/
  const result = await build({
    entryPoints: [path],
    sourcemap: false, // TODO: generate for production
    minify: false, // TODO: set for production
    bundle: true,
    format: "esm",
    target: ["esnext"],
    plugins: [importMapPlugin.plugin()],
    write: false,
  });
  const output = result.outputFiles;

  if (output.length < 1) {
    console.error("esbuild didn't output anything!");

    return;
  }

  return output[0].text;
}

export { compileTypeScript };
