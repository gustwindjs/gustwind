import { extract, install } from "https://esm.sh/@twind/core@1.1.1";
import presetAutoprefix from "https://esm.sh/@twind/preset-autoprefix@1.0.5";
import presetTailwind from "https://esm.sh/@twind/preset-tailwind@1.1.1";
import { path } from "../../server-deps.ts";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  setupPath: string;
}> = {
  meta: {
    name: "gustwind-twind-plugin",
  },
  init: ({ options, outputDirectory }) => {
    const twindSetupPath = path.join(Deno.cwd(), options.setupPath);

    async function prepareStylesheet() {
      const twindSetup = twindSetupPath
        ? await import("file://" + twindSetupPath).then((m) => m.default)
        : { presets: [] };

      // This has to run before tw can work!
      install({
        ...twindSetup,
        presets: [presetAutoprefix(), presetTailwind()].concat(
          twindSetup.presets,
        ),
      });
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
