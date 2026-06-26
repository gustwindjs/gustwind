import * as path from "node:path";
import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";
import type { BuildWorkerEvent, Route } from "../types.ts";

const CACHE_SCHEMA_VERSION = 3;
const CACHE_MANIFEST_PATH = path.join(".gustwind", "build-cache.json");
const MISSING_DEPENDENCY_HASH = "(missing)";
const dependencyTaskTypes = new Set([
  "listDirectory",
  "loadJSON",
  "loadModule",
  "readTextFile",
] as const);

type DependencyTask = Extract<
  BuildWorkerEvent,
  { type: "listDirectory" | "loadJSON" | "loadModule" | "readTextFile" }
>;

type IncrementalBuildRouteCacheEntry = {
  dependencyTasks: DependencyTask[];
  fingerprint: string;
  outputPaths: string[];
};

type IncrementalBuildCache = {
  routes: Record<string, IncrementalBuildRouteCacheEntry>;
  schemaVersion: number;
};

type IncrementalBuildCacheSource =
  | {
      kind: "filesystem";
      rootDirectory: string;
    }
  | {
      kind: "http";
      rootUrl: string;
    };

async function clearCachedOutputs(
  outputDirectory: string,
  outputPaths: string[],
) {
  await Promise.all(
    outputPaths.map((outputPath) =>
      rm(path.join(outputDirectory, outputPath), {
        force: true,
        recursive: false,
      }),
    ),
  );
}

async function fetchCachedOutput(
  cacheSource: IncrementalBuildCacheSource,
  outputPath: string,
) {
  if (cacheSource.kind === "filesystem") {
    return await readFile(path.join(cacheSource.rootDirectory, outputPath));
  }

  const response = await fetch(joinUrl(cacheSource.rootUrl, outputPath));

  if (!response.ok) {
    throw new Error(
      `Failed to fetch cached output ${outputPath}: ${response.status} ${response.statusText}`,
    );
  }

  return Buffer.from(await response.arrayBuffer());
}

async function hashDependencyTasks(cwd: string, tasks: DependencyTask[]) {
  const hash = createHash("sha256");

  for (const task of normalizeDependencyTasks(tasks, cwd)) {
    const dependencyHash = await hashDependencyTask(cwd, task);

    if (!dependencyHash) {
      return null;
    }

    updateDependencyTaskHash(hash, task, dependencyHash);
  }

  return hash.digest("hex");
}

async function hashDependencyTask(cwd: string, task: DependencyTask) {
  const dependencyPath = resolveDependencyPath(cwd, task.payload.path);

  switch (task.type) {
    case "listDirectory":
      return hashDirectory(dependencyPath);
    case "loadJSON":
    case "readTextFile":
      return hashFile(dependencyPath);
    case "loadModule":
      return hashModule(dependencyPath, new Set());
  }
}

function updateDependencyTaskHash(
  hash: ReturnType<typeof createHash>,
  task: DependencyTask,
  dependencyHash: string,
) {
  hash.update(task.type);
  hash.update("\n");
  hash.update(task.payload.path);
  hash.update("\n");
  hash.update(dependencyHash);
  hash.update("\n");
}

async function hashRouteFingerprint(
  cwd: string,
  globalFingerprint: string | null,
  route: Route,
  dependencyTasks: DependencyTask[],
) {
  if (!globalFingerprint) {
    return null;
  }

  const dependencyFingerprint = await hashDependencyTasks(cwd, dependencyTasks);

  if (!dependencyFingerprint) {
    return null;
  }

  return createHash("sha256")
    .update(globalFingerprint)
    .update("\n")
    .update(stableStringify(route))
    .update("\n")
    .update(dependencyFingerprint)
    .digest("hex");
}

function normalizeDependencyTasks(
  tasks: BuildWorkerEvent[],
  cwd?: string,
): DependencyTask[] {
  const seen = new Set<string>();

  return tasks
    .filter((task): task is DependencyTask =>
      dependencyTaskTypes.has(task.type as never),
    )
    .map((task) => ({
      ...task,
      payload: {
        ...task.payload,
        path: cwd
          ? normalizeDependencyPath(cwd, task.payload.path)
          : task.payload.path,
      },
    }))
    .sort((a, b) => stableStringify(a).localeCompare(stableStringify(b)))
    .filter((task) => {
      const key = stableStringify(task);

      if (seen.has(key)) {
        return false;
      }

      seen.add(key);
      return true;
    });
}

async function outputsExist(
  cacheSource: IncrementalBuildCacheSource,
  outputPaths: string[],
) {
  try {
    if (cacheSource.kind === "filesystem") {
      await Promise.all(
        outputPaths.map((outputPath) =>
          stat(path.join(cacheSource.rootDirectory, outputPath)),
        ),
      );
      return true;
    }

    await Promise.all(
      outputPaths.map(async (outputPath) => {
        const response = await fetch(joinUrl(cacheSource.rootUrl, outputPath), {
          method: "HEAD",
        });

        if (!response.ok) {
          throw new Error(`Missing cached output ${outputPath}`);
        }
      }),
    );
    return true;
  } catch {
    return false;
  }
}

async function readIncrementalBuildCache(
  cwd: string,
  cacheFrom: string,
): Promise<
  | { cache: IncrementalBuildCache; source: IncrementalBuildCacheSource }
  | undefined
> {
  const source = resolveCacheSource(cwd, cacheFrom);

  try {
    const manifest =
      source.kind === "filesystem"
        ? await readFile(
            path.join(source.rootDirectory, CACHE_MANIFEST_PATH),
            "utf8",
          )
        : await fetch(joinUrl(source.rootUrl, CACHE_MANIFEST_PATH)).then(
            async (response) => {
              if (!response.ok) {
                throw new Error(
                  `Failed to fetch cache manifest: ${response.status}`,
                );
              }

              return await response.text();
            },
          );
    const cache = JSON.parse(manifest) as IncrementalBuildCache;

    if (cache.schemaVersion !== CACHE_SCHEMA_VERSION) {
      return;
    }

    return { cache, source };
  } catch {
    return;
  }
}

async function removeDeletedRouteOutputs(
  outputDirectory: string,
  previousCache: IncrementalBuildCache | undefined,
  nextRouteUrls: string[],
) {
  if (!previousCache) {
    return;
  }

  const nextRouteSet = new Set(nextRouteUrls);

  await Promise.all(
    Object.entries(previousCache.routes)
      .filter(([url]) => !nextRouteSet.has(url))
      .map(([, entry]) =>
        clearCachedOutputs(outputDirectory, entry.outputPaths),
      ),
  );
}

async function restoreCachedOutputs(
  cacheSource: IncrementalBuildCacheSource,
  outputDirectory: string,
  outputPaths: string[],
) {
  for (const outputPath of outputPaths) {
    const targetPath = path.join(outputDirectory, outputPath);

    if (
      cacheSource.kind === "filesystem" &&
      path.resolve(cacheSource.rootDirectory) === path.resolve(outputDirectory)
    ) {
      continue;
    }

    await mkdir(path.dirname(targetPath), { recursive: true });

    if (cacheSource.kind === "filesystem") {
      await cp(path.join(cacheSource.rootDirectory, outputPath), targetPath, {
        force: true,
      });
      continue;
    }

    await writeFile(
      targetPath,
      await fetchCachedOutput(cacheSource, outputPath),
    );
  }
}

function toRelativeOutputPath(outputDirectory: string, outputPath: string) {
  return path.relative(outputDirectory, outputPath);
}

async function writeIncrementalBuildCache(
  outputDirectory: string,
  routes: Record<string, IncrementalBuildRouteCacheEntry>,
) {
  const cachePath = path.join(outputDirectory, CACHE_MANIFEST_PATH);

  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        routes,
        schemaVersion: CACHE_SCHEMA_VERSION,
      },
      null,
      2,
    ) + "\n",
  );
}

async function hashDirectory(
  directoryPath: string | null,
): Promise<string | null> {
  if (!directoryPath) {
    return null;
  }

  const entries = await collectFiles(directoryPath);

  if (!entries) {
    return createHash("sha256").update(MISSING_DEPENDENCY_HASH).digest("hex");
  }

  const hash = createHash("sha256");

  for (const filePath of entries) {
    hash.update(path.relative(directoryPath, filePath));
    hash.update("\n");
    hash.update(await readFile(filePath));
    hash.update("\n");
  }

  return hash.digest("hex");
}

async function collectFiles(
  directoryPath: string,
): Promise<string[] | undefined> {
  const entries = await readDirectoryEntries(directoryPath);

  if (!entries) {
    return;
  }

  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);
    await collectDirectoryEntryFiles(files, entryPath, entry);
  }

  return files.sort();
}

async function readDirectoryEntries(directoryPath: string) {
  try {
    return await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }

    throw error;
  }
}

async function collectDirectoryEntryFiles(
  files: string[],
  entryPath: string,
  entry: Dirent,
) {
  if (entry.isDirectory()) {
    files.push(...((await collectFiles(entryPath)) || []));
  } else if (entry.isFile()) {
    files.push(entryPath);
  }
}

async function hashFile(filePath: string | null): Promise<string | null> {
  if (!filePath) {
    return null;
  }

  try {
    return createHash("sha256")
      .update(await readFile(filePath))
      .digest("hex");
  } catch (error) {
    if (isMissingFileError(error)) {
      return createHash("sha256").update(MISSING_DEPENDENCY_HASH).digest("hex");
    }

    throw error;
  }
}

async function hashModule(
  modulePath: string | null,
  visitedPaths: Set<string>,
): Promise<string | null> {
  if (!modulePath) {
    return null;
  }

  if (visitedPaths.has(modulePath)) {
    return "";
  }

  visitedPaths.add(modulePath);
  const source = await readModuleSource(modulePath);

  if (source === undefined) {
    return hashMissingDependency();
  }

  const hash = createHash("sha256");

  hash.update(source);
  hash.update("\n");

  return hashModuleImports(hash, modulePath, source, visitedPaths);
}

async function hashModuleImports(
  hash: ReturnType<typeof createHash>,
  modulePath: string,
  source: string,
  visitedPaths: Set<string>,
) {
  for (const specifier of getImportSpecifiers(source)) {
    const specifierHash = await hashImportSpecifier(
      modulePath,
      specifier,
      visitedPaths,
    );
    if (specifierHash === null) {
      return null;
    }

    hash.update(specifierHash);
    hash.update("\n");
  }

  return hash.digest("hex");
}

async function readModuleSource(modulePath: string) {
  try {
    return await readFile(modulePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }

    throw error;
  }
}

function hashMissingDependency() {
  return createHash("sha256").update(MISSING_DEPENDENCY_HASH).digest("hex");
}

async function hashImportSpecifier(
  modulePath: string,
  specifier: string,
  visitedPaths: Set<string>,
) {
  const dependencyPath = resolveImportedModulePath(modulePath, specifier);

  if (dependencyPath === null) {
    return null;
  }

  if (!dependencyPath) {
    return specifier;
  }

  return (await hashModule(dependencyPath, visitedPaths)) || "";
}

function getImportSpecifiers(source: string) {
  const importSpecifiers = new Set<string>();
  const staticImportPattern =
    /(?:import|export)\s+(?:type\s+)?(?:[\s\w{},*$]*?\s+from\s+)?["']([^"']+)["']/g;
  const dynamicImportPattern = /import\(\s*["']([^"']+)["']\s*\)/g;

  for (const pattern of [staticImportPattern, dynamicImportPattern]) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[1];

      if (specifier) {
        importSpecifiers.add(specifier);
      }
    }
  }

  return [...importSpecifiers];
}

function resolveCacheSource(
  cwd: string,
  cacheFrom: string,
): IncrementalBuildCacheSource {
  if (cacheFrom.startsWith("http://") || cacheFrom.startsWith("https://")) {
    return {
      kind: "http",
      rootUrl: cacheFrom.replace(/\/+$/, ""),
    };
  }

  return {
    kind: "filesystem",
    rootDirectory: path.resolve(cwd, cacheFrom),
  };
}

function resolveDependencyPath(cwd: string, targetPath: string) {
  if (isRemotePath(targetPath)) {
    return null;
  }

  if (isFileUrl(targetPath)) {
    return fileURLToPath(targetPath);
  }

  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(cwd, targetPath);
}

function normalizeDependencyPath(cwd: string, targetPath: string) {
  if (isRemotePath(targetPath)) {
    return targetPath;
  }

  const absolutePath = getAbsoluteDependencyPath(cwd, targetPath);
  const relativePath = path.relative(cwd, absolutePath);

  if (!relativePath || relativePath === ".") {
    return ".";
  }

  if (isOutsideRoot(relativePath)) {
    return absolutePath;
  }

  return relativePath;
}

function getAbsoluteDependencyPath(cwd: string, targetPath: string) {
  if (isFileUrl(targetPath)) {
    return fileURLToPath(targetPath);
  }

  return path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(cwd, targetPath);
}

function isOutsideRoot(relativePath: string) {
  return (
    relativePath === ".." ||
    relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  );
}

function resolveImportedModulePath(modulePath: string, specifier: string) {
  if (isRemotePath(specifier)) {
    return null;
  }

  if (isFileUrl(specifier)) {
    return fileURLToPath(specifier);
  }

  if (path.isAbsolute(specifier)) {
    return specifier;
  }

  if (isRelativePath(specifier)) {
    return resolveRelativeModulePath(modulePath, specifier);
  }

  return undefined;
}

function isRemotePath(targetPath: string) {
  return targetPath.startsWith("http://") || targetPath.startsWith("https://");
}

function isFileUrl(targetPath: string) {
  return targetPath.startsWith("file:");
}

function isRelativePath(targetPath: string) {
  return targetPath.startsWith("./") || targetPath.startsWith("../");
}

function resolveRelativeModulePath(modulePath: string, specifier: string) {
  const resolvedPath = path.resolve(path.dirname(modulePath), specifier);

  return path.extname(resolvedPath) ? resolvedPath : undefined;
}

function joinUrl(baseUrl: string, relativePath: string) {
  return `${baseUrl}/${relativePath.replace(/^\/+/, "").replaceAll(path.sep, "/")}`;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  return `{${Object.keys(value)
    .sort()
    .map(
      (key) =>
        `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`,
    )
    .join(",")}}`;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export {
  CACHE_MANIFEST_PATH,
  clearCachedOutputs,
  hashDependencyTasks,
  hashRouteFingerprint,
  normalizeDependencyTasks,
  outputsExist,
  readIncrementalBuildCache,
  removeDeletedRouteOutputs,
  restoreCachedOutputs,
  toRelativeOutputPath,
  writeIncrementalBuildCache,
};
export type {
  DependencyTask,
  IncrementalBuildCache,
  IncrementalBuildRouteCacheEntry,
  IncrementalBuildCacheSource,
};
