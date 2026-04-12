import * as path from "node:path";
import tailwindCss from "tailwindcss";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
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
    let compiledCss: string | undefined;
    let compiledCssPromise: Promise<string> | undefined;

    async function compileCss() {
      const { default: tailwindSetup } = await import(tailwindSetupPath);

      const plugins = [
        tailwindCss(tailwindSetup) as any,
        autoprefixer({}) as any,
        // TODO: Consider allowing customizing autoprefixer
        // autoprefixer(options.autoprefixer) as any,
        // TODO: Consider adding postcss-import as a default plugin
      ];

      if (mode === "production") {
        const { default: cssnano } = await import("cssnano");
        plugins.push(cssnano());
      }

      const processor = await postcss(plugins);
      const tailwindCSS = await load.textFile(tailwindCssPath);
      const { css } = await processor.process(
        tailwindCSS,
        { from: tailwindCssPath },
      );

      return css;
    }

    async function ensureCompiledCss() {
      if (compiledCss) {
        return compiledCss;
      }

      if (!compiledCssPromise) {
        compiledCssPromise = compileCss().then((css) => {
          compiledCss = css;
          return css;
        });
      }

      return await compiledCssPromise;
    }

    return {
      prepareBuild: async () => {
        await ensureCompiledCss();
      },
      prepareContext: async () => {
        await ensureCompiledCss();
      },
      afterEachRender: async ({ markup, url }) => {
        if (url.endsWith(".xml")) {
          return { markup };
        }

        return {
          markup: markup.replace(
            "</head>",
            `<style>${await ensureCompiledCss()}</style></head>`,
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
