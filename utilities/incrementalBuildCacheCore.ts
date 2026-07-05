import * as path from "node:path";
import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { brotliCompress, brotliDecompress } from "node:zlib";
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import type { BuildWorkerEvent, Route } from "../types.ts";

const CACHE_SCHEMA_VERSION = 3;
const CACHE_MANIFEST_PATH = path.join(".gustwind", "build-cache.json");
const CACHE_ARCHIVE_FORMAT = "tar+br";
const CACHE_ARCHIVE_PATH = path.join(".gustwind", "build-cache.tar.br");
const MISSING_DEPENDENCY_HASH = "(missing)";
const TAR_BLOCK_SIZE = 512;
const TAR_TYPE_FILE = "0";
const brotliCompressAsync = promisify(brotliCompress);
const brotliDecompressAsync = promisify(brotliDecompress);
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
  archive?: IncrementalBuildCacheArchive;
  routes: Record<string, IncrementalBuildRouteCacheEntry>;
  schemaVersion: number;
};

type IncrementalBuildCacheArchive = {
  format: typeof CACHE_ARCHIVE_FORMAT;
  hash: string;
  path: string;
};

type IncrementalBuildCacheSource =
  | {
      kind: "filesystem";
      rootDirectory: string;
    }
  | {
      archiveRestored?: boolean;
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

async function fetchCacheSourceFile(
  cacheSource: IncrementalBuildCacheSource,
  outputPath: string,
) {
  if (cacheSource.kind === "filesystem") {
    return await readFile(path.join(cacheSource.rootDirectory, outputPath));
  }

  const response = await fetch(joinUrl(cacheSource.rootUrl, outputPath));

  if (!response.ok) {
    throw new Error(
      `Failed to fetch cached file ${outputPath}: ${response.status} ${response.statusText}`,
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
  const hashDependency = dependencyTaskHashers[task.type];

  return hashDependency(dependencyPath);
}

const dependencyTaskHashers: Record<
  DependencyTask["type"],
  (dependencyPath: string | null) => Promise<string | null>
> = {
  listDirectory: hashDirectory,
  loadJSON: hashFile,
  loadModule: (dependencyPath) => hashModule(dependencyPath, new Set()),
  readTextFile: hashFile,
};

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

    // The remote cache manifest is the source of truth. Avoid a HEAD request
    // for every output here because restore will GET the same paths next.
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
  if (cacheSource.kind === "http" && cacheSource.archiveRestored) {
    return;
  }

  for (const outputPath of outputPaths) {
    if (shouldSkipCacheRestore(cacheSource, outputDirectory)) {
      continue;
    }

    await restoreCachedOutput(cacheSource, outputDirectory, outputPath);
  }
}

function shouldSkipCacheRestore(
  cacheSource: IncrementalBuildCacheSource,
  outputDirectory: string,
) {
  return (
    cacheSource.kind === "filesystem" &&
    path.resolve(cacheSource.rootDirectory) === path.resolve(outputDirectory)
  );
}

async function restoreCachedOutput(
  cacheSource: IncrementalBuildCacheSource,
  outputDirectory: string,
  outputPath: string,
) {
  const targetPath = path.join(outputDirectory, outputPath);

  await mkdir(path.dirname(targetPath), { recursive: true });

  if (cacheSource.kind === "filesystem") {
    await cp(path.join(cacheSource.rootDirectory, outputPath), targetPath, {
      force: true,
    });
    return;
  }

  await writeFile(targetPath, await fetchCachedOutput(cacheSource, outputPath));
}

function toRelativeOutputPath(outputDirectory: string, outputPath: string) {
  return path.relative(outputDirectory, outputPath);
}

async function writeIncrementalBuildCache(
  outputDirectory: string,
  routes: Record<string, IncrementalBuildRouteCacheEntry>,
) {
  const cachePath = path.join(outputDirectory, CACHE_MANIFEST_PATH);
  const archive = await writeIncrementalBuildCacheArchive(
    outputDirectory,
    getCachedOutputPaths(routes),
  );

  await mkdir(path.dirname(cachePath), { recursive: true });
  await writeFile(
    cachePath,
    JSON.stringify(
      {
        archive,
        routes,
        schemaVersion: CACHE_SCHEMA_VERSION,
      },
      null,
      2,
    ) + "\n",
  );
}

async function restoreIncrementalBuildCacheArchive(
  cache: IncrementalBuildCache,
  cacheSource: IncrementalBuildCacheSource,
  outputDirectory: string,
) {
  if (
    cacheSource.kind !== "http" ||
    cacheSource.archiveRestored ||
    !isSupportedCacheArchive(cache.archive)
  ) {
    return false;
  }

  try {
    const archive = await fetchCacheSourceFile(cacheSource, cache.archive.path);

    if (hashArchive(archive) !== cache.archive.hash) {
      return false;
    }

    await extractTarBrotliArchive(archive, outputDirectory);
    cacheSource.archiveRestored = true;

    return true;
  } catch {
    return false;
  }
}

async function writeIncrementalBuildCacheArchive(
  outputDirectory: string,
  outputPaths: string[],
): Promise<IncrementalBuildCacheArchive | undefined> {
  if (!outputPaths.length) {
    return;
  }

  const archivePath = path.join(outputDirectory, CACHE_ARCHIVE_PATH);
  const archive = await createTarBrotliArchive(outputDirectory, outputPaths);

  await mkdir(path.dirname(archivePath), { recursive: true });
  await writeFile(archivePath, archive);

  return {
    format: CACHE_ARCHIVE_FORMAT,
    hash: hashArchive(archive),
    path: CACHE_ARCHIVE_PATH,
  };
}

function getCachedOutputPaths(
  routes: Record<string, IncrementalBuildRouteCacheEntry>,
) {
  return [
    ...new Set(Object.values(routes).flatMap(({ outputPaths }) => outputPaths)),
  ].sort();
}

function isSupportedCacheArchive(
  archive: IncrementalBuildCache["archive"],
): archive is IncrementalBuildCacheArchive {
  return (
    archive?.format === CACHE_ARCHIVE_FORMAT &&
    typeof archive.hash === "string" &&
    archive.hash.startsWith("sha256-") &&
    typeof archive.path === "string" &&
    isSafeRelativeOutputPath(archive.path)
  );
}

function hashArchive(archive: Buffer) {
  return `sha256-${createHash("sha256").update(archive).digest("base64")}`;
}

async function createTarBrotliArchive(
  rootDirectory: string,
  outputPaths: string[],
) {
  const chunks: Buffer[] = [];

  for (const outputPath of outputPaths) {
    if (!isSafeRelativeOutputPath(outputPath)) {
      continue;
    }

    const data = await readFile(path.join(rootDirectory, outputPath));
    chunks.push(createTarFileHeader(outputPath, data.length));
    chunks.push(data);
    chunks.push(createTarPadding(data.length));
  }

  chunks.push(Buffer.alloc(TAR_BLOCK_SIZE * 2));

  return await brotliCompressAsync(Buffer.concat(chunks));
}

function createTarFileHeader(outputPath: string, size: number) {
  const header = Buffer.alloc(TAR_BLOCK_SIZE);
  const normalizedPath = toTarPath(outputPath);
  const { name, prefix } = splitTarPath(normalizedPath);

  writeTarString(header, name, 0, 100);
  writeTarOctal(header, 0o644, 100, 8);
  writeTarOctal(header, 0, 108, 8);
  writeTarOctal(header, 0, 116, 8);
  writeTarOctal(header, size, 124, 12);
  writeTarOctal(header, Math.floor(Date.now() / 1000), 136, 12);
  header.fill(0x20, 148, 156);
  writeTarString(header, TAR_TYPE_FILE, 156, 1);
  writeTarString(header, "ustar", 257, 6);
  writeTarString(header, "00", 263, 2);
  writeTarString(header, prefix, 345, 155);
  writeTarOctal(header, tarChecksum(header), 148, 8);

  return header;
}

function splitTarPath(outputPath: string) {
  if (Buffer.byteLength(outputPath) <= 100) {
    return { name: outputPath, prefix: "" };
  }

  for (let index = outputPath.lastIndexOf("/"); index > 0; index = outputPath.lastIndexOf("/", index - 1)) {
    const prefix = outputPath.slice(0, index);
    const name = outputPath.slice(index + 1);

    if (Buffer.byteLength(prefix) <= 155 && Buffer.byteLength(name) <= 100) {
      return { name, prefix };
    }
  }

  throw new Error(`Cached output path is too long for cache archive: ${outputPath}`);
}

function writeTarString(
  header: Buffer,
  value: string,
  offset: number,
  length: number,
) {
  header.write(value, offset, length, "utf8");
}

function writeTarOctal(
  header: Buffer,
  value: number,
  offset: number,
  length: number,
) {
  const octal = value.toString(8).padStart(length - 1, "0");
  header.write(octal.slice(-(length - 1)) + "\0", offset, length, "ascii");
}

function tarChecksum(header: Buffer) {
  return header.reduce((total, value) => total + value, 0);
}

function createTarPadding(size: number) {
  const padding = (TAR_BLOCK_SIZE - (size % TAR_BLOCK_SIZE)) % TAR_BLOCK_SIZE;

  return Buffer.alloc(padding);
}

async function extractTarBrotliArchive(archive: Buffer, outputDirectory: string) {
  const tar = await brotliDecompressAsync(archive);
  let offset = 0;

  while (offset + TAR_BLOCK_SIZE <= tar.length) {
    const header = tar.subarray(offset, offset + TAR_BLOCK_SIZE);

    if (isEmptyTarBlock(header)) {
      break;
    }

    const outputPath = readTarPath(header);
    const size = readTarOctal(header, 124, 12);
    const type = header.toString("utf8", 156, 157);
    const dataOffset = offset + TAR_BLOCK_SIZE;
    const nextOffset = dataOffset + size + createTarPadding(size).length;

    if (nextOffset > tar.length) {
      throw new Error("Cache archive entry extends past archive data");
    }

    if ((type === TAR_TYPE_FILE || type === "\0") && outputPath) {
      await extractTarFile(
        outputDirectory,
        outputPath,
        tar.subarray(dataOffset, dataOffset + size),
      );
    }

    offset = nextOffset;
  }
}

async function extractTarFile(
  outputDirectory: string,
  outputPath: string,
  data: Buffer,
) {
  if (!isSafeRelativeOutputPath(outputPath)) {
    throw new Error(`Unsafe path in cache archive: ${outputPath}`);
  }

  const targetPath = path.join(outputDirectory, outputPath);

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, data);
}

function isEmptyTarBlock(block: Buffer) {
  return block.every((value) => value === 0);
}

function readTarPath(header: Buffer) {
  const name = readTarString(header, 0, 100);
  const prefix = readTarString(header, 345, 155);

  return prefix ? `${prefix}/${name}` : name;
}

function readTarString(header: Buffer, offset: number, length: number) {
  const end = header.indexOf(0, offset);
  const valueEnd = end === -1 || end > offset + length ? offset + length : end;

  return header.toString("utf8", offset, valueEnd);
}

function readTarOctal(header: Buffer, offset: number, length: number) {
  const value = readTarString(header, offset, length).trim();

  return value ? Number.parseInt(value, 8) : 0;
}

function toTarPath(outputPath: string) {
  return outputPath.split(path.sep).join("/");
}

function isSafeRelativeOutputPath(outputPath: string) {
  const normalized = path.posix.normalize(toTarPath(outputPath));

  return (
    Boolean(outputPath) &&
    !path.posix.isAbsolute(normalized) &&
    normalized !== ".." &&
    !normalized.startsWith("../")
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

  if (isRootRelativePath(relativePath)) {
    return ".";
  }

  if (isOutsideRoot(relativePath)) {
    return absolutePath;
  }

  return relativePath;
}

function isRootRelativePath(relativePath: string) {
  return !relativePath || relativePath === ".";
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
  return resolveImportSpecifiers
    .find(({ matches }) => matches(specifier))
    ?.resolve(modulePath, specifier);
}

const resolveImportSpecifiers = [
  {
    matches: isRemotePath,
    resolve: () => null,
  },
  {
    matches: isFileUrl,
    resolve: (_modulePath: string, specifier: string) =>
      fileURLToPath(specifier),
  },
  {
    matches: path.isAbsolute,
    resolve: (_modulePath: string, specifier: string) => specifier,
  },
  {
    matches: isRelativePath,
    resolve: resolveRelativeModulePath,
  },
] satisfies {
  matches: (targetPath: string) => boolean;
  resolve: (modulePath: string, specifier: string) => string | null | undefined;
}[];

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
  restoreIncrementalBuildCacheArchive,
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
