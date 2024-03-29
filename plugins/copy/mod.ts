import * as path from "node:path";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  // TODO: Consider supporting an array of directories
  inputPath: string;
  outputPath: string;
}> = {
  meta: {
    name: "gustwind-copy-plugin",
    description:
      "${name} allows copying files from a given directory within the build output. This is useful for bringing for example image assets to a website.",
  },
  init(
    { cwd, options: { inputPath, outputPath }, outputDirectory },
  ) {
    return {
      finishBuild: () => [{
        type: "copyFiles",
        payload: {
          inputDirectory: path.join(cwd, inputPath),
          outputDirectory,
          outputPath,
        },
      }],
    };
  },
};

export { plugin };
