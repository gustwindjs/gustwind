import { getStyleTag } from "twind-sheets";
import { renderComponent } from "./renderComponent.ts";
import type { Components, DataContext, Meta, Page } from "../types.ts";
import { getStyleSheet } from "./getStyleSheet.ts";
import { websocketClient } from "./webSockets.ts";

type Mode = "development" | "production";

function getPageRenderer(
  { components, stylesheet, mode }: {
    components: Components;
    stylesheet: ReturnType<typeof getStyleSheet>;
    mode: Mode;
  },
) {
  return async (
    pathname: string,
    pagePath: string,
    pageData: DataContext,
    page: Page,
  ) =>
    htmlTemplate({
      pagePath,
      metaMarkup: renderMetaMarkup(page.meta),
      headMarkup: getStyleTag(stylesheet),
      bodyMarkup: await renderBody(page.page, components, pageData, pathname),
      mode,
      page,
    });
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

function renderBody(
  pageComponent: Page["page"],
  components: Components,
  pageData: DataContext,
  pathname: string,
) {
  return renderComponent(
    {
      children: Array.isArray(pageComponent) ? pageComponent : [pageComponent],
    },
    components,
    { ...pageData, pathname },
  );
}

function htmlTemplate(
  { pagePath, metaMarkup, headMarkup, bodyMarkup, mode, page }: {
    pagePath: string;
    metaMarkup?: string;
    headMarkup?: string;
    bodyMarkup?: string;
    mode: Mode;
    page: Page;
  },
) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8"
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="text/javascript" src="https://unpkg.com/sidewind@3.3.3/dist/sidewind.umd.production.min.js"></script>
    ${
    mode === "development"
      ? `<script type="module" src="https://cdn.skypack.dev/twind/shim"></script>
<link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/josdejong/jsoneditor/dist/jsoneditor.min.css">
<script src="https://cdn.jsdelivr.net/gh/josdejong/jsoneditor/dist/jsoneditor.min.js"></script>`
      : ""
  }
    ${metaMarkup || ""}
    ${headMarkup || ""}
  </head>
  <body>
    ${
    mode === "development"
      ? `<div x-state="{ showEditor: false }">
      <button type="button" hidden class="fixed bottom-0 right-0 m-2" onclick="setState(({ showEditor }) => ({ showEditor: !showEditor }))">
        <div x-class="state.showEditor && 'hidden'">Show editor</div>
        <div x-class="!state.showEditor && 'hidden'">Hide editor</div>
      </button>
      <div x-class="!state.showEditor && 'hidden'" hidden>
        <div id="jsoneditor" class="w-full h-1/2"></div>
      </div>
      <script>
      ${websocketClient}
      const editor = new JSONEditor(document.getElementById("jsoneditor"), {
        onChangeJSON(data) {
          socket.send(JSON.stringify({
            type: 'update',
            payload: {
              path: "${pagePath}",
              data
            }
          }));
        }
      });

      editor.set(${JSON.stringify(page, null, 2)});
      </script>
      <div id="pagebody">${bodyMarkup || ""}</div>
    </div>`
      : bodyMarkup || ""
  }
  </body>
</html>`;
}

export { getPageRenderer, renderBody };
