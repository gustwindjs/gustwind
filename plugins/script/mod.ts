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

  // TODO: Support route.scripts and capture them here
  // The assumption here is that all the page scripts are compiled with Gustwind.
  // TODO: It might be a good idea to support third-party scripts here as well
  /*let pageScripts =
    route.scripts?.slice(0).map((s) => ({ type: "module", src: `/${s}.js` })) ||
    [];*/
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
    beforeEachRender() {
      // TODO: Figure out what to do here
      return {
        scripts: scripts.concat(
          foundScripts.map((s) => ({ type: "module", src: s.name })),
        ),
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
