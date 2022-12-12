import { path } from "../../server-deps.ts";
import type { Plugin, PluginMeta, PluginParameters } from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-asset-plugin",
};

function assetPlugin(
  { options: { assetsPath, outputPath }, projectMeta }: PluginParameters<{
    // TODO: Consider supporting an array of directories
    assetsPath: string;
    outputPath: string;
  }>,
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
