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
    const foundScripts = (await Promise.all(
      scriptsPath.map((p) => load.dir(path.join(cwd, p), ".ts")),
    )).flat();
    let receivedScripts: {
      name: string;
      localPath: string;
      remotePath: string;
    }[] = [];

    return {
      prepareBuild: () => {
        const isDevelopingLocally = import.meta.url.startsWith("file:///");

        return foundScripts.concat(
          receivedScripts.map(({ name, localPath, remotePath }) => ({
            name,
            path: isDevelopingLocally ? localPath : remotePath,
          })),
        ).map((
          { name, path: scriptPath },
        ) => ({
          type: "writeScript",
          payload: {
            outputDirectory,
            file: name.replace(".ts", ".js"),
            scriptPath,
          },
        }));
      },
      prepareContext({ route }) {
        const routeScripts = route.scripts || [];
        const scripts = globalScripts.concat(
          ((receivedScripts.map(({ name }) => name)).concat(
            foundScripts.filter(({ name }) =>
              routeScripts.includes(path.basename(name, path.extname(name)))
            ).map(({ name }) => name),
          )).map((name) => ({
            type: "module",
            src: "/" + name.replace(".ts", ".js"),
          })),
        );

        return { context: { scripts } };
      },
      onMessage({ type, payload }) {
        if (type === "addScripts") {
          receivedScripts = receivedScripts.concat(payload);
        }
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
      },
    };
  },
};

export { plugin };
