import * as path from "node:path";
import process from "node:process";
import { readFile } from "node:fs/promises";
import { VERSION } from "../version.ts";
import { buildNode } from "./build.ts";
import { startDevServer } from "./dev.ts";
import { startStaticServer } from "./serve.ts";
import { evaluatePluginsDefinition } from "../utilities/evaluatePluginsDefinition.ts";

type CliArgs = {
  build: boolean;
  develop: boolean;
  help: boolean;
  input: string;
  output: string;
  port: number;
  plugins: string;
  serve: boolean;
  version: boolean;
};

function usage() {
  console.log(`
Build:   gustwind-node --build [--output <directory>] [--plugins <path>]
Develop: gustwind-node --develop [--port <port>] [--plugins <path>]
Serve:   gustwind-node --serve [--input <directory>] [--port <port>]

Options:
  -b, --build          Builds the project.
  -d, --develop        Runs the Node development server.
  -s, --serve          Serves a static build directory.
  -i, --input          Input directory for --serve (default: ./build).
  -P, --plugins        Plugins definition path (default: plugins.json).
  -o, --output         Build output directory (default: ./build).
  -p, --port           Development server port (default: 3000).
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

  if (args.help || (!args.build && !args.develop && !args.serve)) {
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

  const evaluatedPluginsDefinition = await readPluginDefinitions();
  await buildNode({
    cwd,
    outputDirectory: args.output,
    pluginDefinitions: evaluatedPluginsDefinition,
  });

  return 0;
}
function parseArgs(cliArgs: string[]): CliArgs {
  const ret: CliArgs = {
    build: false,
    develop: false,
    help: false,
    input: "./build",
    output: "./build",
    port: 3000,
    plugins: "plugins.json",
    serve: false,
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
      case "-o":
      case "--output":
        if (!next) {
          throw new Error("Missing output directory");
        }
        ret.output = next;
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
