// This file is loaded both on client and server so it's important
// to keep related imports at minimum.
import type {
  Components,
  Context,
  DataContext,
  DataSources,
  Meta,
  Mode,
  ProjectMeta,
  Renderer,
  Route,
} from "../types.ts";
import type { Component, Utilities } from "../breezewind/types.ts";
import { applyUtilities } from "../breezewind/applyUtility.ts";
import { defaultUtilities } from "../breezewind/defaultUtilities.ts";

type Layout = Component | Component[];

const DEBUG = Deno.env.get("DEBUG") === "1";

// TODO: Some kind of a lifecycle model would be useful to have here
// as it would allow decoupling twind from the core.
async function renderPage({
  projectMeta,
  layout,
  route,
  mode,
  pagePath,
  pageUtilities,
  components,
  pathname,
  dataSources,
  render,
}: {
  projectMeta: ProjectMeta;
  layout: Layout;
  route: Route;
  mode: Mode;
  pagePath: string;
  pageUtilities: Utilities;
  components: Components;
  pathname: string;
  dataSources: DataSources;
  render: Renderer["render"];
}): Promise<{ markup: string; context: DataContext; css?: string }> {
  const runtimeMeta: Meta = { built: (new Date()).toString() };

  // The assumption here is that all the page scripts are compiled with Gustwind.
  // TODO: It might be a good idea to support third party scripts here as well
  let pageScripts =
    route.scripts?.slice(0).map((s) => ({ type: "module", src: `/${s}.js` })) ||
    [];

  if (projectMeta.scripts) {
    pageScripts = pageScripts.concat(projectMeta.scripts);
  }
  if (mode === "development") {
    runtimeMeta.pagePath = pagePath;
  }

  // TODO: Trigger beforeEachRender here to capture scripts and run init code
  const dataSourceContext = await getDataSourceContext(
    route.dataSources,
    dataSources,
  );
  const context: Context = {
    pagePath,
    projectMeta,
    scripts: pageScripts,
    ...route.context,
    ...dataSourceContext,
  };
  const props = {
    ...runtimeMeta,
    ...projectMeta.meta,
    ...route.meta,
  };
  context.meta = await applyUtilities(
    props,
    { ...defaultUtilities, ...pageUtilities } as Utilities,
    { context },
  );

  DEBUG && console.log("rendering a page with context", context);

  try {
    // TODO: Trigger onRender hooks of plugins now
    const markup = await render({
      component: layout,
      components,
      context: { ...context, pathname },
      utilities: pageUtilities,
    });

    return { markup, context };
  } catch (error) {
    console.error("Failed to render", route.url, error);
  }

  return { markup: "", context: {} };
}

async function getDataSourceContext(
  dataSourceIds?: Route["dataSources"],
  dataSources?: DataSources,
): Promise<Record<string, unknown>> {
  if (!dataSourceIds || !dataSources) {
    return {};
  }

  return Object.fromEntries(
    await Promise.all(
      dataSourceIds.map(async ({ name, operation, parameters }) => {
        const dataSource = dataSources[operation];

        if (!dataSource) {
          throw new Error(`Data source ${operation} was not found!`);
        }

        return [
          name,
          await dataSource.apply(
            undefined,
            // @ts-expect-error This is fine
            Array.isArray(parameters) ? parameters : [],
          ),
        ];
      }),
    ),
  );
}

export { renderPage };
