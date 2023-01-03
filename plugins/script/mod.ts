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
            type: "foundScrips",
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

        const scripts =
          ((receivedScripts.filter(({ isExternal }) => !isExternal)).map((
            { name },
          ) => ({ name })).concat(
            routeScripts.map(({ name, ...rest }) => ({
              name: `${name}.js`,
              ...rest,
            })),
          ));
        const scriptTags = scripts.map(({ name, ...rest }) => ({
          type: "module",
          ...rest,
          src: "/" + name.replace(".ts", ".js"),
        }));

        // globalScripts don't need processing since they are in the right format
        return { context: { scripts: globalScripts.concat(scriptTags) } };
      },
      onMessage: async ({ message }) => {
        const { type, payload } = message;

        if (type === "fileChanged") {
          if (payload.type === "foundScripts") {
            foundScripts = await loadScripts();

            // TODO: How to avoid a race condition here with script compilation?
            // A part of the problem is that the compilation result lives at the dev
            // server, not at the plugin since it's messaging based. Maybe that's
            // the right place for solving it as well.
            //
            // Add a custom message just for replacing scripts?
            /*else if (type === "fileChanged") {
              const { extension } = payload;

              if (extension === ".ts") {
                // TODO: Update changed file + trigger web socket update
                console.log("script changed", payload);
              }
            }*/
          }
        }

        if (type === "addScripts") {
          receivedScripts = receivedScripts.concat(payload);
        }
      },
    };
  },
};

export { plugin };
