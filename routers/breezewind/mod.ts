import { expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { getJson } from "../../utilities/fs.ts";
import type { Route, Router } from "../../types.ts";

// TODO: Should data source loading go through this?
async function plugin(
  { dataSourcesPath, routesPath }: {
    dataSourcesPath: string;
    routesPath: string;
  },
): Promise<Router> {
  const routes = await getJson<Record<string, Route>>(routesPath);

  // TODO: How to handle watching + cache on change?
  const dataSources = dataSourcesPath
    ? await import("file://" + dataSourcesPath).then((m) => m)
    : {};

  return {
    getAllRoutes: async () => {
      // TODO: Handle reading data source contents to each route here as well
      return flattenRoutes(
        await expandRoutes({
          routes,
          dataSources,
        }),
      );
    },
    matchRoute(url: string) {
      // TODO: This should check if the given url exists in the route definition
      // To keep this fast, it should avoid flattening/expanding beforehand and
      // should evaluate dataSources only if a route was found
      return undefined;
    },
  };
}

/*
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

function matchRoute(
  routes: Route["routes"],
  pathname: string,
): Route | undefined {
  if (!routes) {
    return;
  }

  const parts = trim(pathname, "/").split("/");
  const match = routes[pathname] || routes[parts[0]];

  if (match && match.routes && parts.length > 1) {
    return matchRoute(match.routes, parts.slice(1).join("/"));
  }

  return match;
}
*/

export { plugin };
