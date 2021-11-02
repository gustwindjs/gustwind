import { dir } from "./fs.ts";
import { compileTypeScript } from "./compileTypeScript.ts";
import type { ImportMap, Mode } from "../types.ts";

async function compileScripts(
  scriptsPath: string,
  mode: Mode,
  importMap: ImportMap,
) {
  const scripts = await Promise.all(await dir(scriptsPath, ".ts"));

  return Promise.all(scripts.map(
    async ({ path, name }) => (
      {
        path,
        name,
        content: await compileTypeScript(path, mode, importMap),
      }
    ),
  ));
}

export { compileScripts };
