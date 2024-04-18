import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { matchRoute } from "./matchRoute.ts";

Deno.test("matches a basic route", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertEquals(await matchRoute({ foo: route }, "foo", {}), route);
});

Deno.test("matches a basic route with a slash prefix", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertEquals(await matchRoute({ foo: route }, "/foo", {}), route);
});

Deno.test("matches a basic route with a slash suffix", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertEquals(await matchRoute({ foo: route }, "foo/", {}), route);
});

Deno.test("matches a recursive route", async () => {
  const route2 = {
    layout: "barIndex",
    meta: {},
    context: {},
  };
  const route1 = {
    layout: "fooIndex",
    meta: {},
    context: {},
    routes: { bar: route2 },
  };

  assertEquals(await matchRoute({ foo: route1 }, "foo/bar", {}), route2);
});

Deno.test("matches a recursive route with a slash prefix", async () => {
  const route2 = {
    layout: "barIndex",
    meta: {},
    context: {},
  };
  const route1 = {
    layout: "fooIndex",
    meta: {},
    context: {},
    routes: { bar: route2 },
  };

  assertEquals(await matchRoute({ foo: route1 }, "/foo/bar", {}), route2);
});

Deno.test("matches a recursive route with a slash suffix", async () => {
  const route2 = {
    layout: "barIndex",
    meta: {},
    context: {},
  };
  const route1 = {
    layout: "fooIndex",
    meta: {},
    context: {},
    routes: { bar: route2 },
  };

  assertEquals(await matchRoute({ foo: route1 }, "foo/bar/", {}), route2);
});

Deno.test("matches a two-order recursive route", async () => {
  const route3 = {
    layout: "bazIndex",
    meta: {},
    context: {},
  };
  const route2 = {
    layout: "barIndex",
    meta: {},
    context: { baz: route3 },
  };
  const route1 = {
    layout: "fooIndex",
    meta: {},
    context: {},
    routes: { bar: route2 },
  };

  assertEquals(await matchRoute({ foo: route1 }, "foo/bar/baz", {}), route2);
});

Deno.test("matches an expanded route", async () => {
  const route = {
    layout: "blogIndex",
    meta: {},
    context: {},
    expand: {
      matchBy: {
        indexer: {
          operation: "index",
          parameters: [],
        },
        dataSources: [],
        slug: "slug",
      },
      layout: "blogPage",
    },
  };

  assertEquals(
    await matchRoute({ blog: route }, "blog/foo", {
      index: () => [{ slug: "foo" }],
    }),
    {
      layout: "blogPage",
      meta: {},
      context: {},
      scripts: undefined,
      url: "foo",
    },
  );
});

Deno.test("matches an expanded route behind a slash", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
    expand: {
      matchBy: {
        indexer: {
          operation: "index",
          parameters: [],
        },
        layout: "barPage",
        dataSources: [],
        slug: "slug",
      },
    },
  };

  assertEquals(
    await matchRoute({ "/": route }, "foo", { index: () => [{ slug: "foo" }] }),
    {
      layout: "barPage",
      meta: {},
      context: {},
    },
  );
});

// TODO: Test different cases when there's no match
// Likely then an exception should be thrown
