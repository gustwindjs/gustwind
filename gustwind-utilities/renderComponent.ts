import breezewind from "../breezewind/mod.ts";
import * as breezeExtensions from "../breezewind/extensions.ts";

function renderComponent(
  { component, components, context, globalUtilities, componentUtilities }:
    Parameters<
      typeof breezewind
    >[0],
) {
  return breezewind({
    component,
    components,
    extensions: [
      // It's important visibleIf evaluates before the others to avoid work
      breezeExtensions.visibleIf,
      breezeExtensions.foreach,
    ],
    context,
    globalUtilities,
    componentUtilities,
  });
}

export { renderComponent };
