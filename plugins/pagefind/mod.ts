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

        await index.addDirectory({
          path: path.join(cwd, outputDirectory),
        });

        const { files } = await index.getFiles();

        return files.map(({ path: file, content: data }) => {
          const parts = file.split("/");
          const out = path.join(
            outputDirectory,
            "pagefind",
            parts.slice(0, -1).join("/"),
          );

          return {
            type: "writeFile",
            payload: {
              outputDirectory: out,
              // There's always something in parts
              file: parts.at(-1) as string,
              data,
            },
          };
        });
      },
    };
  },
};

export { plugin };
