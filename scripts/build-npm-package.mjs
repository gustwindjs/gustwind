import { build } from "esbuild";
import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const gustwindEntries = [
  {
    in: "./gustwind-node/mod.ts",
    out: "mod",
  },
  {
    in: "./renderers/htmlisp-edge-renderer/mod.ts",
    out: "plugins/htmlisp-edge-renderer/mod",
    exportPath: "./plugins/htmlisp-edge-renderer",
  },
  {
    in: "./plugins/copy/mod.ts",
    out: "plugins/copy/mod",
    exportPath: "./plugins/copy",
  },
  {
    in: "./routers/edge-router/mod.ts",
    out: "plugins/edge-router/mod",
    exportPath: "./plugins/edge-router",
  },
  {
    in: "./plugins/meta/mod.ts",
    out: "plugins/meta/mod",
    exportPath: "./plugins/meta",
  },
  {
    in: "./plugins/pagefind/mod.ts",
    out: "plugins/pagefind/mod",
    exportPath: "./plugins/pagefind",
  },
  {
    in: "./plugins/sitemap/mod.ts",
    out: "plugins/sitemap/mod",
    exportPath: "./plugins/sitemap",
  },
  {
    in: "./plugins/stats/mod.ts",
    out: "plugins/stats/mod",
    exportPath: "./plugins/stats",
  },
];

const rootDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const targetName = process.argv[2];
const version = process.argv[3];

if (!targetName || !version) {
  console.error("Usage: node ./scripts/build-npm-package.mjs <gustwind|htmlisp> <version>");
  process.exit(1);
}

const rootPackage = JSON.parse(
  await readFile(path.join(rootDirectory, "package.json"), "utf8"),
);

const targets = {
  gustwind: {
    outDirectory: path.join(rootDirectory, "gustwind-node", "npm"),
    entryPoints: gustwindEntries.map(({ in: input, out }) => ({
      in: input,
      out,
    })),
    packageJson: {
      name: "gustwind",
      version,
      type: "module",
      main: "./mod.js",
      exports: {
        ".": "./mod.js",
        ...Object.fromEntries(
          gustwindEntries
            .filter(({ exportPath }) => exportPath)
            .map(({ exportPath, out }) => [
              exportPath,
              `./${out}.js`,
            ]),
        ),
      },
      files: ["mod.js", "plugins/**/*.js", "README.md", "LICENSE"],
      description:
        "Gustwind is a Node.js-powered website creator that allows component-oriented development of large-scale sites.",
      license: "MIT",
      repository: {
        type: "git",
        url: "git+https://github.com/survivejs/gustwind.git",
      },
      bugs: {
        url: "https://github.com/survivejs/gustwind/issues",
      },
      homepage: "https://gustwind.js.org/",
      keywords: ["ssg", "site-generation", "static-site-generator"],
      engines: {
        node: ">=24",
      },
      dependencies: rootPackage.dependencies,
    },
    readmePath: path.join(rootDirectory, "gustwind-node", "README.md"),
  },
  htmlisp: {
    outDirectory: path.join(rootDirectory, "htmlisp", "npm"),
    entryPoints: [{ in: "./htmlisp/mod.ts", out: "mod" }],
    packageJson: {
      name: "htmlisp",
      version,
      type: "module",
      main: "./mod.js",
      exports: {
        ".": "./mod.js",
      },
      files: ["mod.js", "README.md", "LICENSE"],
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
      engines: {
        node: ">=24",
      },
    },
    readmePath: path.join(rootDirectory, "htmlisp", "README.md"),
  },
};

const target = targets[targetName];

if (!target) {
  console.error(`Unknown package target "${targetName}"`);
  process.exit(1);
}

await rm(target.outDirectory, { recursive: true, force: true });
await mkdir(target.outDirectory, { recursive: true });

await build({
  absWorkingDir: rootDirectory,
  bundle: true,
  entryPoints: target.entryPoints,
  format: "esm",
  outdir: target.outDirectory,
  packages: "external",
  platform: "node",
  target: "node24",
});

await writeFile(
  path.join(target.outDirectory, "package.json"),
  `${JSON.stringify(target.packageJson, null, 2)}\n`,
);
await cp(path.join(rootDirectory, "LICENSE"), path.join(target.outDirectory, "LICENSE"));
await cp(target.readmePath, path.join(target.outDirectory, "README.md"));
