import * as twindSheets from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import { fs, path } from "../deps.ts";
import { compileTypeScript } from "../utils/compileTypeScript.ts";
import { get } from "../utils/functional.ts";
import type {
  Components,
  DataContext,
  Meta,
  Mode,
  Page,
  ProjectMeta,
} from "../types.ts";
import { getContext } from "./getContext.ts";
import { getStyleSheet } from "./getStyleSheet.ts";
import { renderBody } from "./renderBody.ts";

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
    { pathname, pagePath, page, extraContext, initialBodyMarkup, projectMeta }:
      {
        pathname: string;
        pagePath: string;
        page: Page;
        extraContext: DataContext;
        initialBodyMarkup?: string;
        projectMeta: ProjectMeta;
      },
  ) => {
    const projectPaths = projectMeta.paths;
    const pageContext: DataContext = await getContext(
      projectPaths.dataSources,
      projectPaths.transforms,
      page.dataSources,
    );
    const context = { ...pageContext, ...extraContext };
    const bodyMarkup = initialBodyMarkup || await renderBody(
      projectPaths.transforms,
      page,
      page.page,
      components,
      context,
      pathname,
    );

    return htmlTemplate({
      pagePath,
      headMarkup: renderHeadMarkup(
        twindSheets.getStyleTag(stylesheet),
        projectMeta.head,
        getMeta(context, page.meta, projectMeta.siteName),
      ),
      bodyMarkup,
      mode,
      features: projectMeta.features,
      language: projectMeta.language,
      context,
    });
  };
}

function getMeta(
  pageData: DataContext,
  meta: Meta,
  siteName: string,
) {
  return {
    ...applyMeta(meta, pageData),
    "og:site_name": siteName || "",
    "twitter:site": siteName || "",
    "og:title": meta.title || "",
    "twitter:title": meta.title || "",
    "og:description": meta.description || "",
    "twitter:description": meta.description || "",
  };
}

function applyMeta(meta: Meta, dataContext?: DataContext) {
  const ret: Meta = {};

  Object.entries(meta).forEach(([k, v]) => {
    if (k.startsWith("__") && dataContext) {
      ret[k.slice(2)] = get<DataContext>(dataContext, v);
    } else {
      ret[k] = v;
    }
  });

  return ret;
}

function renderHeadMarkup(
  styleTag: string,
  head: ProjectMeta["head"],
  meta: Page["meta"],
) {
  return [
    styleTag,
    toTags("meta", false, head.meta),
    toTags("link", false, head.link),
    toTags("script", true, head.script),
    renderMetaMarkup(meta),
  ].join("");
}

function renderMetaMarkup(
  meta?: Meta,
) {
  if (!meta) {
    return "";
  }

  const ret = Object.entries(meta).map(([key, value]) =>
    `<meta name="${key}" content="${value}"></meta>`
  );

  if (meta.title) {
    ret.push(`<title>${meta.title}</title>`);
  }

  return ret.join("\n");
}

function toTags(
  tagName: string,
  generateSuffix: boolean,
  fields?: Record<string, string>[],
) {
  if (!fields) {
    return "";
  }

  return fields.map((o) =>
    `<${tagName} ` + Object.entries(o).map(([k, v]) =>
      `${k}="${v}"`
    ).join(" ") +
    ">" +
    (generateSuffix ? `</${tagName}>` : "")
  ).join(" ");
}

async function htmlTemplate(
  { pagePath, headMarkup, bodyMarkup, mode, features, language, context }: {
    pagePath: string;
    headMarkup?: string;
    bodyMarkup?: string;
    mode: Mode;
    features: ProjectMeta["features"];
    language: ProjectMeta["language"];
    context: DataContext;
  },
): Promise<[string, string, DataContext]> {
  const scriptName = path.basename(pagePath, path.extname(pagePath));
  const scriptPath = path.join(path.dirname(pagePath), scriptName) + ".ts";

  let pageSource = "";

  if (await fs.exists(scriptPath)) {
    pageSource = await compileTypeScript(scriptPath, mode);
  }

  // TODO: Maybe this should be exposed to the user
  const html = `<!DOCTYPE html>
<html lang="${language}">
  <head>
    <meta name="pagepath" content="${pagePath}" />
    ${headMarkup || ""}
  </head>
  <body>
    ${bodyMarkup || ""}
    ${pageSource ? `<script type="module" src="./index.js"></script>` : ""}
    ${
    mode === "development"
      ? '<script type="module" src="/_webSocketClient.js"></script>'
      : ""
  }
    ${
    !features?.showEditorAlways || features?.loadTwindRuntime
      ? '<script type="module" src="/_twindRuntime.js"></script>'
      : ""
  }
    ${
    mode === "development" || features?.showEditorAlways
      ? '<script type="module" src="/_toggleEditor.js"></script>'
      : ""
  }
  </body>
</html>`;

  return [html, pageSource, context];
}

export { getPageRenderer };
