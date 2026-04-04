import * as path from "node:path";
import process from "node:process";
import { readFile } from "node:fs/promises";
import { VERSION } from "../version.ts";
import { buildNode } from "./build.ts";
import { evaluatePluginsDefinition } from "../utilities/evaluatePluginsDefinition.ts";

type CliArgs = {
  build: boolean;
  help: boolean;
  output: string;
  plugins: string;
  version: boolean;
};

function usage() {
  console.log(`
Build: gustwind-node --build [--output <directory>] [--plugins <path>]

Options:
  -b, --build          Builds the project.
  -P, --plugins        Plugins definition path (default: plugins.json).
  -o, --output         Build output directory (default: ./build).
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

  if (args.help || !args.build) {
    usage();
    return 0;
  }

  const cwd = process.cwd();
  const pluginsPath = path.join(cwd, args.plugins);
  const pluginsDefinition = JSON.parse(await readFile(pluginsPath, "utf8"));

  await buildNode({
    cwd,
    outputDirectory: args.output,
    pluginDefinitions: evaluatePluginsDefinition(pluginsDefinition),
  });

  return 0;
}
function parseArgs(cliArgs: string[]): CliArgs {
  const ret: CliArgs = {
    build: false,
    help: false,
    output: "./build",
    plugins: "plugins.json",
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
      case "-h":
      case "--help":
        ret.help = true;
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
