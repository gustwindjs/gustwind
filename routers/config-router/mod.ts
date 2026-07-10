import * as path from "node:path";
import { raw } from "../../htmlisp/mod.ts";
import { expandRoutes } from "../utilities/expandRoutes.ts";
import { flattenRoutes } from "../utilities/flattenRoutes.ts";
import { matchRoute } from "../utilities/matchRoute.ts";
import { getDataSourceContext } from "../utilities/getDataSourceContext.ts";
import { trim } from "../../utilities/string.ts";
import type {
  BuildDiagnostics,
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
  memoizeDataSources?: boolean;
  routesPath: string;
  emitAllRoutes: boolean;
};
type ConfigRouterContext = {
  dataSourceCache?: Map<string, Promise<unknown>>;
  routes: Routes;
  dataSources: DataSources;
  dynamicRoutes: string[];
};
type ConfigRouterServices = {
  cwd: string;
  dataSourcesPath: string;
  load: LoadApi;
  memoizeDataSources: boolean;
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
      options: { dataSourcesPath, memoizeDataSources, routesPath, emitAllRoutes },
      load,
      renderComponent,
      renderComponentSync,
    },
  ) {
    const services: ConfigRouterServices = {
      cwd,
      dataSourcesPath,
      load,
      memoizeDataSources: memoizeDataSources ?? false,
      outputDirectory,
      renderComponent,
      renderComponentSync,
      routesPath,
    };

    return {
      initPluginContext: () => initConfigRouterContext(services),
      getAllRoutes: ({ buildDiagnostics, pluginContext, routeConcurrency }) =>
        getConfigRouterRoutes({
          buildDiagnostics,
          emitAllRoutes,
          outputDirectory,
          pluginContext,
          routeConcurrency,
        }),
      matchRoute: (url: string, pluginContext, buildDiagnostics) =>
        matchConfigRoute(url, pluginContext, buildDiagnostics),
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

  return {
    routes,
    dataSources,
    dataSourceCache: services.memoizeDataSources ? new Map() : undefined,
    dynamicRoutes: [],
  };
}

async function getConfigRouterRoutes(
  {
    emitAllRoutes,
    buildDiagnostics,
    outputDirectory,
    pluginContext,
    routeConcurrency,
  }: {
    emitAllRoutes: boolean;
    buildDiagnostics?: BuildDiagnostics;
    outputDirectory: string;
    pluginContext: ConfigRouterContext;
    routeConcurrency?: number;
  },
) {
  const routes = await getAllRoutes(
    pluginContext.routes,
    pluginContext.dataSources,
    routeConcurrency,
    withPluginDataSourceCache(pluginContext, buildDiagnostics),
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
  buildDiagnostics?: BuildDiagnostics,
) {
  if (pluginContext.dynamicRoutes.includes(trim(url, "/"))) {
    return;
  }

  const route = await matchRoute(
    pluginContext.routes,
    url,
    pluginContext.dataSources,
  );

  if (!route) {
    return;
  }

  const context = await getDataSourceContext(
    route.parentDataSources,
    route.dataSources,
    pluginContext.dataSources,
    Number.POSITIVE_INFINITY,
    withPluginDataSourceCache(pluginContext, buildDiagnostics),
  );

  return {
    ...route,
    context: { ...route.parentDataSources, ...route.context, ...context },
  };
}

function withPluginDataSourceCache(
  pluginContext: ConfigRouterContext,
  buildDiagnostics?: BuildDiagnostics,
): BuildDiagnostics | undefined {
  if (buildDiagnostics?.dataSourceCache || !pluginContext.dataSourceCache) {
    return buildDiagnostics;
  }

  return {
    ...buildDiagnostics,
    dataSourceCache: pluginContext.dataSourceCache,
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
  buildDiagnostics?: BuildDiagnostics,
) {
  const allRoutes = await expandRoutes({
    routes,
    buildDiagnostics,
    dataSources,
    routeConcurrency,
  });

  return flattenRoutes(allRoutes);
}

export { plugin };
