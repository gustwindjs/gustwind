/// <reference no-default-lib="true"/>
/// <reference lib="deno.ns" />
/// <reference lib="dom" />
/// <reference lib="esnext" />
// Derived from https://github.com/kt3k/twd
import { flags, path } from "./deps.ts";
import { getJson } from "./utils/fs.ts";
import { build as buildProject } from "./src/build.ts";
import { serve as serveProject } from "./src/serve.ts";
import { VERSION } from "./version.ts";
import type { ProjectMeta } from "./types.ts";

function usage() {
  console.log(`
Usage: gustwind [-w|-b|-d] [-D]

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

export async function main(cliArgs: string[]): Promise<number | undefined> {
  const cwd = Deno.cwd();
  const {
    help,
    version,
    build,
    develop,
    debug,
    init,
  } = flags.parse(cliArgs, {
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

  if (init) {
    console.log("TODO: This should initialize a new project");

    return 0;
  }

  if (develop) {
    const projectMeta = await getJson<ProjectMeta>(
      path.join(cwd, "./meta.json"),
    );

    const startTime = performance.now();
    console.log("Starting development server");

    await serveProject(projectMeta, cwd);

    const port = projectMeta.port;

    const endTime = performance.now();
    console.log(
      `Serving at ${port}, took ${endTime - startTime}ms to initialize`,
    );

    // https://gist.github.com/jsejcksn/b4b1e86e504f16239aec90df4e9b29a9
    const p = Deno.run({ cmd: ["pbcopy"], stdin: "piped" });
    await p.stdin?.write(
      new TextEncoder().encode(
        `http://localhost:${port}/`,
      ),
    );
    p.stdin.close();

    return;
  }

  if (build) {
    const projectMeta = await getJson<ProjectMeta>(
      path.join(cwd, "./meta.json"),
    );

    await buildProject(projectMeta, cwd);

    return 0;
  }

  usage();
  return 0;
}

if (import.meta.main) {
  const ret = await main(Deno.args);

  if (ret) {
    Deno.exit(ret);
  }
}
