import * as path from "node:path";
import { extract, install } from "https://esm.sh/@twind/core@1.1.1";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  setupPath: string;
}> = {
  meta: {
    name: "gustwind-twind-plugin",
    description:
      "${name} implements Twind styling integration to the site giving access to Tailwind semantics.",
    dependsOn: [],
  },
  init: ({ cwd, options }) => {
    const twindSetupPath = path.join(cwd, options.setupPath);

    async function prepareStylesheet() {
      const twindSetup = twindSetupPath
        ? await import("file://" + twindSetupPath).then((m) => m.default)
        : { presets: [] };

      // TODO: Figure out why enabling hash breaks markdown transform styling
      install({ ...twindSetup, hash: false });
    }

    return {
      prepareBuild: prepareStylesheet,
      prepareContext: prepareStylesheet,
      afterEachRender({ markup, url }) {
        if (url.endsWith(".xml")) {
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
      onMessage: ({ message }) => {
        const { type } = message;

        if (type === "getStyleSetupPath") {
          return { result: twindSetupPath };
        }
      },
    };
  },
};

export { plugin };
