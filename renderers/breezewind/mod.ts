import { tw } from "../../client-deps.ts";
import { path } from "../../server-deps.ts";
import { getDefinitions } from "../../gustwind-utilities/getDefinitions.ts";
import breezewind from "../../breezewind/index.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import type { Component } from "../../breezewind/types.ts";
import type { Renderer } from "../../types.ts";

async function breezewindRenderer(
  { componentsPath, layoutsPath }: {
    componentsPath: string;
    layoutsPath: string;
  },
): Promise<Renderer> {
  const cwd = Deno.cwd();

  const [components, layouts] = await Promise.all([
    getDefinitions<Component>(path.join(cwd, componentsPath)),
    getDefinitions<Component>(path.join(cwd, layoutsPath)),
  ]);

  return {
    render: async ({ route, context, pageUtilities }) => {
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
