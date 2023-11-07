import { expandRoute, expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { path } from "../../server-deps.ts";
import { trim } from "../../utilities/string.ts";
import type {
  DataSources,
  DataSourcesModule,
  Plugin,
  Route,
} from "../../types.ts";

type Routes = Record<string, Route>;

const plugin: Plugin<{
  dataSourcesPath: string;
  routesPath: string;
  emitAllRoutes: boolean;
}> = {
  meta: {
    name: "breezewind-renderer-plugin",
    dependsOn: [],
  },
  init: async (
    {
      cwd,
      outputDirectory,
      options: { dataSourcesPath, routesPath, emitAllRoutes },
      load,
    },
  ) => {
    let routes = await loadRoutes();
    let dataSources = await loadDataSources();

    function loadRoutes() {
      return load.json<Routes>({
        path: path.join(cwd, routesPath),
        type: "routes",
      });
    }

    async function loadDataSources() {
      return dataSourcesPath
        ? (await load.module<DataSourcesModule>({
          path: path.join(cwd, dataSourcesPath),
          type: "dataSources",
        })).init({ load })
        : {};
    }

    return {
      getAllRoutes: async () => {
        const { allRoutes } = await getAllRoutes(routes, dataSources);

        return {
          routes: allRoutes,
          tasks: emitAllRoutes
            ? [{
              type: "writeTextFile",
              payload: {
                outputDirectory,
                file: "routes.json",
                data: JSON.stringify(allRoutes),
              },
            }]
            : [],
        };
      },
      matchRoute: async (allRoutes: Routes, url: string) => {
        const matchedRoute = matchRoute(allRoutes, url);

        if (matchedRoute) {
          const [_, route] = await expandRoute({
            url,
            route: matchedRoute,
            dataSources,
          });

          return { route, tasks: [], allRoutes };
        }

        return { route: undefined, tasks: [], allRoutes };
      },
      onMessage: async ({ message }) => {
        const { type, payload } = message;

        if (type === "fileChanged") {
          switch (payload.type) {
            case "routes": {
              routes = await loadRoutes();

              return { send: [{ type: "reloadPage" }] };
            }
            case "dataSources": {
              dataSources = await loadDataSources();

              return { send: [{ type: "reloadPage" }] };
            }
            case "paths": {
              return { send: [{ type: "reloadPage" }] };
            }
          }
        }
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
