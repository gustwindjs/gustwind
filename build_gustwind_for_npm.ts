import { build, emptyDir } from "https://deno.land/x/dnt@0.40.0/mod.ts";
import { path } from "./server-deps.ts";

async function buildForNpm(name: string, version: string) {
  if (!version) {
    console.error("Missing version!");

    return;
  }

  const entryDir = "./gustwind-node";
  const outDir = `./${entryDir}/npm`;

  await emptyDir(outDir);

  await build({
    entryPoints: [path.join(entryDir, "mod.ts")],
    scriptModule: false, // ESM only
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
