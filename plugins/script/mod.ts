import { dir } from "../../utilities/fs.ts";
import { path } from "../../server-deps.ts";
import type { Plugin, PluginMeta, ProjectMeta, Scripts } from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-script-plugin",
};

// TODO: Handle script compilation here as well
async function scriptPlugin(
  { scripts, scriptsPath }: {
    scripts: Scripts;
    // TODO: Model scripts output path here
    scriptsPath: string[];
  },
  projectMeta: ProjectMeta,
): Promise<Plugin> {
  const { outputDirectory } = projectMeta;
  const cwd = Deno.cwd();

  const foundScripts = (await Promise.all(
    scriptsPath.map((p) => dir(path.join(cwd, p), ".ts")),
  )).flat();

  return {
    prepareBuild: () => {
      return foundScripts.map(({ name: scriptName, path: scriptPath }) => ({
        type: "writeScript",
        payload: {
          outputDirectory,
          scriptName,
          scriptPath,
        },
      }));
    },
    prepareContext({ route }) {
      return {
        context: {
          scripts: scripts.concat(
            foundScripts.map((s) => ({ type: "module", src: s.name })),
          ).concat(route.scripts || []),
        },
      };
    },
  };
}

// TODO: Server
/*
      if (pathname.endsWith(".js")) {
        const matchedScript = cache.scripts[trim(pathname, "/")];

        if (matchedScript) {
          return respond(200, matchedScript, "text/javascript");
        }

        return respond(404, "No matching script");
      }
 */

export { meta, scriptPlugin as plugin };
