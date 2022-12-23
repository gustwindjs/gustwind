import { recursiveReaddir } from "https://deno.land/x/recursive_readdir@v2.0.0/mod.ts";
import { path as _path } from "../server-deps.ts";

function getJson<R>(filePath: string): Promise<R> {
  return Deno.readTextFile(filePath).then((d) => JSON.parse(d));
}

async function dir(
  { path, extension, recursive }: {
    path: string;
    extension?: string;
    recursive?: boolean;
  },
) {
  if (!path) {
    throw new Error("dir - missing path");
  }

  if (recursive) {
    const files = (await recursiveReaddir(path)).map((p) => ({
      path: p,
      name: _path.relative(path, p),
    }));

    return extension
      ? files.filter(({ path }) => path.endsWith(extension))
      : files;
  }

  const ret = [];

  for await (const { name } of Deno.readDir(path)) {
    if (extension) {
      if (_path.extname(name) === extension) {
        ret.push({ path: _path.join(path, name), name });
      }
    } else {
      ret.push({ path: _path.join(path, name), name });
    }
  }

  return ret;
}

export { dir, getJson };
