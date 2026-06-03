import { get } from "../../utilities/functional.ts";
import type { DataSource, DataSources, Route } from "../../types.ts";
import { getDataSourceContext } from "./getDataSourceContext.ts";
import { mergeRouteScripts } from "./routeScripts.ts";
import { normalizeRouteDataSources } from "./normalizeRouteDataSources.ts";
import { mapWithConcurrency } from "../../utilities/concurrency.ts";

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
  {
    url,
    route,
    dataSources,
    inheritedScripts,
    routeConcurrency = Number.POSITIVE_INFINITY,
    recurse,
  }: {
    url: string;
    route: Route;
    dataSources: DataSources;
    inheritedScripts?: Route["scripts"];
    routeConcurrency?: number;
    recurse: boolean;
  },
): Promise<[string, Route]> {
  let ret = { ...route };
  const routeScripts = mergeRouteScripts(inheritedScripts, route.scripts);

  if (route.expand) {
    const { matchBy } = route.expand;

    if (!matchBy) {
      throw new Error("Tried to matchBy a path that is not matchable");
    }

    const indexer = dataSources[matchBy.indexer.operation];

    if (!indexer) {
      throw new Error("Missing indexer");
    }

    if (typeof indexer !== "function") {
      throw new Error("Data source is not a function");
    }

    const dataSourceIndexer = matchBy.indexer;
    const indexResults = await indexer.apply(
      undefined,
      dataSourceIndexer.parameters || [],
    );

    // Construct individual routes based on the results of indexing
    const { slug } = matchBy;
    if (Array.isArray(indexResults)) {
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
      const expandedRoutes = Object.fromEntries(
        await mapWithConcurrency(
          indexResults,
          routeConcurrency,
          async (match) => {
            const url = get(match, slug) as string;

            if (!url) {
              throw new Error(
                `Route ${matchBy.slug} is missing from ${
                  JSON.stringify(match, null, 2)
                } with slug ${matchBy.slug} within ${url} route`,
              );
            }

            // @ts-ignore route.expand exists by now for sure
            const { layout, scripts, context } = route.expand;

            return [url, {
              layout,
              scripts: mergeRouteScripts(routeScripts, scripts),
              context: context || {},
              parentDataSources: {
                ...inheritedParentDataSources,
                [matchByName]: indexResults,
              },
              dataSources: {
                ...Object.fromEntries(
                  // @ts-ignore route.expand exists by now for sure
                  Object.entries(
                    normalizeRouteDataSources(route.expand?.dataSources),
                  ).map((
                    [k, v]: [string, DataSource],
                  ) => [k, {
                    ...v,
                    parameters: [match].concat(v.parameters),
                  }]),
                ),
              },
            }];
          },
        ),
      );

      ret = { ...route, routes: expandedRoutes };
    } else {
      throw new Error("Data source results are not an array");
    }
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

export { expandRoute, expandRoutes };
