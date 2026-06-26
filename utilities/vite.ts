import { createHash } from "node:crypto";
import * as path from "node:path";
import { readFile } from "node:fs/promises";
import {
  readPersistentAssetText,
  restorePersistentAssets,
  writePersistentAssets,
} from "./persistentAssetCache.ts";

type ClientAssetManifestChunk = {
  assets?: string[];
  file: string;
  css?: string[];
  dynamicImports?: string[];
  imports?: string[];
  isEntry?: boolean;
  name?: string;
  src?: string;
};

type ClientAssetBuildResult = {
  cacheHit: boolean;
  manifest: Record<string, ClientAssetManifestChunk>;
  entryAssets: Record<string, { file: string; css: string[] }>;
  entryFiles: Record<string, string>;
};
type ClientAssetPersistentCache = {
  key: string;
  namespace: string;
};
type ClientAssetBuildOptions = {
  cwd: string;
  outputDirectory: string;
  entries: Record<string, string>;
  base?: string;
  emptyOutDir?: boolean;
  minify?: boolean;
  sourcemap?: boolean;
  persistentCache?: ClientAssetPersistentCache;
};

async function buildClientAssets(
  options: ClientAssetBuildOptions,
): Promise<ClientAssetBuildResult> {
  const {
    cwd,
    outputDirectory,
    entries,
    base = "/",
    emptyOutDir = false,
    minify = true,
    sourcemap = false,
    persistentCache,
  } = options;
  const absoluteEntries = Object.fromEntries(
    Object.entries(entries).map(([name, filePath]) => [
      name,
      path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath),
    ]),
  );
  const manifestPath = path.join(".vite", "manifest.json");

  if (persistentCache) {
    const cachedBuild = await restoreCachedClientAssets({
      absoluteEntries,
      cwd,
      manifestPath,
      outputDirectory,
      persistentCache,
    });

    if (cachedBuild) {
      return cachedBuild;
    }
  }

  const manifest = await runViteClientBuild({
    absoluteEntries,
    base,
    root: cwd,
    emptyOutDir,
    minify,
    outputDirectory,
    sourcemap,
  });
  const entryAssets = getEntryAssets({ absoluteEntries, cwd, manifest });
  const entryFiles = getEntryFiles(entryAssets);

  if (persistentCache) {
    await writePersistentAssets(
      cwd,
      persistentCache.namespace,
      persistentCache.key,
      outputDirectory,
      collectManifestOutputPaths({ absoluteEntries, cwd, manifest }),
    );
  }

  return { cacheHit: false, manifest, entryAssets, entryFiles };
}

async function restoreCachedClientAssets(
  {
    absoluteEntries,
    cwd,
    manifestPath,
    outputDirectory,
    persistentCache,
  }: {
    absoluteEntries: Record<string, string>;
    cwd: string;
    manifestPath: string;
    outputDirectory: string;
    persistentCache: ClientAssetPersistentCache;
  },
): Promise<ClientAssetBuildResult | undefined> {
  const cachedManifest = await readCachedManifest({
    cacheKey: persistentCache.key,
    cwd,
    manifestPath,
    namespace: persistentCache.namespace,
  });

  if (!cachedManifest) {
    return;
  }

  const relativePaths = collectManifestOutputPaths({
    absoluteEntries,
    cwd,
    manifest: cachedManifest,
  });

  if (
    !await restorePersistentAssets(
      cwd,
      persistentCache.namespace,
      persistentCache.key,
      outputDirectory,
      relativePaths,
    )
  ) {
    return;
  }

  const entryAssets = getEntryAssets({
    absoluteEntries,
    cwd,
    manifest: cachedManifest,
  });

  return {
    cacheHit: true,
    manifest: cachedManifest,
    entryAssets,
    entryFiles: getEntryFiles(entryAssets),
  };
}

async function runViteClientBuild(
  {
    absoluteEntries,
    base,
    emptyOutDir,
    minify,
    outputDirectory,
    root,
    sourcemap,
  }: {
    absoluteEntries: Record<string, string>;
    base: string;
    emptyOutDir: boolean;
    minify: boolean;
    outputDirectory: string;
    root: string;
    sourcemap: boolean;
  },
) {
  const { build: viteBuild } = await import("vite");

  await viteBuild({
    appType: "custom",
    base,
    configFile: false,
    publicDir: false,
    root,
    build: {
      emptyOutDir,
      manifest: true,
      minify,
      outDir: outputDirectory,
      rollupOptions: {
        input: absoluteEntries,
      },
      sourcemap,
      target: "esnext",
    },
  });

  return JSON.parse(
    await readFile(
      path.join(outputDirectory, ".vite", "manifest.json"),
      "utf8",
    ),
  ) as Record<string, ClientAssetManifestChunk>;
}

function getEntryAssets(
  {
    absoluteEntries,
    cwd,
    manifest,
  }: {
    absoluteEntries: Record<string, string>;
    cwd: string;
    manifest: Record<string, ClientAssetManifestChunk>;
  },
) {
  return Object.fromEntries(
    Object.entries(absoluteEntries).map(([name, filePath]) => [
      name,
      getEntryAsset({
        cwd,
        filePath,
        manifest,
      }),
    ]),
  );
}

function getEntryFiles(entryAssets: ClientAssetBuildResult["entryAssets"]) {
  return Object.fromEntries(
    Object.entries(entryAssets).map(([name, asset]) => [name, asset.file]),
  );
}

function getEntryAsset(
  {
    cwd,
    filePath,
    manifest,
  }: {
    cwd: string;
    filePath: string;
    manifest: Record<string, ClientAssetManifestChunk>;
  },
) {
  const chunk = findEntryChunk({ cwd, filePath, manifest });
  const relativePath = normalizeManifestPath(path.relative(cwd, filePath));

  if (!chunk) {
    throw new Error(
      `Failed to find Vite manifest entry for ${relativePath} (${
        normalizeManifestPath(filePath)
      })`,
    );
  }

  return {
    file: `/${normalizeManifestPath(chunk.file)}`,
    css: (chunk.css || []).map((assetPath) =>
      `/${normalizeManifestPath(assetPath)}`
    ),
  };
}

function collectManifestOutputPaths(
  {
    absoluteEntries,
    cwd,
    manifest,
  }: {
    absoluteEntries: Record<string, string>;
    cwd: string;
    manifest: Record<string, ClientAssetManifestChunk>;
  },
) {
  const collectedPaths = new Set<string>([path.join(".vite", "manifest.json")]);
  const visitedKeys = new Set<string>();

  for (const filePath of Object.values(absoluteEntries)) {
    const chunkKey = findEntryChunkKey({ cwd, filePath, manifest });

    if (chunkKey) {
      collectChunkOutputs(manifest, chunkKey, collectedPaths, visitedKeys);
    }
  }

  return [...collectedPaths].sort();
}

function collectChunkOutputs(
  manifest: Record<string, ClientAssetManifestChunk>,
  chunkKey: string,
  collectedPaths: Set<string>,
  visitedKeys: Set<string>,
) {
  if (visitedKeys.has(chunkKey)) {
    return;
  }

  visitedKeys.add(chunkKey);

  const chunk = manifest[chunkKey];

  if (!chunk) {
    return;
  }

  collectedPaths.add(normalizeManifestPath(chunk.file));
  chunk.css?.forEach((assetPath) =>
    collectedPaths.add(normalizeManifestPath(assetPath))
  );
  chunk.assets?.forEach((assetPath) =>
    collectedPaths.add(normalizeManifestPath(assetPath))
  );
  chunk.imports?.forEach((importKey) =>
    collectChunkOutputs(manifest, importKey, collectedPaths, visitedKeys)
  );
  chunk.dynamicImports?.forEach((importKey) =>
    collectChunkOutputs(manifest, importKey, collectedPaths, visitedKeys)
  );
}

function findEntryChunk(
  {
    cwd,
    filePath,
    manifest,
  }: {
    cwd: string;
    filePath: string;
    manifest: Record<string, ClientAssetManifestChunk>;
  },
) {
  const chunkKey = findEntryChunkKey({ cwd, filePath, manifest });

  return chunkKey ? manifest[chunkKey] : undefined;
}

function findEntryChunkKey(
  {
    cwd,
    filePath,
    manifest,
  }: {
    cwd: string;
    filePath: string;
    manifest: Record<string, ClientAssetManifestChunk>;
  },
) {
  const normalizedAbsolutePath = normalizeManifestPath(filePath);
  const relativePath = normalizeManifestPath(path.relative(cwd, filePath));

  if (manifest[normalizedAbsolutePath]) {
    return normalizedAbsolutePath;
  }

  if (manifest[relativePath]) {
    return relativePath;
  }

  return Object.entries(manifest).find(([, { src, isEntry }]) =>
    typeof src === "string" &&
    isEntry &&
    (
      src === normalizedAbsolutePath ||
      src === relativePath ||
      src.endsWith(`/${relativePath}`)
    )
  )?.[0];
}

async function readCachedManifest(
  {
    cacheKey,
    cwd,
    manifestPath,
    namespace,
  }: {
    cacheKey: string;
    cwd: string;
    manifestPath: string;
    namespace: string;
  },
) {
  try {
    return JSON.parse(
      await readPersistentAssetText(cwd, namespace, cacheKey, manifestPath),
    ) as Record<string, ClientAssetManifestChunk>;
  } catch {
    return;
  }
}

function normalizeManifestPath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

function createPersistentAssetCacheKey(input: unknown) {
  return createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex");
}

export type { ClientAssetBuildResult, ClientAssetManifestChunk };
export { buildClientAssets, createPersistentAssetCacheKey };
