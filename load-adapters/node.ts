import { Buffer } from "node:buffer";
import { readdir, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import * as path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import type { LoadApi, PluginParameters, Tasks } from "../types.ts";
import { getEsbuild, stopEsbuild } from "../utilities/esbuild.ts";

function initLoadApi(tasks: Tasks): LoadApi {
  return {
    async dir({ path: directoryPath, extension, recursive, type }) {
      tasks.push({
        type: "listDirectory",
        payload: { path: directoryPath, type },
      });

      return await dir({
        path: directoryPath,
        extension,
        recursive,
      });
    },
    async json<T>(payload: Parameters<PluginParameters["load"]["json"]>[0]) {
      tasks.push({ type: "loadJSON", payload });

      return JSON.parse(await readTextFile(payload.path)) as T;
    },
    async module<T>(payload: Parameters<PluginParameters["load"]["module"]>[0]) {
      tasks.push({ type: "loadModule", payload });

      return await importModule<T>(payload.path);
    },
    async textFile(filePath: string) {
      tasks.push({
        type: "readTextFile",
        payload: { path: filePath, type: "" },
      });

      return await readTextFile(filePath);
    },
    textFileSync(filePath: string) {
      tasks.push({
        type: "readTextFile",
        payload: { path: filePath, type: "" },
      });

      return readFileSync(filePath, "utf8");
    },
  };
}

async function dir(
  { path: directoryPath, extension, recursive }: {
    path: string;
    extension?: string;
    recursive?: boolean;
  },
) {
  const entries = await collectFiles(directoryPath, recursive ?? false);

  return entries.filter(({ path: filePath }) =>
    extension ? filePath.endsWith(extension) : true
  ).map((entry) => ({
    ...entry,
    name: path.relative(directoryPath, entry.path),
  }));
}

async function collectFiles(directoryPath: string, recursive: boolean) {
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const files: { path: string; name: string }[] = [];

  for (const entry of entries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isFile()) {
      files.push({ path: entryPath, name: entry.name });
      continue;
    }

    if (recursive && entry.isDirectory()) {
      files.push(...await collectFiles(entryPath, recursive));
    }
  }

  return files;
}

async function readTextFile(filePath: string) {
  return await readFile(filePath, "utf8");
}

async function importModule<T>(modulePath: string) {
  if (await shouldBundleModule(modulePath)) {
    const bundledSource = await bundleModule(modulePath);
    const importPath = `data:text/javascript;base64,${
      Buffer.from(`// cache-bust:${Date.now()}\n${bundledSource}`).toString(
        "base64",
      )
    }`;

    return await import(importPath) as T;
  }

  return await import(getImportPath(modulePath)) as T;
}

async function shouldBundleModule(modulePath: string) {
  if (modulePath.startsWith("http://") || modulePath.startsWith("https://")) {
    return true;
  }

  const normalizedPath = getLocalModulePath(modulePath);

  if (!normalizedPath) {
    return false;
  }

  return await hasRemoteModuleDependencies(normalizedPath, new Set());
}

async function bundleModule(modulePath: string) {
  const esbuild = await getEsbuild();
  const entryPoint = normalizeEntryPoint(modulePath);
  const result = await esbuild.build({
    absWorkingDir: path.isAbsolute(entryPoint)
      ? path.dirname(entryPoint)
      : undefined,
    entryPoints: [entryPoint],
    bundle: true,
    format: "esm",
    logLevel: "silent",
    packages: "external",
    platform: "node",
    target: ["node24"],
    write: false,
    plugins: [httpImportPlugin()],
  });

  const output = result.outputFiles?.[0]?.text;

  if (!output) {
    throw new Error(`Failed to bundle module ${modulePath}`);
  }

  return output;
}

function normalizeEntryPoint(modulePath: string) {
  if (modulePath.startsWith("file:")) {
    return fileURLToPath(modulePath);
  }

  if (modulePath.startsWith("./") || modulePath.startsWith("../")) {
    return path.resolve(modulePath);
  }

  return modulePath;
}

async function stopModuleBundler() {
  await stopEsbuild();
}

function httpImportPlugin() {
  return {
    name: "gustwind-http-imports",
    setup(build: {
      onResolve(
        options: { filter: RegExp; namespace?: string },
        callback: (args: { path: string; importer: string }) =>
          | { external?: boolean; namespace?: string; path: string }
          | Promise<{ external?: boolean; namespace?: string; path: string }>,
      ): void;
      onLoad(
        options: { filter: RegExp; namespace: string },
        callback: (args: { path: string }) =>
          | { contents: string; loader: string }
          | Promise<{ contents: string; loader: string }>,
      ): void;
    }) {
      build.onResolve(
        { filter: /^(node:|data:)/ },
        (args) => ({ path: args.path, external: true }),
      );
      build.onResolve(
        { filter: /^https?:\/\// },
        (args) => ({ path: args.path, namespace: "http-url" }),
      );
      build.onResolve(
        { filter: /.*/, namespace: "http-url" },
        (args) => ({
          path: new URL(args.path, args.importer).href,
          namespace: "http-url",
        }),
      );
      build.onLoad(
        { filter: /.*/, namespace: "http-url" },
        async (args) => {
          const response = await fetch(args.path);

          if (!response.ok) {
            throw new Error(
              `Failed to load remote module ${args.path}: ${response.status} ${response.statusText}`,
            );
          }

          return {
            contents: await response.text(),
            loader: getLoader(
              args.path,
              response.headers.get("content-type") || "",
            ),
          };
        },
      );
    },
  };
}

async function hasRemoteModuleDependencies(
  modulePath: string,
  visitedPaths: Set<string>,
): Promise<boolean> {
  if (visitedPaths.has(modulePath)) {
    return false;
  }

  visitedPaths.add(modulePath);

  const source = await readTextFile(modulePath);
  const importSpecifiers = getImportSpecifiers(source);

  for (const specifier of importSpecifiers) {
    if (specifier.startsWith("http://") || specifier.startsWith("https://")) {
      return true;
    }

    if (
      specifier.startsWith("./") || specifier.startsWith("../") ||
      specifier.startsWith("/") || specifier.startsWith("file:")
    ) {
      const dependencyPath = resolveDependencyPath(modulePath, specifier);

      if (dependencyPath && await hasRemoteModuleDependencies(
        dependencyPath,
        visitedPaths,
      )) {
        return true;
      }
    }
  }

  return false;
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

function resolveDependencyPath(modulePath: string, specifier: string) {
  if (specifier.startsWith("file:")) {
    return fileURLToPath(specifier);
  }

  if (specifier.startsWith("/")) {
    return specifier;
  }

  const resolvedPath = path.resolve(path.dirname(modulePath), specifier);

  return path.extname(resolvedPath) ? resolvedPath : undefined;
}

function getLocalModulePath(modulePath: string) {
  if (modulePath.startsWith("file:")) {
    return fileURLToPath(modulePath);
  }

  if (
    modulePath.startsWith("/") || modulePath.startsWith("./") ||
    modulePath.startsWith("../")
  ) {
    return path.resolve(modulePath);
  }

  return undefined;
}

function getImportPath(modulePath: string) {
  if (
    modulePath.startsWith("http://") || modulePath.startsWith("https://") ||
    modulePath.startsWith("node:") || modulePath.startsWith("data:")
  ) {
    return modulePath;
  }

  const localModulePath = getLocalModulePath(modulePath);

  if (!localModulePath) {
    return modulePath;
  }

  return `${pathToFileURL(localModulePath).href}?cache=${Date.now()}`;
}

function getLoader(modulePath: string, contentType = "") {
  if (contentType.includes("json")) {
    return "json";
  }

  if (contentType.includes("typescript")) {
    return "ts";
  }

  const extension = path.extname(
    modulePath.startsWith("http") ? new URL(modulePath).pathname : modulePath,
  );

  switch (extension) {
    case ".tsx":
      return "tsx";
    case ".jsx":
      return "jsx";
    case ".json":
      return "json";
    case ".mts":
    case ".cts":
    case ".ts":
      return "ts";
    default:
      return "js";
  }
}

export { initLoadApi, stopModuleBundler };
