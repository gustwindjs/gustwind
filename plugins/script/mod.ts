import * as esbuild from "https://deno.land/x/esbuild@v0.19.4/mod.js";
import { fs, path } from "../../server-deps.ts";
import { compileTypeScript } from "../../utilities/compileTypeScript.ts";
import type { Plugin, Scripts } from "../../types.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

type ScriptWorkerEvent = {
  type: "writeScript";
  payload: {
    outputDirectory: string;
    file: string;
    scriptPath: string;
    externals?: string[];
  };
};

const plugin: Plugin<{
  scripts: Scripts;
  // TODO: Model scripts output path here
  scriptsPath: string[];
}, ScriptWorkerEvent> = {
  meta: {
    name: "gustwind-script-plugin",
    description:
      "${name} implements client-side scripting and exposes hooks for adding scripts to write to the site.",
  },
  init: async ({
    cwd,
    load,
    mode,
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
    let receivedGlobalScripts: { type: string; src: string }[] = [];

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

        if (type === "addGlobalScripts") {
          receivedGlobalScripts = receivedGlobalScripts.concat(payload);
        }

        if (type === "addScripts") {
          receivedScripts = receivedScripts.concat(payload);
        }
      },
      cleanUp: () => {
        // https://esbuild.github.io/getting-started/#deno
        esbuild.stop();
      },
      // TODO: Define this interface at types.ts
      handleEvent: async ({ message }) => {
        const { type, payload } = message;

        if (type === "writeScript") {
          const { scriptPath } = payload;

          DEBUG &&
            console.log(
              "worker - writing script",
              scriptPath,
              path.join(outputDirectory, payload.file),
            );

          // TODO: Expose write API to plugins to replace most of this.
          // That should be specialized depending on prod/dev
          await fs.ensureDir(outputDirectory);
          await Deno.writeTextFile(
            path.join(outputDirectory, payload.file),
            scriptPath.startsWith("http")
              ? await fetch(scriptPath).then((res) => res.text())
              : await compileTypeScript(
                scriptPath,
                mode,
                payload.externals,
              ),
          );
        }
      },
    };
  },
};

export { plugin };
