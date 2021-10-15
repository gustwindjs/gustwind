import { getJson } from "./utils.ts";

async function compileTypeScript(path: string) {
  const importMapName = "import_map.json";
  const importMap = await getJson<{ imports: Record<string, string> }>(
    importMapName,
  );

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
