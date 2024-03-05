import { build, emptyDir } from "https://deno.land/x/dnt@0.40.0/mod.ts";
import * as path from "node:path";

async function buildForNpm(name: string, version: string) {
  if (!version) {
    console.error("Missing version!");

    return;
  }

  // TODO: Ideally plugins would be published standalone behind a namespace
  // TODO: Generate plugin entry points automatically based on the file system
  const pluginNames = [
    "htmlisp-edge-renderer",
    // Skip config-router for now as it doesn't make sense on the edge
    // "config-router",
    "copy",
    "edge-router",
    // editor is experimental so don't expose it
    // "editor",
    // It doesn't make sense to expose file-watcher for Node
    // "file-watcher",
    "meta",
    // sharp is a difficult dependency for the edge so skip for now
    // "og",
    "pagefind",
    // Omit script plugin for now
    // "script",
    "sitemap",
    "stats",
    "twind",
    // uno is experimental so don't expose it
    // "uno",
    // It doesn't make sense to expose websocket for Node
    // "websocket",
  ];
  const entryDir = "./gustwind-node";
  const outDir = `./${entryDir}/npm`;

  await emptyDir(outDir);

  await build({
    entryPoints: [
      path.join(entryDir, "mod.ts"),
    ].concat(
      // @ts-expect-error This is fine
      pluginNames.map((name) => ({
        name: `./plugins/${name}`,
        path: `plugins/${name}/mod.ts`,
      })),
    ),
    scriptModule: false, // ESM only (allows top-level await)
    outDir,
    shims: {
      deno: true,
    },
    test: false,
    package: {
      name,
      version,
      description: "Flexible site generator",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/survivejs/gustwind.git",
      },
      bugs: {
        url: "https://github.com/survivejs/gustwind/issues",
      },
      // TODO: No cli included for now
      // bin: "./src/cli.js",
      homepage: "https://gustwind.js.org/",
      keywords: ["ssg", "site-generation", "static-site-generator"],
    },
  });

  Deno.copyFileSync("LICENSE", path.join(outDir, "LICENSE"));
  Deno.copyFileSync(
    path.join(entryDir, "README.md"),
    path.join(outDir, "README.md"),
  );
}

buildForNpm("gustwind", Deno.args[0]);
