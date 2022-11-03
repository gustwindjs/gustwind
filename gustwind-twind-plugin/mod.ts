import {
  getStyleTag,
  // getStyleTagProperties,
  virtualSheet,
} from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import { setup as setupTwind } from "https://cdn.skypack.dev/twind@0.16.16?min";
// import { path } from "../server-deps.ts";
import { ProjectMeta, Route } from "../types.ts";
import type { Context } from "../breezewind/types.ts";

// TODO: Extract styles.css name as a parameter to projectMeta
// TODO: Expose custom types for ProjectMeta
function twindPlugin(
  projectMeta: ProjectMeta,
  setup: Record<string, unknown>,
) {
  const setupRender = () => {
    const stylesheet = virtualSheet();

    return { stylesheet };
  };

  return {
    setupRender,
    beforeEachRender({ stylesheet }: ReturnType<typeof setupRender>) {
      setupTwind({ sheet: stylesheet, mode: "silent", ...setup });

      // @ts-ignore Somehow TS gets confused here
      stylesheet.reset();
    },
    afterEachRender(
      {
        parameters,
        markup,
        context,
        route,
      }: {
        parameters: ReturnType<typeof setupRender>;
        markup: string;
        context: Context;
        route: Route;
      },
    ) {
      if (route.type === "xml") {
        return { markup, context };
      }

      const { stylesheet } = parameters;

      // https://web.dev/defer-non-critical-css/
      // TODO: Consider restoring CSS extraction
      /*
      const styleTag = projectMeta.features?.extractCSS
        ? `<link rel="preload" href="./styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="styles.css"></noscript>`
        : getStyleTag(stylesheet);

      let css = "";
      if (projectMeta.features?.extractCSS) {
        css = getStyleTagProperties(stylesheet).textContent;
      }
      */

      const styleTag = getStyleTag(stylesheet);

      return { markup: injectStyleTag(markup, styleTag) };
    },
    /*
    writeRender: async (
      { dir, meta }: { dir: string; meta: { css: string } },
    ) => {
      await Deno.writeTextFile(path.join(dir, "styles.css"), meta.css);
    },
    */
  };
}

function injectStyleTag(markup: string, styleTag: string) {
  const parts = markup.split("</head>");

  return parts[0] + styleTag + parts[1];
}

export { twindPlugin as plugin };
