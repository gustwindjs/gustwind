import * as jampack from "npm:@divriots/jampack@0.22.1";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

console.log('jampack', jampack)

const plugin: Plugin = {
  meta: {
    name: "gustwind-jampack-plugin",
    description:
      "${name} optimizes build output in multiple ways (images, above the fold, prefetching etc.).",
  },
  init(
    { cwd, outputDirectory },
  ) {
    return {
      finishBuild: async () => {
        // TODO
      },
    };
  },
};

export { plugin };
