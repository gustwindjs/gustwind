import { path as _path } from "../../server-deps.ts";
import { get } from "../../utilities/functional.ts";
import type { DataSources, Route } from "../../types.ts";

async function expandRoutes({ routes, dataSources }: {
  routes: Record<string, Route>;
  dataSources: DataSources;
}): Promise<
  NonNullable<{ allRoutes: Record<string, Route>; allParameters: string[] }>
> {
  const allRoutes: Record<string, Route> = {};
  let allParameters: string[] = [];

  // Resolve promises in series to avoid race conditions in resolving
  for (
    const [url, route] of Object.entries(routes)
  ) {
    const [expandedUrl, expandedRoute, parameters] = await expandRoute({
      url,
      route,
      dataSources,
    });

    allRoutes[expandedUrl] = expandedRoute;
    allParameters = allParameters.concat(parameters);
  }

  // / is an exception. If it has an expansion, then it has to be added
  // to the root as otherwise the router won't find it later.
  if (allRoutes["/"]) {
    return {
      allRoutes: {
        ...allRoutes,
        ...allRoutes["/"].routes,
        "/": { ...allRoutes["/"], routes: {} },
      },
      allParameters,
    };
  }

  return { allRoutes, allParameters };
}

async function expandRoute(
  { url, route, dataSources }: {
    url: string;
    route: Route;
    dataSources: DataSources;
  },
): Promise<[string, Route, string[]]> {
  let ret = { ...route };
  let allParameters: string[] = [];

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
    const dataSourceParameters = matchBy.dataSource.parameters as string[];
    const dataSourceResults = await dataSource.apply(
      undefined,
      // @ts-expect-error This is fine.
      dataSourceParameters,
    );
    allParameters = allParameters.concat(dataSourceParameters);

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

    // Take care to expand routes since they might have data source related logic etc.
    // to execute.
    const expandedRouteRoutes = await expandRoutes({
      routes: route.routes || {},
      dataSources,
    });
    allParameters = allParameters.concat(expandedRouteRoutes.allParameters);

    ret = {
      ...route,
      routes: {
        ...(expandedRouteRoutes).allRoutes,
        ...expandedRoutes,
      },
    };
  }

  // Take care to expand routes since they might have data source related logic etc.
  // to execute.
  if (route.routes) {
    console.log("expanding route routes", route, route.routes);

    const expandedRouteRoutes = await expandRoutes({
      routes: route.routes || {},
      dataSources,
    });
    allParameters = allParameters.concat(expandedRouteRoutes.allParameters);

    ret = {
      ...route,
      routes: expandedRouteRoutes.allRoutes,
    };
  }

  if (route.dataSources) {
    const { context, capturedParameters } = await getDataSourceContext(
      route.dataSources,
      dataSources,
    );

    if (capturedParameters) {
      allParameters = allParameters.concat(capturedParameters);
    }

    return [url, { ...ret, url, context }, allParameters];
  }

  return [url, { ...ret, url }, allParameters];
}

async function getDataSourceContext(
  dataSourceIds?: Route["dataSources"],
  dataSources?: DataSources,
) {
  if (!dataSourceIds || !dataSources) {
    return {};
  }
  let capturedParameters: string[] = [];

  const context = Object.fromEntries(
    await Promise.all(
      dataSourceIds.map(async ({ name, operation, parameters }) => {
        const dataSource = dataSources[operation];

        if (!dataSource) {
          throw new Error(`Data source ${operation} was not found!`);
        }

        capturedParameters = capturedParameters.concat(parameters as string[]);

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

  return { context, capturedParameters };
}

export { expandRoute, expandRoutes };
