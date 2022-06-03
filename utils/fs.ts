import { async, path } from "../server-deps.ts";
import type { ProjectMeta } from "../types.ts";

function resolvePaths(rootPath = Deno.cwd(), paths: ProjectMeta["paths"]) {
  return Object.fromEntries(
    Object.entries(paths).map(([k, p]) => [k, path.join(rootPath, p)]),
  ) as ProjectMeta["paths"];
}

function getJson<R>(filePath: string): Promise<R> {
  return Deno.readTextFile(filePath).then((d) => JSON.parse(d));
}

function getJsonSync<R>(filePath: string) {
  try {
    return JSON.parse(Deno.readTextFileSync(filePath));
  } catch (error) {
    console.error("Failed to parse", filePath, error);
  }
}

async function dir(p: string, extension?: string) {
  const ret = [];

  for await (const { name } of Deno.readDir(p)) {
    if (extension) {
      if (path.extname(name) === extension) {
        ret.push({ path: path.join(p, name), name });
      }
    } else {
      ret.push({ path: path.join(p, name), name });
    }
  }

  return ret;
}

function dirSync(p: string, extension?: string) {
  const ret = [];

  for (const { name } of Deno.readDirSync(p)) {
    if (extension) {
      if (path.extname(name) === extension) {
        ret.push({ path: path.join(p, name), name });
      }
    } else {
      ret.push({ path: path.join(p, name), name });
    }
  }

  return ret;
}

async function watch(
  directory: string,
  extension: string,
  handler: (path: string, event: Deno.FsEvent) => void,
  debounceDelay = 200, // in ms
) {
  const watcher = Deno.watchFs(directory);

  const trigger = async.debounce(
    (event: Deno.FsEvent) =>
      event.paths.forEach((p) => p.endsWith(extension) && handler(p, event)),
    debounceDelay,
  );

  for await (const event of watcher) {
    trigger(event);
  }
}

export { dir, dirSync, getJson, getJsonSync, resolvePaths, watch };
