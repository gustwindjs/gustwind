import { path } from "../../server-deps.ts";
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
    const inputDirectory = path.join(cwd, inputPath);

    return {
      finishBuild: () => [{
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
