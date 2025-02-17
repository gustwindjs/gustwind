import * as path from "node:path";
// Note that this depends on --allow-ffi
import sharp from "npm:sharp@0.33.0";
import { htmlispToHTML } from "../../htmlisp/mod.ts";
import type { Plugin } from "../../types.ts";

const encoder = new TextEncoder();

const plugin: Plugin<{
  layout: string;
}> = {
  meta: {
    name: "gustwind-og-plugin",
    description: "${name} allows generating OpenGraph images for a website.",
    dependsOn: ["htmlisp-renderer-plugin", "gustwind-meta-plugin"],
  },
  init: async (
    { options: { layout }, load, outputDirectory },
  ) => {
    const ogLayout = await load.textFile(layout);

    return {
      beforeEachRender: async ({ url, route, send }) => {
        if (
          !url.endsWith(".html") && !url.endsWith(".html/") &&
          !url.endsWith(".xml") && !url.endsWith(".xml/")
        ) {
          const meta = await send("gustwind-meta-plugin", {
            type: "getMeta",
            payload: undefined,
          });
          const components = await send("htmlisp-renderer-plugin", {
            type: "getComponents",
            payload: undefined,
          });

          const svg = await htmlispToHTML({
            htmlInput: ogLayout,
            // @ts-expect-error It would be better to type this somehow but this will do
            components,
            context: {
              meta: {
                // @ts-expect-error Figure out how to type this
                ...meta,
                // @ts-expect-error Figure out how to type this
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
