import * as path from "node:path";
import { htmlispToHTML, htmlispToHTMLSync, raw } from "../../htmlisp/mod.ts";
import type { Context, Utilities, Utility } from "../../types.ts";
import { applyUtilities } from "../../htmlisp/utilities/applyUtilities.ts";
import { defaultUtilities } from "../../htmlisp/defaultUtilities.ts";
import {
  type ComponentDependencyGraph,
  type ComponentSourceDefinition,
  createComponentDependencyGraph,
} from "../../utilities/componentDependencyGraph.ts";
import { initLoader } from "../../utilities/htmlLoader.ts";
import { createRuntimeUtilitiesResolver } from "../../utilities/runtimeUtilitiesCache.ts";
import type {
  BuildWorkerEvent,
  GlobalUtilities,
  LoadApi,
  MatchRoute,
  Mode,
  Plugin,
  PluginApi,
  Render,
  RenderSync,
  Route,
} from "../../types.ts";
import { isDebugEnabled } from "../../utilities/runtime.ts";

const DEBUG = isDebugEnabled();
type ComponentPathDefinition = { path: string; selection?: string[] };
type HtmlispRendererPluginContext = {
  htmlLoader: ReturnType<typeof initLoader>;
  componentDefinitions: Record<string, ComponentSourceDefinition>;
  componentGraph: ComponentDependencyGraph;
  components: Record<string, string>;
  componentUtilities: Record<string, GlobalUtilities | undefined>;
  globalDependencyTasks: BuildWorkerEvent[];
  globalUtilities: GlobalUtilities;
};
type RuntimeUtilitiesResolver = ReturnType<
  typeof createRuntimeUtilitiesResolver
>;
type RendererServices = {
  components: ComponentPathDefinition[];
  cwd: string;
  getRuntimeUtilities: RuntimeUtilitiesResolver;
  globalUtilitiesPath: string;
  load: LoadApi;
  mode: Mode;
  renderComponent: Render;
  renderComponentSync: RenderSync;
};

const plugin: Plugin<
  {
    components: ComponentPathDefinition[];
    globalUtilitiesPath: string;
  },
  HtmlispRendererPluginContext
> = {
  meta: {
    name: "htmlisp-renderer-plugin",
    description: "${name} allows rendering using HTMLisp templating language.",
    dependsOn: ["gustwind-meta-plugin"],
  },
  init({ cwd, options, load, renderComponent, renderComponentSync, mode }) {
    const { components, globalUtilitiesPath } = options;
    const getRuntimeUtilities = createRuntimeUtilitiesResolver({
      load,
      render: renderComponent,
      renderSync: renderComponentSync,
    });
    const services: RendererServices = {
      components,
      cwd,
      getRuntimeUtilities,
      globalUtilitiesPath,
      load,
      mode,
      renderComponent,
      renderComponentSync,
    };

    // TODO: Push the check to the plugin system core
    if (!globalUtilitiesPath) {
      throw new Error(
        "htmlisp-renderer-plugin - globalUtilitiesPath was not provided",
      );
    }

    return {
      initPluginContext: () => initRendererPluginContext(services),
      sendMessages: async () => undefined,
      prepareContext: ({ url, route, send }) =>
        prepareRendererContext({ mode, route, send, url }),
      renderLayout: (args) => renderRendererLayout(args, services),
      renderComponent: ({
        matchRoute,
        componentName,
        htmlInput,
        context,
        props,
        pluginContext,
      }) =>
        renderRendererComponent({
          componentName,
          context,
          htmlInput,
          matchRoute,
          pluginContext,
          props,
          services,
        }),
      renderComponentSync: ({
        matchRoute,
        componentName,
        htmlInput,
        context,
        props,
        pluginContext,
      }) =>
        renderRendererComponentSync({
          componentName,
          context,
          htmlInput,
          matchRoute,
          pluginContext,
          props,
          services,
        }),
      onMessage: ({ message, pluginContext }) =>
        handleRendererMessage({ message, pluginContext, services }),
    };
  },
};

async function initRendererPluginContext(
  services: RendererServices,
): Promise<HtmlispRendererPluginContext> {
  const htmlLoader = createHtmlLoader(services.cwd, services.load);
  const [
    { componentDefinitions, componentGraph, components, componentUtilities },
    globalUtilities,
  ] = await Promise.all([
    loadComponents(htmlLoader, services.components),
    loadGlobalUtilities(services),
  ]);

  return {
    htmlLoader,
    componentDefinitions,
    componentGraph,
    components,
    componentUtilities,
    globalDependencyTasks: getGlobalDependencyTasks(services),
    globalUtilities,
  };
}

function createHtmlLoader(cwd: string, load: LoadApi) {
  return initLoader({
    cwd,
    loadDir: load.dir,
    loadModule: (path) =>
      load.module<GlobalUtilities>({ path, type: "globalUtilities" }),
    readTextFile: load.textFile,
  });
}

async function prepareRendererContext({
  mode,
  route,
  send,
  url,
}: {
  mode: Mode;
  route: Route;
  send: (
    pluginName: string,
    message: { type: "getMeta"; payload: undefined },
  ) => unknown | Promise<unknown>;
  url: string;
}) {
  const meta = await send("gustwind-meta-plugin", {
    type: "getMeta",
    payload: undefined,
  });
  const runtimeMeta: Record<string, string> = {
    built: new Date().toString(),
  };

  if (mode === "development") {
    runtimeMeta.url = url;
  }

  const context = {
    ...route.context,
    meta: {
      ...runtimeMeta,
      // @ts-expect-error This is fine
      ...meta,
      ...route.meta,
      // @ts-expect-error This is fine
      ...route.context?.meta,
    },
  };
  const appliedContext = await applyUtilities<Utility, Utilities, Context>(
    context,
    defaultUtilities,
    { context },
  );

  return {
    context: { ...context, ...appliedContext, url },
  };
}

async function renderRendererLayout(
  {
    matchRoute,
    route,
    context,
    url,
    pluginContext,
  }: {
    matchRoute: MatchRoute;
    route: Route;
    context: Context;
    url: string;
    pluginContext: HtmlispRendererPluginContext;
  },
  services: RendererServices,
) {
  const { components, componentUtilities, globalUtilities } = pluginContext;
  const layout = components[route.layout];

  if (!layout) {
    throw new Error(
      `htmlisp-renderer-plugin - layout ${route.layout} to render was not found for url ${url}`,
    );
  }

  const runtimeUtilities = services.getRuntimeUtilities({
    componentUtilities,
    globalUtilities,
    matchRoute,
    url,
  });

  try {
    return await htmlispToHTML({
      htmlInput: layout,
      components,
      context,
      utilities: {
        ...runtimeUtilities.utilities,
        ...getLayoutUtilities({
          layoutUtilities: componentUtilities[route.layout],
          matchRoute,
          services,
          url,
        }),
      },
      componentUtilities: runtimeUtilities.componentUtilities,
    });
  } catch (error) {
    throw withRenderContext(error, { layout: route.layout, url });
  }
}

function getLayoutUtilities({
  layoutUtilities,
  matchRoute,
  services,
  url,
}: {
  layoutUtilities: GlobalUtilities | undefined;
  matchRoute: MatchRoute;
  services: RendererServices;
  url: string;
}) {
  return layoutUtilities
    ? layoutUtilities.init({
        load: services.load,
        raw,
        render: services.renderComponent,
        renderRaw: raw,
        renderSync: services.renderComponentSync,
        matchRoute,
        url,
      })
    : {};
}

function renderRendererComponent({
  componentName,
  context,
  htmlInput,
  matchRoute,
  pluginContext,
  props,
  services,
}: {
  componentName?: string;
  context: Context;
  htmlInput?: string;
  matchRoute: MatchRoute;
  pluginContext: HtmlispRendererPluginContext;
  props: Context;
  services: RendererServices;
}) {
  const { components, componentUtilities, globalUtilities } = pluginContext;
  const runtimeUtilities = services.getRuntimeUtilities({
    componentUtilities,
    globalUtilities,
    matchRoute,
    url: "",
  });

  return htmlispToHTML({
    htmlInput: getComponentHtmlInput(componentName, htmlInput, components),
    components,
    context,
    props,
    utilities: runtimeUtilities.utilities,
    componentUtilities: runtimeUtilities.componentUtilities,
  });
}

function renderRendererComponentSync({
  componentName,
  context,
  htmlInput,
  matchRoute,
  pluginContext,
  props,
  services,
}: {
  componentName?: string;
  context: Context;
  htmlInput?: string;
  matchRoute: MatchRoute;
  pluginContext: HtmlispRendererPluginContext;
  props: Context;
  services: RendererServices;
}) {
  const { components, componentUtilities, globalUtilities } = pluginContext;
  const runtimeUtilities = services.getRuntimeUtilities({
    componentUtilities,
    globalUtilities,
    matchRoute,
    url: "",
  });

  return htmlispToHTMLSync({
    htmlInput: getComponentHtmlInput(componentName, htmlInput, components),
    components,
    context,
    props,
    utilities: runtimeUtilities.utilities,
    componentUtilities: runtimeUtilities.componentUtilities,
  });
}

function getComponentHtmlInput(
  componentName: string | undefined,
  htmlInput: string | undefined,
  components: Record<string, string>,
) {
  if (!componentName) {
    return htmlInput;
  }

  const componentHtmlInput = components[componentName];

  if (!componentHtmlInput) {
    throw new Error(`Component ${componentName} was not found to render`);
  }

  return componentHtmlInput;
}

async function handleRendererMessage({
  message,
  pluginContext,
  services,
}: {
  message: Parameters<
    NonNullable<PluginApi<HtmlispRendererPluginContext>["onMessage"]>
  >[0]["message"];
  pluginContext: HtmlispRendererPluginContext;
  services: RendererServices;
}) {
  const { type, payload } = message;
  const handler = rendererMessageHandlers[type];

  if (!handler) {
    return;
  }

  return handler(payload, pluginContext, services);
}

const rendererMessageHandlers: Record<
  string,
  (
    payload: any,
    pluginContext: HtmlispRendererPluginContext,
    services: RendererServices,
  ) => any
> = {
  fileChanged: handleRendererFileChange,
  getComponentDependencyGraph: getComponentDependencyGraphMessageResult,
  getComponents: (_payload, pluginContext) => ({
    result: pluginContext.components,
  }),
  getRenderContext: getRenderContextMessageResult,
  getRenderer: (payload, pluginContext) => ({
    result: pluginContext.components[payload],
  }),
};

function getComponentDependencyGraphMessageResult(
  _payload: unknown,
  pluginContext: HtmlispRendererPluginContext,
) {
  return {
    result: {
      componentGraph: pluginContext.componentGraph,
      globalDependencyTasks: pluginContext.globalDependencyTasks,
    },
  };
}

async function handleRendererFileChange(
  payload: { type: string; path: string },
  pluginContext: HtmlispRendererPluginContext,
  services: RendererServices,
) {
  DEBUG && console.log("htmlisp-renderer - file changed", payload);

  if (payload.type === "paths") {
    return { send: [{ type: "reloadPage" as const, payload: undefined }] };
  }

  const nextPluginContext: Partial<HtmlispRendererPluginContext> = {};

  await updateReloadedComponents(
    nextPluginContext,
    payload,
    pluginContext,
    services,
  );
  await updateReloadedGlobalUtilities(nextPluginContext, payload, services);

  return {
    send: [{ type: "reloadPage" as const, payload: undefined }],
    pluginContext: nextPluginContext,
  };
}

async function updateReloadedComponents(
  nextPluginContext: Partial<HtmlispRendererPluginContext>,
  payload: { type: string; path: string },
  pluginContext: HtmlispRendererPluginContext,
  services: RendererServices,
) {
  if (shouldReloadComponents(payload, services)) {
    Object.assign(
      nextPluginContext,
      await loadComponents(pluginContext.htmlLoader, services.components),
    );
  }
}

async function updateReloadedGlobalUtilities(
  nextPluginContext: Partial<HtmlispRendererPluginContext>,
  payload: { type: string; path: string },
  services: RendererServices,
) {
  if (shouldReloadGlobalUtilities(payload, services)) {
    nextPluginContext.globalUtilities = await loadGlobalUtilities(services);
  }
}

function getRenderContextMessageResult(
  payload: { matchRoute: MatchRoute; url: string },
  pluginContext: HtmlispRendererPluginContext,
  services: RendererServices,
) {
  const { components, componentUtilities, globalUtilities } = pluginContext;
  const runtimeUtilities = services.getRuntimeUtilities({
    componentUtilities,
    globalUtilities,
    matchRoute: payload.matchRoute,
    url: payload.url,
  });

  return {
    result: {
      components,
      componentUtilities: runtimeUtilities.componentUtilities,
      utilities: runtimeUtilities.utilities,
    },
  };
}

// This function looks into different component paths, loads them,
// and finally aggregates them into a single data structure.
async function loadComponents(
  htmlLoader: ReturnType<typeof initLoader>,
  components: ComponentPathDefinition[],
): Promise<{
  componentDefinitions: Record<string, ComponentSourceDefinition>;
  componentGraph: ComponentDependencyGraph;
  components: Record<string, string>;
  componentUtilities: Record<string, GlobalUtilities | undefined>;
}> {
  const loadedComponents = await Promise.all(
    components.map(({ path: componentsPath, selection }) =>
      htmlLoader(componentsPath, selection),
    ),
  );
  const componentDefinitions = Object.assign(
    {},
    ...loadedComponents.map(({ componentDefinitions }) => componentDefinitions),
  );

  return {
    componentDefinitions,
    componentGraph: createComponentDependencyGraph(componentDefinitions),
    components: Object.assign(
      {},
      ...loadedComponents.map(({ components }) => components),
    ),
    componentUtilities: Object.assign(
      {},
      ...loadedComponents.map(({ componentUtilities }) => componentUtilities),
    ),
  };
}

async function loadGlobalUtilities(services: RendererServices) {
  return services.globalUtilitiesPath
    ? await services.load.module<GlobalUtilities>({
        path: path.join(services.cwd, services.globalUtilitiesPath),
        type: "globalUtilities",
      })
    : { init: () => ({}) };
}

function getGlobalDependencyTasks(services: RendererServices) {
  return services.globalUtilitiesPath
    ? [
        {
          type: "loadModule" as const,
          payload: {
            path: path.join(services.cwd, services.globalUtilitiesPath),
            type: "globalUtilities",
          },
        },
      ]
    : [];
}

function shouldReloadComponents(
  payload: { type: string; path: string },
  services: RendererServices,
) {
  return (
    payload.type === "components" ||
    isComponentSourcePath(payload.path, services)
  );
}

function shouldReloadGlobalUtilities(
  payload: { type: string; path: string },
  services: RendererServices,
) {
  return (
    payload.type === "globalUtilities" ||
    isGlobalUtilitiesPath(payload.path, services)
  );
}

function isComponentSourcePath(filePath: string, services: RendererServices) {
  return services.components.some(
    ({ path: componentsPath }) =>
      !componentsPath.startsWith("http") &&
      isWithinPath(filePath, path.join(services.cwd, componentsPath)),
  );
}

function isGlobalUtilitiesPath(filePath: string, services: RendererServices) {
  return services.globalUtilitiesPath
    ? path.resolve(filePath) ===
        path.resolve(path.join(services.cwd, services.globalUtilitiesPath))
    : false;
}

function isWithinPath(filePath: string, directoryPath: string) {
  const resolvedFilePath = path.resolve(filePath);
  const resolvedDirectoryPath = path.resolve(directoryPath);

  return (
    resolvedFilePath === resolvedDirectoryPath ||
    resolvedFilePath.startsWith(resolvedDirectoryPath + path.sep)
  );
}

function withRenderContext(
  error: unknown,
  { layout, url }: { layout: string; url: string },
) {
  if (!(error instanceof Error)) {
    return error;
  }

  return new Error(
    `${error.message} while rendering layout "${layout}" for url "${url}"`,
    { cause: error },
  );
}

export { plugin };
