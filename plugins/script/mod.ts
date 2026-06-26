import { hashDependencyTasks } from "../../utilities/incrementalBuildCache.ts";
import * as path from "node:path";
import {
  compileTypeScript,
  stopEsbuild,
} from "../../utilities/compileTypeScript.ts";
import type {
  BuildWorkerEvent,
  Mode,
  Plugin,
  PluginApi,
  Route,
  Scripts,
  Send,
} from "../../types.ts";
import { isDebugEnabled } from "../../utilities/runtime.ts";
import {
  buildClientAssets,
  createPersistentAssetCacheKey,
} from "../../utilities/vite.ts";

const DEBUG = isDebugEnabled();
const SCRIPT_ASSETS_MANIFEST_PATH = ".gustwind/script-assets.json";

const plugin: Plugin<
  {
    scripts?: Scripts;
    scriptAssets?: ScriptEntryAssets;
    // TODO: Model scripts output path here
    scriptsPath?: string[];
  },
  {
    foundScripts: FoundScript[];
    receivedScripts: {
      isExternal?: boolean;
      name: string;
      localPath: string;
      remotePath: string;
      externals?: string[];
    }[];
    receivedGlobalScripts: { type: string; src: string }[];
  }
> = {
  meta: {
    name: "gustwind-script-plugin",
    description:
      "${name} implements client-side scripting and exposes hooks for adding scripts to write to the site.",
  },
  init({
    cwd,
    load,
    mode,
    options: { scripts: globalScripts = [], scriptAssets, scriptsPath = [] },
    outputDirectory,
  }) {
    let builtEntryAssets: ScriptEntryAssets = {};

    return {
      initPluginContext: async () => {
        const foundScripts = await loadScripts();

        return { foundScripts, receivedScripts: [], receivedGlobalScripts: [] };
      },
      prepareBuild: ({ pluginContext }) => {
        return prepareScriptBuild({
          cwd,
          mode,
          outputDirectory,
          pluginContext,
          scriptAssets,
          setBuiltEntryAssets(nextBuiltEntryAssets) {
            builtEntryAssets = nextBuiltEntryAssets;
          },
        });
      },
      prepareContext({ route, pluginContext, send }) {
        return prepareScriptContext({
          builtEntryAssets,
          cwd,
          globalScripts,
          mode,
          pluginContext,
          routeScripts: route.scripts || [],
          send,
        });
      },
      onMessage: async ({ message, pluginContext, send }) => {
        return await handleScriptMessage({
          loadScripts,
          message,
          pluginContext,
          send,
        });
      },
      cleanUp: stopEsbuild,
    };

    async function loadScripts(): Promise<
      {
        name: string;
        path: string;
        externals?: string[];
      }[]
    > {
      if (scriptAssets) {
        return Object.keys(scriptAssets).map((name) => ({
          name: `${normalizeScriptName(name)}.ts`,
          path: "",
        }));
      }

      return (
        await Promise.all(
          scriptsPath.map((p) =>
            load.dir({
              path: path.join(cwd, p),
              extension: ".ts",
              type: "foundScripts",
            }),
          ),
        )
      ).flat();
    }
  },
};

type ScriptEntryAsset = { file: string; css?: string[] };
type ScriptEntryAssets = Record<string, ScriptEntryAsset>;
type FoundScript = { name: string; path: string; externals?: string[] };
type ScriptPluginContext = {
  foundScripts: FoundScript[];
  receivedScripts: {
    isExternal?: boolean;
    name: string;
    localPath: string;
    remotePath: string;
    externals?: string[];
  }[];
  receivedGlobalScripts: { type: string; src: string }[];
};
type RouteScripts = NonNullable<Route["scripts"]>;
type ScriptContextInput = {
  name: string;
  src?: string;
  srcPrefix?: string;
  [key: string]: unknown;
};

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
      mode,
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

function prepareScriptContext({
  builtEntryAssets,
  cwd,
  globalScripts,
  mode,
  pluginContext,
  routeScripts,
  send,
}: {
  builtEntryAssets: ScriptEntryAssets;
  cwd: string;
  globalScripts: Scripts;
  mode: Mode;
  pluginContext: ScriptPluginContext;
  routeScripts: RouteScripts;
  send: Send;
}) {
  const scripts = collectContextScripts({
    builtEntryAssets,
    cwd,
    mode,
    pluginContext,
    routeScripts,
  });
  const scriptTags = scripts.map(({ name, src, srcPrefix, ...rest }) => ({
    type: "module",
    ...rest,
    src: src || (srcPrefix || "/") + name.replace(".ts", ".js"),
  }));
  const styles = getScriptStyles(scripts, builtEntryAssets);

  registerDynamicScriptRoutes(scripts, send);

  // TODO: Add uniqueness check for global scripts to avoid injecting the same script multiple times
  // Global scripts don't need processing since they are in the right format already
  return {
    context: {
      styles,
      scripts: globalScripts
        .concat(pluginContext.receivedGlobalScripts)
        .concat(scriptTags),
    },
  };
}

function collectContextScripts({
  builtEntryAssets,
  cwd,
  mode,
  pluginContext,
  routeScripts,
}: {
  builtEntryAssets: ScriptEntryAssets;
  cwd: string;
  mode: Mode;
  pluginContext: ScriptPluginContext;
  routeScripts: RouteScripts;
}): ScriptContextInput[] {
  const { foundScripts, receivedScripts } = pluginContext;
  const routeScriptNames = routeScripts.map(({ name }) => name);
  const foundScriptNames = foundScripts.map(({ name }) => name);
  const foundScriptPaths = Object.fromEntries(
    foundScripts.map(({ name, path }) => [name, path]),
  );

  if (
    !routeScriptNames.every((name) => foundScriptNames.includes(`${name}.ts`))
  ) {
    console.error(foundScriptNames, routeScriptNames);
    throw new Error("Route script is missing from the scripts directory");
  }

  return receivedScripts
    .filter(({ isExternal }) => !isExternal)
    .map(({ name, localPath, remotePath }) => ({
      name,
      src:
        mode === "production"
          ? builtEntryAssets[normalizeScriptName(name)]?.file
          : getDevScriptPath(
              import.meta.url.startsWith("file:///") ? localPath : remotePath,
              cwd,
            ),
    }))
    .concat(
      routeScripts.map(({ name, ...rest }) => ({
        name: `${name}.ts`,
        src:
          mode === "production"
            ? builtEntryAssets[name]?.file
            : getDevScriptPath(foundScriptPaths[`${name}.ts`], cwd),
        ...rest,
      })),
    );
}

function getScriptStyles(
  scripts: ScriptContextInput[],
  builtEntryAssets: ScriptEntryAssets,
) {
  return Array.from(
    new Set(
      scripts.flatMap(
        ({ name }) => builtEntryAssets[normalizeScriptName(name)]?.css || [],
      ),
    ),
  ).map((href) => ({ href, rel: "stylesheet" }));
}

function registerDynamicScriptRoutes(
  scripts: ScriptContextInput[],
  send: Send,
) {
  scripts.forEach(({ name, src }) => {
    if (src) {
      return;
    }

    send("*", {
      type: "addDynamicRoute",
      payload: { path: name.replace(".ts", ".js") },
    });
  });
}

async function handleScriptMessage({
  loadScripts,
  message,
  pluginContext,
  send,
}: {
  loadScripts(): Promise<FoundScript[]>;
  message: Parameters<
    NonNullable<PluginApi<ScriptPluginContext>["onMessage"]>
  >[0]["message"];
  pluginContext: ScriptPluginContext;
  send: Send;
}) {
  const { type, payload } = message;

  if (type === "fileChanged") {
    if (payload.type === "foundScripts") {
      const foundScripts = await loadScripts();

      // TODO: Make this more refined by sending a replaceScript event
      // and the script that changed so that it can be replaced as
      // that avoids a full page reload.
      return {
        send: [{ type: "reloadPage" as const, payload: undefined }],
        pluginContext: { foundScripts },
      };
    }
  }

  if (type === "addGlobalScripts") {
    payload.forEach(({ src: path }) =>
      // TODO: Scope to router- instead
      send("*", { type: "addDynamicRoute", payload: { path } }),
    );

    return {
      pluginContext: {
        receivedGlobalScripts:
          pluginContext.receivedGlobalScripts.concat(payload),
      },
    };
  }

  if (type === "addScripts") {
    payload.forEach(({ name: path }) =>
      // TODO: Scope to router- instead
      send("*", { type: "addDynamicRoute", payload: { path } }),
    );

    return {
      pluginContext: {
        receivedScripts: pluginContext.receivedScripts.concat(payload),
      },
    };
  }
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
  mode: Mode;
  outputDirectory: string;
  scripts: { name: string; path: string; externals?: string[] }[];
  setBuiltEntryAssets(builtEntryAssets: ScriptEntryAssets): void;
}): Promise<BuildWorkerEvent[]> {
  const localScripts = scripts.filter(
    ({ path: scriptPath }) =>
      !scriptPath.startsWith("http://") && !scriptPath.startsWith("https://"),
  );
  const remoteScripts = scripts.filter(
    ({ path: scriptPath }) =>
      scriptPath.startsWith("http://") || scriptPath.startsWith("https://"),
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

function normalizeScriptName(name: string) {
  return name.endsWith(".ts") ? name.slice(0, -3) : name;
}

function isRemotePath(scriptPath: string) {
  return scriptPath.startsWith("http://") || scriptPath.startsWith("https://");
}

function getDevScriptPath(scriptPath: string | undefined, cwd: string) {
  if (!scriptPath) {
    return undefined;
  }

  if (isRemotePath(scriptPath)) {
    return undefined;
  }

  if (path.isAbsolute(scriptPath)) {
    return getAbsoluteDevScriptPath(scriptPath, cwd);
  }

  const normalizedPath = scriptPath.startsWith("./")
    ? scriptPath.slice(2)
    : scriptPath;

  return `/${normalizedPath.split(path.sep).join("/")}`;
}

function getAbsoluteDevScriptPath(scriptPath: string, cwd: string) {
  const relativePath = path.relative(cwd, scriptPath);

  return isProjectRelativePath(relativePath)
    ? toDevRoutePath(relativePath)
    : `/@fs/${toBrowserPath(scriptPath)}`;
}

function isProjectRelativePath(relativePath: string) {
  return !relativePath.startsWith("..");
}

function toDevRoutePath(scriptPath: string) {
  return `/${toBrowserPath(scriptPath)}`;
}

function toBrowserPath(scriptPath: string) {
  return scriptPath.split(path.sep).join("/");
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
  DEBUG &&
    console.log(
      "worker - writing script",
      scriptPath,
      path.join(outputDirectory, file),
    );

  const data = scriptPath.startsWith("http")
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

export { plugin, SCRIPT_ASSETS_MANIFEST_PATH };
export type { ScriptEntryAsset, ScriptEntryAssets };
