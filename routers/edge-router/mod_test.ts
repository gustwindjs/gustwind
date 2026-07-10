import assert from "node:assert/strict";
import test from "node:test";
import type { Route } from "../../types.ts";
import { plugin } from "./mod.ts";

test("edge router returns undefined for an unmatched route", async () => {
  const routes: Record<string, Route> = {
    "/": { layout: "Home", context: {} },
  };
  const api = await plugin.init({
    cwd: process.cwd(),
    load: undefined as never,
    mode: "development",
    options: { routes },
    outputDirectory: "",
    renderComponent: undefined as never,
    renderComponentSync: undefined as never,
  });
  const context = await api.initPluginContext?.();

  assert.ok(api.matchRoute);
  assert.ok(context);
  assert.equal(await api.matchRoute("/missing", context), undefined);
  assert.equal((await api.matchRoute("/", context))?.layout, "Home");
});
