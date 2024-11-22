import * as path from "node:path";
import tailwindCss from "npm:tailwindcss@3.4.15";
import postcss from "npm:postcss@8.4.49";
import autoprefixer from "npm:autoprefixer@10.4.20";
import type { Plugin } from "../../types.ts";

const plugin: Plugin<{
  cssPath: string;
  setupPath: string;
}> = {
  meta: {
    name: "gustwind-tailwind-plugin",
    description:
      "${name} implements Tailwind styling integration to the site giving access to Tailwind semantics.",
    dependsOn: [],
  },
  init: ({ cwd, options, load, mode }) => {
    const tailwindCssPath = path.join(cwd, options.cssPath);
    const tailwindSetupPath = path.join(cwd, options.setupPath);
    let processor: ReturnType<typeof postcss>;
    let tailwindCSS: string;

    // TODO: Execute this only if needed (not for all files like now)
    async function preparePlugins() {
      const { default: tailwindSetup } = await import(tailwindSetupPath);

      const plugins = [
        // deno-lint-ignore no-explicit-any
        tailwindCss(tailwindSetup) as any,
        // deno-lint-ignore no-explicit-any
        autoprefixer({}) as any,
        // TODO: Consider allowing customizing autoprefixer
        // autoprefixer(options.autoprefixer) as any,
        // TODO: Consider adding postcss-import as a default plugin
      ];

      if (mode === "production") {
        const { default: cssnano } = await import("npm:cssnano@7.0.6");
        plugins.push(cssnano());
      }

      processor = await postcss(plugins);
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
      onMessage: ({ message }) => {
        const { type } = message;

        if (type === "getStyleSetupPath") {
          return { result: tailwindSetupPath };
        }
      },
    };
  },
};

export { plugin };
