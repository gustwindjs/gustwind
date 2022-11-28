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
    render: async ({ component, components, context, utilities }) => {
      // TODO: Maybe breezewind should trigger _onRenderStart and _onRenderEnd
      // as it feels like a templating engine feature over a custom one.
      utilities._onRenderStart && utilities._onRenderStart(context);

      const markup = await breezewind({
        component,
        components,
        extensions: [
          // TODO: Allow defining these through configuration
          breezeExtensions.classShortcut(tw),
          breezeExtensions.foreach,
          breezeExtensions.visibleIf,
        ],
        context,
        utilities,
      });

      utilities._onRenderEnd && utilities._onRenderEnd(context);

      return markup;
    },
  };
}

export { breezewindRenderer as renderer };
