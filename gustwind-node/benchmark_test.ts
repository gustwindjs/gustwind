import * as path from "node:path";
import assert from "node:assert/strict";
import process from "node:process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import test from "node:test";
import { buildNode } from "./build.ts";
import { main } from "./cli.ts";

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
