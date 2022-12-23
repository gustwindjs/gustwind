import { dir } from "./fs.ts";
import { compileTypeScript } from "./compileTypeScript.ts";
import type { Mode } from "../types.ts";

async function compileScripts(scriptsPath: string, mode: Mode) {
  const scripts = await Promise.all(
    await dir({ path: scriptsPath, extension: ".ts" }),
  );

  return Promise.all(scripts.map(
    ({ path, name }) => compileScript({ path, name, mode }),
  ));
}

async function compileScript(
  { path, name, mode }: { path: string; name: string; mode: Mode },
) {
  return {
    path,
    name,
    content: await compileTypeScript(path, mode),
  };
}

export { compileScript, compileScripts };
