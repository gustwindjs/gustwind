import { htmlispToHTML, htmlispToHTMLSync, raw } from "../../htmlisp/mod.ts";
import { applyUtilities } from "../../htmlisp/utilities/applyUtilities.ts";
import { defaultUtilities } from "../../htmlisp/defaultUtilities.ts";
import type { Context, Utilities, Utility } from "../../types.ts";
import type {
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
import { createRuntimeUtilitiesResolver } from "../../utilities/runtimeUtilitiesCache.ts";
import { isDebugEnabled } from "../../utilities/runtime.ts";

// For edge renderer components are directly strings
type Components = Record<string, string>;
type EdgeRendererPluginOptions = {
  components: Components;
  componentUtilities: Record<string, GlobalUtilities | undefined>;
  globalUtilities: GlobalUtilities;
};
type EdgeRendererPluginContext = {
  components: Components;
  globalUtilities: GlobalUtilities;
};
type EdgeRendererServices = {
  getRuntimeUtilities: ReturnType<typeof createRuntimeUtilitiesResolver>;
  load: LoadApi;
  mode: Mode;
  options: EdgeRendererPluginOptions;
  renderComponent: Render;
  renderComponentSync: RenderSync;
};

const DEBUG = isDebugEnabled();

// TODO: See if rendering should be decoupled from routing somehow to allow usage without a router
const plugin: Plugin<EdgeRendererPluginOptions, EdgeRendererPluginContext> = {
  meta: {
    name: "htmlisp-edge-renderer-plugin",
    description:
      "${name} implements an edge-compatible way to render through HTMLisp templating language.",
    dependsOn: ["gustwind-meta-plugin"],
  },
  init({ options, mode, load, renderComponent, renderComponentSync }) {
    const getRuntimeUtilities = createRuntimeUtilitiesResolver({
      load,
      render: renderComponent,
      renderSync: renderComponentSync,
    });
    const services: EdgeRendererServices = {
      getRuntimeUtilities,
      load,
      mode,
      options,
      renderComponent,
      renderComponentSync,
    };

    // TODO: Push this style check to the plugin system core
    if (!options.globalUtilities) {
      throw new Error(
        "htmlisp-edge-renderer-plugin - globalUtilitiesPath was not provided",
      );
    }

    return {
      initPluginContext: () => options,
      prepareContext: ({ url, route, send }) =>
        prepareEdgeRendererContext({ route, send, services, url }),
      renderLayout: (args) => renderEdgeRendererLayout(args, services),
      renderComponent: (
        { matchRoute, componentName, htmlInput, context, props, pluginContext },
      ) =>
        renderEdgeRendererComponent({
          componentName,
          context,
          htmlInput,
          matchRoute,
          pluginContext,
          props,
          services,
        }),
      renderComponentSync: (
        { matchRoute, componentName, htmlInput, context, props, pluginContext },
      ) =>
        renderEdgeRendererComponentSync({
          componentName,
          context,
          htmlInput,
          matchRoute,
          pluginContext,
          props,
          services,
        }),
      onMessage: ({ message, pluginContext }) =>
        handleEdgeRendererMessage({ message, pluginContext, services }),
    };
  },
};

async function prepareEdgeRendererContext(
  {
    route,
    send,
    services,
    url,
  }: {
    route: Route;
    send: (
      pluginName: string,
      message: { type: "getMeta"; payload: undefined },
    ) => unknown | Promise<unknown>;
    services: EdgeRendererServices;
    url: string;
  },
) {
  const meta = await send("gustwind-meta-plugin", {
    type: "getMeta",
    payload: undefined,
  });
  const runtimeMeta: Record<string, string> = {
    built: (new Date()).toString(),
  };

  if (services.mode === "development") {
    runtimeMeta.url = url;
  }

  const context = {
    ...route.context,
    meta: {
      ...runtimeMeta,
      // @ts-expect-error Figure out how to type this
      ...meta,
      ...route.meta,
      // @ts-expect-error Figure out how to type this
      ...route.context?.meta,
    },
  };

  return {
    context: {
      ...context,
      url,
      ...await applyUtilities<Utility, Utilities, Context>(
        context,
        defaultUtilities,
        { context },
      ),
    },
  };
}

async function renderEdgeRendererLayout(
  {
    matchRoute,
    route,
    context,
    pluginContext,
    url,
  }: {
    matchRoute: MatchRoute;
    route: Route;
    context: Context;
    pluginContext: EdgeRendererPluginContext;
    url: string;
  },
  services: EdgeRendererServices,
) {
  const { components, globalUtilities } = pluginContext;
  const layout = components[route.layout];

  if (!layout) {
    throw new Error(
      `htmlisp-edge-renderer-plugin - layout ${route.layout} to render was not found for url ${url}`,
    );
  }

  const runtimeUtilities = services.getRuntimeUtilities({
    componentUtilities: services.options.componentUtilities,
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
          layoutUtilities: services.options.componentUtilities[route.layout],
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

function getLayoutUtilities(
  {
    layoutUtilities,
    matchRoute,
    services,
    url,
  }: {
    layoutUtilities: GlobalUtilities | undefined;
    matchRoute: MatchRoute;
    services: EdgeRendererServices;
    url: string;
  },
) {
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

function renderEdgeRendererComponent(
  {
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
    pluginContext: EdgeRendererPluginContext;
    props: Context;
    services: EdgeRendererServices;
  },
) {
  const { components, globalUtilities } = pluginContext;
  const runtimeUtilities = services.getRuntimeUtilities({
    componentUtilities: services.options.componentUtilities,
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

function renderEdgeRendererComponentSync(
  {
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
    pluginContext: EdgeRendererPluginContext;
    props: Context;
    services: EdgeRendererServices;
  },
) {
  const { components, globalUtilities } = pluginContext;
  const runtimeUtilities = services.getRuntimeUtilities({
    componentUtilities: services.options.componentUtilities,
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
  components: Components,
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

function handleEdgeRendererMessage(
  {
    message,
    pluginContext,
    services,
  }: {
    message: Parameters<
      NonNullable<PluginApi<EdgeRendererPluginContext>["onMessage"]>
    >[0]["message"];
    pluginContext: EdgeRendererPluginContext;
    services: EdgeRendererServices;
  },
) {
  const { type, payload } = message;

  switch (type) {
    case "fileChanged":
      return handleEdgeRendererFileChange(payload, services);
    case "getComponents":
      return { result: pluginContext.components };
    case "getRenderer":
      return { result: pluginContext.components[payload] };
    default:
      return;
  }
}

function handleEdgeRendererFileChange(
  payload: { type: string },
  services: EdgeRendererServices,
) {
  DEBUG && console.log("htmlisp-edge-renderer - file changed", payload);

  return getEdgeRendererReloadResult(payload.type, services);
}

function getEdgeRendererReloadResult(
  payloadType: string,
  services: EdgeRendererServices,
) {
  return {
    send: [{ type: "reloadPage" as const, payload: undefined }],
    pluginContext: getEdgeRendererReloadContext(payloadType, services),
  };
}

function getEdgeRendererReloadContext(
  payloadType: string,
  services: EdgeRendererServices,
): Partial<EdgeRendererPluginContext> | undefined {
  return edgeRendererReloadContexts[payloadType]?.(services);
}

const edgeRendererReloadContexts: Record<
  string,
  (services: EdgeRendererServices) => Partial<EdgeRendererPluginContext>
> = {
  components: (services) => ({ components: services.options.components }),
  globalUtilities: (services) => ({
    globalUtilities: services.options.globalUtilities,
  }),
};

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
