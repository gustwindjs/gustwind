/// <reference no-default-lib="true"/>
/// <reference lib="deno.ns" />
/// <reference lib="dom" />
/// <reference lib="esnext" />
// Derived from https://github.com/kt3k/twd
import * as esbuild from "https://deno.land/x/esbuild@v0.16.10/mod.js";
import { path } from "../server-deps.ts";
import * as flags from "https://deno.land/std@0.161.0/flags/mod.ts";
import { VERSION } from "../version.ts";
import { build as buildProject } from "../gustwind-builder/mod.ts";
import { gustwindDevServer } from "../gustwind-dev-server/mod.ts";
import { gustwindServe } from "../gustwind-serve/mod.ts";
import { importPlugin } from "../gustwind-utilities/plugins.ts";
import { getWebsocketServer } from "../utilities/getWebSocketServer.ts";
import { plugin as fileWatcherPlugin } from "../plugins/file-watcher/mod.ts";
import { plugin as webSocketPlugin } from "../plugins/websocket/mod.ts";
import { evaluatePluginsDefinition } from "./evaluatePluginsDefinition.ts";

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
    const pluginsPath = path.join(cwd, pluginsLookupPath || "plugins.json");
    const pluginDefinitions = await evaluatePluginsDefinition(pluginsPath);
    const mode = "development";
    const startTime = performance.now();

    console.log("Starting development server");

    const wss = getWebsocketServer();
    const serve = await gustwindDevServer({
      cwd,
      plugins: [
        await importPlugin({
          cwd,
          pluginModule: fileWatcherPlugin,
          options: { pluginsPath },
          outputDirectory,
          mode,
        }),
        await importPlugin({
          cwd,
          pluginModule: webSocketPlugin,
          options: { wss },
          outputDirectory,
          mode,
        }),
      ],
      pluginDefinitions,
      mode,
      port: Number(port),
    });

    const endTime = performance.now();
    console.log(
      `Serving at ${port}, took ${
        (endTime - startTime).toFixed(2)
      }ms to initialize the server`,
    );

    await copyToClipboard(`http://localhost:${port}/`);
    console.log("The server address has been copied to the clipboard");
    await serve();

    // https://esbuild.github.io/getting-started/#deno
    esbuild.stop();

    return;
  }

  if (serve) {
    if (!input) {
      throw new Error("Missing input directory");
    }
    const startTime = performance.now();

    console.log(`Starting static server against ${input}`);

    const serve = await gustwindServe({
      cwd,
      input,
      port: Number(port),
    });

    const endTime = performance.now();
    console.log(
      `Serving at ${port}, took ${
        (endTime - startTime).toFixed(2)
      }ms to initialize the server`,
    );

    await copyToClipboard(`http://localhost:${port}/`);
    console.log("The server address has been copied to the clipboard");
    await serve();

    return;
  }

  if (build) {
    const pluginsPath = path.join(cwd, pluginsLookupPath || "plugins.json");
    const pluginDefinitions = await evaluatePluginsDefinition(pluginsPath);
    await buildProject({ cwd, outputDirectory, pluginDefinitions, threads });

    return 0;
  }

  usage();

  return 0;
}

async function copyToClipboard(input: string) {
  // https://gist.github.com/jsejcksn/b4b1e86e504f16239aec90df4e9b29a9
  const p = Deno.run({ cmd: ["pbcopy"], stdin: "piped" });
  await p.stdin?.write(new TextEncoder().encode(input));
  p.stdin.close();
}

if (import.meta.main) {
  const ret = await main(Deno.args);

  if (ret) {
    Deno.exit(ret);
  }
}
