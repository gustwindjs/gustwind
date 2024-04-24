import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { expandRoutes } from "./expandRoutes.ts";

Deno.test("converts empty data source ids to a context", async () => {
  assertEquals(await expandRoutes({ routes: {}, dataSources: {} }), {});
});

Deno.test("does not expand a simple root route", async () => {
  const routes = { "/": { layout: "siteIndex" } };

  assertEquals(
    await expandRoutes({ routes, dataSources: {} }),
    routes,
  );
});

Deno.test("does not expand a simple route", async () => {
  const routes = { "blog": { layout: "siteIndex" } };

  assertEquals(
    await expandRoutes({ routes, dataSources: {} }),
    routes,
  );
});

// TODO: Test expand case
// TODO: Test routes within routes case
// TODO: Test nested expand case
