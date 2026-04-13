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
  serve: boolean;
  validate: boolean;
  version: boolean;
};

function usage() {
  console.log(`
Build:   gustwind --build [--output <directory>] [--plugins <path>] [--validate] [--cache-from <directory-or-url>] [--no-incremental]
Benchmark: gustwind --benchmark [--output <directory>] [--plugins <path>] [--benchmark-output <file>]
Diagnose: gustwind --diagnose-routes [--output <directory>] [--plugins <path>] [--diagnostics-top <count>]
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
  -V, --validate       Validates generated HTML. With --build, validates the output after build.
  -v, --version        Shows the version number.
  -h, --help           Shows the help message.
`.trim());
}

async function main(cliArgs: string[]): Promise<number> {
  const args = parseArgs(cliArgs);

  if (args.version) {
    console.log(`gustwind@${VERSION}\nnode@${process.version}`);
    return 0;
  }

  if (
    args.help ||
    (!args.benchmark && !args.build && !args.develop && !args.diagnoseRoutes &&
      !args.serve && !args.validate)
  ) {
    usage();
    return 0;
  }

  const cwd = process.cwd();
  const pluginsPath = path.join(cwd, args.plugins);
  const readPluginDefinitions = async () =>
    evaluatePluginsDefinition(
      JSON.parse(await readFile(pluginsPath, "utf8")),
    );

  if (args.develop) {
    const server = await startDevServer({
      cwd,
      pluginDefinitions: readPluginDefinitions,
      port: args.port,
      watchPaths: [pluginsPath],
    });
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

    console.log(`Serving at ${server.url}`);
    await new Promise<void>(() => undefined);
    return 0;
  }

  if (args.serve) {
    const server = await startStaticServer({
      cwd,
      input: args.input,
      port: args.port,
    });
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

    console.log(`Serving static files at ${server.url}`);
    await new Promise<void>(() => undefined);
    return 0;
  }

  if (args.validate && !args.build) {
    const { filesValidated } = await validateHtmlDirectory(path.resolve(cwd, args.input));
    console.log(`Validated ${filesValidated} HTML files in ${path.resolve(cwd, args.input)}.`);
    return 0;
  }

  const evaluatedPluginsDefinition = await readPluginDefinitions();
  const buildResult = await buildNode({
    cwd,
    cacheFrom: args.cacheFrom || args.output,
    outputDirectory: args.output,
    pluginDefinitions: evaluatedPluginsDefinition,
    collectBenchmark: args.benchmark || args.diagnoseRoutes,
    incremental: (args.benchmark || args.diagnoseRoutes) ? false : args.incremental,
    validateOutput: args.validate,
  });

  if (args.validate && buildResult?.validation) {
    console.log(`Validated ${buildResult.validation.filesValidated} HTML files in ${path.resolve(cwd, args.output)}.`);
  }

  if (args.build && !args.benchmark && typeof buildResult?.routesBuilt === "number") {
    if (args.incremental) {
      console.log(
        `Incremental build reused ${buildResult.cacheHits || 0} routes and rebuilt ${
          buildResult.routesBuilt
        }.`,
      );
    } else {
      console.log(`Full build rebuilt ${buildResult.routesBuilt} routes.`);
    }
  }

  if (args.benchmark && buildResult?.benchmark) {
    const benchmarkOutputPath = path.resolve(cwd, args.benchmarkOutput);

    await writeFile(
      benchmarkOutputPath,
      JSON.stringify(buildResult.benchmark, null, 2) + "\n",
    );
    console.log(
      `Benchmarked ${buildResult.benchmark.routesBuilt} routes in ${
        buildResult.benchmark.totalDurationMs
      }ms. Results written to ${benchmarkOutputPath}.`,
    );
  }

  if (args.diagnoseRoutes && buildResult?.benchmark) {
    formatRouteDiagnostics(buildResult.benchmark, args.diagnosticsTop).lines.forEach((line) =>
      console.log(line)
    );
  }

  return 0;
}
function parseArgs(cliArgs: string[]): CliArgs {
  const ret: CliArgs = {
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
    serve: false,
    validate: false,
    version: false,
  };

  for (let index = 0; index < cliArgs.length; index++) {
    const arg = cliArgs[index];
    const next = cliArgs[index + 1];

    switch (arg) {
      case "-b":
      case "--build":
        ret.build = true;
        break;
      case "-B":
      case "--benchmark":
        ret.benchmark = true;
        ret.build = true;
        break;
      case "--diagnose-routes":
        ret.diagnoseRoutes = true;
        ret.build = true;
        break;
      case "--diagnostics-top":
        if (!next) {
          throw new Error("Missing diagnostics top count");
        }
        ret.diagnosticsTop = Number(next);
        if (!Number.isInteger(ret.diagnosticsTop) || ret.diagnosticsTop <= 0) {
          throw new Error(`Invalid diagnostics top count ${next}`);
        }
        index++;
        break;
      case "--cache-from":
        if (!next) {
          throw new Error("Missing cache source");
        }
        ret.cacheFrom = next;
        index++;
        break;
      case "-d":
      case "--develop":
        ret.develop = true;
        break;
      case "-s":
      case "--serve":
        ret.serve = true;
        break;
      case "-h":
      case "--help":
        ret.help = true;
        break;
      case "-i":
      case "--input":
        if (!next) {
          throw new Error("Missing input directory");
        }
        ret.input = next;
        index++;
        break;
      case "--no-incremental":
        ret.incremental = false;
        break;
      case "-p":
      case "--port":
        if (!next) {
          throw new Error("Missing port");
        }
        ret.port = Number(next);
        if (!Number.isInteger(ret.port) || ret.port < 0) {
          throw new Error(`Invalid port ${next}`);
        }
        index++;
        break;
      case "-v":
      case "--version":
        ret.version = true;
        break;
      case "-V":
      case "--validate":
        ret.validate = true;
        break;
      case "-o":
      case "--output":
        if (!next) {
          throw new Error("Missing output directory");
        }
        ret.output = next;
        index++;
        break;
      case "--benchmark-output":
        if (!next) {
          throw new Error("Missing benchmark output path");
        }
        ret.benchmarkOutput = next;
        index++;
        break;
      case "-P":
      case "--plugins":
        if (!next) {
          throw new Error("Missing plugins definition path");
        }
        ret.plugins = next;
        index++;
        break;
      default:
        throw new Error(`Unknown argument ${arg}`);
    }
  }

  return ret;
}

if (import.meta.main) {
  const ret = await main(process.argv.slice(2));
  process.exitCode = ret;
}

export { main };
