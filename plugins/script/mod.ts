import * as esbuild from "https://deno.land/x/esbuild@v0.19.4/mod.js";
import { path } from "../../server-deps.ts";
import type { Plugin, Scripts } from "../../types.ts";

const plugin: Plugin<{
  scripts: Scripts;
  // TODO: Model scripts output path here
  scriptsPath: string[];
}> = {
  meta: {
    name: "gustwind-script-plugin",
  },
  init: async ({
    cwd,
    load,
    options: { scripts: globalScripts = [], scriptsPath },
    outputDirectory,
  }) => {
    let foundScripts = await loadScripts();
    let receivedScripts: {
      isExternal?: boolean;
      name: string;
      localPath: string;
      remotePath: string;
      externals?: string[];
    }[] = [];

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

    return {
      prepareBuild: () => {
        const isDevelopingLocally = import.meta.url.startsWith("file:///");

        return foundScripts.concat(
          receivedScripts.map(({ name, localPath, remotePath, externals }) => ({
            name,
            path: isDevelopingLocally ? localPath : remotePath,
            externals,
          })),
        ).map((
          { name, path: scriptPath, externals },
        ) => ({
          type: "writeScript",
          payload: {
            outputDirectory,
            file: name.replace(".ts", ".js"),
            scriptPath,
            externals,
          },
        }));
      },
      prepareContext({ route }) {
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

        // globalScripts don't need processing since they are in the right format
        return { context: { scripts: globalScripts.concat(scriptTags) } };
      },
      onMessage: async ({ message }) => {
        const { type, payload } = message;

        if (type === "fileChanged") {
          if (payload.type === "foundScripts") {
            foundScripts = await loadScripts();

            // TODO: Make this more refined by sending a replaceScript event
            // and the script that changed so that it can be replaced as
            // that avoids a full page reload.
            return { send: [{ type: "reloadPage" }] };
          }
        }

        if (type === "addScripts") {
          receivedScripts = receivedScripts.concat(payload);
        }
      },
      cleanUp: () => {
        // https://esbuild.github.io/getting-started/#deno
        esbuild.stop();
      },
    };
  },
};

export { plugin };
