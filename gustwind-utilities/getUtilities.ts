import type { Utilities } from "../breezewind/types.ts";
import type {
  Components,
  ComponentsEntry,
  GlobalUtilities,
  Routes,
} from "../types.ts";

// https://stackoverflow.com/a/47636222/228885
function getComponentUtilities(
  components: Components,
  routes: Routes,
): Record<string, Utilities> {
  return Object.fromEntries(
    Object.entries(components).map(([k, v]) =>
      v.utilities && [k, v.utilities.init({ routes })]
    )
      .filter(<T>(n?: T): n is T => Boolean(n)),
  );
}

function getGlobalUtilities(
  {
    globalUtilities,
    routes,
    layout,
  }: {
    globalUtilities: GlobalUtilities;
    routes?: Routes;
    layout?: ComponentsEntry;
  },
) {
  routes = routes || {};
  const ret = globalUtilities.init({ routes });

  // Expose layout-specific utilities as global utilities
  if (layout) {
    return { ...ret, ...layout.utilities?.init({ routes }) };
  }

  return ret;
}

export { getComponentUtilities, getGlobalUtilities };
