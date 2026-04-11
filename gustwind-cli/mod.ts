/// <reference no-default-lib="true"/>
/// <reference lib="deno.ns" />
/// <reference lib="dom" />
/// <reference lib="esnext" />
// Derived from https://github.com/kt3k/twd
import * as flags from "https://deno.land/std@0.207.0/flags/mod.ts";
import { VERSION } from "../version.ts";

function usage() {
  console.log(`
Build:   gustwind -b [-D] [-t <number|"cpuMax"|"cpuHalf">] [-o <directory>]
Develop: gustwind -d [-D] [-p <port>]
Serve:   gustwind -s [-D] [-p <port>] [-i <directory>]

Options:
  -b, --build          Builds the project.
  -d, --develop        Runs the project in development mode.
  -s, --serve          Serves the static build in a given port.
  -i, --input          Input directory for --serve.
  -D, --debug          Output debug information during execution.
  -p, --port           Development server port.
  -P, --plugins        Plugins definition path (default: plugins.json).
  -o, --output         Build output directory.
  -t, --threads        Amount of threads to use during building. Accepts a number, "cpuMax", or "cpuHalf".
  -v, --version        Shows the version number.
  -h, --help           Shows the help message.
`.trim());
}

type CliArgs = {
  help: boolean;
  version: boolean;
  port: string;
  plugins: string;
  threads: string;
  input: string;
  output: string;
  build: boolean;
  develop: boolean;
  serve: boolean;
  debug: boolean;
  _: string[];
};

export async function main(cliArgs: string[]): Promise<number | undefined> {
  const {
    help,
    version,
    port,
    plugins: pluginsLookupPath,
    threads,
    output: outputDirectory,
    build,
    develop,
    debug,
    serve,
    input,
  } = flags.parse(cliArgs, {
    boolean: ["help", "version", "build", "develop", "debug", "serve"],
    string: ["port", "plugins", "threads", "output", "input"],
    alias: {
      v: "version",
      h: "help",
      b: "build",
      s: "serve",
      d: "develop",
      t: "threads",
      p: "port",
      P: "plugins",
      o: "output",
      i: "input",
      D: "debug",
    },
  }) as CliArgs;

  if (debug) {
    Deno.env.set("DEBUG", "1");
  }

  if (version) {
    const { deno, v8, typescript } = Deno.version;

    console.log(
      `gustwind@${VERSION}\ndeno@${deno}\nv8@${v8}\ntypescript@${typescript}`,
    );

    return 0;
  }

  if (help) {
    usage();

    return 0;
  }

  const cwd = Deno.cwd();

  if (develop) {
    const pluginsPath = pluginsLookupPath || "plugins.json";

    return await runNodeCli(cwd, [
      "--develop",
      "--plugins",
      pluginsPath,
      "--port",
      port || "3000",
    ], debug);
  }

  if (serve) {
    if (!input) {
      throw new Error("Missing input directory");
    }

    return await runNodeCli(cwd, [
      "--serve",
      "--input",
      input,
      "--port",
      port || "3000",
    ], debug);
  }

  if (build) {
    const nodeArgs = ["--build"];

    if (pluginsLookupPath) {
      nodeArgs.push("--plugins", pluginsLookupPath);
    }
    if (outputDirectory) {
      nodeArgs.push("--output", outputDirectory);
    }

    return await runNodeCli(cwd, nodeArgs, debug);
  }

  usage();

  return 0;
}

async function runNodeCli(cwd: string, args: string[], debug: boolean) {
  const command = new Deno.Command("node", {
    args: ["./gustwind-node/cli.ts", ...args],
    cwd,
    env: debug ? { DEBUG: "1" } : undefined,
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  });
  const child = command.spawn();
  const status = await child.status;

  return status.code;
}

if (import.meta.main) {
  const ret = await main(Deno.args);

  if (ret) {
    Deno.exit(ret);
  }
}
