import { createHash } from "node:crypto";
import * as path from "node:path";
import tailwindCss from "tailwindcss";
import postcss from "postcss";
import autoprefixer from "autoprefixer";
import { hashDependencyTasks } from "../../utilities/incrementalBuildCache.ts";
import type { Plugin } from "../../types.ts";
import {
  persistentAssetExists,
  readPersistentAssetText,
  writePersistentAssetText,
} from "../../utilities/persistentAssetCache.ts";

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
    let cacheKeyPromise: Promise<string | null> | undefined;

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
        compiledCssPromise = loadCompiledCssFromCacheOrBuild();
      }

      return await compiledCssPromise;
    }

    async function loadCompiledCssFromCacheOrBuild() {
      const cacheKey = await getTailwindCacheKey();

      if (
        cacheKey &&
        await persistentAssetExists(
          cwd,
          "tailwind",
          cacheKey,
          "compiled.css",
        )
      ) {
        compiledCss = await readPersistentAssetText(
          cwd,
          "tailwind",
          cacheKey,
          "compiled.css",
        );

        return compiledCss;
      }

      compiledCss = await compileCss();

      if (cacheKey) {
        await writePersistentAssetText(
          cwd,
          "tailwind",
          cacheKey,
          "compiled.css",
          compiledCss,
        );
      }

      return compiledCss;
    }

    async function getTailwindCacheKey() {
      if (!cacheKeyPromise) {
        cacheKeyPromise = hashDependencyTasks(cwd, [
          {
            type: "readTextFile",
            payload: {
              path: tailwindCssPath,
              type: "styles",
            },
          },
          {
            type: "loadModule",
            payload: {
              path: tailwindSetupPath,
              type: "styleSetup",
            },
          },
        ]).then((dependencyFingerprint) =>
          dependencyFingerprint
            ? createHash("sha256")
              .update(JSON.stringify({
                dependencyFingerprint,
                mode,
                version: 1,
              }))
              .digest("hex")
            : null
        );
      }

      return await cacheKeyPromise;
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
