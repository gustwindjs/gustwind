// This file is loaded both on client and server so it's important
// to keep related imports at minimum.
import {
  getStyleTag,
  getStyleTagProperties,
  setupTwind,
  virtualSheet,
} from "../client-deps.ts";
import type {
  Components,
  DataContext,
  DataSources,
  Layout,
  Meta,
  Mode,
  ProjectMeta,
  Route,
} from "../types.ts";
import type { Utilities } from "../breeze/types.ts";
import breeze from "../breeze/index.ts";
import * as breezeExtensions from "../breeze/extensions.ts";
import { evaluateFields } from "../utils/evaluate.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

const stylesheet = virtualSheet();

// TODO: Some kind of a lifecycle model would be useful to have here
// as it would allow decoupling twind from the core.
async function renderPage({
  projectMeta,
  layout,
  route,
  mode,
  pagePath,
  pageUtilities,
  twindSetup,
  components,
  pathname,
  dataSources,
}: {
  projectMeta: ProjectMeta;
  layout: Layout;
  route: Route;
  mode: Mode;
  pagePath: string;
  pageUtilities: Utilities;
  twindSetup: Record<string, unknown>;
  components: Components;
  pathname: string;
  dataSources: DataSources;
}): Promise<[string, DataContext, string?]> {
  setupTwind({ sheet: stylesheet, mode: "silent", ...twindSetup });

  // @ts-ignore Somehow TS gets confused here
  stylesheet.reset();

  const runtimeMeta: Meta = { built: (new Date()).toString() };
  const showEditor = projectMeta.features?.showEditorAlways;

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
    pageScripts.push({ type: "module", src: "/_webSocketClient.js" });
  }
  if (mode === "development" || showEditor) {
    pageScripts.push({ type: "module", src: "/_twindRuntime.js" });
    pageScripts.push({ type: "module", src: "/_toggleEditor.js" });
  }

  const meta = {
    ...runtimeMeta,
    ...projectMeta.meta,
    ...route.meta,
  };
  const dataSourceContext = await getDataSourceContext(
    route.dataSources,
    dataSources,
  );
  const context = {
    projectMeta,
    meta: {
      ...meta,
      ...Object.fromEntries(await evaluateFields(route.context, meta)),
    },
    scripts: pageScripts,
    ...route.context,
    ...dataSourceContext,
  };

  DEBUG && console.log("rendering a page with context", context);

  try {
    const markup = await renderHTML(
      layout,
      components,
      context,
      pathname,
      pageUtilities,
    );

    if (route.type === "xml") {
      return [markup, context];
    }

    // https://web.dev/defer-non-critical-css/
    const styleTag = projectMeta.features?.extractCSS
      ? `<link rel="preload" href="./styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="styles.css"></noscript>`
      : getStyleTag(stylesheet);

    let css = "";
    if (projectMeta.features?.extractCSS) {
      css = getStyleTagProperties(stylesheet).textContent;
    }

    return [
      injectStyleTag(markup, styleTag),
      context,
      css,
    ];
  } catch (error) {
    console.error("Failed to render", route.url, error);
  }

  return ["", {}];
}

async function getDataSourceContext(
  dataSourceIds?: Route["dataSources"],
  dataSources?: DataSources,
) {
  if (!dataSourceIds || !dataSources) {
    return {};
  }

  return Object.fromEntries(
    await Promise.all(
      dataSourceIds.map(async (id) => [id, await dataSources[id]()]),
    ),
  );
}

function injectStyleTag(markup: string, styleTag: string) {
  const parts = markup.split("</head>");

  return parts[0] + styleTag + parts[1];
}

function renderHTML(
  // TODO: Load transforms beforehand and connect them with utilities here
  // transformsPath: string,
  children: Layout,
  components: Components,
  pageData: DataContext,
  pathname: string,
  utilities: Utilities,
) {
  if (!children) {
    return "";
  }

  return breeze({
    component: children,
    components,
    extensions: [
      breezeExtensions.classShortcut,
      breezeExtensions.foreach,
      breezeExtensions.visibleIf,
    ],
    context: { ...pageData, pathname },
    utilities,
  });
}

export { renderHTML, renderPage };
