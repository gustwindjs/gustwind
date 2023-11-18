// Note that this depends on --allow-ffi
import sharp from "npm:sharp@0.33.0-alpha.11";
import { path } from "../../server-deps.ts";
import { htmlToBreezewind } from "../../html-to-breezewind/mod.ts";
import breezewind from "../../breezewind/mod.ts";
import type { Plugin } from "../../types.ts";

const encoder = new TextEncoder();

const plugin: Plugin<{
  layout: string;
  metaPath: string;
}> = {
  meta: {
    name: "gustwind-og-plugin",
    description: "${name} allows generating OpenGraph images for a website.",
    dependsOn: ["breezewind-renderer-plugin"],
  },
  init: async (
    { options: { layout, metaPath }, cwd, load, outputDirectory },
  ) => {
    const ogLayout = htmlToBreezewind(await load.textFile(layout));

    // TODO: Extract meta loading to a plugin?
    const meta = await loadMeta();

    function loadMeta() {
      return metaPath
        ? load.json<Record<string, unknown>>({
          path: path.join(cwd, metaPath),
          type: "meta",
        })
        : Promise.resolve({});
    }

    return {
      beforeEachRender: async ({ url, route, send }) => {
        if (!url.endsWith(".html") && !url.endsWith(".xml")) {
          const components = await send("breezewind-renderer-plugin", {
            type: "getComponents",
            payload: undefined,
          });

          // TODO: Add a strict mode to breezewind to disallow empty fields
          // as that helps catching svg issues
          const svg = await breezewind({
            component: ogLayout,
            // @ts-expect-error It would be better to type this somehow but this will do
            components,
            // TODO: Allow passing a context as a plugin parameter?
            context: { meta: { ...meta, ...route.meta } },
          });

          const data = await sharp(encoder.encode(svg)).png().toBuffer();

          return [{
            type: "writeFile",
            payload: {
              outputDirectory,
              file: path.join(route.url, "og.png"),
              data,
            },
          }];
        }

        return [];
      },
    };
  },
};

export { plugin };
