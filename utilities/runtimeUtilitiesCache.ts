import type {
  GlobalUtilities,
  LoadApi,
  MatchRoute,
  Render,
  RenderSync,
  Utilities,
} from "../types.ts";

function createRuntimeUtilitiesResolver(
  {
    load,
    render,
    renderSync,
  }: {
    load: LoadApi;
    render: Render;
    renderSync: RenderSync;
  },
) {
  const runtimeUtilitiesCache = new WeakMap<MatchRoute, Map<string, {
    componentUtilities: Record<string, Utilities>;
    utilities: Utilities;
  }>>();

  return function getRuntimeUtilities(
    {
      componentUtilities,
      globalUtilities,
      matchRoute,
      url,
    }: {
      componentUtilities: Record<string, GlobalUtilities | undefined>;
      globalUtilities: GlobalUtilities;
      matchRoute: MatchRoute;
      url: string;
    },
  ) {
    let cacheForRoute = runtimeUtilitiesCache.get(matchRoute);

    if (!cacheForRoute) {
      cacheForRoute = new Map();
      runtimeUtilitiesCache.set(matchRoute, cacheForRoute);
    }

    const cacheKey = url || "(component)";
    const cachedUtilities = cacheForRoute.get(cacheKey);

    if (cachedUtilities) {
      return cachedUtilities;
    }

    const initializedUtilities = {
      componentUtilities: Object.fromEntries(
        Object.entries(componentUtilities).map(([k, v]) => [
          k,
          v
            ? v.init({
              load,
              render,
              renderSync,
              matchRoute,
              url,
            })
            : {},
        ]),
      ),
      utilities: globalUtilities.init({
        load,
        render,
        renderSync,
        matchRoute,
        url,
      }),
    };

    cacheForRoute.set(cacheKey, initializedUtilities);

    return initializedUtilities;
  };
}

export { createRuntimeUtilitiesResolver };
