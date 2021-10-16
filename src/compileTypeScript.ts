import { build } from "esbuild";
import { getJson } from "./utils.ts";
import * as importMapPlugin from "./esbuildImportMapPlugin.ts";

const importMapName = "import_map.json";
const importMap = await getJson<{ imports: Record<string, string> }>(
  importMapName,
);

importMapPlugin.load(importMap);

console.log(build);

async function compileTypeScript(path: string) {
  // https://esbuild.github.io/api/
  // TODO: minify for production
  // TODO: figure out how to get deno tsconfig
  await build({
    entryPoints: [path],
    sourcemap: false, // TODO: generate for production?
    minify: false,
    bundle: true,
    outdir: "./demo", // TODO
    format: "iife", // TODO: target esm instead?
    plugins: [importMapPlugin.plugin()],
    // target: ['esnext'] maybe needed
    // TODO: push this to tsconfig.json
    // https://deno.land/manual@v1.15.1/typescript/configuration#what-an-implied-tsconfigjson-looks-like
    /*tsconfig: {
      "compilerOptions": {
        "allowJs": true,
        "esModuleInterop": true,
        "experimentalDecorators": true,
        "inlineSourceMap": true,
        "isolatedModules": true,
        "jsx": "react",
        "lib": ["deno.window"],
        "module": "esnext",
        "strict": true,
        "target": "esnext",
        "useDefineForClassFields": true,
      },
    },*/
  });

  const { files, diagnostics } = await Deno.emit(
    path,
    {
      bundle: "classic", // or "module"
      importMap,
      importMapPath: `file:///${importMapName}`,
    },
  );

  if (diagnostics.length) {
    // Disabled for now to avoid noise
    // console.log("Received diagnostics from Deno compiler", diagnostics);
  }

  return files["deno:///bundle.js"];
}

export { compileTypeScript };
