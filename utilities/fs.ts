import { async, path } from "../server-deps.ts";

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
  if (!p) {
    throw new Error("dir - missing path");
  }

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

export { dir, getJson, getJsonSync, watch };
