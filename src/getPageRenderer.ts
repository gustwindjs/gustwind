import { twindSheets } from "../browserDeps.ts";
import { fs, path } from "../deps.ts";
import { compileTypeScript } from "../utils/compileTypeScript.ts";
import type {
  Components,
  DataContext,
  Meta,
  Mode,
  Page,
  ProjectMeta,
} from "../types.ts";
import { getStyleSheet } from "./getStyleSheet.ts";
import { renderBody } from "./renderBody.ts";

function getPageRenderer(
  { transformsPath, components, mode, projectMeta }: {
    transformsPath: string;
    components: Components;
    mode: Mode;
    projectMeta: ProjectMeta;
  },
) {
  const stylesheet = getStyleSheet(mode);

  return async (
    pathname: string,
    pagePath: string,
    pageData: DataContext,
    page: Page,
    initialBodyMarkup?: string,
  ) => {
    const bodyMarkup = initialBodyMarkup || await renderBody(
      transformsPath,
      page,
      page.page,
      components,
      pageData,
      pathname,
    );

    return htmlTemplate({
      pagePath,
      headMarkup: renderHeadMarkup(stylesheet, page, projectMeta.head),
      bodyMarkup,
      mode,
      features: projectMeta.features,
      language: projectMeta.language,
    });
  };
}

function renderHeadMarkup(
  stylesheet: ReturnType<typeof getStyleSheet>,
  page: Page,
  head: ProjectMeta["head"],
) {
  return [
    twindSheets.getStyleTag(stylesheet),
    toTags("meta", false, head.meta),
    toTags("link", false, head.link),
    toTags("script", true, head.script),
    renderMetaMarkup(page.meta),
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
  { pagePath, headMarkup, bodyMarkup, mode, features, language }: {
    pagePath: string;
    headMarkup?: string;
    bodyMarkup?: string;
    mode: Mode;
    features: ProjectMeta["features"];
    language: ProjectMeta["language"];
  },
): Promise<[string, string?]> {
  const scriptName = path.basename(pagePath, path.extname(pagePath));
  const scriptPath = path.join(path.dirname(pagePath), scriptName) + ".ts";

  let pageSource;

  if (await fs.exists(scriptPath)) {
    pageSource = await compileTypeScript(scriptPath, mode);
  }

  const html = `<!DOCTYPE html>
<html lang="${language}">
  <head>
    <meta name="pagepath" content="${pagePath}" />
    ${headMarkup || ""}
  </head>
  <body>
    <main>${bodyMarkup || ""}</main>
    ${pageSource ? `<script type="module" src="./index.js"></script>` : ""}
    ${
    mode === "development"
      ? '<script type="module" src="/_webSocketClient.js"></script>'
      : ""
  }
    ${
    mode === "development" || features?.showEditorAlways
      ? '<script type="module" src="/_toggleEditor.js"></script>'
      : ""
  }
  </body>
</html>`;

  return [html, pageSource];
}

export { getPageRenderer };
