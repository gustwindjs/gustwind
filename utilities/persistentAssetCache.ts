import * as path from "node:path";
import { copyFile, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";

const PERSISTENT_ASSET_CACHE_ROOT = path.join(".gustwind", "persistent-assets");

async function persistentAssetExists(
  cwd: string,
  namespace: string,
  key: string,
  relativePath: string,
) {
  try {
    await stat(getPersistentAssetPath(cwd, namespace, key, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function readPersistentAssetText(
  cwd: string,
  namespace: string,
  key: string,
  relativePath: string,
) {
  return await readFile(
    getPersistentAssetPath(cwd, namespace, key, relativePath),
    "utf8",
  );
}

async function restorePersistentAssets(
  cwd: string,
  namespace: string,
  key: string,
  outputDirectory: string,
  relativePaths: string[],
) {
  const normalizedPaths = normalizeRelativePaths(relativePaths);

  if (
    !(await Promise.all(
      normalizedPaths.map((relativePath) =>
        persistentAssetExists(cwd, namespace, key, relativePath)
      ),
    )).every(Boolean)
  ) {
    return false;
  }

  for (const relativePath of normalizedPaths) {
    const sourcePath = getPersistentAssetPath(cwd, namespace, key, relativePath);
    const targetPath = path.join(outputDirectory, relativePath);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }

  return true;
}

async function writePersistentAssetText(
  cwd: string,
  namespace: string,
  key: string,
  relativePath: string,
  contents: string,
) {
  const targetPath = getPersistentAssetPath(cwd, namespace, key, relativePath);

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, contents);
}

async function writePersistentAssets(
  cwd: string,
  namespace: string,
  key: string,
  sourceDirectory: string,
  relativePaths: string[],
) {
  const normalizedPaths = normalizeRelativePaths(relativePaths);
  const cacheRoot = getPersistentAssetRoot(cwd, namespace, key);

  await rm(cacheRoot, { recursive: true, force: true });

  for (const relativePath of normalizedPaths) {
    const sourcePath = path.join(sourceDirectory, relativePath);
    const targetPath = getPersistentAssetPath(cwd, namespace, key, relativePath);

    await mkdir(path.dirname(targetPath), { recursive: true });
    await copyFile(sourcePath, targetPath);
  }
}

function getPersistentAssetPath(
  cwd: string,
  namespace: string,
  key: string,
  relativePath: string,
) {
  return path.join(getPersistentAssetRoot(cwd, namespace, key), relativePath);
}

function getPersistentAssetRoot(cwd: string, namespace: string, key: string) {
  return path.join(cwd, PERSISTENT_ASSET_CACHE_ROOT, namespace, key);
}

function normalizeRelativePaths(relativePaths: string[]) {
  return [...new Set(relativePaths)].sort();
}

export {
  persistentAssetExists,
  PERSISTENT_ASSET_CACHE_ROOT,
  readPersistentAssetText,
  restorePersistentAssets,
  writePersistentAssets,
  writePersistentAssetText,
};
