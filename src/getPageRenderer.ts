import { getStyleTag } from "twind-sheets";
import { renderComponent } from "./renderComponent.ts";
import type { Components, DataContext, Meta, Mode, Page } from "../types.ts";
import { getStyleSheet } from "./getStyleSheet.ts";

function getPageRenderer(
  { components, mode }: {
    components: Components;
    mode: Mode;
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

async function htmlTemplate(
  { pagePath, metaMarkup, headMarkup, bodyMarkup, mode, page }: {
    pagePath: string;
    metaMarkup?: string;
    headMarkup?: string;
    bodyMarkup?: string;
    mode: Mode;
    page: Page;
  },
) {
  let developmentSource = "";

  if (mode === "development") {
    const { files, diagnostics } = await Deno.emit(
      "./src/developmentShim.ts",
      {
        bundle: "classic", // or "module"
        // TODO: Read this from import_map.json
        importMap: {
          imports: {
            "jsoneditor": "https://esm.sh/jsoneditor@9.5.6",
            "twind-shim": "https://cdn.skypack.dev/twind/shim",
            "twind-colors": "https://unpkg.com/twind@0.16.16/colors/colors.js",
            "twind-typography":
              "https://unpkg.com/@twind/typography@0.0.2/typography.js",
          },
        },
        importMapPath: "file:///import_map.json",
      },
    );

    if (diagnostics.length) {
      console.log("Received diagnostics from Deno compiler", diagnostics);
    }

    developmentSource = files["deno:///bundle.js"];
  }

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8"
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <script type="text/javascript" src="https://unpkg.com/sidewind@3.4.0/dist/sidewind.umd.production.min.js"></script>
    <link rel="stylesheet" type="text/css" href="https://cdn.jsdelivr.net/gh/highlightjs/highlight.js/src/styles/github.css">
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
        <button type="button" class="fixed bottom-0 right-0 m-2" onclick="setState(({ showEditor }) => ({ showEditor: !showEditor }))">
          <div x-class="state.showEditor && 'hidden'">Show editor</div>
          <div x-class="!state.showEditor && 'hidden'">Hide editor</div>
        </button>
        <div x-class="!state.showEditor && 'hidden'">
          <div id="jsoneditor" class="fixed bg-white top-0 w-full max-h-1/2"></div>
        </div>
      </div>
      <script>
        ${developmentSource}
        window.createJSONEditor(document.getElementById("jsoneditor"), "${pagePath}", ${
        JSON.stringify(page, null, 2)
      });
      </script>
      <div id="pagebody">
        ${bodyMarkup || ""}
      </div>
    </div>`
      : bodyMarkup || ""
  }
  </body>
</html>`;
}

export { getPageRenderer, renderBody };
