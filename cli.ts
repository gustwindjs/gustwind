// Derived from https://github.com/kt3k/twd
import { parse } from "https://deno.land/std@0.113.0/flags/mod.ts";

const NAME = "Gustwind";

// TODO: Read this from scripts.json
const VERSION = "x.x.x";

function usage() {
  console.log(`
Usage: ${NAME} [-w|-b|-d] [-D]

Options:
  -i, --init           Initializes 'twd.ts' config file.
  -b, --build          Builds the project.
  -d, --develop        Runs the project in development mode.
  -D, --debug          Output debug information during execution.
  -v, --version        Shows the version number.
  -h, --help           Shows the help message.
`.trim());
}

type CliArgs = {
  help: boolean;
  version: boolean;
  build: boolean;
  develop: boolean;
  debug: boolean;
  init: boolean;
  _: string[];
};

export function main(cliArgs: string[]): number {
  const {
    help,
    version,
    build,
    develop,
    debug,
    init,
  } = parse(cliArgs, {
    boolean: ["help", "version", "build", "develop", "debug", "init"],
    alias: {
      v: "version",
      h: "help",
      b: "build",
      d: "develop",
      o: "output",
      D: "debug",
      i: "init",
    },
  }) as CliArgs;

  if (version) {
    console.log(`${NAME}@${VERSION}`);
    return 0;
  }

  if (help) {
    usage();
    return 0;
  }

  if (init) {
    console.log("TODO: This should initialize a new project");

    return 0;
  }

  if (develop) {
    console.log("TODO: This should trigger development mode");

    return 0;
  }

  if (build) {
    console.log("TODO: This should build the project");

    return 0;
  }

  usage();
  return 0;
}

if (import.meta.main) {
  Deno.exit(await main(Deno.args));
}
