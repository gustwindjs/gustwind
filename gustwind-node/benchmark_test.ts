import * as path from "node:path";
import assert from "node:assert/strict";
import process from "node:process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { build as buildBundle } from "esbuild";
import { buildNode } from "./build.ts";
import { main } from "./cli.ts";

const rootDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("gustwind-node can collect structured build benchmarks", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-build-benchmark-"));

  try {
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies routes for benchmark testing.",
  },
  init() {
    const routes = {
      "/": { layout: "Page", context: { message: "home" } },
      "docs": { layout: "Page", context: { message: "docs" } },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        if (url === "/") {
          return routes["/"];
        }
        if (url === "/docs/") {
          return routes.docs;
        }
      },
    };
  },
};
`.trimStart(),
    );
    await writeFile(
      path.join(cwd, "renderer-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Renders HTML for benchmark testing.",
  },
  init() {
    return {
      renderLayout({ context, url }) {
        return \`<html><body><main><h1>\${context.message}</h1><p>\${url}</p></main></body></html>\`;
      },
    };
  },
};
`.trimStart(),
    );

    const result = await buildNode({
      cwd,
      outputDirectory: path.join(cwd, "dist"),
      pluginDefinitions: [
        { path: "./router-plugin.ts", options: {}, module: undefined as never },
        { path: "./renderer-plugin.ts", options: {}, module: undefined as never },
      ],
      collectBenchmark: true,
    });

    assert.ok(result?.benchmark);
    assert.equal(result.benchmark.schemaVersion, 1);
    assert.equal(result.benchmark.routesBuilt, 2);
    assert.equal(result.benchmark.routeResults.length, 2);
    assert.ok(result.benchmark.totalDurationMs >= 0);
    assert.ok(result.benchmark.peakMemoryRssBytes > 0);
    assert.ok(result.benchmark.tasksProcessed >= 2);
    assert.deepEqual(
      result.benchmark.routeResults.map(({ url }) => url).sort(),
      ["/", "/docs/"],
    );
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

test("gustwind-node CLI writes benchmark JSON output", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-cli-benchmark-"));
  const previousCwd = process.cwd();

  try {
    await writeFile(
      path.join(cwd, "plugins.json"),
      JSON.stringify({
        env: {},
        plugins: [
          {
            path: "./router-plugin.ts",
            options: {},
          },
          {
            path: "./renderer-plugin.ts",
            options: {},
          },
        ],
      }, null, 2),
    );
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies a route for CLI benchmark testing.",
  },
  init() {
    const routes = {
      "/": { layout: "Page" },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        if (url === "/") {
          return routes["/"];
        }
      },
    };
  },
};
`.trimStart(),
    );
    await writeFile(
      path.join(cwd, "renderer-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Renders HTML for CLI benchmark testing.",
  },
  init() {
    return {
      renderLayout() {
        return "<html><body><h1>ok</h1></body></html>";
      },
    };
  },
};
`.trimStart(),
    );

    process.chdir(cwd);

    const exitCode = await main([
      "--benchmark",
      "--output",
      "./dist",
      "--benchmark-output",
      "./bench.json",
    ]);

    assert.equal(exitCode, 0);

    const benchmark = JSON.parse(await readFile(path.join(cwd, "bench.json"), "utf8"));

    assert.equal(benchmark.schemaVersion, 1);
    assert.equal(benchmark.routesBuilt, 1);
    assert.equal(benchmark.routeResults[0].url, "/");
  } finally {
    process.chdir(previousCwd);
    await rm(cwd, { recursive: true, force: true });
  }
});

test("gustwind-node CLI accepts route concurrency override", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-cli-route-concurrency-"));
  const previousCwd = process.cwd();

  try {
    await writeFile(
      path.join(cwd, "plugins.json"),
      JSON.stringify({
        env: {},
        plugins: [
          {
            path: "./router-plugin.ts",
            options: {},
          },
          {
            path: "./renderer-plugin.ts",
            options: {},
          },
        ],
      }, null, 2),
    );
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies routes for CLI route concurrency testing.",
  },
  init() {
    const routes = {
      "/": { layout: "Page", context: { message: "home" } },
      docs: { layout: "Page", context: { message: "docs" } },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        if (url === "/") {
          return routes["/"];
        }
        if (url === "/docs/") {
          return routes.docs;
        }
      },
    };
  },
};
`.trimStart(),
    );
    await writeFile(
      path.join(cwd, "renderer-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Renders HTML for CLI route concurrency testing.",
  },
  init() {
    return {
      renderLayout({ context }) {
        return \`<html><body><h1>\${context.message}</h1></body></html>\`;
      },
    };
  },
};
`.trimStart(),
    );

    process.chdir(cwd);

    const exitCode = await main([
      "--benchmark",
      "--output",
      "./dist",
      "--benchmark-output",
      "./bench.json",
      "--route-concurrency",
      "1",
    ]);

    assert.equal(exitCode, 0);

    const benchmark = JSON.parse(await readFile(path.join(cwd, "bench.json"), "utf8"));

    assert.equal(benchmark.routesBuilt, 2);
    assert.deepEqual(
      benchmark.routeResults.map(({ url }: { url: string }) => url).sort(),
      ["/", "/docs/"],
    );
  } finally {
    process.chdir(previousCwd);
    await rm(cwd, { recursive: true, force: true });
  }
});

test("gustwind-node CLI can print route diagnostics", async () => {
  const cwd = await mkdtemp(path.join(tmpdir(), "gustwind-node-cli-diagnostics-"));
  const previousCwd = process.cwd();
  const previousLog = console.log;
  const logs: string[] = [];

  try {
    await writeFile(
      path.join(cwd, "plugins.json"),
      JSON.stringify({
        env: {},
        plugins: [
          {
            path: "./router-plugin.ts",
            options: {},
          },
          {
            path: "./renderer-plugin.ts",
            options: {},
          },
        ],
      }, null, 2),
    );
    await writeFile(
      path.join(cwd, "router-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-router-plugin",
    description: "Supplies routes for CLI diagnostics testing.",
  },
  init() {
    const routes = {
      "/": { layout: "Page", context: { message: "home" } },
      docs: { layout: "Page", context: { message: "docs" } },
    };

    return {
      getAllRoutes() {
        return { routes, tasks: [] };
      },
      matchRoute(url) {
        if (url === "/") {
          return routes["/"];
        }
        if (url === "/docs/") {
          return routes.docs;
        }
      },
    };
  },
};
`.trimStart(),
    );
    await writeFile(
      path.join(cwd, "renderer-plugin.ts"),
      `
export const plugin = {
  meta: {
    name: "test-renderer-plugin",
    description: "Renders HTML for CLI diagnostics testing.",
  },
  init() {
    return {
      async renderLayout({ context }) {
        if (context.message === "docs") {
          await new Promise((resolve) => setTimeout(resolve, 20));
        }

        return \`<html><body><h1>\${context.message}</h1></body></html>\`;
      },
    };
  },
};
`.trimStart(),
    );

    process.chdir(cwd);
    console.log = (...args) => {
      logs.push(args.join(" "));
    };

    const exitCode = await main([
      "--diagnose-routes",
      "--diagnostics-top",
      "1",
      "--output",
      "./dist",
    ]);

    assert.equal(exitCode, 0);
    assert.match(logs.join("\n"), /Top 1 slow routes/);
    assert.match(logs.join("\n"), /\/docs\//);
    assert.match(logs.join("\n"), /route timings can overlap/i);
  } finally {
    console.log = previousLog;
    process.chdir(previousCwd);
    await rm(cwd, { recursive: true, force: true });
  }
});

test("gustwind-node packaged CLI does not use top-level await", async () => {
  const outDirectory = await mkdtemp(path.join(tmpdir(), "gustwind-node-packaged-cli-"));

  try {
    await buildBundle({
      absWorkingDir: rootDirectory,
      banner: {
        js: "#!/usr/bin/env node",
      },
      bundle: true,
      define: {
        "process.env.GUSTWIND_VERSION": JSON.stringify("0.0.0-test"),
      },
      entryPoints: [{
        in: "./gustwind-node/cli.ts",
        out: "cli",
      }],
      format: "esm",
      outdir: outDirectory,
      packages: "external",
      platform: "node",
      target: "node24",
    });

    const cliSource = await readFile(path.join(outDirectory, "cli.js"), "utf8");

    assert.doesNotMatch(cliSource, /await main\(/);
    assert.match(cliSource, /function runCli\(\)/);
    assert.match(cliSource, /void main\(/);
  } finally {
    await rm(outDirectory, { recursive: true, force: true });
  }
});
