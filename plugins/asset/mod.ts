import { path } from "../../server-deps.ts";
import type { Plugin, PluginMeta, ProjectMeta } from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-asset-plugin",
};

function assetPlugin(
  { assetsPath, outputPath }: {
    // TODO: Consider supporting an array of directories
    assetsPath: string;
    outputPath: string;
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
          outputPath,
        },
      }];
    },
  };
}

export { assetPlugin as plugin, meta };
