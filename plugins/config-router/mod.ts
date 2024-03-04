import * as path from "node:path";
import { expandRoute, expandRoutes } from "./expandRoutes.ts";
import { flattenRoutes } from "./flattenRoutes.ts";
import { matchRoute } from "../../utilities/matchRoute.ts";
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
}, { routes: Routes; dataSources: DataSources }> = {
  meta: {
    name: "config-router-plugin",
    description: "${name} implements a configuration based router.",
    dependsOn: [],
  },
  init(
    {
      cwd,
      outputDirectory,
      options: { dataSourcesPath, routesPath, emitAllRoutes },
      load,
    },
  ) {
    return {
      initPluginContext: async () => {
        const [routes, dataSources] = await Promise.all([
          loadRoutes(),
          loadDataSources(),
        ]);

        return { routes, dataSources };
      },
      getAllRoutes: async ({ pluginContext }) => {
        const { allRoutes } = await getAllRoutes(
          pluginContext.routes,
          pluginContext.dataSources,
        );

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
      matchRoute: async (allRoutes: Routes, url: string, pluginContext) => {
        const matchedRoute = matchRoute(allRoutes, url);

        if (matchedRoute) {
          const [_, route] = await expandRoute({
            url,
            route: matchedRoute,
            dataSources: pluginContext.dataSources,
          });

          return { route, tasks: [], allRoutes };
        }

        throw new Error(
          `config-router-plugin - Match for url ${url} was not found`,
        );
      },
      onMessage: async ({ message }) => {
        const { type, payload } = message;

        if (type === "fileChanged") {
          switch (payload.type) {
            case "routes": {
              const routes = await loadRoutes();

              return {
                send: [{ type: "reloadPage", payload: undefined }],
                pluginContext: { routes },
              };
            }
            case "dataSources": {
              const dataSources = await loadDataSources();

              return {
                send: [{ type: "reloadPage", payload: undefined }],
                pluginContext: { dataSources },
              };
            }
            case "paths": {
              return { send: [{ type: "reloadPage", payload: undefined }] };
            }
          }
        }
      },
    };

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
  },
};

async function getAllRoutes(routes: Routes, dataSources: DataSources) {
  const { allRoutes, allParameters } = await expandRoutes({
    routes,
    dataSources,
  });

  return { allRoutes: flattenRoutes(allRoutes), allParameters };
}

export { plugin };
