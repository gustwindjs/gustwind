import * as pagefind from "npm:pagefind@1.0.3";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin = {
  meta: {
    name: "gustwind-pagefind-plugin",
    description:
      "${name} implements side-wide search using PageFind underneath. Make sure to integrate the results with the <PageFind> component.",
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

        return files.map(({ path: file, content: data }) => ({
          type: "writeFile",
          payload: {
            outputDirectory,
            file: path.join("pagefind", file),
            data,
          },
        }));
      },
    };
  },
};

export { plugin };
