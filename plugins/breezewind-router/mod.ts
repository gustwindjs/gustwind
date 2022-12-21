import { expandRoute, expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { path } from "../../server-deps.ts";
import { trim } from "../../utilities/string.ts";
import type { DataSources, Plugin, Route } from "../../types.ts";

type Routes = Record<string, Route>;

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
    const routes = await load.json<Routes>(
      path.join(cwd, routesPath),
    );
    const dataSources = dataSourcesPath
      ? await load.module<DataSources>(path.join(cwd, dataSourcesPath))
      : {};

    return {
      getAllRoutes: async () => {
        const { allRoutes } = await getAllRoutes(routes, dataSources);

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
        const { allRoutes, allParameters } = await getAllRoutes(
          routes,
          dataSources,
        );
        const matchedRoute = matchRoute(allRoutes, url);

        if (matchedRoute) {
          const [_, route] = await expandRoute({
            url,
            route: matchedRoute,
            dataSources,
          });

          return {
            route,
            tasks: [{
              type: "watchPaths",
              payload: { paths: allParameters },
            }],
          };
        }

        return { route: undefined, tasks: [] };
      },
    };
  },
};

async function getAllRoutes(routes: Routes, dataSources: DataSources) {
  const { allRoutes, allParameters } = await expandRoutes({
    routes,
    dataSources,
  });

  return { allRoutes: flattenRoutes(allRoutes), allParameters };
}

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
