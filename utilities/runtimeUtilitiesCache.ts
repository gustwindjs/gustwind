import type {
  GlobalUtilities,
  LoadApi,
  MatchRoute,
  Render,
  RenderRaw,
  RenderSync,
  Utilities,
} from "../types.ts";
import { raw } from "../htmlisp/mod.ts";

type RuntimeUtilitiesResolverOptions = {
  load: LoadApi;
  render: Render;
  renderRaw?: RenderRaw;
  renderSync: RenderSync;
};
type RuntimeUtilitiesInput = {
  componentUtilities: Record<string, GlobalUtilities | undefined>;
  globalUtilities: GlobalUtilities;
  matchRoute: MatchRoute;
  url: string;
};
type InitializedRuntimeUtilities = {
  componentUtilities: Record<string, Utilities>;
  utilities: Utilities;
};
type RuntimeUtilitiesCache = WeakMap<
  MatchRoute,
  Map<string, InitializedRuntimeUtilities>
>;

function createRuntimeUtilitiesResolver(
  options: RuntimeUtilitiesResolverOptions,
) {
  const runtimeUtilitiesCache: RuntimeUtilitiesCache = new WeakMap();

  return function getRuntimeUtilities(
    input: RuntimeUtilitiesInput,
  ) {
    const cacheForRoute = getRouteUtilitiesCache(
      runtimeUtilitiesCache,
      input.matchRoute,
    );
    const cacheKey = getRuntimeUtilitiesCacheKey(input.url);
    const cachedUtilities = cacheForRoute.get(cacheKey);

    if (cachedUtilities) {
      return cachedUtilities;
    }

    const initializedUtilities = initializeRuntimeUtilities(options, input);

    cacheForRoute.set(cacheKey, initializedUtilities);

    return initializedUtilities;
  };
}

function getRouteUtilitiesCache(
  runtimeUtilitiesCache: RuntimeUtilitiesCache,
  matchRoute: MatchRoute,
) {
  let cacheForRoute = runtimeUtilitiesCache.get(matchRoute);

  if (!cacheForRoute) {
    cacheForRoute = new Map();
    runtimeUtilitiesCache.set(matchRoute, cacheForRoute);
  }

  return cacheForRoute;
}

function getRuntimeUtilitiesCacheKey(url: string) {
  return url || "(component)";
}

function initializeRuntimeUtilities(
  options: RuntimeUtilitiesResolverOptions,
  input: RuntimeUtilitiesInput,
): InitializedRuntimeUtilities {
  return {
    componentUtilities: initializeComponentUtilities(options, input),
    utilities: input.globalUtilities.init(createUtilitiesContext(options, input)),
  };
}

function initializeComponentUtilities(
  options: RuntimeUtilitiesResolverOptions,
  input: RuntimeUtilitiesInput,
) {
  return Object.fromEntries(
    Object.entries(input.componentUtilities).map(([name, utilities]) => [
      name,
      utilities ? utilities.init(createUtilitiesContext(options, input)) : {},
    ]),
  );
}

function createUtilitiesContext(
  {
    load,
    render,
    renderRaw = raw,
    renderSync,
  }: RuntimeUtilitiesResolverOptions,
  { matchRoute, url }: RuntimeUtilitiesInput,
) {
  return {
    load,
    raw,
    render,
    renderRaw,
    renderSync,
    matchRoute,
    url,
  };
}

export { createRuntimeUtilitiesResolver };
