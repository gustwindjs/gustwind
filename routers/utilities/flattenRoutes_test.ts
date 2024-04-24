import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { flattenRoutes } from "./flattenRoutes.ts";

Deno.test("converts empty routes to empty routes", () => {
  assertEquals(flattenRoutes({}), {});
});

Deno.test("does not convert a simple route", () => {
  const routes = { blog: { layout: "siteIndex" } };

  assertEquals(flattenRoutes(routes), routes);
});

Deno.test("converts nested routes", () => {
  const route = { layout: "siteIndex" };
  const routes = { blog: { ...route, routes: { more: route } } };

  assertEquals(flattenRoutes(routes), {
    ...routes,
    "blog/more": route,
  });
});

Deno.test("converts three times nested routes", () => {
  const route2 = { layout: "anotherIndex" };
  const route1 = { layout: "siteIndex", routes: { even: route2 } };
  const routes = { blog: { ...route1, routes: { more: route1 } } };

  assertEquals(flattenRoutes(routes), {
    ...routes,
    "blog/more": route1,
    "blog/more/even": route2,
  });
});
