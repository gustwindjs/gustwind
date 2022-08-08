import { build, emptyDir } from "https://deno.land/x/dnt@0.30.0/mod.ts";
import { path } from "./server-deps.ts";

async function buildForNpm(name: string, version: string) {
  if (!version) {
    console.error("Missing version!");

    return;
  }

  const outDir = `./${name}/npm`;

  await emptyDir(outDir);

  await build({
    entryPoints: [`./cli.ts`],
    scriptModule: false, // ESM only (allows top level awaits)
    outDir,
    shims: {
      deno: true,
    },
    test: false,
    package: {
      name,
      version,
      description: "JSON oriented site generator",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/survivejs/gustwind.git",
      },
      bugs: {
        url: "https://github.com/survivejs/gustwind/issues",
      },
      bin: "./src/cli.js",
      homepage: "https://gustwind.js.org/",
      keywords: ["ssg", "json", "site-generation", "static-site-generator"],
    },
  });

  Deno.copyFileSync("LICENSE", path.join(outDir, "LICENSE"));
  Deno.copyFileSync("README.md", path.join(outDir, "README.md"));
}

buildForNpm("gustwind", Deno.args[0]);
