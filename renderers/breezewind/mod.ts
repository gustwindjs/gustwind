import { tw } from "../../client-deps.ts";
import breezewind from "../../breezewind/index.ts";
import * as breezeExtensions from "../../breezewind/extensions.ts";
import type { ProjectMeta, Renderer } from "../../types.ts";

function breezewindRenderer(
  _projectMeta: ProjectMeta,
  // TODO: Support options. Something like tw should be an option.
  // options: {},
): Renderer {
  return {
    render: async ({ layout, components, context, pageUtilities }) => {
      // TODO: Maybe breezewind should trigger _onRenderStart and _onRenderEnd
      // as it feels like a templating engine feature over a custom one.
      pageUtilities._onRenderStart && pageUtilities._onRenderStart(context);

      const markup = await breezewind({
        component: layout,
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
