/// <reference no-default-lib="true"/>
/// <reference lib="deno.ns" />
/// <reference lib="dom" />
/// <reference lib="esnext" />
// Derived from https://github.com/kt3k/twd
import * as esbuild from "https://deno.land/x/esbuild@v0.16.10/mod.js";
import { path } from "../server-deps.ts";
import * as flags from "https://deno.land/std@0.161.0/flags/mod.ts";
import { getJson } from "../utilities/fs.ts";
import { VERSION } from "../version.ts";
import type { PluginOptions } from "../types.ts";
import { build as buildProject } from "../gustwind-builder/mod.ts";
import { serveGustwind } from "../gustwind-server/mod.ts";
import { importPlugin } from "../gustwind-utilities/plugins.ts";
import { getWebsocketServer } from "../utilities/getWebSocketServer.ts";
import { plugin as fileWatcherPlugin } from "../plugins/file-watcher/mod.ts";
import { plugin as webSocketPlugin } from "../plugins/websocket/mod.ts";

function usage() {
  console.log(`
Usage: gustwind [-b|-d] [-D] [-p <port>] [-t <number|"cpuMax"|"cpuHalf">] [-o <directory>]

Options:
  -b, --build          Builds the project.
  -d, --develop        Runs the project in development mode.
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
  output: string;
  build: boolean;
  develop: boolean;
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
  } = flags.parse(cliArgs, {
    boolean: ["help", "version", "build", "develop", "debug"],
    string: ["port", "plugins", "threads", "output"],
    alias: {
      v: "version",
      h: "help",
      b: "build",
      d: "develop",
      t: "threads",
      p: "port",
      P: "plugins",
      o: "output",
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
  const pluginsPath = path.join(cwd, pluginsLookupPath || "plugins.json");
  const pluginDefinitions = await getJson<PluginOptions[]>(pluginsPath);

  if (develop) {
    const mode = "development";
    const startTime = performance.now();

    console.log("Starting development server");

    const wss = getWebsocketServer();
    const serve = serveGustwind({
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
      `Serving at ${port}, took ${endTime - startTime}ms to initialize`,
    );

    await copyToClipboard(`http://localhost:${port}/`);
    console.log("The server address has been copied to the clipboard");
    await serve();

    // https://esbuild.github.io/getting-started/#deno
    esbuild.stop();

    return;
  }

  if (build) {
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
