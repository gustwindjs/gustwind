import * as path from "node:path";
import * as pagefind from "npm:pagefind@1.1.0";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{ indexInDev: boolean }> = {
  meta: {
    name: "gustwind-pagefind-plugin",
    description:
      "${name} implements side-wide search using PageFind underneath. Make sure to integrate the results with the <PageFind> component.",
  },
  async init(
    { cwd, options: { indexInDev }, outputDirectory, mode },
  ) {
    let files: pagefind.IndexFile[] = [];

    // It is enough to generate an index once in development mode since it
    // doesn't have to be completely accurate.
    if (mode === "development") {
      files = indexInDev ? await indexBuild() : await indexEmpty();
    }

    return {
      sendMessages: ({ send }) => {
        files.forEach(({ path: file }) =>
          // TODO: Scope this to router plugins using prefixing (router-)
          // This needs a change at plugins.ts logic
          send("*", {
            type: "addDynamicRoute",
            payload: { path: "pagefind/" + file },
          })
        );
      },
      // This triggers only in production and then a full index is needed no matter what
      finishBuild: async () => {
        const files = await indexBuild();

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

    async function indexEmpty() {
      const { index } = await pagefind.createIndex({});

      if (!index) {
        throw new Error("pagefind failed to create an index");
      }

      const { files } = await index.getFiles();

      return files;
    }

    async function indexBuild() {
      const { index } = await pagefind.createIndex({});

      if (!index) {
        throw new Error("pagefind failed to create an index");
      }

      await index.addDirectory({
        path: path.join(cwd, outputDirectory),
      });

      const { files } = await index.getFiles();

      return files;
    }
  },
};

export { plugin };
