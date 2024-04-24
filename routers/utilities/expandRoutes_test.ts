import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { expandRoutes } from "./expandRoutes.ts";

Deno.test("converts empty data source ids to a context", async () => {
  assertEquals(await expandRoutes({ routes: {}, dataSources: {} }), {});
});

// TODO: Test expand case
// TODO: Test routes within routes case
// TODO: Test nested expand case
