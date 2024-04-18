import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { matchRoute } from "./matchRoute.ts";

Deno.test("matches a basic route", () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertEquals(matchRoute({ foo: route }, "foo"), route);
});

Deno.test("matches a basic route with a slash prefix", () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertEquals(matchRoute({ foo: route }, "/foo"), route);
});

Deno.test("matches a basic route with a slash suffix", () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertEquals(matchRoute({ foo: route }, "foo/"), route);
});

Deno.test("matches a recursive route", () => {
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

  assertEquals(
    matchRoute({ foo: route1 }, "foo/bar"),
    route2,
  );
});

Deno.test("matches a recursive route with a slash prefix", () => {
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

  assertEquals(
    matchRoute({ foo: route1 }, "/foo/bar"),
    route2,
  );
});

Deno.test("matches a recursive route with a slash suffix", () => {
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

  assertEquals(
    matchRoute({ foo: route1 }, "foo/bar/"),
    route2,
  );
});

Deno.test("matches a two-order recursive route", () => {
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

  assertEquals(
    matchRoute({ foo: route1 }, "foo/bar/baz"),
    route2,
  );
});

Deno.test("matches an expanded route", () => {
  // TODO: Figure out how to pass indexing logic here
  // Likely matchRoute needs access to dataSources through a parameter
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
        slug: "data.slug",
      },
    },
  };

  assertEquals(matchRoute({ "blog": route }, "blog/foo"), {
    layout: "barPage",
    meta: {},
    context: {},
  });
});

Deno.test("matches an expanded route behind a slash", () => {
  // TODO: Figure out how to pass indexing logic here
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
        slug: "data.slug",
      },
    },
  };

  assertEquals(matchRoute({ "/": route }, "foo"), {
    layout: "barPage",
    meta: {},
    context: {},
  });
});

// TODO: Test different cases when there's no match
// Likely then an exception should be thrown
