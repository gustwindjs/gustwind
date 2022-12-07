import {
  getStyleTag,
  // getStyleTagProperties,
  virtualSheet,
} from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import { setup as setupTwind } from "https://cdn.skypack.dev/twind@0.16.16?min";
import { path } from "../../server-deps.ts";
import type { Plugin, PluginMeta, ProjectMeta } from "../../types.ts";

const meta: PluginMeta = {
  name: "gustwind-twind-plugin",
};

function twindPlugin(
  options: {
    setupPath: string;
    // TODO: Support style extraction
    // extractStylesToDirectory: string;
  },
  projectMeta: ProjectMeta,
): Plugin {
  const stylesheet = virtualSheet();
  const twindSetupPath = path.join(Deno.cwd(), options.setupPath);

  async function prepareStylesheet() {
    const twindSetup = twindSetupPath
      ? await import("file://" + twindSetupPath).then((m) => m.default)
      : {};

    setupTwind({ sheet: stylesheet, mode: "silent", ...twindSetup });

    // @ts-ignore Somehow TS gets confused here
    stylesheet.reset();
  }

  return {
    prepareBuild: async () => {
      await prepareStylesheet();

      return [{
        type: "writeScript",
        payload: {
          outputDirectory: projectMeta.paths.output,
          scriptName: "twindSetup.js",
          scriptPath: twindSetupPath,
        },
      }];
    },
    beforeEachContext: prepareStylesheet,
    afterEachRender({ markup, route }) {
      if (route.type === "xml") {
        return { markup };
      }

      // https://web.dev/defer-non-critical-css/
      // TODO: Consider restoring CSS extraction
      /*
      const styleTag = projectMeta.features?.extractCSS
        ? `<link rel="preload" href="./styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="styles.css"></noscript>`
        : getStyleTag(stylesheet);

      let css = "";
      if (projectMeta.features?.extractCSS) {
        css = getStyleTagProperties(stylesheet).textContent;

        TODO: Setup a task to write styles.css
      }
      */

      return { markup: injectStyleTag(markup, getStyleTag(stylesheet)) };
    },
  };
}

function injectStyleTag(markup: string, styleTag: string) {
  const parts = markup.split("</head>");

  return parts[0] + styleTag + parts[1];
}

export { meta, twindPlugin as plugin };
