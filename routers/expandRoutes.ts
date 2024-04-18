import * as _path from "node:path";
import { applyUtilities } from "../htmlisp/utilities/applyUtility.ts";
import { defaultUtilities } from "../htmlisp/defaultUtilities.ts";
import { get } from "../utilities/functional.ts";
import type {
  Context,
  DataSources,
  Route,
  Utilities,
  Utility,
} from "../types.ts";

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
      recurse: true,
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
  { url, route, dataSources, recurse }: {
    url: string;
    route: Route;
    dataSources: DataSources;
    recurse: boolean;
  },
): Promise<[string, Route, string[]]> {
  let ret = { ...route };
  let allParameters: string[] = [];

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
    const { slug, dataSources: matchByDataSources } = matchBy;
    if (Array.isArray(indexResults)) {
      await Promise.all(indexResults.map(async (match) => {
        const url = get(match, slug) as string;

        if (!url) {
          throw new Error(
            `Route ${matchBy.slug} is missing from ${
              JSON.stringify(match, null, 2)
            } with slug ${matchBy.slug} within ${url} route`,
          );
        }

        const { context, capturedParameters } = await getDataSourceContext(
          matchByDataSources.map((dataSource) => ({
            ...dataSource,
            parameters: [match].concat(
              dataSource.parameters,
            ),
          })),
          dataSources,
        );

        if (capturedParameters) {
          allParameters = allParameters.concat(capturedParameters);
        }

        // @ts-ignore route.expand exists by now for sure
        const { meta, layout, scripts } = route.expand;

        expandedRoutes[url] = {
          // @ts-expect-error This is fine
          meta: await applyUtilities<Utility, Utilities, Context>(
            meta,
            defaultUtilities,
            { context },
          ),
          layout,
          scripts,
          context,
          url,
        };
      }));
    } else {
      console.warn("data source results are not an array");
    }

    // Take care to expand routes since they might have data source related logic etc.
    // to execute.
    if (recurse) {
      const expandedRouteRoutes = await expandRoutes({
        routes: route.routes || {},
        dataSources,
      });
      allParameters = allParameters.concat(expandedRouteRoutes.allParameters);

      ret = {
        ...route,
        routes: {
          ...expandedRouteRoutes.allRoutes,
          ...expandedRoutes,
        },
      };
    }
  }

  // Take care to expand routes since they might have data source related logic etc.
  // to execute.
  if (recurse && route.routes) {
    const expandedRouteRoutes = await expandRoutes({
      routes: route.routes || {},
      dataSources,
    });
    allParameters = allParameters.concat(expandedRouteRoutes.allParameters);

    ret = {
      ...route,
      routes: { ...ret.routes, ...expandedRouteRoutes.allRoutes },
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
