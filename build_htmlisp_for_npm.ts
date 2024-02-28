import { build, emptyDir } from "https://deno.land/x/dnt@0.40.0/mod.ts";
import * as path from "node:path";

async function buildForNpm(name: string, version: string) {
  if (!version) {
    console.error("Missing version!");

    return;
  }

  const outDir = `./${name}/npm`;

  await emptyDir(outDir);

  await build({
    entryPoints: [`./${name}/mod.ts`],
    outDir,
    shims: {
      deno: true,
    },
    test: false, // TODO: Re-enable when dnt works again
    package: {
      name,
      version,
      description: "HTML combined with Lisp for fun and profit",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/survivejs/gustwind.git",
      },
      bugs: {
        url: "https://github.com/survivejs/gustwind/issues",
      },
      homepage: "https://gustwind.js.org/",
      keywords: ["templating", "html", "templating-engine"],
    },
  });

  Deno.copyFileSync("LICENSE", path.join(outDir, "LICENSE"));
  Deno.copyFileSync(`./${name}/README.md`, path.join(outDir, "README.md"));
}

buildForNpm("htmlisp", Deno.args[0]);
