import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import test from "node:test";
import {
  finishPlugins,
  getDependencyLayers,
  preparePlugins,
  type PluginDefinition,
} from "./plugins.ts";

function createPluginDefinition(
  {
    name,
    dependsOn,
    prepareBuild,
    finishBuild,
  }: {
    name: string;
    dependsOn?: string[];
    prepareBuild?: () => Promise<void>;
    finishBuild?: () => Promise<void>;
  },
): PluginDefinition {
  return {
    meta: {
      name,
      description: `${name} test plugin`,
      dependsOn,
    },
    api: {
      prepareBuild: prepareBuild
        ? async () => {
          await prepareBuild();
          return [];
        }
        : undefined,
      finishBuild: finishBuild
        ? async () => {
          await finishBuild();
          return [];
        }
        : undefined,
    },
    context: {},
    moduleTasks: [],
    tasks: [],
  };
}

test("getDependencyLayers groups independent plugins together", () => {
  const layers = getDependencyLayers([
    createPluginDefinition({ name: "tailwind" }),
    createPluginDefinition({ name: "sitemap", dependsOn: ["meta"] }),
    createPluginDefinition({ name: "meta" }),
    createPluginDefinition({ name: "pagefind" }),
  ]);

  assert.deepEqual(
    layers.map((layer) => layer.map(({ meta }) => meta.name)),
    [["tailwind", "meta", "pagefind"], ["sitemap"]],
  );
});

test("preparePlugins runs independent prepareBuild hooks in parallel", async () => {
  const prepareEvents: string[] = [];
  const plugins = [
    createPluginDefinition({
      name: "first",
      prepareBuild: async () => {
        prepareEvents.push("first:start");
        await new Promise((resolve) => setTimeout(resolve, 80));
        prepareEvents.push("first:end");
      },
    }),
    createPluginDefinition({
      name: "second",
      prepareBuild: async () => {
        prepareEvents.push("second:start");
        await new Promise((resolve) => setTimeout(resolve, 80));
        prepareEvents.push("second:end");
      },
    }),
  ];

  const startTime = performance.now();
  await preparePlugins(plugins);
  const duration = performance.now() - startTime;

  assert.ok(duration < 140, `expected parallel prepareBuild hooks, received ${duration} ms`);
  assert.deepEqual(
    new Set(prepareEvents),
    new Set(["first:start", "first:end", "second:start", "second:end"]),
  );
});

test("finishPlugins waits for dependency layers before running dependents", async () => {
  const events: string[] = [];
  const plugins = [
    createPluginDefinition({
      name: "meta",
      finishBuild: async () => {
        events.push("meta:start");
        await new Promise((resolve) => setTimeout(resolve, 50));
        events.push("meta:end");
      },
    }),
    createPluginDefinition({
      name: "sitemap",
      dependsOn: ["meta"],
      finishBuild: async () => {
        events.push("sitemap:start");
        assert.ok(events.includes("meta:end"));
        events.push("sitemap:end");
      },
    }),
    createPluginDefinition({
      name: "pagefind",
      finishBuild: async () => {
        events.push("pagefind:start");
        await new Promise((resolve) => setTimeout(resolve, 50));
        events.push("pagefind:end");
      },
    }),
  ];

  const startTime = performance.now();
  await finishPlugins(plugins);
  const duration = performance.now() - startTime;

  assert.ok(duration < 120, `expected dependent finishBuild hooks to overlap by layer, received ${duration} ms`);
  assert.ok(events.indexOf("meta:end") < events.indexOf("sitemap:start"));
});
