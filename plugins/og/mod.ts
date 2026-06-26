import * as path from "node:path";
// Note that this depends on --allow-ffi
import sharp from "sharp";
import { htmlispToHTML } from "../../htmlisp/mod.ts";
import type { Context, MatchRoute, Plugin, Send, Tasks } from "../../types.ts";

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
        return await createOgImageTasks({
          context,
          layout: ogLayout,
          matchRoute,
          output,
          outputDirectory,
          send,
          skipExtensions,
          url,
        });
      },
    };
  },
};

async function createOgImageTasks(
  {
    context,
    layout,
    matchRoute,
    output,
    outputDirectory,
    send,
    skipExtensions,
    url,
  }: {
    context: Context;
    layout: string;
    matchRoute: MatchRoute;
    output: string;
    outputDirectory: string;
    send: Send;
    skipExtensions: string[];
    url: string;
  },
): Promise<Tasks> {
  if (!shouldRenderOg(url, skipExtensions)) {
    return [];
  }

  const svg = await renderOgSvg({ context, layout, matchRoute, send, url });
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

async function renderOgSvg(
  {
    context,
    layout,
    matchRoute,
    send,
    url,
  }: {
    context: Context;
    layout: string;
    matchRoute: MatchRoute;
    send: Send;
    url: string;
  },
) {
  const meta = await loadOgMeta(send);
  const { components, componentUtilities, utilities } =
    await loadRendererContext(send, matchRoute, url);

  return await htmlispToHTML({
    htmlInput: layout,
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
}

async function loadOgMeta(send: Send) {
  return toRecord(
    await send("gustwind-meta-plugin", {
      type: "getMeta",
      payload: undefined,
    }),
  );
}

async function loadRendererContext(
  send: Send,
  matchRoute: MatchRoute,
  url: string,
) {
  return toRecord(
    await send("htmlisp-renderer-plugin", {
      type: "getRenderContext",
      payload: { matchRoute, url },
    }),
  );
}

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
