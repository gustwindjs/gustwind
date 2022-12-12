import { compileTypeScript } from "./compileTypeScript.ts";
import type { Mode } from "../types.ts";

function compileScripts(
  paths: { path: string; name: string }[],
  mode: Mode,
) {
  return Promise.all(paths.map(
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
