import { tw } from "../../client-deps.ts";
import { path } from "../../server-deps.ts";
import { getDefinitions } from "../../gustwind-utilities/getDefinitions.ts";
import breezewind from "../../breezewind/index.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import type { Component } from "../../breezewind/types.ts";
import type { Renderer } from "../../types.ts";

async function breezewindRenderer(
  { componentsPath, layoutsPath, pageUtilitiesPath }: {
    componentsPath: string;
    layoutsPath: string;
    pageUtilitiesPath: string;
  },
): Promise<Renderer> {
  const cwd = Deno.cwd();

  // TODO: Use this for cache busting modules in watch mode
  // "?cache=" +
  // new Date().getTime()
  //
  // Maybe it's a good default for an import helper
  const [components, layouts, pageUtilities] = await Promise.all([
    getDefinitions<Component>(path.join(cwd, componentsPath)),
    getDefinitions<Component>(path.join(cwd, layoutsPath)),
    pageUtilitiesPath
      ? await import("file://" + path.join(cwd, pageUtilitiesPath))
      : {},
  ]);

  return {
    render: async ({ route, context }) => {
      // TODO: Maybe breezewind should trigger _onRenderStart and _onRenderEnd
      // as it feels like a templating engine feature over a custom one.
      pageUtilities._onRenderStart && pageUtilities._onRenderStart(context);

      const markup = await breezewind({
        component: layouts[route.layout],
        components,
        extensions: [
          // TODO: Allow defining these through configuration
          breezeExtensions.classShortcut(tw),
          breezeExtensions.foreach,
          breezeExtensions.visibleIf,
        ],
        context,
        utilities: pageUtilities,
      });

      pageUtilities._onRenderEnd && pageUtilities._onRenderEnd(context);

      return markup;
    },
  };
}

export { breezewindRenderer as plugin };
