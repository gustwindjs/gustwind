import { build, emptyDir } from "https://deno.land/x/dnt@0.28.0/mod.ts";
import { path } from "./server-deps.ts";

async function buildForNpm(outDir: string, version: string) {
  if (!version) {
    console.error("Missing version!");

    return;
  }

  await emptyDir(outDir);

  await build({
    entryPoints: ["./breezewind/index.ts", {
      name: "./extensions",
      path: "./breezewind/extensions.ts",
    }],
    outDir,
    shims: {
      deno: true,
    },
    package: {
      name: "breezewind",
      version,
      description: "Simple and extensible JSON based templating engine",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/survivejs/gustwind.git",
      },
      bugs: {
        url: "https://github.com/survivejs/gustwind/issues",
      },
      homepage: "https://gustwind.js.org/",
      keywords: ["templating", "json", "templating-engine"],
    },
  });

  Deno.copyFileSync("LICENSE", path.join(outDir, "LICENSE"));
  Deno.copyFileSync("./breezewind/README.md", path.join(outDir, "README.md"));
}

buildForNpm("./breezewind/npm", Deno.args[0]);
