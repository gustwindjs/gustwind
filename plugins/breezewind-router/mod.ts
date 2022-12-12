import { expandRoute, expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { path } from "../../server-deps.ts";
import { trim } from "../../utilities/string.ts";
import type {
  DataSources,
  Plugin,
  PluginMeta,
  PluginParameters,
  Route,
} from "../../types.ts";

const meta: PluginMeta = {
  name: "breezewind-renderer-plugin",
  dependsOn: [],
};

async function plugin(
  { options: { dataSourcesPath, include, routesPath }, load }: PluginParameters<
    {
      dataSourcesPath: string;
      include: string[];
      routesPath: string;
    }
  >,
): Promise<Plugin> {
  const cwd = Deno.cwd();
  const routes = await load.json<Record<string, Route>>(
    path.join(cwd, routesPath),
  );
  const dataSources = dataSourcesPath
    ? await load.module<DataSources>(path.join(cwd, dataSourcesPath))
    : {};

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
      const matchedRoute = matchRoute(routes, url);

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

export { meta, plugin };
