import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  // TODO: Consider supporting an array of directories
  inputPath: string;
  outputPath: string;
}> = {
  meta: {
    name: "gustwind-copy-plugin",
  },
  init(
    { cwd, options: { inputPath, outputPath }, outputDirectory },
  ) {
    const inputDirectory = path.join(cwd, inputPath);

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
