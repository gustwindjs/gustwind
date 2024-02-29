import * as path from "node:path";
import { extract, install } from "https://esm.sh/@twind/core@1.1.1";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<
  // TODO: Type this so that either has to be defined
  { setupPath?: string; twindSetup?: Record<string, unknown> }
> = {
  meta: {
    name: "gustwind-twind-plugin",
    description:
      "${name} implements Twind styling integration to the site giving access to Tailwind semantics.",
    dependsOn: [],
  },
  init: ({ cwd, options }) => {
    async function prepareStylesheet() {
      // TODO: What if neither has been defined?
      const twindSetup = options.twindSetup ||
        await import("file://" + path.join(cwd, options.setupPath)).then((
          m,
        ) => m.default);

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

        // TODO: What to do if there's no setupPath (directly twindSetup for example)
        if (type === "getStyleSetupPath" && options.setupPath) {
          const twindSetupPath = path.join(cwd, options.setupPath);

          return { result: twindSetupPath };
        }
      },
    };
  },
};

export { plugin };
