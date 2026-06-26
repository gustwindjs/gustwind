import * as path from "node:path";
import { raw } from "../../htmlisp/mod.ts";
import { expandRoutes } from "../utilities/expandRoutes.ts";
import { flattenRoutes } from "../utilities/flattenRoutes.ts";
import { matchRoute } from "../utilities/matchRoute.ts";
import { getDataSourceContext } from "../utilities/getDataSourceContext.ts";
import { trim } from "../../utilities/string.ts";
import type {
  DataSources,
  DataSourcesModule,
  LoadApi,
  Plugin,
  PluginApi,
  Render,
  RenderSync,
  Route,
} from "../../types.ts";

type Routes = Record<string, Route>;
type ConfigRouterOptions = {
  dataSourcesPath: string;
  routesPath: string;
  emitAllRoutes: boolean;
};
type ConfigRouterContext = {
  routes: Routes;
  dataSources: DataSources;
  dynamicRoutes: string[];
};
type ConfigRouterServices = {
  cwd: string;
  dataSourcesPath: string;
  load: LoadApi;
  outputDirectory: string;
  renderComponent: Render;
  renderComponentSync: RenderSync;
  routesPath: string;
};

const plugin: Plugin<ConfigRouterOptions, ConfigRouterContext> = {
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
      renderComponent,
      renderComponentSync,
    },
  ) {
    const services: ConfigRouterServices = {
      cwd,
      dataSourcesPath,
      load,
      outputDirectory,
      renderComponent,
      renderComponentSync,
      routesPath,
    };

    return {
      initPluginContext: () => initConfigRouterContext(services),
      getAllRoutes: ({ pluginContext, routeConcurrency }) =>
        getConfigRouterRoutes({
          emitAllRoutes,
          outputDirectory,
          pluginContext,
          routeConcurrency,
        }),
      matchRoute: (url: string, pluginContext) =>
        matchConfigRoute(url, pluginContext),
      onMessage: ({ message, pluginContext }) =>
        handleConfigRouterMessage({ message, pluginContext, services }),
    };
  },
};

async function initConfigRouterContext(services: ConfigRouterServices) {
  const [routes, dataSources] = await Promise.all([
    loadRoutes(services),
    loadDataSources(services),
  ]);

  return { routes, dataSources, dynamicRoutes: [] };
}

async function getConfigRouterRoutes(
  {
    emitAllRoutes,
    outputDirectory,
    pluginContext,
    routeConcurrency,
  }: {
    emitAllRoutes: boolean;
    outputDirectory: string;
    pluginContext: ConfigRouterContext;
    routeConcurrency?: number;
  },
) {
  const routes = await getAllRoutes(
    pluginContext.routes,
    pluginContext.dataSources,
    routeConcurrency,
  );

  return {
    routes,
    tasks: emitAllRoutes ? [createAllRoutesTask(outputDirectory, routes)] : [],
  };
}

function createAllRoutesTask(outputDirectory: string, routes: Routes) {
  return {
    type: "writeTextFile" as const,
    payload: {
      outputDirectory,
      file: "routes.json",
      data: JSON.stringify(routes),
    },
  };
}

async function matchConfigRoute(
  url: string,
  pluginContext: ConfigRouterContext,
) {
  if (pluginContext.dynamicRoutes.includes(trim(url, "/"))) {
    return;
  }

  const route = await matchRoute(
    pluginContext.routes,
    url,
    pluginContext.dataSources,
  );
  const context = await getDataSourceContext(
    route.parentDataSources,
    route.dataSources,
    pluginContext.dataSources,
  );

  return {
    ...route,
    context: { ...route.parentDataSources, ...route.context, ...context },
  };
}

async function handleConfigRouterMessage(
  {
    message,
    pluginContext,
    services,
  }: {
    message: Parameters<
      NonNullable<PluginApi<ConfigRouterContext>["onMessage"]>
    >[0]["message"];
    pluginContext: ConfigRouterContext;
    services: ConfigRouterServices;
  },
) {
  return await handleConfigRouterMessagePayload(
    message,
    pluginContext,
    services,
  );
}

async function handleConfigRouterMessagePayload(
  message: Parameters<
    NonNullable<PluginApi<ConfigRouterContext>["onMessage"]>
  >[0]["message"],
  pluginContext: ConfigRouterContext,
  services: ConfigRouterServices,
) {
  const { type, payload } = message;

  if (type === "addDynamicRoute") {
    addDynamicRoute(pluginContext, payload.path);
    return;
  }

  if (type !== "fileChanged") {
    return;
  }

  return await handleConfigRouterFileChange(payload, services);
}

function addDynamicRoute(
  pluginContext: ConfigRouterContext,
  routePath: string,
) {
  if (!pluginContext.dynamicRoutes.includes(routePath)) {
    // TODO: Figure out why returning a concat doesn't patch the
    // state correctly (lifecycle issue?)
    pluginContext.dynamicRoutes.push(routePath);
  }
}

async function handleConfigRouterFileChange(
  payload: { type: string },
  services: ConfigRouterServices,
) {
  switch (payload.type) {
    case "routes":
      return {
        send: [{ type: "reloadPage" as const, payload: undefined }],
        pluginContext: { routes: await loadRoutes(services) },
      };
    case "dataSources":
      return {
        send: [{ type: "reloadPage" as const, payload: undefined }],
        pluginContext: { dataSources: await loadDataSources(services) },
      };
    case "paths":
      return { send: [{ type: "reloadPage" as const, payload: undefined }] };
  }
}

function loadRoutes(services: ConfigRouterServices) {
  return services.load.json<Routes>({
    path: path.join(services.cwd, services.routesPath),
    type: "routes",
  });
}

async function loadDataSources(services: ConfigRouterServices) {
  return services.dataSourcesPath
    ? (await services.load.module<DataSourcesModule>({
      path: path.join(services.cwd, services.dataSourcesPath),
      type: "dataSources",
    })).init({
      load: services.load,
      render: services.renderComponent,
      renderRaw: raw,
      renderSync: services.renderComponentSync,
    })
    : {};
}

async function getAllRoutes(
  routes: Routes,
  dataSources: DataSources,
  routeConcurrency?: number,
) {
  const allRoutes = await expandRoutes({
    routes,
    dataSources,
    routeConcurrency,
  });

  return flattenRoutes(allRoutes);
}

export { plugin };
