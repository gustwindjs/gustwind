import { dir } from "./utils.ts";
import { compileTypeScript } from "./compileTypeScript.ts";

async function compileScripts(scriptsPath: string) {
  const scripts = await Promise.all(await dir(scriptsPath, ".ts"));

  return Promise.all(scripts.map(
    async ({ path, name }) => (
      {
        path,
        name,
        content: await compileTypeScript(path),
      }
    ),
  ));
}

export { compileScripts };
