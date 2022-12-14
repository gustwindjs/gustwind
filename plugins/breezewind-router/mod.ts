import { expandRoute, expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { path } from "../../server-deps.ts";
import { trim } from "../../utilities/string.ts";
import type { DataSources, Plugin, Route } from "../../types.ts";

const plugin: Plugin<{
  dataSourcesPath: string;
  include: string[];
  routesPath: string;
}> = {
  meta: {
    name: "breezewind-renderer-plugin",
    dependsOn: [],
  },
  init: async ({ options: { dataSourcesPath, include, routesPath }, load }) => {
    const cwd = Deno.cwd();
    const routes = await load.json<Record<string, Route>>(
      path.join(cwd, routesPath),
    );
    const dataSources = dataSourcesPath
      ? await load.module<DataSources>(path.join(cwd, dataSourcesPath))
      : {};
    let allRoutes: Record<string, Route>;

    return {
      getAllRoutes: async () => {
        const allRoutes = flattenRoutes(
          await expandRoutes({
            routes,
            dataSources,
          }),
        );

        if (include) {
          return Object.fromEntries(
            Object.entries(
              allRoutes,
            ).filter(([url]) => include.includes(url)),
          );
        }

        return allRoutes;
      },
      matchRoute: async (url: string) => {
        // As an optimization, flatten routes only on demand.
        // This could be optimized further by pushing more work to matchRoute
        if (!allRoutes) {
          allRoutes = flattenRoutes(
            await expandRoutes({
              routes,
              dataSources,
            }),
          );
        }

        const matchedRoute = matchRoute(allRoutes, url);

        if (matchedRoute) {
          const [_, route] = await expandRoute({
            url,
            route: matchedRoute,
            dataSources,
          });

          return route;
        }
      },
    };
  },
};

function matchRoute(
  routes: Record<string, Route>,
  url: string,
): Route | undefined {
  if (!routes) {
    return;
  }

  const parts = trim(url, "/").split("/");
  const match = routes[url] || routes[parts[0]];

  if (match && match.routes && parts.length > 1) {
    return matchRoute(match.routes, parts.slice(1).join("/"));
  }

  return match;
}

export { plugin };
