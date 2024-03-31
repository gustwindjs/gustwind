import * as path from "node:path";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  // TODO: Type this so that either has to be defined
  inputPath?: string;
  meta?: Record<string, unknown>;
}, {
  meta: Record<string, unknown>;
}> = {
  meta: {
    name: "gustwind-meta-plugin",
    description:
      "${name} allows loading meta information from a given JSON file to be used by other plugins.",
  },
  init({ cwd, options, load }) {
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
      if (options.meta) {
        return options.meta;
      }

      return options.inputPath
        ? load.json<Record<string, unknown>>({
          path: path.join(cwd, options.inputPath),
          type: "meta",
        })
        : Promise.resolve({});
    }
  },
};

export { plugin };
