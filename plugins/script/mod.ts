import { hashDependencyTasks } from "../../utilities/incrementalBuildCache.ts";
import * as path from "node:path";
import {
  compileTypeScript,
  stopEsbuild,
} from "../../utilities/compileTypeScript.ts";
import type { BuildWorkerEvent, Mode, Plugin, Scripts } from "../../types.ts";
import { isDebugEnabled } from "../../utilities/runtime.ts";
import {
  buildClientAssets,
  createPersistentAssetCacheKey,
} from "../../utilities/vite.ts";

const DEBUG = isDebugEnabled();

const plugin: Plugin<{
  scripts: Scripts;
  // TODO: Model scripts output path here
  scriptsPath: string[];
}, {
  foundScripts: { name: string; path: string; externals?: string[] }[];
  receivedScripts: {
    isExternal?: boolean;
    name: string;
    localPath: string;
    remotePath: string;
    externals?: string[];
  }[];
  receivedGlobalScripts: { type: string; src: string }[];
}> = {
  meta: {
    name: "gustwind-script-plugin",
    description:
      "${name} implements client-side scripting and exposes hooks for adding scripts to write to the site.",
  },
  init({
    cwd,
    load,
    mode,
    options: { scripts: globalScripts = [], scriptsPath },
    outputDirectory,
  }) {
    let builtEntryAssets: Record<string, { file: string; css: string[] }> = {};

    return {
      initPluginContext: async () => {
        const foundScripts = await loadScripts();

        return { foundScripts, receivedScripts: [], receivedGlobalScripts: [] };
      },
      prepareBuild: ({ pluginContext }) => {
        const { foundScripts, receivedScripts } = pluginContext;
        const isDevelopingLocally = import.meta.url.startsWith("file:///");
        const resolvedScripts = foundScripts.concat(
          receivedScripts.map((
            { name, localPath, remotePath, externals },
          ) => ({
            name,
            path: isDevelopingLocally ? localPath : remotePath,
            externals,
          })),
        );

        if (mode === "production") {
          return buildProductionScripts({
            cwd,
            mode,
            outputDirectory,
            scripts: resolvedScripts,
            setBuiltEntryAssets(nextBuiltEntryAssets) {
              builtEntryAssets = nextBuiltEntryAssets;
            },
          });
        }

        return Promise.all(
          resolvedScripts.filter(({ path: scriptPath }) =>
            scriptPath.startsWith("http://") || scriptPath.startsWith("https://")
          ).map((
            { name, path: scriptPath, externals },
          ) =>
            writeScript({
              file: name.replace(".ts", ".js"),
              scriptPath,
              externals,
              mode,
              outputDirectory,
            })
          ),
        );
      },
      prepareContext({ route, pluginContext, send }) {
        const { foundScripts, receivedScripts, receivedGlobalScripts } =
          pluginContext;
        const routeScripts = route.scripts || [];
        const routeScriptNames = routeScripts.map(({ name }) => name);
        const foundScriptNames = foundScripts.map(({ name }) => name);
        const foundScriptPaths = Object.fromEntries(
          foundScripts.map(({ name, path }) => [name, path]),
        );

        if (
          !routeScriptNames.every((name) =>
            foundScriptNames.includes(`${name}.ts`)
          )
        ) {
          console.error(foundScriptNames, routeScriptNames);
          throw new Error("Route script is missing from the scripts directory");
        }

        const scripts: { name: string; src?: string; srcPrefix?: string }[] =
          (receivedScripts.filter(({ isExternal }) => !isExternal)).map((
            { name, localPath, remotePath },
          ) => ({
            name,
            src: mode === "production"
              ? builtEntryAssets[normalizeScriptName(name)]?.file
              : getDevScriptPath(
                import.meta.url.startsWith("file:///") ? localPath : remotePath,
                cwd,
              ),
          })).concat(
            routeScripts.map(({ name, ...rest }) => ({
              name: `${name}.ts`,
              src: mode === "production"
                ? builtEntryAssets[name]?.file
                : getDevScriptPath(foundScriptPaths[`${name}.ts`], cwd),
              ...rest,
            })),
          );
        const scriptTags = scripts.map(({ name, src, srcPrefix, ...rest }) => ({
          type: "module",
          ...rest,
          src: src || (srcPrefix || "/") + name.replace(".ts", ".js"),
        }));
        const styles = Array.from(
          new Set(
            scripts.flatMap(({ name }) => builtEntryAssets[normalizeScriptName(name)]?.css || []),
          ),
        ).map((href) => ({ href, rel: "stylesheet" }));

        scripts.forEach(({ name, src }) => {
          if (src) {
            return;
          }

          send("*", {
            type: "addDynamicRoute",
            payload: { path: name.replace(".ts", ".js") },
          });
        });

        // TODO: Add uniqueness check for global scripts to avoid injecting the same script multiple times
        // Global scripts don't need processing since they are in the right format already
        return {
          context: {
            styles,
            scripts: globalScripts.concat(receivedGlobalScripts).concat(
              scriptTags,
            ),
          },
        };
      },
      onMessage: async ({ message, pluginContext, send }) => {
        const { type, payload } = message;

        if (type === "fileChanged") {
          if (payload.type === "foundScripts") {
            const foundScripts = await loadScripts();

            // TODO: Make this more refined by sending a replaceScript event
            // and the script that changed so that it can be replaced as
            // that avoids a full page reload.
            return {
              send: [{ type: "reloadPage", payload: undefined }],
              pluginContext: { foundScripts },
            };
          }
        }

        if (type === "addGlobalScripts") {
          payload.forEach(({ src: path }) =>
            // TODO: Scope to router- instead
            send("*", { type: "addDynamicRoute", payload: { path } })
          );

          return {
            pluginContext: {
              receivedGlobalScripts: pluginContext.receivedGlobalScripts.concat(
                payload,
              ),
            },
          };
        }

        if (type === "addScripts") {
          payload.forEach(({ name: path }) =>
            // TODO: Scope to router- instead
            send("*", { type: "addDynamicRoute", payload: { path } })
          );

          return {
            pluginContext: {
              receivedScripts: pluginContext.receivedScripts.concat(payload),
            },
          };
        }
      },
      cleanUp: stopEsbuild,
    };

    async function loadScripts(): Promise<{
      name: string;
      path: string;
      externals?: string[];
    }[]> {
      return (await Promise.all(
        scriptsPath.map((p) =>
          load.dir({
            path: path.join(cwd, p),
            extension: ".ts",
            type: "foundScripts",
          })
        ),
      )).flat();
    }
  },
};

async function buildProductionScripts(
  {
    cwd,
    outputDirectory,
    scripts,
    setBuiltEntryAssets,
  }: {
    cwd: string;
    mode: Mode;
    outputDirectory: string;
    scripts: { name: string; path: string; externals?: string[] }[];
    setBuiltEntryAssets(
      builtEntryAssets: Record<string, { file: string; css: string[] }>,
    ): void;
  },
): Promise<BuildWorkerEvent[]> {
  const localScripts = scripts.filter(({ path: scriptPath }) =>
    !scriptPath.startsWith("http://") && !scriptPath.startsWith("https://")
  );
  const remoteScripts = scripts.filter(({ path: scriptPath }) =>
    scriptPath.startsWith("http://") || scriptPath.startsWith("https://")
  );

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

    setBuiltEntryAssets(builtAssets.entryAssets);
  } else {
    setBuiltEntryAssets({});
  }

  return await Promise.all(
    remoteScripts.map(({ name, path: scriptPath, externals }) =>
      writeScript({
        file: name.replace(".ts", ".js"),
        scriptPath,
        externals,
        mode: "production",
        outputDirectory,
      })
    ),
  );
}

function normalizeScriptName(name: string) {
  return name.endsWith(".ts") ? name.slice(0, -3) : name;
}

function getDevScriptPath(scriptPath: string | undefined, cwd: string) {
  if (!scriptPath) {
    return undefined;
  }

  if (scriptPath.startsWith("http://") || scriptPath.startsWith("https://")) {
    return undefined;
  }

  if (path.isAbsolute(scriptPath)) {
    const relativePath = path.relative(cwd, scriptPath);

    if (!relativePath.startsWith("..")) {
      return `/${relativePath.split(path.sep).join("/")}`;
    }

    return `/@fs/${scriptPath.split(path.sep).join("/")}`;
  }

  const normalizedPath = scriptPath.startsWith("./")
    ? scriptPath.slice(2)
    : scriptPath;

  return `/${normalizedPath.split(path.sep).join("/")}`;
}

async function writeScript(
  { file, scriptPath, externals, mode, outputDirectory }: {
    file: string;
    scriptPath: string;
    externals?: string[];
    mode: Mode;
    outputDirectory: string;
  },
): Promise<BuildWorkerEvent> {
  DEBUG &&
    console.log(
      "worker - writing script",
      scriptPath,
      path.join(outputDirectory, file),
    );

  const data = scriptPath.startsWith("http")
    ? await fetch(scriptPath).then((res) => res.text())
    : await compileTypeScript(
      scriptPath,
      mode,
      externals,
    );

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

export { plugin };
