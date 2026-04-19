import { createHash } from "node:crypto";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import tailwindCss from "tailwindcss";
import { hashDependencyTasks } from "../../utilities/incrementalBuildCache.ts";
import type { Plugin } from "../../types.ts";
import {
  persistentAssetExists,
  readPersistentAssetText,
  writePersistentAssetText,
} from "../../utilities/persistentAssetCache.ts";

type TailwindPluginOptions = {
  cssPath: string;
  setupPath: string;
};

const plugin: Plugin<TailwindPluginOptions> = {
  meta: {
    name: "gustwind-tailwind-plugin",
    description:
      "Compiles Tailwind once and links a shared stylesheet in production.",
    dependsOn: [],
  },
  init({ cwd, load, mode, options, outputDirectory }) {
    const cssPath = path.join(cwd, options.cssPath);
    const setupPath = path.join(cwd, options.setupPath);
    let compiledCss: string | undefined;
    let compiledCssPromise: Promise<string> | undefined;
    let cacheKeyPromise: Promise<string | null> | undefined;
    let stylesheetFile: string | undefined;

    async function compileCss() {
      const [{ default: tailwindSetup }, tailwindSource] = await Promise.all([
        import(pathToFileURL(setupPath).href),
        load.textFile(cssPath),
      ]);
      const plugins = [
        tailwindCss(tailwindSetup) as any,
        autoprefixer({}),
      ];

      if (mode === "production") {
        const { default: cssnano } = await import("cssnano");
        plugins.push(cssnano());
      }

      const { css } = await postcss(plugins).process(tailwindSource, {
        from: cssPath,
      });

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
              path: cssPath,
              type: "styles",
            },
          },
          {
            type: "loadModule",
            payload: {
              path: setupPath,
              type: "styleSetup",
            },
          },
        ]).then((dependencyFingerprint) =>
          dependencyFingerprint
            ? createHash("sha256")
              .update(JSON.stringify({
                dependencyFingerprint,
                mode,
                version: 2,
              }))
              .digest("hex")
            : null
        );
      }

      return await cacheKeyPromise;
    }

    async function getStylesheetFile() {
      if (stylesheetFile) {
        return stylesheetFile;
      }

      const css = await ensureCompiledCss();
      const hash = createHash("sha256").update(css).digest("hex").slice(0, 12);
      stylesheetFile = `tailwind-${hash}.css`;

      return stylesheetFile;
    }

    function injectIntoHead(markup: string, injected: string) {
      return markup.includes("</head>")
        ? markup.replace("</head>", `${injected}</head>`)
        : markup;
    }

    return {
      prepareBuild: async () => {
        await ensureCompiledCss();
      },
      prepareContext: async () => {
        await ensureCompiledCss();
      },
      async afterEachRender({ markup, url }) {
        if (url.endsWith(".xml")) {
          return { markup };
        }

        if (mode === "production") {
          const stylesheetHref = "/" + await getStylesheetFile();

          return {
            markup: injectIntoHead(
              markup,
              `<link rel="stylesheet" href="${stylesheetHref}">`,
            ),
          };
        }

        return {
          markup: injectIntoHead(
            markup,
            `<style data-tailwind>${await ensureCompiledCss()}</style>`,
          ),
        };
      },
      async finishBuild() {
        if (mode !== "production") {
          return;
        }

        return [{
          type: "writeFile",
          payload: {
            outputDirectory,
            file: await getStylesheetFile(),
            data: await ensureCompiledCss(),
          },
        }];
      },
      onMessage({ message }) {
        if (message.type === "getStyleSetupPath") {
          return { result: setupPath };
        }
      },
    };
  },
};

export { plugin };
