import * as path from "node:path";
import type { LoadApi, Mode, Plugin, Tasks } from "../../types.ts";
import { TailwindRuntime } from "./runtime.ts";

type TailwindPluginOptions = {
  cssPath: string;
  setupPath: string;
  stableCssPath?: string;
};

const plugin: Plugin<TailwindPluginOptions> = {
  meta: {
    name: "gustwind-tailwind-plugin",
    description:
      "Compiles Tailwind once and links a shared stylesheet in production.",
    dependsOn: [],
  },
  init({ cwd, load, mode, options, outputDirectory }) {
    const tailwindRuntime = createTailwindRuntime({
      cwd,
      load,
      mode,
      options,
    });
    const setupPath = path.join(cwd, options.setupPath);

    return {
      prepareBuild: async () => {
        await tailwindRuntime.ensureCompiledCss();
      },
      prepareContext: async () => {
        await tailwindRuntime.ensureCompiledCss();
      },
      async afterEachRender({ markup, url }) {
        return await injectTailwindRenderStyle({
          markup,
          mode,
          tailwindRuntime,
          url,
        });
      },
      async finishBuild() {
        return await createTailwindBuildTasks({
          mode,
          options,
          outputDirectory,
          tailwindRuntime,
        });
      },
      onMessage({ message }) {
        if (message.type === "getStyleSetupPath") {
          return { result: setupPath };
        }
      },
    };
  },
};

function createTailwindRuntime(
  {
    cwd,
    load,
    mode,
    options,
  }: {
    cwd: string;
    load: LoadApi;
    mode: Mode;
    options: TailwindPluginOptions;
  },
) {
  return new TailwindRuntime({
    cssPath: path.join(cwd, options.cssPath),
    cwd,
    load,
    mode,
    setupPath: path.join(cwd, options.setupPath),
  });
}

async function injectTailwindRenderStyle(
  {
    markup,
    mode,
    tailwindRuntime,
    url,
  }: {
    markup: string;
    mode: Mode;
    tailwindRuntime: TailwindRuntime;
    url: string;
  },
) {
  if (url.endsWith(".xml")) {
    return { markup };
  }

  const style = mode === "production"
    ? await getProductionStyleElement(tailwindRuntime)
    : await getDevelopmentStyleElement(tailwindRuntime);

  return { markup: injectIntoHead(markup, style) };
}

async function getProductionStyleElement(tailwindRuntime: TailwindRuntime) {
  const stylesheetHref = "/" + (await tailwindRuntime.getStylesheetFile());

  return `<link rel="stylesheet" href="${stylesheetHref}">`;
}

async function getDevelopmentStyleElement(tailwindRuntime: TailwindRuntime) {
  return `<style data-tailwind>${await tailwindRuntime.ensureCompiledCss()}</style>`;
}

async function createTailwindBuildTasks(
  {
    mode,
    options,
    outputDirectory,
    tailwindRuntime,
  }: {
    mode: Mode;
    options: TailwindPluginOptions;
    outputDirectory: string;
    tailwindRuntime: TailwindRuntime;
  },
): Promise<Tasks | undefined> {
  if (mode !== "production") {
    return;
  }

  const css = await tailwindRuntime.ensureCompiledCss();
  const tasks: Tasks = [
    {
      type: "writeFile",
      payload: {
        outputDirectory,
        file: await tailwindRuntime.getStylesheetFile(),
        data: css,
      },
    },
  ];

  if (options.stableCssPath) {
    tasks.push({
      type: "writeFile",
      payload: {
        outputDirectory,
        file: trimLeadingSlash(options.stableCssPath),
        data: css,
      },
    });
  }

  return tasks;
}

function injectIntoHead(markup: string, injected: string) {
  return markup.includes("</head>")
    ? markup.replace("</head>", `${injected}</head>`)
    : markup;
}

function trimLeadingSlash(input: string) {
  return input.startsWith("/") ? input.slice(1) : input;
}

export { plugin };
