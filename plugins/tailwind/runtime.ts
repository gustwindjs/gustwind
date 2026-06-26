import { createHash } from "node:crypto";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import type tailwindCssPlugin from "@tailwindcss/postcss";
import type { LoadApi, Mode } from "../../types.ts";
import {
  persistentAssetExists,
  readPersistentAssetText,
  writePersistentAssetText,
} from "../../utilities/persistentAssetCache.ts";
import { createTailwindCacheKey } from "./content.ts";
import { normalizeTailwindSource } from "./source.ts";

type TailwindRuntimeOptions = {
  cssPath: string;
  cwd: string;
  load: LoadApi;
  mode: Mode;
  setupPath: string;
};

let tailwindCssPromise: Promise<typeof tailwindCssPlugin> | undefined;

class TailwindRuntime {
  #compiledCss: string | undefined;
  #compiledCssPromise: Promise<string> | undefined;
  #cacheKeyPromise: Promise<string | null> | undefined;
  #stylesheetFile: string | undefined;
  #options: TailwindRuntimeOptions;

  constructor(options: TailwindRuntimeOptions) {
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
}: TailwindRuntimeOptions) {
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

export { TailwindRuntime };
