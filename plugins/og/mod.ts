// Note that this depends on --allow-ffi
import sharp from "npm:sharp@0.33.0";
import { path } from "../../server-deps.ts";
import { htmlToBreezewind } from "../../html-to-breezewind/mod.ts";
import breezewind from "../../breezewind/mod.ts";
import type { Plugin } from "../../types.ts";

const encoder = new TextEncoder();

const plugin: Plugin<{
  layout: string;
}> = {
  meta: {
    name: "gustwind-og-plugin",
    description: "${name} allows generating OpenGraph images for a website.",
    dependsOn: ["breezewind-renderer-plugin", "gustwind-meta-plugin"],
  },
  init: async (
    { options: { layout }, load, outputDirectory },
  ) => {
    const ogLayout = htmlToBreezewind(await load.textFile(layout));

    return {
      beforeEachRender: async ({ url, route, send }) => {
        if (!url.endsWith(".html") && !url.endsWith(".xml")) {
          const meta = await send("gustwind-meta-plugin", {
            type: "getMeta",
            payload: undefined,
          });
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
            context: {
              meta: {
                // @ts-expect-error Figure out how to type this
                ...meta,
                ...route.meta,
              },
            },
          });

          const data = await sharp(encoder.encode(svg)).png().toBuffer();

          return [{
            type: "writeFile",
            payload: {
              outputDirectory,
              file: path.join(url, "og.png"),
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
