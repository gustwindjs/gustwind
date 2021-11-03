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
      metaMarkup: renderMetaMarkup({ ...projectMeta.meta, ...page.meta }),
      headMarkup: twindSheets.getStyleTag(stylesheet),
      bodyMarkup,
      mode,
      features: projectMeta.features,
    });
  };
}

function renderMetaMarkup(meta?: Meta) {
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

async function htmlTemplate(
  { pagePath, metaMarkup, headMarkup, bodyMarkup, mode, features }: {
    pagePath: string;
    metaMarkup?: string;
    headMarkup?: string;
    bodyMarkup?: string;
    mode: Mode;
    features: ProjectMeta["features"];
  },
): Promise<[string, string?]> {
  const scriptName = path.basename(pagePath, path.extname(pagePath));
  const scriptPath = path.join(path.dirname(pagePath), scriptName) + ".ts";

  let pageSource;

  if (await fs.exists(scriptPath)) {
    pageSource = await compileTypeScript(scriptPath, mode);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8"
    <meta name="pagepath" content="${pagePath}" />
    <script type="text/javascript" src="https://unpkg.com/sidewind@5.4.6/dist/sidewind.umd.production.min.js"></script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐳</text></svg>">
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/highlightjs/highlight.js/src/styles/github.css">
    ${metaMarkup || ""}
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
