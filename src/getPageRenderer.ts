import { getStyleTag } from "twind-sheets";
import { exists } from "fs";
import { basename, dirname, extname, join } from "path";
import type {
  Components,
  DataContext,
  ImportMap,
  Meta,
  Mode,
  Page,
} from "../types.ts";
import { getStyleSheet } from "./getStyleSheet.ts";
import { renderBody } from "./renderBody.ts";
import { compileTypeScript } from "./compileTypeScript.ts";

function getPageRenderer(
  { components, mode, importMap }: {
    components: Components;
    mode: Mode;
    importMap: ImportMap;
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
      page,
      page.page,
      components,
      pageData,
      pathname,
    );

    return htmlTemplate({
      pagePath,
      metaMarkup: renderMetaMarkup(page.meta),
      headMarkup: getStyleTag(stylesheet),
      bodyMarkup,
      mode,
      page,
      importMap,
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

let developmentSourceCache: string;

async function htmlTemplate(
  { pagePath, metaMarkup, headMarkup, bodyMarkup, mode, page, importMap }: {
    pagePath: string;
    metaMarkup?: string;
    headMarkup?: string;
    bodyMarkup?: string;
    mode: Mode;
    page: Page;
    importMap: ImportMap;
  },
): Promise<[string, string?]> {
  let developmentSource = developmentSourceCache;

  if (mode === "development" && !developmentSourceCache) {
    developmentSource = await compileTypeScript(
      "./src/developmentShim.ts",
      mode,
      importMap,
    );
    developmentSourceCache = developmentSource;
  }

  const scriptName = basename(pagePath, extname(pagePath));
  const scriptPath = join(dirname(pagePath), scriptName) + ".ts";

  let pageSource;

  if (await exists(scriptPath)) {
    pageSource = await compileTypeScript(scriptPath, mode, importMap);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8"
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="text/javascript" src="https://unpkg.com/sidewind@3.4.1/dist/sidewind.umd.production.min.js"></script>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐳</text></svg>">
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/highlightjs/highlight.js/src/styles/github.css">
    <script type="importmap">${JSON.stringify(importMap)}</script>
    ${
    mode === "development"
      ? `<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/josdejong/jsoneditor/dist/jsoneditor.min.css">`
      : ""
  }
    ${metaMarkup || ""}
    ${headMarkup || ""}
  </head>
  <body>
    ${
    mode === "development"
      ? `<div>
      <div hidden x-cloak x-state="{ showEditor: false }">
        <button type="button" class="fixed bottom-0 right-0 m-2 z-50" onclick="setState(({ showEditor }) => ({ showEditor: !showEditor }))">
          <div x-class="state.showEditor && 'hidden'">Show editor</div>
          <div x-class="!state.showEditor && 'hidden'">Hide editor</div>
        </button>
        <div x-class="!state.showEditor && 'hidden'">
          <div id="jsoneditor" class="fixed bg-white bottom-0 w-full max-h-1/2"></div>
        </div>
      </div>
      <script type="module">
        ${developmentSource}
        const pagePath = "${pagePath}";
        const data = ${JSON.stringify(page, null, 2)};
        const socket = window.createWebSocket(pagePath);
        window.createJSONEditor(socket, document.getElementById("jsoneditor"), pagePath, data);
      </script>
      <main id="pagebody">
        ${bodyMarkup || ""}
      </main>
    </div>`
      : `<main>${bodyMarkup || ""}</main>` || ""
  }
  ${pageSource ? `<script type="module" src="./index.js"></script>` : ""}
  </body>
</html>`;

  return [html, pageSource];
}

export { getPageRenderer };
