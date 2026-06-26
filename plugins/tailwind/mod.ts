import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import autoprefixer from "autoprefixer";
import postcss from "postcss";
import type tailwindCssPlugin from "@tailwindcss/postcss";
import { glob } from "tinyglobby";
import { hashDependencyTasks } from "../../utilities/incrementalBuildCache.ts";
import type { LoadApi, Mode, Plugin, Tasks } from "../../types.ts";
import {
  persistentAssetExists,
  readPersistentAssetText,
  writePersistentAssetText,
} from "../../utilities/persistentAssetCache.ts";

type TailwindPluginOptions = {
  cssPath: string;
  setupPath: string;
  stableCssPath?: string;
};

const require = createRequire(import.meta.url);
const tailwindStylesheetPath = require.resolve("tailwindcss/index.css");
let tailwindCssPromise: Promise<typeof tailwindCssPlugin> | undefined;

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
    const tailwindRuntime = new TailwindRuntime({
      cssPath,
      cwd,
      load,
      mode,
      setupPath,
    });

    return {
      prepareBuild: async () => {
        await tailwindRuntime.ensureCompiledCss();
      },
      prepareContext: async () => {
        await tailwindRuntime.ensureCompiledCss();
      },
      async afterEachRender({ markup, url }) {
        if (url.endsWith(".xml")) {
          return { markup };
        }

        if (mode === "production") {
          const stylesheetHref =
            "/" + (await tailwindRuntime.getStylesheetFile());

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
            `<style data-tailwind>${await tailwindRuntime.ensureCompiledCss()}</style>`,
          ),
        };
      },
      async finishBuild() {
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
      },
      onMessage({ message }) {
        if (message.type === "getStyleSetupPath") {
          return { result: setupPath };
        }
      },
    };
  },
};

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

async function createTailwindCacheKey({
  cssPath,
  cwd,
  mode,
  setupPath,
}: {
  cssPath: string;
  cwd: string;
  mode: Mode;
  setupPath: string;
}) {
  const [dependencyFingerprint, contentFingerprint] = await Promise.all([
    hashDependencyTasks(cwd, [
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
    ]),
    hashTailwindContent(cwd, setupPath),
  ]);

  return dependencyFingerprint && contentFingerprint !== null
    ? createHash("sha256")
        .update(
          JSON.stringify({
            contentFingerprint,
            dependencyFingerprint,
            mode,
            version: 3,
          }),
        )
        .digest("hex")
    : null;
}

function injectIntoHead(markup: string, injected: string) {
  return markup.includes("</head>")
    ? markup.replace("</head>", `${injected}</head>`)
    : markup;
}

async function hashTailwindContent(cwd: string, setupPath: string) {
  const contentConfig = await getTailwindContentConfig(cwd, setupPath);

  if (!contentConfig) {
    return null;
  }

  const { baseDirectory, patterns } = contentConfig;
  const hash = createHash("sha256");

  hash.update(path.relative(cwd, baseDirectory));
  hash.update("\n");
  hash.update(JSON.stringify(patterns));
  hash.update("\n");

  if (patterns.length === 0) {
    return hash.digest("hex");
  }

  let contentFiles: string[];

  try {
    contentFiles = await glob(patterns, {
      absolute: true,
      cwd: baseDirectory,
      dot: true,
      ignore: ["**/node_modules/**", ".gustwind/**"],
      onlyFiles: true,
    });
  } catch {
    return null;
  }

  for (const filePath of [...new Set(contentFiles)].sort()) {
    hash.update(path.relative(cwd, filePath));
    hash.update("\n");
    hash.update(await readFile(filePath));
    hash.update("\n");
  }

  return hash.digest("hex");
}

async function getTailwindContentConfig(cwd: string, setupPath: string) {
  const setupModule = (await import(
    `${pathToFileURL(setupPath).href}?cache=${Date.now()}`
  )) as {
    default?: {
      content?: unknown;
    };
  };

  return extractTailwindContentConfig(
    setupModule.default?.content,
    cwd,
    setupPath,
  );
}

function extractTailwindContentConfig(
  content: unknown,
  cwd: string,
  setupPath: string,
): {
  baseDirectory: string;
  patterns: string[];
} | null {
  if (content === undefined) {
    return { baseDirectory: cwd, patterns: [] };
  }

  if (isTailwindContentString(content)) {
    return { baseDirectory: cwd, patterns: [content] };
  }

  if (isTailwindContentArray(content)) {
    return createTailwindContentConfig(
      cwd,
      extractTailwindContentFiles(content),
    );
  }

  if (!isTailwindContentObject(content)) {
    return null;
  }

  return extractTailwindContentObjectConfig(content, cwd, setupPath);
}

function isTailwindContentString(content: unknown): content is string {
  return typeof content === "string";
}

function isTailwindContentArray(content: unknown): content is unknown[] {
  return Array.isArray(content);
}

function isTailwindContentObject(content: unknown): content is object {
  return Boolean(content && typeof content === "object");
}

function extractTailwindContentObjectConfig(
  content: object,
  cwd: string,
  setupPath: string,
) {
  if (!("files" in content)) {
    return { baseDirectory: cwd, patterns: [] };
  }

  const contentObject = content as { files?: unknown; relative?: unknown };
  const baseDirectory =
    contentObject.relative === true ? path.dirname(setupPath) : cwd;

  return createTailwindContentConfig(
    baseDirectory,
    extractTailwindContentPatterns(contentObject.files),
  );
}

function extractTailwindContentPatterns(files: unknown) {
  if (typeof files === "string") {
    return [files];
  }

  if (Array.isArray(files)) {
    return extractTailwindContentFiles(files);
  }

  return null;
}

function createTailwindContentConfig(
  baseDirectory: string,
  patterns: string[] | null,
) {
  return patterns ? { baseDirectory, patterns } : null;
}

function extractTailwindContentFiles(files: unknown[]) {
  const patterns: string[] = [];

  for (const file of files) {
    if (typeof file === "string") {
      patterns.push(file);
      continue;
    }

    if (!isRawTailwindContent(file)) {
      return null;
    }
  }

  return patterns;
}

function isRawTailwindContent(file: unknown) {
  return Boolean(
    file &&
    typeof file === "object" &&
    typeof (file as { raw?: unknown }).raw === "string",
  );
}

function normalizeTailwindSource(source: string) {
  let hasTailwindImport = false;

  const withResolvedImports = source.replace(
    /@import\s+["']tailwindcss["'];/g,
    () => {
      hasTailwindImport = true;

      return `@import "${tailwindStylesheetPath}";`;
    },
  );

  return withResolvedImports.replace(
    /^\s*@tailwind\s+(?:base|components|utilities)\s*;\s*$/gm,
    () => {
      if (hasTailwindImport) {
        return "";
      }

      hasTailwindImport = true;

      return `@import "${tailwindStylesheetPath}";`;
    },
  );
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
  const message = warning instanceof Error ? warning.message : String(warning);
  const warningCode =
    typeof typeOrOptions === "object" && typeOrOptions
      ? (typeOrOptions as { code?: unknown }).code
      : code;

  return warningCode === "DEP0205" && message.includes("module.register()");
}

export { plugin };
