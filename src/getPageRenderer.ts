import * as twindSheets from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import type {
  Components,
  DataContext,
  Mode,
  Page,
  ProjectMeta,
} from "../types.ts";
import { getContext } from "./getContext.ts";
import { getStyleSheet } from "./getStyleSheet.ts";
import { renderComponent } from "./renderComponent.ts";

const DEBUG = Deno.env.get("DEBUG") === "1";

// TODO: Some kind of a lifecycle model would be useful to have here
// as it would allow decoupling twind from the core.
function getPageRenderer(
  { components, mode, twindSetup }: {
    components: Components;
    mode: Mode;
    twindSetup: Record<string, unknown>;
  },
) {
  const stylesheet = getStyleSheet(twindSetup);

  return async (
    {
      pathname,
      pagePath,
      page,
      extraContext,
      initialHeadMarkup,
      initialBodyMarkup,
      projectMeta,
      hasScript,
    }: {
      pathname: string;
      pagePath: string;
      page: Page;
      extraContext: DataContext;
      initialHeadMarkup?: string;
      initialBodyMarkup?: string;
      projectMeta: ProjectMeta;
      hasScript: boolean;
    },
  ): Promise<[string, DataContext]> => {
    const projectPaths = projectMeta.paths;
    const pageContext: DataContext = await getContext(
      projectPaths.dataSources,
      projectPaths.transforms,
      page.dataSources,
    );
    page.meta.built = (new Date()).toString();

    const scripts = projectMeta.scripts?.slice(0) || [];

    if (hasScript) {
      scripts.push({ type: "module", src: "./index.js" });
    }
    if (mode === "development") {
      page.meta.pagePath = pagePath;
      scripts.push({ type: "module", src: "/_webSocketClient.js" });
    }
    if (mode === "development" || projectMeta.features?.showEditorAlways) {
      scripts.push({ type: "module", src: "/_twindRuntime.js" });
      scripts.push({ type: "module", src: "/_toggleEditor.js" });
    }

    const context = {
      projectMeta,
      meta: page.meta,
      scripts,
      ...pageContext,
      ...extraContext,
    };

    DEBUG && console.log("rendering a page with context", context);

    const [headMarkup, bodyMarkup] = await Promise.all([
      initialHeadMarkup ? Promise.resolve(initialHeadMarkup) : renderHTML(
        projectPaths.transforms,
        page,
        page.head,
        components,
        context,
        pathname,
      ),
      initialBodyMarkup ? Promise.resolve(initialBodyMarkup) : renderHTML(
        projectPaths.transforms,
        page,
        page.body,
        components,
        context,
        pathname,
      ),
    ]);
    const styleTag = twindSheets.getStyleTag(stylesheet);

    if (page.layout === "xml") {
      return [xmlTemplate(bodyMarkup), context];
    }

    return [
      htmlTemplate(projectMeta.language, headMarkup + styleTag, bodyMarkup),
      context,
    ];
  };
}

function renderHTML(
  transformsPath: string,
  page: Page,
  children: Page["head"] | Page["body"],
  components: Components,
  pageData: DataContext,
  pathname: string,
) {
  if (!children) {
    return "";
  }

  return renderComponent(
    transformsPath,
    { children },
    components,
    { ...pageData, pathname, page },
  );
}

function htmlTemplate(
  language: string,
  headMarkup: string,
  bodyMarkup: string,
) {
  return `<!DOCTYPE html><html lang="${language}"><head>${headMarkup}</head><body>${bodyMarkup}</body></html>`;
}

function xmlTemplate(bodyMarkup: string) {
  return `<?xml version="1.0" encoding="UTF-8" ?>${bodyMarkup}`;
}

export { getPageRenderer, renderHTML };
