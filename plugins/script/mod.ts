import * as path from "node:path";
import {
  compileTypeScript,
  stopEsbuild,
} from "../../utilities/compileTypeScript.ts";
import type { BuildWorkerEvent, Mode, Plugin, Scripts } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

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
    return {
      initPluginContext: async () => {
        const foundScripts = await loadScripts();

        return { foundScripts, receivedScripts: [], receivedGlobalScripts: [] };
      },
      prepareBuild: ({ pluginContext }) => {
        const { foundScripts, receivedScripts } = pluginContext;
        const isDevelopingLocally = import.meta.url.startsWith("file:///");

        return Promise.all(
          foundScripts.concat(
            receivedScripts.map((
              { name, localPath, remotePath, externals },
            ) => ({
              name,
              path: isDevelopingLocally ? localPath : remotePath,
              externals,
            })),
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

        if (
          !routeScriptNames.every((name) =>
            foundScriptNames.includes(`${name}.ts`)
          )
        ) {
          console.error(foundScriptNames, routeScriptNames);
          throw new Error("Route script is missing from the scripts directory");
        }

        const scripts: { name: string; srcPrefix?: string }[] =
          (receivedScripts.filter(({ isExternal }) => !isExternal)).map((
            { name },
          ) => ({ name })).concat(
            routeScripts.map(({ name, ...rest }) => ({
              name: `${name}.js`,
              ...rest,
            })),
          );
        const scriptTags = scripts.map(({ name, srcPrefix, ...rest }) => ({
          type: "module",
          ...rest,
          src: (srcPrefix || "/") + name.replace(".ts", ".js"),
        }));

        scripts.forEach(({ name: path }) =>
          // TODO: Scope to router- instead
          send("*", { type: "addDynamicRoute", payload: { path } })
        );

        // TODO: Add uniqueness check for global scripts to avoid injecting the same script multiple times
        // Global scripts don't need processing since they are in the right format already
        return {
          context: {
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

export { plugin };
