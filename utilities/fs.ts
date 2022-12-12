import { path } from "../server-deps.ts";

function getJson<R>(filePath: string): Promise<R> {
  return Deno.readTextFile(filePath).then((d) => JSON.parse(d));
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

export { dir, getJson };
