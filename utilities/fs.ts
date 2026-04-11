import * as _path from "node:path";
import { readdir } from "node:fs/promises";

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

  const files = await collectFiles(path, recursive ?? false);

  return files.filter(({ path: filePath }) =>
    extension ? filePath.endsWith(extension) : true
  ).map((entry) => ({
    path: entry.path,
    name: _path.relative(path, entry.path),
  }));
}

async function collectFiles(directoryPath: string, recursive: boolean) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: { path: string }[] = [];

  for (const entry of entries) {
    const entryPath = _path.join(directoryPath, entry.name);

    if (entry.isFile()) {
      files.push({ path: entryPath });
      continue;
    }

    if (recursive && entry.isDirectory()) {
      files.push(...await collectFiles(entryPath, recursive));
    }
  }

  return files;
}

export { dir };
