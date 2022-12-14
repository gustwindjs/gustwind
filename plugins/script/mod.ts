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
    load,
    options: { scripts: globalScripts = [], scriptsPath },
    outputDirectory,
  }) => {
    const cwd = Deno.cwd();

    const foundScripts = (await Promise.all(
      scriptsPath.map((p) => load.dir(path.join(cwd, p), ".ts")),
    )).flat();
    let receivedScripts: { name: string; path: string }[] = [];

    return {
      prepareBuild: () => {
        return foundScripts.concat(receivedScripts).map((
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
          (foundScripts.filter(({ name }) =>
            routeScripts.includes(path.basename(name, path.extname(name)))
          ).concat(receivedScripts)).map((s) => ({
            type: "module",
            src: s.name.replace(".ts", ".js"),
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
