import { extract, install } from "https://esm.sh/@twind/core@1.1.1";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  setupPath: string;
}> = {
  meta: {
    name: "gustwind-twind-plugin",
  },
  init: ({ cwd, options, outputDirectory }) => {
    const twindSetupPath = path.join(cwd, options.setupPath);

    async function prepareStylesheet() {
      const twindSetup = twindSetupPath
        ? await import("file://" + twindSetupPath).then((m) => m.default)
        : { presets: [] };

      // TODO: Figure out why enabling hash breaks markdown transform styling
      install({ ...twindSetup, hash: false });
    }

    return {
      prepareBuild: async () => {
        await prepareStylesheet();

        return [{
          type: "writeScript",
          payload: {
            outputDirectory,
            file: "twindSetup.js",
            scriptPath: twindSetupPath,
          },
        }];
      },
      prepareContext: prepareStylesheet,
      afterEachRender({ markup, route }) {
        if (route.type === "xml") {
          return { markup };
        }

        // https://web.dev/defer-non-critical-css/
        // TODO: Consider restoring CSS extraction
        /*
        const styleTag = options.extractCSS
          ? `<link rel="preload" href="./styles.css" as="style" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" href="styles.css"></noscript>`
          : getStyleTag(stylesheet);

        let css = "";
        if (options.extractCSS) {
          css = getStyleTagProperties(stylesheet).textContent;

          TODO: Setup a task to write styles.css
        }
        */

        // https://twind.style/packages/@twind/core#extract
        const { html, css } = extract(markup);

        return {
          markup: html.replace(
            "</head>",
            `<style data-twind>${css}</style></head>`,
          ),
        };
      },
    };
  },
};

export { plugin };
