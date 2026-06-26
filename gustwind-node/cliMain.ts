import * as path from "node:path";
import process from "node:process";
import { readFile, writeFile } from "node:fs/promises";
import { VERSION } from "../version.ts";
import { buildNode } from "./build.ts";
import { startDevServer } from "./dev.ts";
import { startStaticServer } from "./serve.ts";
import { evaluatePluginsDefinition } from "../utilities/evaluatePluginsDefinition.ts";
import { formatRouteDiagnostics } from "../utilities/buildBenchmark.ts";
import { validateHtmlDirectory } from "../utilities/htmlValidation.ts";

type CliArgs = {
  benchmark: boolean;
  benchmarkOutput: string;
  build: boolean;
  cacheFrom: string;
  develop: boolean;
  diagnoseRoutes: boolean;
  diagnosticsTop: number;
  help: boolean;
  input: string;
  incremental: boolean;
  output: string;
  port: number;
  plugins: string;
  routeConcurrency?: number;
  serve: boolean;
  validate: boolean;
  version: boolean;
};
type CliArgsReader = {
  next(): string;
  nextValue(errorMessage: string): string;
  hasNext(): boolean;
};
type CliOptionDefinition =
  | { kind: "boolean"; field: BooleanCliArg }
  | { kind: "build" }
  | { kind: "benchmark" }
  | { kind: "diagnoseRoutes" }
  | { kind: "disableIncremental" }
  | { kind: "integer"; field: IntegerCliArg; missing: string; label: string }
  | { kind: "port"; missing: string }
  | { kind: "string"; field: StringCliArg; missing: string };
type BooleanCliArg =
  | "develop"
  | "help"
  | "serve"
  | "validate"
  | "version";
type IntegerCliArg = "diagnosticsTop" | "routeConcurrency";
type StringCliArg =
  | "benchmarkOutput"
  | "cacheFrom"
  | "input"
  | "output"
  | "plugins";
type CloseableServer = {
  close(): Promise<void> | void;
  url: string;
};
type BuildResult = Awaited<ReturnType<typeof buildNode>>;
type CliExecutionContext = {
  args: CliArgs;
  cwd: string;
  pluginsPath: string;
  readPluginDefinitions(): Promise<
    Awaited<ReturnType<typeof evaluatePluginsDefinition>>
  >;
};
type CliCommand = {
  matches(args: CliArgs): boolean;
  run(context: CliExecutionContext): Promise<number>;
};

function usage() {
  console.log(`
Build:   gustwind --build [--output <directory>] [--plugins <path>] [--validate] [--cache-from <directory-or-url>] [--no-incremental] [--route-concurrency <count>]
Benchmark: gustwind --benchmark [--output <directory>] [--plugins <path>] [--benchmark-output <file>] [--route-concurrency <count>]
Diagnose: gustwind --diagnose-routes [--output <directory>] [--plugins <path>] [--diagnostics-top <count>] [--route-concurrency <count>]
Develop: gustwind --develop [--port <port>] [--plugins <path>]
Serve:   gustwind --serve [--input <directory>] [--port <port>]
Validate: gustwind --validate [--input <directory>]

Options:
  -B, --benchmark      Builds the project and writes benchmark metrics as JSON.
  --benchmark-output   Benchmark output path (default: ./benchmark-results.json).
  -b, --build          Builds the project.
  --cache-from         Previous build directory or published site URL to reuse cached route output from (default: output directory).
  -d, --develop        Runs the Node development server.
  --diagnose-routes    Builds the project and prints the slowest route timings.
  --diagnostics-top    Number of routes to show in --diagnose-routes output (default: 5).
  -s, --serve          Serves a static build directory.
  -i, --input          Input directory for --serve (default: ./build).
  --no-incremental     Disables incremental route reuse for --build.
  -P, --plugins        Plugins definition path (default: plugins.json).
  -o, --output         Build output directory (default: ./build).
  -p, --port           Development server port (default: 3000).
  --route-concurrency  Max number of routes to build in parallel (default: available CPUs - 1).
  -V, --validate       Validates generated HTML. With --build, validates the output after build.
  -v, --version        Shows the version number.
  -h, --help           Shows the help message.
`.trim());
}

async function main(cliArgs: string[]): Promise<number> {
  const args = parseArgs(cliArgs);

  const immediateResult = runImmediateCommand(args);

  if (immediateResult !== undefined) {
    return immediateResult;
  }

  const cliContext = createCliExecutionContext(args);
  const command = getCliCommand(args);

  return command.run(cliContext);
}

function runImmediateCommand(args: CliArgs) {
  if (args.version) {
    console.log(`gustwind@${VERSION}\nnode@${process.version}`);
    return 0;
  }

  if (shouldShowUsage(args)) {
    usage();
    return 0;
  }
}

function shouldShowUsage(args: CliArgs) {
  return args.help || !hasCliAction(args);
}

function hasCliAction(args: CliArgs) {
  return [
    args.benchmark,
    args.build,
    args.develop,
    args.diagnoseRoutes,
    args.serve,
    args.validate,
  ].some(Boolean);
}

function createCliExecutionContext(args: CliArgs): CliExecutionContext {
  const cwd = process.cwd();
  const pluginsPath = path.join(cwd, args.plugins);

  return {
    args,
    cwd,
    pluginsPath,
    readPluginDefinitions: async () =>
      evaluatePluginsDefinition(
        JSON.parse(await readFile(pluginsPath, "utf8")),
      ),
  };
}

async function runDevelop(
  { args, cwd, pluginsPath, readPluginDefinitions }: CliExecutionContext,
) {
  const server = await startDevServer({
    cwd,
    pluginDefinitions: readPluginDefinitions,
    port: args.port,
    watchPaths: [pluginsPath],
  });

  return waitForServer(server, `Serving at ${server.url}`);
}

async function runServe({ args, cwd }: CliExecutionContext) {
  const server = await startStaticServer({
    cwd,
    input: args.input,
    port: args.port,
  });

  return waitForServer(server, `Serving static files at ${server.url}`);
}

function isValidateOnly(args: CliArgs) {
  return args.validate && !args.build;
}

function getCliCommand(args: CliArgs) {
  const command = CLI_COMMANDS.find(({ matches }) => matches(args));

  if (!command) {
    throw new Error("No CLI command matched parsed arguments");
  }

  return command;
}

async function runValidateOnly({ args, cwd }: CliExecutionContext) {
  const inputPath = path.resolve(cwd, args.input);
  const { filesValidated } = await validateHtmlDirectory(inputPath);

  console.log(`Validated ${filesValidated} HTML files in ${inputPath}.`);

  return 0;
}

async function runBuild(
  { args, cwd, readPluginDefinitions }: CliExecutionContext,
) {
  const evaluatedPluginsDefinition = await readPluginDefinitions();
  const collectBenchmark = args.benchmark || args.diagnoseRoutes;

  return buildNode({
    cwd,
    cacheFrom: args.cacheFrom || args.output,
    collectBenchmark,
    incremental: getBuildIncrementalMode(args, collectBenchmark),
    outputDirectory: args.output,
    pluginDefinitions: evaluatedPluginsDefinition,
    routeConcurrency: args.routeConcurrency,
    validateOutput: args.validate,
  });
}

function getBuildIncrementalMode(args: CliArgs, collectBenchmark: boolean) {
  return collectBenchmark ? false : args.incremental;
}

async function runBuildCommand(cliContext: CliExecutionContext) {
  const buildResult = await runBuild(cliContext);
  await reportBuildResult(cliContext, buildResult);

  return 0;
}

const CLI_COMMANDS: CliCommand[] = [
  { matches: (args) => args.develop, run: runDevelop },
  { matches: (args) => args.serve, run: runServe },
  { matches: isValidateOnly, run: runValidateOnly },
  { matches: (args) => args.build, run: runBuildCommand },
];

async function reportBuildResult(
  cliContext: CliExecutionContext,
  buildResult: BuildResult,
) {
  reportValidation(cliContext, buildResult);
  reportBuildSummary(cliContext, buildResult);
  await writeBenchmarkResult(cliContext, buildResult);
  reportRouteDiagnostics(cliContext, buildResult);
}

function reportValidation(
  { args, cwd }: CliExecutionContext,
  buildResult: BuildResult,
) {
  if (args.validate && buildResult?.validation) {
    console.log(
      `Validated ${buildResult.validation.filesValidated} HTML files in ${
        path.resolve(cwd, args.output)
      }.`,
    );
  }
}

function reportBuildSummary(
  { args }: CliExecutionContext,
  buildResult: BuildResult,
) {
  if (!shouldReportBuildSummary(args, buildResult)) {
    return;
  }

  console.log(createBuildSummaryMessage(args, buildResult));
}

function shouldReportBuildSummary(args: CliArgs, buildResult: BuildResult) {
  return args.build && !args.benchmark &&
    typeof buildResult?.routesBuilt === "number";
}

function createBuildSummaryMessage(args: CliArgs, buildResult: BuildResult) {
  if (!args.incremental) {
    return `Full build rebuilt ${buildResult.routesBuilt} routes.`;
  }

  return `Incremental build reused ${
    buildResult.cacheHits || 0
  } routes and rebuilt ${buildResult.routesBuilt}.`;
}

async function writeBenchmarkResult(
  { args, cwd }: CliExecutionContext,
  buildResult: BuildResult,
) {
  if (args.benchmark && buildResult?.benchmark) {
    const benchmarkOutputPath = path.resolve(cwd, args.benchmarkOutput);

    await writeFile(
      benchmarkOutputPath,
      JSON.stringify(buildResult.benchmark, null, 2) + "\n",
    );
    console.log(
      `Benchmarked ${buildResult.benchmark.routesBuilt} routes in ${buildResult.benchmark.totalDurationMs}ms. Results written to ${benchmarkOutputPath}.`,
    );
  }
}

function reportRouteDiagnostics(
  { args }: CliExecutionContext,
  buildResult: BuildResult,
) {
  if (args.diagnoseRoutes && buildResult?.benchmark) {
    formatRouteDiagnostics(buildResult.benchmark, args.diagnosticsTop).lines
      .forEach((line) => console.log(line));
  }
}

async function waitForServer(
  server: CloseableServer,
  message: string,
): Promise<number> {
  const stop = async () => {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    await server.close();
    process.exitCode = 0;
  };
  const onSigint = () => void stop();
  const onSigterm = () => void stop();

  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);

  console.log(message);
  await new Promise<void>(() => undefined);

  return 0;
}

function parseArgs(cliArgs: string[]): CliArgs {
  const ret = createDefaultCliArgs();
  const reader = createCliArgsReader(cliArgs);

  while (reader.hasNext()) {
    const arg = reader.next();
    const parseOption = CLI_OPTION_PARSERS[arg];

    if (!parseOption) {
      throw new Error(`Unknown argument ${arg}`);
    }

    applyCliOption(ret, reader, parseOption);
  }

  return ret;
}

function createDefaultCliArgs(): CliArgs {
  return {
    benchmark: false,
    benchmarkOutput: "./benchmark-results.json",
    build: false,
    cacheFrom: "",
    develop: false,
    diagnoseRoutes: false,
    diagnosticsTop: 5,
    help: false,
    input: "./build",
    incremental: true,
    output: "./build",
    port: 3000,
    plugins: "plugins.json",
    routeConcurrency: undefined,
    serve: false,
    validate: false,
    version: false,
  };
}

function createCliArgsReader(cliArgs: string[]): CliArgsReader {
  let index = 0;

  return {
    hasNext: () => index < cliArgs.length,
    next: () => cliArgs[index++],
    nextValue: (errorMessage: string) => {
      const value = cliArgs[index++];

      if (!value) {
        throw new Error(errorMessage);
      }

      return value;
    },
  };
}

const CLI_OPTION_PARSERS: Record<string, CliOptionDefinition> = {
  "-b": { kind: "build" },
  "--build": { kind: "build" },
  "-B": { kind: "benchmark" },
  "--benchmark": { kind: "benchmark" },
  "--diagnose-routes": { kind: "diagnoseRoutes" },
  "--diagnostics-top": {
    kind: "integer",
    field: "diagnosticsTop",
    missing: "Missing diagnostics top count",
    label: "diagnostics top count",
  },
  "--cache-from": {
    kind: "string",
    field: "cacheFrom",
    missing: "Missing cache source",
  },
  "-d": { kind: "boolean", field: "develop" },
  "--develop": { kind: "boolean", field: "develop" },
  "-s": { kind: "boolean", field: "serve" },
  "--serve": { kind: "boolean", field: "serve" },
  "-h": { kind: "boolean", field: "help" },
  "--help": { kind: "boolean", field: "help" },
  "-i": { kind: "string", field: "input", missing: "Missing input directory" },
  "--input": {
    kind: "string",
    field: "input",
    missing: "Missing input directory",
  },
  "--no-incremental": { kind: "disableIncremental" },
  "-p": { kind: "port", missing: "Missing port" },
  "--port": { kind: "port", missing: "Missing port" },
  "--route-concurrency": {
    kind: "integer",
    field: "routeConcurrency",
    missing: "Missing route concurrency",
    label: "route concurrency",
  },
  "-v": { kind: "boolean", field: "version" },
  "--version": { kind: "boolean", field: "version" },
  "-V": { kind: "boolean", field: "validate" },
  "--validate": { kind: "boolean", field: "validate" },
  "-o": {
    kind: "string",
    field: "output",
    missing: "Missing output directory",
  },
  "--output": {
    kind: "string",
    field: "output",
    missing: "Missing output directory",
  },
  "--benchmark-output": {
    kind: "string",
    field: "benchmarkOutput",
    missing: "Missing benchmark output path",
  },
  "-P": {
    kind: "string",
    field: "plugins",
    missing: "Missing plugins definition path",
  },
  "--plugins": {
    kind: "string",
    field: "plugins",
    missing: "Missing plugins definition path",
  },
};

function applyCliOption(
  args: CliArgs,
  reader: CliArgsReader,
  option: CliOptionDefinition,
) {
  CLI_OPTION_APPLIERS[option.kind](args, reader, option);
}

const CLI_OPTION_APPLIERS: Record<
  CliOptionDefinition["kind"],
  (
    args: CliArgs,
    reader: CliArgsReader,
    option: CliOptionDefinition,
  ) => void
> = {
  benchmark: applyBenchmarkOption,
  boolean: applyBooleanOption,
  build: applyBuildOption,
  diagnoseRoutes: applyRouteDiagnosticsOption,
  disableIncremental: applyDisableIncrementalOption,
  integer: applyIntegerOption,
  port: applyPortOption,
  string: applyStringOption,
};

function applyBooleanOption(_args: CliArgs, _reader: CliArgsReader, option: CliOptionDefinition) {
  const { field } = option as Extract<CliOptionDefinition, { kind: "boolean" }>;

  _args[field] = true;
}

function applyBuildOption(args: CliArgs) {
  args.build = true;
}

function applyBenchmarkOption(args: CliArgs) {
  args.benchmark = true;
  args.build = true;
}

function applyRouteDiagnosticsOption(args: CliArgs) {
  args.diagnoseRoutes = true;
  args.build = true;
}

function applyDisableIncrementalOption(args: CliArgs) {
  args.incremental = false;
}

function applyIntegerOption(args: CliArgs, reader: CliArgsReader, option: CliOptionDefinition) {
  const { field, label, missing } = option as Extract<
    CliOptionDefinition,
    { kind: "integer" }
  >;

  args[field] = parsePositiveInteger(reader.nextValue(missing), label);
}

function applyPortOption(args: CliArgs, reader: CliArgsReader, option: CliOptionDefinition) {
  const { missing } = option as Extract<CliOptionDefinition, { kind: "port" }>;

  args.port = parsePort(reader.nextValue(missing));
}

function applyStringOption(args: CliArgs, reader: CliArgsReader, option: CliOptionDefinition) {
  const { field, missing } = option as Extract<
    CliOptionDefinition,
    { kind: "string" }
  >;

  args[field] = reader.nextValue(missing);
}

function parsePort(value: string) {
  const port = Number(value);

  if (!Number.isInteger(port) || port < 0) {
    throw new Error(`Invalid port ${value}`);
  }

  return port;
}

function parsePositiveInteger(value: string, label: string) {
  const ret = Number(value);

  if (!Number.isInteger(ret) || ret <= 0) {
    throw new Error(`Invalid ${label} ${value}`);
  }

  return ret;
}

function runCli() {
  void main(process.argv.slice(2)).then(
    (ret) => {
      process.exitCode = ret;
    },
    (error) => {
      console.error(error);
      process.exitCode = 1;
    },
  );
}

if (import.meta.main) {
  runCli();
}

export { main, runCli };
