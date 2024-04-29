import * as path from "node:path";
import * as pagefind from "npm:pagefind@1.1.0";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<
  { language?: string },
  { files: pagefind.IndexFile[] }
> = {
  meta: {
    name: "gustwind-pagefind-plugin",
    description:
      "${name} implements side-wide search using PageFind underneath. Make sure to integrate the results with the <PageFind> component.",
  },
  init(
    { cwd, options: { language }, outputDirectory },
  ) {
    return {
      initPluginContext: async () => {
        const { index } = await pagefind.createIndex({
          forceLanguage: language || "en",
        });

        if (!index) {
          throw new Error("pagefind failed to create an index");
        }

        await index.addDirectory({
          path: path.join(cwd, outputDirectory),
        });

        const { files } = await index.getFiles();

        await pagefind.close();

        return { files };
      },
      sendMessages: ({ send, pluginContext }) => {
        pluginContext.files.forEach(({ path: file }) =>
          // TODO: Scope this to router plugins using prefixing (router-)
          // This needs a change at plugins.ts logic
          send("*", {
            type: "addDynamicRoute",
            payload: { path: "pagefind/" + file },
          })
        );
      },
      finishBuild: ({ pluginContext }) => {
        return pluginContext.files.map(({ path: file, content: data }) => ({
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
