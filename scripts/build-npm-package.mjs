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
];

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const targetName = process.argv[2];
const version = process.argv[3];

if (!targetName || !version) {
  console.error("Usage: node ./scripts/build-npm-package.mjs <gustwind|htmlisp> <version>");
  process.exit(1);
}

const rootPackage = JSON.parse(
  await readFile(path.join(rootDirectory, "package.json"), "utf8"),
);
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
    entryPoints: gustwindEntries.map(({ in: input, out }) => ({
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
          gustwindEntries
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
        "htmlisp/**/*.d.ts",
        "plugins/**/*.js",
        "plugins/**/*.d.ts",
        "routers/**/*.js",
        "routers/**/*.d.ts",
        "README.md",
        "LICENSE",
      ],
      description:
        "Gustwind is a Node.js-powered website creator that allows component-oriented development of large-scale sites.",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/survivejs/gustwind.git",
      },
      bugs: {
        url: "https://github.com/survivejs/gustwind/issues",
      },
      homepage: "https://gustwind.js.org/",
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
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/survivejs/gustwind.git",
      },
      bugs: {
        url: "https://github.com/survivejs/gustwind/issues",
      },
      homepage: "https://gustwind.js.org/",
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
      .map(({ out }) =>
        writeFile(
          path.join(outDirectory, `${out}.d.ts`),
          createPluginDeclaration(),
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
