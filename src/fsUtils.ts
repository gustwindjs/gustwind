import { extname, join } from "path";

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
      if (extname(name) === extension) {
        ret.push({ path: join(p, name), name });
      }
    } else {
      ret.push({ path: join(p, name), name });
    }
  }

  return ret;
}

function dirSync(p: string, extension?: string) {
  const ret = [];

  for (const { name } of Deno.readDirSync(p)) {
    if (extension) {
      if (extname(name) === extension) {
        ret.push({ path: join(p, name), name });
      }
    } else {
      ret.push({ path: join(p, name), name });
    }
  }

  return ret;
}

async function watch(
  directory: string,
  extension: string,
  handler: (path: string) => void,
) {
  const watcher = Deno.watchFs(directory);

  for await (const event of watcher) {
    event.paths.forEach((p) => p.endsWith(extension) && handler(p));
  }
}

export { dir, dirSync, getJson, getJsonSync, watch };
