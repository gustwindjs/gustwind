import * as path from "node:path";
// Note that this depends on --allow-ffi
import sharp from "sharp";
import { htmlispToHTML } from "../../htmlisp/mod.ts";
import type { Plugin } from "../../types.ts";

const encoder = new TextEncoder();
const toRecord = (value: unknown) =>
  value && typeof value === "object"
    ? value as Record<string, unknown>
    : {};
const defaultSkipExtensions = [".html", ".xml"];

type OgPluginOptions = {
  layout: string;
  output?: string;
  skipExtensions?: string[];
};

const plugin: Plugin<OgPluginOptions> = {
  meta: {
    name: "gustwind-og-plugin",
    description: "${name} allows generating OpenGraph images for a website.",
    dependsOn: ["htmlisp-renderer-plugin", "gustwind-meta-plugin"],
  },
  init: async (
    {
      options: {
        layout,
        output = "og.png",
        skipExtensions = defaultSkipExtensions,
      },
      load,
      outputDirectory,
    },
  ) => {
    if (!layout) {
      throw new Error("gustwind-og-plugin requires a layout option");
    }

    const ogLayout = await load.textFile(layout);

    return {
      beforeEachRender: async ({ url, matchRoute, context, send }) => {
        if (shouldRenderOg(url, skipExtensions)) {
          const meta = toRecord(await send("gustwind-meta-plugin", {
            type: "getMeta",
            payload: undefined,
          }));
          const renderContext = toRecord(
            await send("htmlisp-renderer-plugin", {
              type: "getRenderContext",
              payload: { matchRoute, url },
            }),
          );
          const { components, componentUtilities, utilities } = renderContext;

          const svg = await htmlispToHTML({
            htmlInput: ogLayout,
            // @ts-expect-error It would be better to type this somehow but this will do
            components,
            // @ts-expect-error It would be better to type this somehow but this will do
            componentUtilities,
            // @ts-expect-error It would be better to type this somehow but this will do
            utilities,
            context: {
              ...context,
              meta: { ...meta, ...toRecord(context.meta) },
            },
          });

          const data = await sharp(encoder.encode(svg)).png().toBuffer();

          return [{
            type: "writeFile",
            payload: {
              outputDirectory,
              file: getOgOutputPath(url, output),
              data,
            },
          }];
        }

        return [];
      },
    };
  },
};

function shouldRenderOg(url: string, skipExtensions: string[]) {
  const normalizedUrl = url.replace(/\/+$/, "");

  return !skipExtensions.some((extension) =>
    normalizedUrl.endsWith(extension)
  );
}

function getOgOutputPath(url: string, output: string) {
  return path.posix.join(
    url.replace(/^\/+|\/+$/g, ""),
    output.replace(/^\/+/g, ""),
  );
}

export { plugin };
