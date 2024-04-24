import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { flattenRoutes } from "./flattenRoutes.ts";

Deno.test("converts empty routes to empty routes", async () => {
  assertEquals(await flattenRoutes({}), {});
});
