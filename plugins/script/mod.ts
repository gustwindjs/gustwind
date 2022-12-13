import { path } from "../../server-deps.ts";
import type {
  PluginApi,
  PluginMeta,
  PluginParameters,
  Scripts,
} from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-script-plugin",
};

async function scriptPlugin(
  { load, options: { scripts: globalScripts = [], scriptsPath }, projectMeta }:
    PluginParameters<
      {
        scripts: Scripts;
        // TODO: Model scripts output path here
        scriptsPath: string[];
      }
    >,
): Promise<PluginApi> {
  const { outputDirectory } = projectMeta;
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
      } else {
        throw new Error(
          `gustwind-script-plugin - Unknown message type: ${type}`,
        );
      }
    },
  };
}

export { meta, scriptPlugin as plugin };
