import * as path from "node:path";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  inputPath: string;
}, {
  meta: Record<string, unknown>;
}> = {
  meta: {
    name: "gustwind-meta-plugin",
    description:
      "${name} allows loading meta information from a given JSON file to be used by other plugins.",
  },
  init({ cwd, options: { inputPath }, load }) {
    return {
      initPluginContext: async () => {
        const meta = await loadMeta();

        return { meta };
      },
      onMessage: async ({ message, pluginContext }) => {
        const { type, payload } = message;

        switch (type) {
          case "fileChanged": {
            switch (payload.type) {
              case "meta": {
                const meta = await loadMeta();

                return {
                  send: [{ type: "reloadPage", payload: undefined }],
                  pluginContext: { meta },
                };
              }
            }

            break;
          }
          case "getMeta":
            return { result: pluginContext.meta };
        }
      },
    };

    function loadMeta() {
      return inputPath
        ? load.json<Record<string, unknown>>({
          path: path.join(cwd, inputPath),
          type: "meta",
        })
        : Promise.resolve({});
    }
  },
};

export { plugin };
