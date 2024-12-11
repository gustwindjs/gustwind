import * as path from "node:path";
import tailwindCss from "npm:@tailwindcss/postcss@4.0.0-beta.6";
import postcss from "npm:postcss@8.4.49";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  cssPath: string;
}> = {
  meta: {
    name: "gustwind-tailwind-plugin",
    description:
      "${name} implements Tailwind styling integration to the site giving access to Tailwind semantics.",
    dependsOn: [],
  },
  init: ({ cwd, options, load }) => {
    const tailwindCssPath = path.join(cwd, options.cssPath);
    let processor: ReturnType<typeof postcss>;
    let tailwindCSS: string;

    // TODO: Execute this only if needed (not for all files like now)
    // Likely the right thing to do is to process once at prepareBuild and
    // then used the cached CSS for everything.
    async function preparePlugins() {
      processor = await postcss([tailwindCss()]);
      tailwindCSS = await load.textFile(tailwindCssPath);
    }

    return {
      prepareBuild: preparePlugins,
      prepareContext: preparePlugins,
      afterEachRender: async ({ markup, url }) => {
        if (url.endsWith(".xml")) {
          return { markup };
        }

        const { css } = await processor.process(
          tailwindCSS,
          // TODO: Is this correct?
          { from: url },
        );

        return {
          markup: markup.replace(
            "</head>",
            `<style>${css}</style></head>`,
          ),
        };
      },
      /*onMessage: ({ message }) => {
        const { type } = message;

        if (type === "getStyleSetupPath") {
          return { result: tailwindSetupPath };
        }
      },*/
    };
  },
};

export { plugin };
