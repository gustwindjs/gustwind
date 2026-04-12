import * as path from "node:path";
import { readFile } from "node:fs/promises";
import { build as viteBuild } from "vite";

type ClientAssetManifestChunk = {
  file: string;
  src?: string;
  name?: string;
  isEntry?: boolean;
  css?: string[];
  assets?: string[];
  imports?: string[];
  dynamicImports?: string[];
};

type ClientAssetBuildResult = {
  manifest: Record<string, ClientAssetManifestChunk>;
  entryFiles: Record<string, string>;
};

async function buildClientAssets(
  {
    cwd,
    outputDirectory,
    entries,
    base = "/",
    emptyOutDir = false,
    minify = true,
    sourcemap = false,
  }: {
    cwd: string;
    outputDirectory: string;
    entries: Record<string, string>;
    base?: string;
    emptyOutDir?: boolean;
    minify?: boolean;
    sourcemap?: boolean;
  },
): Promise<ClientAssetBuildResult> {
  const absoluteEntries = Object.fromEntries(
    Object.entries(entries).map(([name, filePath]) => [
      name,
      path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath),
    ]),
  );

  await viteBuild({
    appType: "custom",
    base,
    configFile: false,
    publicDir: false,
    root: cwd,
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

  const manifest = JSON.parse(
    await readFile(path.join(outputDirectory, ".vite", "manifest.json"), "utf8"),
  ) as Record<string, ClientAssetManifestChunk>;
  const entryFiles = Object.fromEntries(
    Object.entries(absoluteEntries).map(([name, filePath]) => [
      name,
      getEntryFile({
        cwd,
        filePath,
        manifest,
      }),
    ]),
  );

  return { manifest, entryFiles };
}

function getEntryFile(
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
  const chunk = manifest[normalizedAbsolutePath] || manifest[relativePath] ||
    Object.values(manifest).find(({ src, isEntry }) =>
      Boolean(src) &&
      isEntry &&
      (
        src === normalizedAbsolutePath ||
        src === relativePath ||
        src.endsWith(`/${relativePath}`)
      )
    );

  if (!chunk) {
    throw new Error(
      `Failed to find Vite manifest entry for ${relativePath} (${normalizedAbsolutePath})`,
    );
  }

  return `/${normalizeManifestPath(chunk.file)}`;
}

function normalizeManifestPath(filePath: string) {
  return filePath.split(path.sep).join("/");
}

export type { ClientAssetBuildResult, ClientAssetManifestChunk };
export { buildClientAssets };
