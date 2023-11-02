import * as pagefind from "npm:pagefind@1.0.3";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin = {
  meta: {
    name: "gustwind-pagefind-plugin",
  },
  init(
    { cwd, outputDirectory },
  ) {
    return {
      finishBuild: async () => {
        const { index } = await pagefind.createIndex({});

        if (!index) {
          throw new Error("pagefind failed to create an index");
        }

        // TODO: It would be better to stay in-memory and
        // leverage addCustomRecord as instructed at
        // https://pagefind.app/docs/node-api/
        await index.addDirectory({
          path: path.join(cwd, outputDirectory),
        });

        await index.writeFiles({
          outputPath: path.join(cwd, outputDirectory, "pagefind"),
        });
      },
    };
  },
};

export { plugin };
