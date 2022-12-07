import { path } from "../../server-deps.ts";
import type { Plugin, PluginMeta, ProjectMeta } from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-asset-plugin",
};

function assetPlugin(
  // TODO: Model asset output path
  { assetsPath }: {
    // TODO: Consider supporting an array of directories
    assetsPath: string;
  },
  projectMeta: ProjectMeta,
): Plugin {
  const { outputDirectory } = projectMeta;
  const cwd = Deno.cwd();
  const inputDirectory = path.join(cwd, assetsPath);

  return {
    prepareBuild: () => {
      return [{
        type: "writeFiles",
        payload: {
          inputDirectory,
          outputDirectory,
        },
      }];
    },
  };
}

// TODO: Server
/*
      const assetPath = projectPaths.assets && _path.join(
        projectPaths.assets,
        _path.relative(assetsPath || "", trim(pathname, "/")),
      );

      try {
        if (assetPath) {
          const asset = await Deno.readFile(assetPath);

          return respond(200, asset, lookup(assetPath));
        }
      } catch (_error) {
        // TODO: What to do with possible errors?
        DEBUG && console.error(_error);
      }
*/

export { assetPlugin as plugin, meta };
