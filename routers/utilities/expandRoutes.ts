import { get } from "../../utilities/functional.ts";
import type { DataSource, DataSources, Route } from "../../types.ts";

async function expandRoutes({ routes, dataSources }: {
  routes: Record<string, Route>;
  dataSources: DataSources;
}): Promise<Record<string, Route>> {
  const allRoutes: Record<string, Route> = {};

  // Resolve promises in series to avoid race conditions in resolving
  for (
    const [url, route] of Object.entries(routes)
  ) {
    const [expandedUrl, expandedRoute] = await expandRoute({
      url,
      route,
      dataSources,
      recurse: true,
    });

    allRoutes[expandedUrl] = expandedRoute;
  }

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
  { url, route, dataSources, recurse }: {
    url: string;
    route: Route;
    dataSources: DataSources;
    recurse: boolean;
  },
): Promise<[string, Route]> {
  let ret = { ...route };

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

    const expandedRoutes: Record<string, Route> = {};
    const dataSourceIndexer = matchBy.indexer;
    const indexResults = await indexer.apply(
      undefined,
      // @ts-expect-error This is fine.
      dataSourceIndexer.parameters,
    );

    // Construct individual routes based on the results of indexing
    const { slug } = matchBy;
    if (Array.isArray(indexResults)) {
      await Promise.all(indexResults.map((match) => {
        const url = get(match, slug) as string;

        if (!url) {
          throw new Error(
            `Route ${matchBy.slug} is missing from ${
              JSON.stringify(match, null, 2)
            } with slug ${matchBy.slug} within ${url} route`,
          );
        }

        // @ts-ignore route.expand exists by now for sure
        const { meta, layout, scripts, context } = route.expand;

        expandedRoutes[url] = {
          meta: meta || {},
          layout,
          scripts,
          context: context || {},
          dataSources: Object.fromEntries(
            // @ts-ignore route.expand exists by now for sure
            Object.entries(route.expand.dataSources).map((
              [k, v]: [string, DataSource],
            ) => [k, {
              ...v,
              parameters: [match].concat(v.parameters),
            }]),
          ),
        };

        ret = { ...route, routes: expandedRoutes };
      }));
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
    });

    ret = {
      ...route,
      routes: { ...ret.routes, ...expandedRouteRoutes },
    };
  }

  return [url, ret];
}

export { expandRoute, expandRoutes };
