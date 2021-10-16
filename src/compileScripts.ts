import { dir } from "./fsUtils.ts";
import { compileTypeScript } from "./compileTypeScript.ts";
import type { Mode } from "../types.ts";

async function compileScripts(scriptsPath: string, mode: Mode) {
  const scripts = await Promise.all(await dir(scriptsPath, ".ts"));

  return Promise.all(scripts.map(
    async ({ path, name }) => (
      {
        path,
        name,
        content: await compileTypeScript(path, mode),
      }
    ),
  ));
}

export { compileScripts };
