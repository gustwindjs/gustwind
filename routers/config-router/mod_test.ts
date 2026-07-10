import assert from "node:assert/strict";
import test from "node:test";
import type { Route } from "../../types.ts";
import { plugin } from "./mod.ts";

test("config router returns undefined for an unmatched route", async () => {
  const routes: Record<string, Route> = {
    "/": { layout: "Home", context: {} },
  };
  const api = await plugin.init({
    cwd: process.cwd(),
    load: {
      dir: async () => [],
      json: async <T>() => routes as T,
      module: async () => {
        throw new Error("No data source module should be loaded");
      },
      textFile: async () => "",
      textFileSync: () => "",
    },
    mode: "development",
    options: {
      dataSourcesPath: "",
      emitAllRoutes: false,
      routesPath: "routes.json",
    },
    outputDirectory: "",
    renderComponent: async () => "",
    renderComponentSync: () => "",
  });
  const context = await api.initPluginContext?.();

  assert.ok(api.matchRoute);
  assert.ok(context);
  assert.equal(await api.matchRoute("/missing", context), undefined);
  assert.equal((await api.matchRoute("/", context))?.layout, "Home");
});
