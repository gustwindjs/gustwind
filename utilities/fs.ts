import { async, path } from "../server-deps.ts";
import type { ProjectMeta } from "../types.ts";

function resolvePaths(rootPath = Deno.cwd(), paths: ProjectMeta["paths"]) {
  return Object.fromEntries(
    Object.entries(paths).map((
      [k, p],
    ) => [
      k,
      Array.isArray(p)
        ? p.map((i) => path.join(rootPath, i))
        : path.join(rootPath, p),
    ]),
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

async function watch({
  directory,
  handler,
  debounceDelay,
}: {
  directory: string;
  handler: (path: string, event: Deno.FsEvent) => void;
  debounceDelay?: number;
}) {
  const watcher = Deno.watchFs(directory);

  const trigger = async.debounce(
    (event: Deno.FsEvent) => event.paths.forEach((p) => handler(p, event)),
    debounceDelay || 200,
  );

  for await (const event of watcher) {
    trigger(event);
  }
}

export { dir, dirSync, getJson, getJsonSync, resolvePaths, watch };
