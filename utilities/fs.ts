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
    files.push(...await collectFileEntry(directoryPath, entry, recursive));
  }

  return files;
}

async function collectFileEntry(
  directoryPath: string,
  entry: { name: string; isFile(): boolean; isDirectory(): boolean },
  recursive: boolean,
) {
  const entryPath = _path.join(directoryPath, entry.name);

  if (entry.isFile()) {
    return [{ path: entryPath }];
  }

  return recursive && entry.isDirectory()
    ? collectFiles(entryPath, recursive)
    : [];
}

export { dir };
