import { build } from "esbuild";
import { chmod, cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const gustwindEntries = [
  {
    in: "./gustwind-node/mod.ts",
    out: "mod",
  },
  {
    declaration: "cloudflareWorker",
    in: "./cloudflare-worker/mod.ts",
    out: "workers/cloudflare/mod",
    exportPaths: ["./workers/cloudflare", "./cloudflare-worker"],
  },
  {
    in: "./renderers/htmlisp-renderer/mod.ts",
    out: "plugins/htmlisp-renderer/mod",
    exportPath: "./plugins/htmlisp-renderer",
  },
  {
    in: "./renderers/htmlisp-edge-renderer/mod.ts",
    out: "plugins/htmlisp-edge-renderer/mod",
    exportPath: "./plugins/htmlisp-edge-renderer",
  },
  {
    in: "./plugins/copy/mod.ts",
    out: "plugins/copy/mod",
    exportPath: "./plugins/copy",
  },
  {
    in: "./routers/config-router/mod.ts",
    out: "routers/config-router/mod",
    exportPaths: ["./routers/config-router"],
  },
  {
    in: "./routers/edge-router/mod.ts",
    out: "routers/edge-router/mod",
    exportPaths: ["./routers/edge-router", "./plugins/edge-router"],
  },
  {
    in: "./plugins/meta/mod.ts",
    out: "plugins/meta/mod",
    exportPath: "./plugins/meta",
  },
  {
    in: "./plugins/pagefind/mod.ts",
    out: "plugins/pagefind/mod",
    exportPath: "./plugins/pagefind",
  },
  {
    in: "./plugins/script/mod.ts",
    out: "plugins/script/mod",
    exportPath: "./plugins/script",
  },
  {
    in: "./plugins/sitemap/mod.ts",
    out: "plugins/sitemap/mod",
    exportPath: "./plugins/sitemap",
  },
  {
    in: "./plugins/stats/mod.ts",
    out: "plugins/stats/mod",
    exportPath: "./plugins/stats",
  },
  {
    in: "./plugins/tailwind/mod.ts",
    out: "plugins/tailwind/mod",
    exportPath: "./plugins/tailwind",
  },
];

const gustwindHtmlispEntries = [
  {
    declaration: "htmlisp",
    exportPath: "./htmlisp",
    in: "./htmlisp/mod.ts",
    out: "htmlisp/mod",
  },
  {
    declaration: "htmlispToHTMLSync",
    exportPath: "./htmlisp/htmlispToHTMLSync",
    in: "./htmlisp/htmlispToHTMLSync.ts",
    out: "htmlisp/htmlispToHTMLSync",
  },
  {
    declaration: "astToHTMLSync",
    exportPath: "./htmlisp/utilities/astToHTMLSync",
    in: "./htmlisp/utilities/astToHTMLSync.ts",
    out: "htmlisp/utilities/astToHTMLSync",
  },
  {
    declaration: "parseLatex",
    exportPath: "./htmlisp/parsers/latex/parseLatex",
    in: "./htmlisp/parsers/latex/parseLatex.ts",
    out: "htmlisp/parsers/latex/parseLatex",
  },
  {
    declaration: "parseBibtexCollection",
    exportPath: "./htmlisp/parsers/latex/parseBibtexCollection",
    in: "./htmlisp/parsers/latex/parseBibtexCollection.ts",
    out: "htmlisp/parsers/latex/parseBibtexCollection",
  },
  {
    declaration: "defaultExpressions",
    exportPath: "./htmlisp/parsers/latex/defaultExpressions",
    in: "./htmlisp/parsers/latex/defaultExpressions.ts",
    out: "htmlisp/parsers/latex/defaultExpressions",
  },
];

const gustwindPackageEntries = [...gustwindEntries, ...gustwindHtmlispEntries];

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const targetName = process.argv[2];
if (!targetName) {
  console.error(
    "Usage: node ./scripts/build-npm-package.mjs <gustwind|htmlisp> [version-from-package.json]",
  );
  process.exit(1);
}

const rootPackage = JSON.parse(
  await readFile(path.join(rootDirectory, "package.json"), "utf8"),
);
const version = process.argv[3] ?? rootPackage.version;
const rootTypesSource = await readFile(
  path.join(rootDirectory, "types.ts"),
  "utf8",
);
const htmlispTypesSource = await readFile(
  path.join(rootDirectory, "htmlisp", "types.ts"),
  "utf8",
);

const targets = {
  gustwind: {
    outDirectory: path.join(rootDirectory, "gustwind-node", "npm"),
    entryPoints: gustwindPackageEntries.map(({ in: input, out }) => ({
      in: input,
      out,
    })),
    cliEntryPoint: {
      in: "./gustwind-node/cli.ts",
      out: "cli",
    },
    packageJson: {
      name: "gustwind",
      version,
      type: "module",
      main: "./mod.js",
      types: "./mod.d.ts",
      bin: {
        gustwind: "./cli.js",
      },
      exports: {
        ".": "./mod.js",
        ...Object.fromEntries(
          gustwindPackageEntries
            .flatMap(({ exportPath, exportPaths, out }) =>
              [exportPath, ...(exportPaths || [])]
                .filter(Boolean)
                .map((currentExportPath) => [
                  currentExportPath,
                  `./${out}.js`,
                ])
            ),
        ),
      },
      files: [
        "cli.js",
        "mod.js",
        "mod.d.ts",
        "types.d.ts",
        "htmlisp/**/*.js",
        "htmlisp/**/*.d.ts",
        "plugins/**/*.js",
        "plugins/**/*.d.ts",
        "routers/**/*.js",
        "routers/**/*.d.ts",
        "workers/**/*.js",
        "workers/**/*.d.ts",
        "README.md",
        "LICENSE",
      ],
      description:
        "Gustwind is a Node.js-powered website creator that allows component-oriented development of large-scale sites.",
      license: rootPackage.license,
      repository: rootPackage.repository,
      bugs: rootPackage.bugs,
      homepage: rootPackage.homepage,
      keywords: ["ssg", "site-generation", "static-site-generator"],
      engines: {
        node: ">=24",
      },
      dependencies: rootPackage.dependencies,
    },
    readmePath: path.join(rootDirectory, "gustwind-node", "README.md"),
  },
  htmlisp: {
    outDirectory: path.join(rootDirectory, "htmlisp", "npm"),
    entryPoints: [{ in: "./htmlisp/mod.ts", out: "mod" }],
    packageJson: {
      name: "htmlisp",
      version,
      type: "module",
      main: "./mod.js",
      exports: {
        ".": "./mod.js",
      },
      files: ["mod.js", "README.md", "LICENSE"],
      description: "HTML combined with Lisp for fun and profit",
      license: rootPackage.license,
      repository: rootPackage.repository,
      bugs: rootPackage.bugs,
      homepage: rootPackage.homepage,
      keywords: ["templating", "html", "templating-engine"],
      engines: {
        node: ">=24",
      },
    },
    readmePath: path.join(rootDirectory, "htmlisp", "README.md"),
  },
};

const target = targets[targetName];

if (!target) {
  console.error(`Unknown package target "${targetName}"`);
  process.exit(1);
}

await rm(target.outDirectory, { recursive: true, force: true });
await mkdir(target.outDirectory, { recursive: true });

await build({
  absWorkingDir: rootDirectory,
  bundle: true,
  define: {
    "process.env.GUSTWIND_VERSION": JSON.stringify(version),
  },
  entryPoints: target.entryPoints,
  format: "esm",
  outdir: target.outDirectory,
  packages: "external",
  platform: "node",
  target: "node24",
});

if (target.cliEntryPoint) {
  await build({
    absWorkingDir: rootDirectory,
    banner: {
      js: "#!/usr/bin/env node",
    },
    bundle: true,
    define: {
      "process.env.GUSTWIND_VERSION": JSON.stringify(version),
    },
    entryPoints: [target.cliEntryPoint],
    format: "esm",
    outdir: target.outDirectory,
    packages: "external",
    platform: "node",
    target: "node24",
  });
  await chmod(path.join(target.outDirectory, "cli.js"), 0o755);
}

await writeFile(
  path.join(target.outDirectory, "package.json"),
  `${JSON.stringify(target.packageJson, null, 2)}\n`,
);
await cp(path.join(rootDirectory, "LICENSE"), path.join(target.outDirectory, "LICENSE"));
await cp(target.readmePath, path.join(target.outDirectory, "README.md"));

if (targetName === "gustwind") {
  await writeGustwindDeclarations(target.outDirectory);
}

async function writeGustwindDeclarations(outDirectory) {
  await writeFile(path.join(outDirectory, "mod.d.ts"), createGustwindDeclaration());
  await writeFile(
    path.join(outDirectory, "types.d.ts"),
    rewriteDeclarationImports(rootTypesSource, [["./htmlisp/types.ts", "./htmlisp/types.js"]]),
  );
  await mkdir(path.join(outDirectory, "htmlisp"), { recursive: true });
  await writeFile(
    path.join(outDirectory, "htmlisp", "types.d.ts"),
    rewriteDeclarationImports(htmlispTypesSource, [["../types.ts", "../types.js"]]),
  );

  await Promise.all(
    gustwindEntries
      .filter(({ exportPath, exportPaths }) => exportPath || exportPaths?.length)
      .map(({ declaration, out }) =>
        writeFile(
          path.join(outDirectory, `${out}.d.ts`),
          declaration === "cloudflareWorker"
            ? createCloudflareWorkerDeclaration()
            : createPluginDeclaration(),
        )
      ),
  );
  await Promise.all(
    gustwindHtmlispEntries.map(({ declaration, out }) =>
      writeFile(
        path.join(outDirectory, `${out}.d.ts`),
        createHtmlispEntryDeclaration(declaration),
      )
    ),
  );
}

function rewriteDeclarationImports(source, replacements) {
  return `${replacements.reduce(
    (ret, [from, to]) => ret.replaceAll(from, to),
    source,
  )}\n`;
}

function createPluginDeclaration() {
  return [
    'import type { Plugin } from "../../types.js";',
    "",
    "export declare const plugin: Plugin<Record<string, unknown>, Record<string, unknown>>;",
    "",
  ].join("\n");
}

function createCloudflareWorkerDeclaration() {
  return [
    'import type { Plugin, Tasks } from "../../types.js";',
    "",
    "type PluginDefinition = [Plugin, Record<string, unknown>];",
    "type RenderFn = (",
    "  pathname: string,",
    "  initialContext: Record<string, unknown>,",
    ") => Promise<{",
    "  markup: string;",
    "  tasks: Tasks;",
    "}>;",
    "",
    "type CloudflareAssetFetcher = {",
    "  fetch(input: Request | URL | string, init?: RequestInit): Promise<Response>;",
    "};",
    "",
    "type CloudflareExecutionContext = {",
    "  waitUntil(promise: Promise<unknown>): void;",
    "  passThroughOnException?(): void;",
    "};",
    "",
    "type CloudflareWorkerContext<E> = {",
    "  ctx: CloudflareExecutionContext;",
    "  env: E;",
    "  request: Request;",
    "};",
    "",
    "type CloudflareWorker<E> = {",
    "  fetch(",
    "    request: Request,",
    "    env: E,",
    "    ctx: CloudflareExecutionContext,",
    "  ): Response | Promise<Response>;",
    "};",
    "",
    "type CloudflareWorkerOptions<E extends Record<string, unknown>> = {",
    "  assetsBinding?: keyof E & string;",
    "  getRenderContext?(",
    "    context: CloudflareWorkerContext<E>,",
    "  ): Record<string, unknown> | Promise<Record<string, unknown>>;",
    "  handleTasks?(",
    "    context: CloudflareWorkerContext<E> & { tasks: Tasks },",
    "  ): void | Promise<void>;",
    "  initialPlugins?: PluginDefinition[];",
    "  onError?(",
    "    context: CloudflareWorkerContext<E> & { error: unknown },",
    "  ): Response | Promise<Response>;",
    "  render?: RenderFn;",
    "};",
    "",
    "export declare function createCloudflareWorker<E extends Record<string, unknown>>(",
    "  options: CloudflareWorkerOptions<E>,",
    "): CloudflareWorker<E>;",
    "",
    "export type {",
    "  CloudflareAssetFetcher,",
    "  CloudflareExecutionContext,",
    "  CloudflareWorker,",
    "  CloudflareWorkerContext,",
    "  CloudflareWorkerOptions,",
    "};",
    "",
  ].join("\n");
}

function createHtmlispEntryDeclaration(declaration) {
  switch (declaration) {
    case "htmlisp":
      return createHtmlispDeclaration();
    case "htmlispToHTMLSync":
      return createHtmlispToHTMLSyncDeclaration();
    case "astToHTMLSync":
      return createAstToHTMLSyncDeclaration();
    case "parseLatex":
      return createParseLatexDeclaration();
    case "parseBibtexCollection":
      return createParseBibtexCollectionDeclaration();
    case "defaultExpressions":
      return createDefaultExpressionsDeclaration();
    default:
      throw new Error(`Unknown htmlisp declaration "${declaration}"`);
  }
}

function createHtmlispDeclaration() {
  return [
    'export type * from "./types.js";',
    'export { htmlispToHTMLSync } from "./htmlispToHTMLSync.js";',
    'export { astToHTMLSync } from "./utilities/astToHTMLSync.js";',
    'export { parseLatex } from "./parsers/latex/parseLatex.js";',
    'export { parseBibtexCollection } from "./parsers/latex/parseBibtexCollection.js";',
    'export { blocks, cites, doubles, el, element, lists, refs, singles } from "./parsers/latex/defaultExpressions.js";',
    'import type { HtmllispToHTMLParameters, RawHtml } from "./types.js";',
    "",
    "export declare function htmlispToHTML(args: HtmllispToHTMLParameters): Promise<string>;",
    "export declare function raw(value: unknown): RawHtml;",
    "",
  ].join("\n");
}

function createHtmlispToHTMLSyncDeclaration() {
  return [
    'import type { HtmllispToHTMLParameters } from "./types.js";',
    "",
    "export declare function htmlispToHTMLSync(args: HtmllispToHTMLParameters): string;",
    "",
  ].join("\n");
}

function createAstToHTMLSyncDeclaration() {
  return [
    'import type { Utilities } from "../../types.js";',
    'import type { Components, Context, Element, HtmlispRenderOptions, HtmllispToHTMLParameters } from "../types.js";',
    "",
    "export declare function astToHTMLSync(",
    "  ast: (string | Element)[],",
    "  htmlispToHTML: (args: HtmllispToHTMLParameters) => unknown,",
    "  context?: Context,",
    "  props?: Context,",
    "  initialLocal?: Context,",
    "  utilities?: Utilities,",
    "  componentUtilities?: Record<string, Utilities>,",
    "  components?: Components,",
    "  renderOptions?: HtmlispRenderOptions,",
    "  parentAst?: (string | Element)[],",
    "): string;",
    "",
  ].join("\n");
}

function createParseLatexDeclaration() {
  return [
    'import type { Element } from "../../types.js";',
    "",
    "type MatchCounts = Record<string, string[]>;",
    "type SingleParser<T> = (children: string[], matchCounts: MatchCounts) => T;",
    "type DoubleParser<T> = (first: string, second?: string) => T;",
    "type BlockParser<T, U> = {",
    "  container: (children: U[]) => T;",
    "  item: (getCharacter: unknown) => U;",
    "};",
    "",
    "export declare function parseLatex(",
    "  input: string,",
    "  parser: {",
    "    singles?: Record<string, SingleParser<Element>>;",
    "    doubles?: Record<string, DoubleParser<Element>>;",
    "    blocks?: Record<string, BlockParser<Element, string>>;",
    "    lists?: Record<string, BlockParser<Element, Element>>;",
    "  },",
    "): Element[];",
    "",
  ].join("\n");
}

function createParseBibtexCollectionDeclaration() {
  return [
    "type BibtexCollection = {",
    "  fields?: Record<string, string>;",
    "  id: string;",
    "  type: string;",
    "};",
    "",
    "export declare function parseBibtexCollection(input: string): Record<string, BibtexCollection>;",
    "export type { BibtexCollection };",
    "",
  ].join("\n");
}

function createDefaultExpressionsDeclaration() {
  return [
    'import type { Element } from "../../types.js";',
    "",
    "type BibtexCollection = {",
    "  fields?: Record<string, string>;",
    "  id: string;",
    "  type: string;",
    "};",
    "type MatchCounts = Record<string, string[]>;",
    "type SingleParser<T> = (children: string[], matchCounts: MatchCounts) => T;",
    "type DoubleParser<T> = (first: string, second?: string) => T;",
    "type BlockParser<T, U> = {",
    "  container: (children: U[]) => T;",
    "  item: (getCharacter: unknown) => U;",
    "};",
    "",
    "export declare const singles: Record<string, SingleParser<Element>>;",
    "export declare const doubles: Record<string, DoubleParser<Element>>;",
    "export declare const blocks: Record<string, BlockParser<Element, string>>;",
    "export declare const lists: Record<string, BlockParser<Element, Element>>;",
    "export declare const cites: (bibtexEntries: Record<string, BibtexCollection>) => Record<string, SingleParser<Element>>;",
    "export declare const refs: (refEntries: { title: string; label: string; slug: string }[]) => Record<string, SingleParser<Element>>;",
    "export declare function el(type: string): (children: string[]) => Element;",
    "export declare function element(type: string, children: (Element | string)[], attributes?: Record<string, string>): Element;",
    "",
  ].join("\n");
}

function createGustwindDeclaration() {
  return [
    'import type { InitLoadApi, Plugin, PluginOptions, Tasks } from "./types.js";',
    "",
    "type PluginDefinition = [Plugin, Record<string, unknown>];",
    "type NodePluginDefinition = [Plugin | string, Record<string, unknown>];",
    "type ValidationResult = { filesValidated: number };",
    "",
    "type RenderFn = (",
    "  pathname: string,",
    "  initialContext: Record<string, unknown>,",
    ") => Promise<{",
    "  markup: string;",
    "  tasks: Tasks;",
    "}>;",
    "",
    "type BuildRouteBenchmark = {",
    "  bytesWritten: number;",
    "  durationMs: number;",
    "  memoryRssBytes: number;",
    "  outputPath: string;",
    "  url: string;",
    "};",
    "",
    "type BuildBenchmark = {",
    "  averageRouteDurationMs: number;",
    "  fastestRoute: BuildRouteBenchmark | null;",
    "  finalMemoryRssBytes: number;",
    "  finishedAt: string;",
    "  outputDirectory: string;",
    "  p50RouteDurationMs: number;",
    "  p95RouteDurationMs: number;",
    "  peakMemoryRssBytes: number;",
    "  routeResults: BuildRouteBenchmark[];",
    "  routesBuilt: number;",
    "  schemaVersion: 1;",
    "  slowestRoute: BuildRouteBenchmark | null;",
    "  startedAt: string;",
    "  tasksProcessed: number;",
    "  totalDurationMs: number;",
    "};",
    "",
    "type BuildNodeResult = {",
    "  benchmark?: BuildBenchmark;",
    "  cacheFrom?: string;",
    "  cacheHits?: number;",
    "  routesBuilt?: number;",
    "  validation?: ValidationResult;",
    "};",
    "",
    "export * from \"./types.js\";",
    "",
    "export declare function buildNode(args: {",
    "  cwd: string;",
    "  outputDirectory: string;",
    "  pluginDefinitions: PluginOptions[];",
    "  validateOutput?: boolean;",
    "  collectBenchmark?: boolean;",
    "  incremental?: boolean;",
    "  cacheFrom?: string;",
    "  routeConcurrency?: number;",
    "}): Promise<BuildNodeResult>;",
    "",
    "export declare function initNodeRender(args: {",
    "  cwd: string;",
    "  initialPlugins: NodePluginDefinition[];",
    "  outputDirectory?: string;",
    "}): Promise<RenderFn>;",
    "",
    "export declare function initRender(initialPlugins: PluginDefinition[]): Promise<RenderFn>;",
    "export declare function initRender(",
    "  initLoadApi: InitLoadApi,",
    "  initialPlugins: PluginDefinition[],",
    "): Promise<RenderFn>;",
    "",
    "export declare function validateHtmlDirectory(directoryPath: string): Promise<ValidationResult>;",
    "export declare function validateHtmlDocument(args: {",
    "  filePath: string;",
    "  html: string;",
    "}): void;",
    "",
    "export type { BuildBenchmark, BuildNodeResult, BuildRouteBenchmark, RenderFn };",
    "",
  ].join("\n");
}
