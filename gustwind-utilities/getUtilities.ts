import type { GlobalUtilities, Routes } from "../types.ts";
import type { Utilities } from "../breezewind/types.ts";

function getComponentUtilities(
  { componentUtilities, routes }: {
    componentUtilities: Record<string, GlobalUtilities | undefined>;
    routes: Routes;
  },
) {
  return Object.fromEntries(
    Object.entries(componentUtilities).map((
      [k, v],
    ) => [k, v ? v.init({ routes }) : {}]),
  );
}

function getGlobalUtilities(
  {
    globalUtilities,
    layoutUtilities,
    routes,
  }: {
    globalUtilities: GlobalUtilities;
    layoutUtilities: Utilities;
    routes?: Routes;
  },
) {
  routes = routes || {};
  const ret = globalUtilities.init({ routes });

  // Expose layout-specific utilities as global utilities
  if (layoutUtilities) {
    return { ...ret, ...layoutUtilities };
  }

  return ret;
}

export { getComponentUtilities, getGlobalUtilities };
