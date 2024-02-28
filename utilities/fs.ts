import * as _path from "node:path";
import { walk } from "https://deno.land/std@0.207.0/fs/walk.ts";

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

  const files: { path: string; name: string }[] = [];

  for await (
    const entry of walk(path, {
      exts: extension ? [extension] : undefined,
      includeDirs: false,
      maxDepth: recursive ? Infinity : 1,
    })
  ) {
    if (entry.isFile) {
      files.push({
        path: entry.path,
        name: _path.relative(path, entry.path),
      });
    }
  }

  return files;
}

export { dir };
