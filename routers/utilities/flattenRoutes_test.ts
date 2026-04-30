import assert from "node:assert/strict";
import test from "node:test";
import { flattenRoutes } from "./flattenRoutes.ts";

test("converts empty routes to empty routes", () => {
  assert.deepEqual(flattenRoutes({}), {});
});

test("does not convert a simple route", () => {
  const routes = { blog: { layout: "siteIndex" } };

  assert.deepEqual(flattenRoutes(routes), routes);
});

test("converts nested routes", () => {
  const route = { layout: "siteIndex" };
  const routes = { blog: { ...route, routes: { more: route } } };

  assert.deepEqual(flattenRoutes(routes), {
    ...routes,
    "blog/more": route,
  });
});

test("nested routes inherit parent scripts", () => {
  const routes = {
    blog: {
      layout: "siteIndex",
      scripts: [{ name: "theme" }],
      routes: {
        more: {
          layout: "blogPage",
          scripts: [{ name: "search" }],
        },
      },
    },
  };

  assert.deepEqual(flattenRoutes(routes)["blog/more"], {
    layout: "blogPage",
    scripts: [{ name: "theme" }, { name: "search" }],
  });
});

test("converts three times nested routes", () => {
  const route2 = { layout: "anotherIndex" };
  const route1 = { layout: "siteIndex", routes: { even: route2 } };
  const routes = { blog: { ...route1, routes: { more: route1 } } };

  assert.deepEqual(flattenRoutes(routes), {
    ...routes,
    "blog/more": route1,
    "blog/more/even": route2,
  });
});
