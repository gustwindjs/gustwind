import { expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { getJson } from "../../utilities/fs.ts";
import type { Route, Router } from "../../types.ts";

// TODO: Should data source loading go through this?
async function plugin(
  { routesPath }: { routesPath: string },
): Promise<Router> {
  const routes = await getJson<Record<string, Route>>(routesPath);

  /*
  const dataSources = projectPaths.dataSources
    ? await import("file://" + projectPaths.dataSources).then((m) => m)
    : {};
  */

  return {
    getAllRoutes: async () => {
      return flattenRoutes(
        await expandRoutes({
          routes,
          // TODO: Figure out where/how to load data sources
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
