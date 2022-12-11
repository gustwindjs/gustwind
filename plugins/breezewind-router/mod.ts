import { expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { getJson } from "../../utilities/fs.ts";
import { path } from "../../server-deps.ts";
import { trim } from "../../utilities/string.ts";
import type { Plugin, PluginMeta, Route } from "../../types.ts";

const meta: PluginMeta = {
  name: "breezewind-renderer-plugin",
  dependsOn: [],
};

async function plugin(
  { dataSourcesPath, include, routesPath }: {
    dataSourcesPath: string;
    include: string[];
    routesPath: string;
  },
): Promise<Plugin> {
  const cwd = Deno.cwd();
  const routes = await getJson<Record<string, Route>>(
    path.join(cwd, routesPath),
  );

  // TODO: How to handle watching + cache on change?
  const dataSources = dataSourcesPath
    ? await import("file://" + path.join(cwd, dataSourcesPath)).then((m) => m)
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
    matchRoute(url: string) {
      return matchRoute(routes, url);
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
