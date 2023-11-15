// Note that this depends on --allow-ffi
import sharp from "npm:sharp@0.33.0-alpha.11";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  // TODO: Consider supporting an array of directories
  layout: string;
}> = {
  meta: {
    name: "gustwind-og-plugin",
    description: "${name} allows generating OpenGraph images for a website.",
  },
  init(
    { options: { layout } },
  ) {
    console.log("using layout", layout);

    // TODO: This should generate og.png for each route that doesn't end in html or xml
    // TODO: Consider leveraging beforeEachRender for this
    // TODO: Define a custom worker task next to the plugin (same idea would work for other plugins)
    // The task should encapsulate sharp related logic.
    // TODO: Leverage html-to-breezewind and breezewind to generate SVG using the template
    return {};

    /* const inputDirectory = path.join(cwd, inputPath);

    return {
      finishBuild: () => [{
        type: "copyFiles",
        payload: {
          inputDirectory,
          outputDirectory,
          outputPath,
        },
      }],
    };*/
  },
};

export { plugin };
