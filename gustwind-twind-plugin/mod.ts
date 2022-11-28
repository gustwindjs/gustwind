import {
  getStyleTag,
  // getStyleTagProperties,
  virtualSheet,
} from "https://cdn.skypack.dev/twind@0.16.16/sheets?min";
import { setup as setupTwind } from "https://cdn.skypack.dev/twind@0.16.16?min";
// import { path } from "../server-deps.ts";
import { Plugin, ProjectMeta } from "../types.ts";

function twindPlugin(
  projectMeta: ProjectMeta,
  options: {
    setupPath: string;
    // TODO: Support style extraction
    // extractStylesToDirectory: string;
  },
): Plugin {
  const stylesheet = virtualSheet();
  const twindSetupPath = options.setupPath;

  return {
    beforeEachRender: async () => {
      const twindSetup = twindSetupPath
        ? await import("file://" + twindSetupPath).then((m) => m.default)
        : {};

      setupTwind({ sheet: stylesheet, mode: "silent", ...twindSetup });

      // @ts-ignore Somehow TS gets confused here
      stylesheet.reset();
    },
    afterEachRender({ markup, route }) {
      if (route.type === "xml") {
        return;
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
    prepareBuild: () => {
      const { paths } = projectMeta;
      const outputDirectory = paths.output;

      return [{
        type: "writeScript",
        payload: {
          outputDirectory,
          scriptName: "twindSetup.js",
          scriptPath: twindSetupPath,
        },
      }];
    },
  };
}

function injectStyleTag(markup: string, styleTag: string) {
  const parts = markup.split("</head>");

  return parts[0] + styleTag + parts[1];
}

export { twindPlugin as plugin };
