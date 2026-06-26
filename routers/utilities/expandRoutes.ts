import { get } from "../../utilities/functional.ts";
import type { DataSource, DataSources, Route } from "../../types.ts";
import { getDataSourceContext } from "./getDataSourceContext.ts";
import { mergeRouteScripts } from "./routeScripts.ts";
import { normalizeRouteDataSources } from "./normalizeRouteDataSources.ts";
import { mapWithConcurrency } from "../../utilities/concurrency.ts";

type ExpandRouteOptions = {
  url: string;
  route: Route;
  dataSources: DataSources;
  inheritedScripts?: Route["scripts"];
  routeConcurrency?: number;
  recurse: boolean;
};
type RouteExpansion = NonNullable<Route["expand"]>;
type RouteExpansionMatch = NonNullable<RouteExpansion["matchBy"]>;

async function expandRoutes(
  {
    routes,
    dataSources,
    inheritedScripts,
    routeConcurrency = Number.POSITIVE_INFINITY,
  }: {
    routes: Record<string, Route>;
    dataSources: DataSources;
    inheritedScripts?: Route["scripts"];
    routeConcurrency?: number;
  },
): Promise<Record<string, Route>> {
  const allRoutes = Object.fromEntries(
    await mapWithConcurrency(
      Object.entries(routes),
      routeConcurrency,
      ([url, route]) =>
        expandRoute({
          url,
          route,
          dataSources,
          inheritedScripts,
          routeConcurrency,
          recurse: true,
        }),
    ),
  );

  // / is an exception. If it has an expansion, then it has to be added
  // to the root as otherwise the router won't find it later.
  if (allRoutes["/"] && allRoutes["/"].routes) {
    return {
      ...allRoutes,
      ...allRoutes["/"].routes,
      "/": { ...allRoutes["/"], routes: {} },
    };
  }

  return allRoutes;
}

async function expandRoute(
  options: ExpandRouteOptions,
): Promise<[string, Route]> {
  const {
    url,
    route,
    dataSources,
    inheritedScripts,
    routeConcurrency = Number.POSITIVE_INFINITY,
    recurse,
  } = options;
  let ret = { ...route };
  const routeScripts = mergeRouteScripts(inheritedScripts, route.scripts);

  if (route.expand) {
    ret = {
      ...route,
      routes: await expandRouteByIndex({
        dataSources,
        expansion: route.expand,
        route,
        routeConcurrency,
        routeScripts,
      }),
    };
  }

  // Take care to expand routes since they might have data source related logic etc.
  // to execute.
  if (recurse && route.routes) {
    const expandedRouteRoutes = await expandRoutes({
      routes: route.routes || {},
      dataSources,
      inheritedScripts: routeScripts,
      routeConcurrency,
    });

    ret = {
      ...ret,
      routes: { ...ret.routes, ...expandedRouteRoutes },
    };
  }

  return [url, ret];
}

async function expandRouteByIndex(
  {
    dataSources,
    expansion,
    route,
    routeConcurrency,
    routeScripts,
  }: {
    dataSources: DataSources;
    expansion: RouteExpansion;
    route: Route;
    routeConcurrency: number;
    routeScripts: Route["scripts"];
  },
) {
  const matchBy = getRouteExpansionMatch(expansion);
  const indexResults = await runRouteExpansionIndexer(dataSources, matchBy);

  if (!Array.isArray(indexResults)) {
    throw new Error("Data source results are not an array");
  }

  const inheritedParentDataSources = {
    ...route.parentDataSources,
    ...await getDataSourceContext(
      route.parentDataSources,
      route.dataSources,
      dataSources,
      routeConcurrency,
    ),
  };
  const matchByName = matchBy.name || matchBy.indexer.operation;

  return Object.fromEntries(
    await mapWithConcurrency(
      indexResults,
      routeConcurrency,
      async (match) =>
        createExpandedRoute({
          expansion,
          inheritedParentDataSources,
          indexResults,
          match,
          matchBy,
          matchByName,
          routeScripts,
        }),
    ),
  );
}

function getRouteExpansionMatch(expansion: RouteExpansion) {
  const { matchBy } = expansion;

  if (!matchBy) {
    throw new Error("Tried to matchBy a path that is not matchable");
  }

  return matchBy;
}

async function runRouteExpansionIndexer(
  dataSources: DataSources,
  matchBy: RouteExpansionMatch,
) {
  const indexer = dataSources[matchBy.indexer.operation];

  if (!indexer) {
    throw new Error("Missing indexer");
  }

  if (typeof indexer !== "function") {
    throw new Error("Data source is not a function");
  }

  return await indexer.apply(
    undefined,
    matchBy.indexer.parameters || [],
  );
}

function createExpandedRoute(
  {
    expansion,
    inheritedParentDataSources,
    indexResults,
    match,
    matchBy,
    matchByName,
    routeScripts,
  }: {
    expansion: RouteExpansion;
    inheritedParentDataSources: Record<string, unknown>;
    indexResults: unknown[];
    match: unknown;
    matchBy: RouteExpansionMatch;
    matchByName: string;
    routeScripts: Route["scripts"];
  },
): [string, Route] {
  const { slug } = matchBy;
  const url = get(match, slug) as string;

  if (!url) {
    throw new Error(
      `Route ${matchBy.slug} is missing from ${
        JSON.stringify(match, null, 2)
      } with slug ${matchBy.slug} within ${url} route`,
    );
  }

  const { layout, scripts, context } = expansion;

  return [url, {
    layout,
    scripts: mergeRouteScripts(routeScripts, scripts),
    context: context || {},
    parentDataSources: {
      ...inheritedParentDataSources,
      [matchByName]: indexResults,
    },
    dataSources: createExpandedRouteDataSources(expansion, match),
  }];
}

function createExpandedRouteDataSources(
  expansion: RouteExpansion,
  match: unknown,
) {
  return Object.fromEntries(
    Object.entries(
      normalizeRouteDataSources(expansion.dataSources),
    ).map((
      [k, v]: [string, DataSource],
    ) => [k, {
      ...v,
      parameters: [match].concat(v.parameters),
    }]),
  );
}

export { expandRoute, expandRoutes };
