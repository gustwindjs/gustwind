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
    entryPoints: [`./${name}/index.ts`, {
      name: "./extensions",
      path: `./${name}/extensions.ts`,
    }],
    outDir,
    shims: {
      deno: true,
    },
    package: {
      name,
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
  Deno.copyFileSync(`./${name}/README.md`, path.join(outDir, "README.md"));
}

buildForNpm("breezewind", Deno.args[0]);
