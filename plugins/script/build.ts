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

  let builtEntryAssets: ScriptEntryAssets = {};

  if (localScripts.length > 0) {
    const persistentCacheKey = await getScriptAssetCacheKey(cwd, localScripts);
    const builtAssets = await buildClientAssets({
      cwd,
      entries: Object.fromEntries(
        localScripts.map(({ name, path: scriptPath }) => [
          normalizeScriptName(name),
          scriptPath,
        ]),
      ),
      outputDirectory,
      persistentCache: persistentCacheKey
        ? {
            key: persistentCacheKey,
            namespace: "scripts",
          }
        : undefined,
    });

    builtEntryAssets = builtAssets.entryAssets;
    setBuiltEntryAssets(builtEntryAssets);
  } else {
    setBuiltEntryAssets({});
  }

  const tasks = await Promise.all(
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

  if (localScripts.length > 0) {
    tasks.push({
      type: "writeTextFile",
      payload: {
        outputDirectory,
        file: SCRIPT_ASSETS_MANIFEST_PATH,
        data: `${JSON.stringify(builtEntryAssets, null, 2)}\n`,
      },
    });
  }

  return tasks;
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
