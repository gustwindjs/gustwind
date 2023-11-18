import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  inputPath: string;
}> = {
  meta: {
    name: "gustwind-meta-plugin",
    description:
      "${name} allows loading meta information from a given JSON file to be used by other plugins.",
  },
  init: async (
    { cwd, options: { inputPath }, load },
  ) => {
    let meta = await loadMeta();

    function loadMeta() {
      return inputPath
        ? load.json<Record<string, unknown>>({
          path: path.join(cwd, inputPath),
          type: "meta",
        })
        : Promise.resolve({});
    }

    return {
      onMessage: ({ message }) => {
        const { type, payload } = message;

        switch (type) {
          case "fileChanged": {
            switch (payload.type) {
              case "meta": {
                meta = loadMeta();

                return { send: [{ type: "reloadPage" }] };
              }
            }

            break;
          }
          case "getMeta":
            return meta;
        }
      },
    };
  },
};

export { plugin };
