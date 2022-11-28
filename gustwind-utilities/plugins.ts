import type { Context, Layout, Plugin, ProjectMeta, Route } from "../types.ts";

function importPlugins(projectMeta: ProjectMeta) {
  // TODO: Import and sort plugins to dependency order
  return [];
}

async function applyBeforeEachRenders(
  { context, layout, plugins, route, url }: {
    context: Context;
    layout: Layout;
    plugins: Plugin[];
    route: Route;
    url: string;
  },
) {
  const beforeEachRenders = plugins.map((plugin) => plugin.beforeEachRender)
    .filter(Boolean);
  for await (const beforeEachRender of beforeEachRenders) {
    // @ts-expect-error We know beforeEachRender should be defined by now
    await beforeEachRender({
      context,
      layout,
      route,
      url,
    });
  }
}

async function applyAfterEachRenders(
  { context, layout, markup, plugins, route, url }: {
    context: Context;
    layout: Layout;
    markup: string;
    plugins: Plugin[];
    route: Route;
    url: string;
  },
) {
  const afterEachRenders = plugins.map((plugin) => plugin.afterEachRender)
    .filter(Boolean);
  for await (const afterEachRender of afterEachRenders) {
    // TODO: Later on this should be able to create new tasks to run
    // @ts-expect-error We know afterEachRender should be defined by now
    const { markup: updatedMarkup } = await afterEachRender({
      context,
      layout,
      markup,
      route,
      url,
    });

    markup = updatedMarkup;
  }

  return markup;
}

export { applyAfterEachRenders, applyBeforeEachRenders, importPlugins };
