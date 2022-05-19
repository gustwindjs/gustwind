import {
  getStyleTag,
  getStyleTagProperties,
  virtualSheet,
} from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import { setup as setupTwind } from "https://cdn.skypack.dev/twind@0.16.16?min";
import type {
  Components,
  DataContext,
  Layout,
  Meta,
  Mode,
  ProjectMeta,
  Route,
} from "../types.ts";
import { renderComponent } from "./renderComponent.ts";
import { getContext } from "./getContext.ts";
import { evaluateFields } from "./evaluate.ts";

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
}: {
  projectMeta: ProjectMeta;
  layout: Layout;
  route: Route;
  mode: Mode;
  pagePath: string;
  pageUtilities: Record<string, unknown>;
  twindSetup: Record<string, unknown>;
  components: Components;
  pathname: string;
}): Promise<[string, DataContext, string?]> {
  setupTwind({ sheet: stylesheet, mode: "silent", ...twindSetup });

  // @ts-ignore Somehow TS gets confused here
  stylesheet.reset();

  const projectPaths = projectMeta.paths;
  const runtimeMeta: Meta = { built: (new Date()).toString() };

  let pageScripts = route.scripts?.slice(0) || [];

  if (projectMeta.scripts) {
    pageScripts = pageScripts.concat(projectMeta.scripts);
  }
  if (mode === "development") {
    runtimeMeta.pagePath = pagePath;
    pageScripts.push({ type: "module", src: "/_webSocketClient.js" });
  }
  if (mode === "development" || projectMeta.features?.showEditorAlways) {
    pageScripts.push({ type: "module", src: "/_twindRuntime.js" });
    pageScripts.push({ type: "module", src: "/_toggleEditor.js" });
  }

  const extraContext = await getContext(
    mode,
    projectPaths.dataSources,
    projectPaths.transforms,
    route.dataSources,
  );
  const meta = {
    ...runtimeMeta,
    ...projectMeta.meta,
    ...route.meta,
  };
  const context = {
    projectMeta,
    meta: {
      ...meta,
      ...Object.fromEntries(await evaluateFields(route.context, meta)),
    },
    scripts: pageScripts,
    ...route.context,
    ...extraContext,
  };

  DEBUG && console.log("rendering a page with context", context);

  try {
    const [headMarkup, bodyMarkup] = await Promise.all([
      renderHTML(
        projectPaths.transforms,
        layout.head,
        components,
        context,
        pathname,
        pageUtilities,
      ),
      renderHTML(
        projectPaths.transforms,
        layout.body,
        components,
        context,
        pathname,
        pageUtilities,
      ),
    ]);

    if (route.type === "xml") {
      return [xmlTemplate(bodyMarkup), context];
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
      htmlTemplate(
        route.meta?.language || projectMeta.meta?.language,
        headMarkup + styleTag,
        bodyMarkup,
      ),
      context,
      css,
    ];
  } catch (error) {
    console.error("Failed to render", route.url, error);
  }

  return ["", {}];
}

function renderHTML(
  transformsPath: string,
  children: Layout["head"] | Layout["body"],
  components: Components,
  pageData: DataContext,
  pathname: string,
  pageUtilities: Record<string, unknown>,
) {
  if (!children) {
    return "";
  }

  return renderComponent(
    transformsPath,
    { children },
    components,
    { ...pageData, pathname },
    pageUtilities,
  );
}

function htmlTemplate(
  language: string,
  headMarkup: string,
  bodyMarkup: string,
) {
  // TODO: Consider generalizing html attribute handling
  return `<!DOCTYPE html><html${
    language ? ' language="' + language + '"' : ""
  }><head>${headMarkup}</head><body>${bodyMarkup}</body></html$>`;
}

function xmlTemplate(bodyMarkup: string) {
  return `<?xml version="1.0" encoding="UTF-8" ?>${bodyMarkup}`;
}

export { renderHTML, renderPage };
