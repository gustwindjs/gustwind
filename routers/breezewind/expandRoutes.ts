import { path as _path } from "../../server-deps.ts";
import { get } from "../../utilities/functional.ts";
import type { DataSources, Route } from "../../types.ts";

async function expandRoutes({ routes, dataSources }: {
  routes: Route["routes"];
  dataSources: DataSources;
}): Promise<NonNullable<Route["routes"]>> {
  if (!routes) {
    throw new Error("Missing route definition");
  }

  const ret: Record<string, Route> = {};

  // Resolve promises in series to avoid race conditions in resolving
  for (
    const [url, route] of Object.entries(routes)
  ) {
    const [expandedUrl, expandedRoute] = await expandRoute({
      url,
      route,
      dataSources,
    });

    ret[expandedUrl] = expandedRoute;
  }

  // / is an exception. If it has an expansion, then it has to be added
  // to the root as otherwise the router won't find it later.
  if (ret["/"]) {
    return { ...ret, ...ret["/"].routes, "/": { ...ret["/"], routes: {} } };
  }

  return ret;
}

async function expandRoute(
  { url, route, dataSources }: {
    url: string;
    route: Route;
    dataSources: DataSources;
  },
): Promise<[string, Route]> {
  let ret = { ...route };

  if (route.expand) {
    const { matchBy } = route.expand;

    if (!matchBy) {
      throw new Error("Tried to matchBy a path that is not matchable");
    }

    const dataSource = dataSources[matchBy.dataSource.operation];

    if (!dataSource) {
      throw new Error("Missing data source");
    }

    if (typeof dataSource !== "function") {
      throw new Error("Data source is not a function");
    }

    const expandedRoutes: Record<string, Route> = {};
    const dataSourceParameter = matchBy.dataSource.parameters;
    const dataSourceResults = await dataSource.apply(
      undefined,
      // @ts-expect-error This is fine.
      dataSourceParameter,
    );

    if (Array.isArray(dataSourceResults)) {
      dataSourceResults.forEach((match) => {
        const u = get(match, matchBy.slug) as string;

        if (!u) {
          throw new Error(
            `Route ${matchBy.slug} is missing from ${
              JSON.stringify(match, null, 2)
            } with slug ${matchBy.slug} within ${url} route`,
          );
        }

        // @ts-ignore route.expand exists by now for sure
        const { meta, layout } = route.expand;

        // @ts-ignore Not sure how to type this
        expandedRoutes[u] = {
          meta,
          layout,
          context: {
            ...expandedRoutes[u]?.context,
            [matchBy.dataSource.name]: match,
          },
          url: u,
        };
      });
    } else {
      console.warn("data source results are not an array");
    }

    ret = {
      ...route,
      routes: { ...(route.routes || {}), ...expandedRoutes },
    };
  } else if (route.dataSources) {
    const context = await getDataSourceContext(
      route.dataSources,
      dataSources,
    );

    return [url, { ...ret, url, context }];
  }

  return [url, { ...ret, url }];
}

async function getDataSourceContext(
  dataSourceIds?: Route["dataSources"],
  dataSources?: DataSources,
): Promise<Record<string, unknown>> {
  if (!dataSourceIds || !dataSources) {
    return {};
  }

  return Object.fromEntries(
    await Promise.all(
      dataSourceIds.map(async ({ name, operation, parameters }) => {
        const dataSource = dataSources[operation];

        if (!dataSource) {
          throw new Error(`Data source ${operation} was not found!`);
        }

        return [
          name,
          await dataSource.apply(
            undefined,
            // @ts-expect-error This is fine
            Array.isArray(parameters) ? parameters : [],
          ),
        ];
      }),
    ),
  );
}

export { expandRoute, expandRoutes };
