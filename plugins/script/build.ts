import { hashDependencyTasks } from "../../utilities/incrementalBuildCache.ts";
import * as path from "node:path";
import { compileTypeScript } from "../../utilities/compileTypeScript.ts";
import type { BuildWorkerEvent, Mode } from "../../types.ts";
import {
  buildClientAssets,
  createPersistentAssetCacheKey,
} from "../../utilities/vite.ts";
import {
  SCRIPT_ASSETS_MANIFEST_PATH,
  type ScriptEntryAssets,
  type ScriptPluginContext,
} from "./types.ts";

async function prepareScriptBuild({
  cwd,
  mode,
  outputDirectory,
  pluginContext,
  scriptAssets,
  setBuiltEntryAssets,
}: {
  cwd: string;
  mode: Mode;
  outputDirectory: string;
  pluginContext: ScriptPluginContext;
  scriptAssets?: ScriptEntryAssets;
  setBuiltEntryAssets(builtEntryAssets: ScriptEntryAssets): void;
}) {
  if (mode === "production" && scriptAssets) {
    setBuiltEntryAssets(normalizeScriptEntryAssets(scriptAssets));
    return [];
  }

  const resolvedScripts = resolveScriptInputs(pluginContext);

  if (mode === "production") {
    return buildProductionScripts({
      cwd,
      outputDirectory,
      scripts: resolvedScripts,
      setBuiltEntryAssets,
    });
  }

  return Promise.all(
    resolvedScripts
      .filter(({ path: scriptPath }) => isRemotePath(scriptPath))
      .map(({ name, path: scriptPath, externals }) =>
        writeScript({
          file: name.replace(".ts", ".js"),
          scriptPath,
          externals,
          mode,
          outputDirectory,
        }),
      ),
  );
}

function resolveScriptInputs(pluginContext: ScriptPluginContext) {
  const { foundScripts, receivedScripts } = pluginContext;
  const isDevelopingLocally = import.meta.url.startsWith("file:///");

  return foundScripts.concat(
    receivedScripts.map(({ name, localPath, remotePath, externals }) => ({
      name,
      path: isDevelopingLocally ? localPath : remotePath,
      externals,
    })),
  );
}

function normalizeScriptEntryAssets(scriptAssets: ScriptEntryAssets) {
  return Object.fromEntries(
    Object.entries(scriptAssets).map(([name, asset]) => [
      normalizeScriptName(name),
      {
        file: asset.file,
        css: asset.css || [],
      },
    ]),
  );
}

async function buildProductionScripts({
  cwd,
  outputDirectory,
  scripts,
  setBuiltEntryAssets,
}: {
  cwd: string;
  outputDirectory: string;
  scripts: { name: string; path: string; externals?: string[] }[];
  setBuiltEntryAssets(builtEntryAssets: ScriptEntryAssets): void;
}): Promise<BuildWorkerEvent[]> {
  const localScripts = scripts.filter(
    ({ path: scriptPath }) => !isRemotePath(scriptPath),
  );
  const remoteScripts = scripts.filter(({ path: scriptPath }) =>
    isRemotePath(scriptPath)
  );

  const builtEntryAssets = await buildLocalScriptAssets({
    cwd,
    localScripts,
    outputDirectory,
  });
  setBuiltEntryAssets(builtEntryAssets);

  const tasks = await writeRemoteScripts(remoteScripts, outputDirectory);
  tasks.push(...createScriptManifestTasks(builtEntryAssets, outputDirectory));

  return tasks;
}

async function buildLocalScriptAssets(
  {
    cwd,
    localScripts,
    outputDirectory,
  }: {
    cwd: string;
    localScripts: { name: string; path: string; externals?: string[] }[];
    outputDirectory: string;
  },
): Promise<ScriptEntryAssets> {
  if (localScripts.length === 0) {
    return {};
  }

  const persistentCacheKey = await getScriptAssetCacheKey(cwd, localScripts);
  const builtAssets = await buildClientAssets({
    cwd,
    entries: getScriptBuildEntries(localScripts),
    outputDirectory,
    persistentCache: persistentCacheKey
      ? {
          key: persistentCacheKey,
          namespace: "scripts",
        }
      : undefined,
  });

  return builtAssets.entryAssets;
}

function getScriptBuildEntries(
  scripts: { name: string; path: string; externals?: string[] }[],
) {
  return Object.fromEntries(
    scripts.map(({ name, path: scriptPath }) => [
      normalizeScriptName(name),
      scriptPath,
    ]),
  );
}

function writeRemoteScripts(
  remoteScripts: { name: string; path: string; externals?: string[] }[],
  outputDirectory: string,
) {
  return Promise.all(
    remoteScripts.map(({ name, path: scriptPath, externals }) =>
      writeScript({
        file: name.replace(".ts", ".js"),
        scriptPath,
        externals,
        mode: "production",
        outputDirectory,
      }),
    ),
  );
}

function createScriptManifestTasks(
  builtEntryAssets: ScriptEntryAssets,
  outputDirectory: string,
): BuildWorkerEvent[] {
  if (Object.keys(builtEntryAssets).length === 0) {
    return [];
  }

  return [{
    type: "writeTextFile",
    payload: {
      outputDirectory,
      file: SCRIPT_ASSETS_MANIFEST_PATH,
      data: `${JSON.stringify(builtEntryAssets, null, 2)}\n`,
    },
  }];
}

async function writeScript({
  file,
  scriptPath,
  externals,
  mode,
  outputDirectory,
}: {
  file: string;
  scriptPath: string;
  externals?: string[];
  mode: Mode;
  outputDirectory: string;
}): Promise<BuildWorkerEvent> {
  const data = isRemotePath(scriptPath)
    ? await fetch(scriptPath).then((res) => res.text())
    : await compileTypeScript(scriptPath, mode, externals);

  return {
    type: "writeTextFile",
    payload: {
      outputDirectory,
      file,
      data,
    },
  };
}

async function getScriptAssetCacheKey(
  cwd: string,
  localScripts: { name: string; path: string; externals?: string[] }[],
) {
  const dependencyFingerprint = await hashDependencyTasks(
    cwd,
    localScripts.map(({ path: scriptPath }) => ({
      type: "loadModule" as const,
      payload: {
        path: scriptPath,
        type: "foundScripts",
      },
    })),
  );

  if (!dependencyFingerprint) {
    return null;
  }

  return createPersistentAssetCacheKey({
    dependencyFingerprint,
    entries: localScripts
      .map(({ externals = [], name, path: scriptPath }) => ({
        externals: [...externals].sort(),
        name: normalizeScriptName(name),
        path: path.isAbsolute(scriptPath)
          ? path.relative(cwd, scriptPath)
          : scriptPath,
      }))
      .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    version: 1,
  });
}

function normalizeScriptName(name: string) {
  return name.endsWith(".ts") ? name.slice(0, -3) : name;
}

function isRemotePath(scriptPath: string) {
  return scriptPath.startsWith("http://") || scriptPath.startsWith("https://");
}

export { normalizeScriptName, prepareScriptBuild };
