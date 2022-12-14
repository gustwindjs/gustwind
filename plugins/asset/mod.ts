import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  // TODO: Consider supporting an array of directories
  assetsPath: string;
  outputPath: string;
}> = {
  meta: {
    name: "gustwind-asset-plugin",
  },
  init(
    { options: { assetsPath, outputPath }, outputDirectory },
  ) {
    const cwd = Deno.cwd();
    const inputDirectory = path.join(cwd, assetsPath);

    return {
      prepareBuild: () => [{
        type: "writeFiles",
        payload: {
          inputDirectory,
          outputDirectory,
          outputPath,
        },
      }],
    };
  },
};

export { plugin };
