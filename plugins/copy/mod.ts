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
    { cwd, options: { inputPath, outputPath }, load, outputDirectory },
  ) {
    return {
      sendMessages: async ({ send }) => {
        const files = await load.dir({
          path: inputPath,
          extension: "",
          type: "",
        });

        files.forEach((f) =>
          // TODO: Scope this to router plugins using prefixing (router-)
          // This needs a change at plugins.ts logic
          send("*", {
            type: "addDynamicRoute",
            payload: { path: f.path },
          })
        );
      },
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
