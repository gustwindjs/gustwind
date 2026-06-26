import { createHash } from "node:crypto";
import * as path from "node:path";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import type tailwindCssPlugin from "@tailwindcss/postcss";
import type { LoadApi, Mode, Plugin, Tasks } from "../../types.ts";
import {
  persistentAssetExists,
  readPersistentAssetText,
  writePersistentAssetText,
} from "../../utilities/persistentAssetCache.ts";
import { createTailwindCacheKey } from "./content.ts";
import { normalizeTailwindSource } from "./source.ts";

type TailwindPluginOptions = {
  cssPath: string;
  setupPath: string;
  stableCssPath?: string;
};

let tailwindCssPromise: Promise<typeof tailwindCssPlugin> | undefined;

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

class TailwindRuntime {
  #compiledCss: string | undefined;
  #compiledCssPromise: Promise<string> | undefined;
  #cacheKeyPromise: Promise<string | null> | undefined;
  #stylesheetFile: string | undefined;
  #options: {
    cssPath: string;
    cwd: string;
    load: LoadApi;
    mode: Mode;
    setupPath: string;
  };

  constructor(options: {
    cssPath: string;
    cwd: string;
    load: LoadApi;
    mode: Mode;
    setupPath: string;
  }) {
    this.#options = options;
  }

  async ensureCompiledCss() {
    if (this.#compiledCss) {
      return this.#compiledCss;
    }

    if (!this.#compiledCssPromise) {
      this.#compiledCssPromise = this.loadCompiledCssFromCacheOrBuild();
    }

    return await this.#compiledCssPromise;
  }

  async getStylesheetFile() {
    if (this.#stylesheetFile) {
      return this.#stylesheetFile;
    }

    const css = await this.ensureCompiledCss();
    const hash = createHash("sha256").update(css).digest("hex").slice(0, 12);
    this.#stylesheetFile = `tailwind-${hash}.css`;

    return this.#stylesheetFile;
  }

  private async loadCompiledCssFromCacheOrBuild() {
    const { cwd } = this.#options;
    const cacheKey = await this.getTailwindCacheKey();

    if (
      cacheKey &&
      (await persistentAssetExists(cwd, "tailwind", cacheKey, "compiled.css"))
    ) {
      this.#compiledCss = await readPersistentAssetText(
        cwd,
        "tailwind",
        cacheKey,
        "compiled.css",
      );

      return this.#compiledCss;
    }

    this.#compiledCss = await compileTailwindCss(this.#options);

    if (cacheKey) {
      await writePersistentAssetText(
        cwd,
        "tailwind",
        cacheKey,
        "compiled.css",
        this.#compiledCss,
      );
    }

    return this.#compiledCss;
  }

  private async getTailwindCacheKey() {
    if (!this.#cacheKeyPromise) {
      this.#cacheKeyPromise = createTailwindCacheKey(this.#options);
    }

    return await this.#cacheKeyPromise;
  }
}

async function compileTailwindCss({
  cssPath,
  cwd,
  load,
  mode,
  setupPath,
}: {
  cssPath: string;
  cwd: string;
  load: LoadApi;
  mode: Mode;
  setupPath: string;
}) {
  const tailwindSource = await load.textFile(cssPath);
  const tailwindCss = await getTailwindCss();
  const plugins = [tailwindCss({ base: cwd }), autoprefixer({})];

  if (mode === "production") {
    const { default: cssnano } = await import("cssnano");
    plugins.push(cssnano());
  }

  const { css } = await postcss(plugins).process(
    `@config "${setupPath}";\n${normalizeTailwindSource(tailwindSource)}`,
    {
      from: cssPath,
    },
  );

  return css;
}

function injectIntoHead(markup: string, injected: string) {
  return markup.includes("</head>")
    ? markup.replace("</head>", `${injected}</head>`)
    : markup;
}

function trimLeadingSlash(input: string) {
  return input.startsWith("/") ? input.slice(1) : input;
}

async function getTailwindCss() {
  if (!tailwindCssPromise) {
    tailwindCssPromise = importWithSuppressedModuleRegisterWarning(
      "@tailwindcss/postcss",
    ).then(
      (module) =>
        ("default" in module
          ? module.default
          : module) as typeof tailwindCssPlugin,
    );
  }

  return await tailwindCssPromise;
}

async function importWithSuppressedModuleRegisterWarning(
  specifier: "@tailwindcss/postcss",
) {
  const originalEmitWarning = process.emitWarning;

  // Tailwind 4 currently emits DEP0205 on Node 26 while registering its loader.
  process.emitWarning = ((...args: Parameters<typeof process.emitWarning>) => {
    if (isModuleRegisterDeprecationWarning(args)) {
      return;
    }

    return Reflect.apply(originalEmitWarning, process, args);
  }) as typeof process.emitWarning;

  try {
    return await import(specifier);
  } finally {
    process.emitWarning = originalEmitWarning;
  }
}

function isModuleRegisterDeprecationWarning(args: unknown[]) {
  const [warning, typeOrOptions, code] = args;
  const message = getWarningMessage(warning);
  const warningCode = getWarningCode(typeOrOptions, code);

  return warningCode === "DEP0205" && message.includes("module.register()");
}

function getWarningMessage(warning: unknown) {
  return warning instanceof Error ? warning.message : String(warning);
}

function getWarningCode(typeOrOptions: unknown, code: unknown) {
  return isWarningOptions(typeOrOptions) ? typeOrOptions.code : code;
}

function isWarningOptions(
  typeOrOptions: unknown,
): typeOrOptions is { code?: unknown } {
  return Boolean(typeOrOptions && typeof typeOrOptions === "object");
}

export { plugin };
