import * as path from "node:path";
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
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
      rm(path.join(outputDirectory, outputPath), { force: true, recursive: false })
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
    hash.update(task.type);
    hash.update("\n");

    switch (task.type) {
      case "listDirectory": {
        const directoryHash = await hashDirectory(resolveDependencyPath(cwd, task.payload.path));

        if (!directoryHash) {
          return null;
        }

        hash.update(task.payload.path);
        hash.update("\n");
        hash.update(directoryHash);
        hash.update("\n");
        break;
      }
      case "loadJSON":
      case "readTextFile": {
        const fileHash = await hashFile(resolveDependencyPath(cwd, task.payload.path));

        if (!fileHash) {
          return null;
        }

        hash.update(task.payload.path);
        hash.update("\n");
        hash.update(fileHash);
        hash.update("\n");
        break;
      }
      case "loadModule": {
        const moduleHash = await hashModule(resolveDependencyPath(cwd, task.payload.path), new Set());

        if (!moduleHash) {
          return null;
        }

        hash.update(task.payload.path);
        hash.update("\n");
        hash.update(moduleHash);
        hash.update("\n");
        break;
      }
    }
  }

  return hash.digest("hex");
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

  return tasks.filter((task): task is DependencyTask => dependencyTaskTypes.has(task.type as never))
    .map((task) => ({
      ...task,
      payload: {
        ...task.payload,
        path: cwd ? normalizeDependencyPath(cwd, task.payload.path) : task.payload.path,
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
          stat(path.join(cacheSource.rootDirectory, outputPath))
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
): Promise<{ cache: IncrementalBuildCache; source: IncrementalBuildCacheSource } | undefined> {
  const source = resolveCacheSource(cwd, cacheFrom);

  try {
    const manifest = source.kind === "filesystem"
      ? await readFile(path.join(source.rootDirectory, CACHE_MANIFEST_PATH), "utf8")
      : await fetch(joinUrl(source.rootUrl, CACHE_MANIFEST_PATH)).then(async (response) => {
        if (!response.ok) {
          throw new Error(`Failed to fetch cache manifest: ${response.status}`);
        }

        return await response.text();
      });
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
      .map(([, entry]) => clearCachedOutputs(outputDirectory, entry.outputPaths)),
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
      await cp(path.join(cacheSource.rootDirectory, outputPath), targetPath, { force: true });
      continue;
    }

    await writeFile(targetPath, await fetchCachedOutput(cacheSource, outputPath));
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
    JSON.stringify({
      routes,
      schemaVersion: CACHE_SCHEMA_VERSION,
    }, null, 2) + "\n",
  );
}

async function hashDirectory(directoryPath: string | null): Promise<string | null> {
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

async function collectFiles(directoryPath: string): Promise<string[] | undefined> {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (isMissingFileError(error)) {
      return;
    }

    throw error;
  }
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath) || []));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files.sort();
}

async function hashFile(filePath: string | null): Promise<string | null> {
  if (!filePath) {
    return null;
  }

  try {
    return createHash("sha256").update(await readFile(filePath)).digest("hex");
  } catch (error) {
    if (isMissingFileError(error)) {
      return createHash("sha256").update(MISSING_DEPENDENCY_HASH).digest("hex");
    }

    throw error;
  }
}

async function hashModule(modulePath: string | null, visitedPaths: Set<string>): Promise<string | null> {
  if (!modulePath) {
    return null;
  }

  if (visitedPaths.has(modulePath)) {
    return "";
  }

  visitedPaths.add(modulePath);
  let source: string;

  try {
    source = await readFile(modulePath, "utf8");
  } catch (error) {
    if (isMissingFileError(error)) {
      return createHash("sha256").update(MISSING_DEPENDENCY_HASH).digest("hex");
    }

    throw error;
  }
  const hash = createHash("sha256");

  hash.update(source);
  hash.update("\n");

  for (const specifier of getImportSpecifiers(source)) {
    const dependencyPath = resolveImportedModulePath(modulePath, specifier);

    if (dependencyPath === null) {
      return null;
    }

    if (!dependencyPath) {
      hash.update(specifier);
      hash.update("\n");
      continue;
    }

    hash.update(await hashModule(dependencyPath, visitedPaths) || "");
    hash.update("\n");
  }

  return hash.digest("hex");
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

function resolveCacheSource(cwd: string, cacheFrom: string): IncrementalBuildCacheSource {
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
  if (targetPath.startsWith("http://") || targetPath.startsWith("https://")) {
    return null;
  }

  if (targetPath.startsWith("file:")) {
    return fileURLToPath(targetPath);
  }

  return path.isAbsolute(targetPath) ? targetPath : path.resolve(cwd, targetPath);
}

function normalizeDependencyPath(cwd: string, targetPath: string) {
  if (targetPath.startsWith("http://") || targetPath.startsWith("https://")) {
    return targetPath;
  }

  const absolutePath = targetPath.startsWith("file:")
    ? fileURLToPath(targetPath)
    : path.isAbsolute(targetPath)
    ? targetPath
    : path.resolve(cwd, targetPath);
  const relativePath = path.relative(cwd, absolutePath);

  if (!relativePath || relativePath === ".") {
    return ".";
  }

  if (
    relativePath === ".." || relativePath.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relativePath)
  ) {
    return absolutePath;
  }

  return relativePath;
}

function resolveImportedModulePath(modulePath: string, specifier: string) {
  if (specifier.startsWith("http://") || specifier.startsWith("https://")) {
    return null;
  }

  if (specifier.startsWith("file:")) {
    return fileURLToPath(specifier);
  }

  if (specifier.startsWith("/")) {
    return specifier;
  }

  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    const resolvedPath = path.resolve(path.dirname(modulePath), specifier);

    return path.extname(resolvedPath) ? resolvedPath : undefined;
  }

  return undefined;
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

  return `{${Object.keys(value).sort().map((key) =>
    `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`
  ).join(",")}}`;
}

function isMissingFileError(error: unknown): error is NodeJS.ErrnoException {
  return typeof error === "object" && error !== null && "code" in error &&
    error.code === "ENOENT";
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
