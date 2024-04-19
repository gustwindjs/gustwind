import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { matchRoute } from "./matchRoute.ts";

// TODO: Test that / and templating style routes get expanded based on their data sources

Deno.test("matches a basic route", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertEquals(await matchRoute({ foo: route }, "foo", {}), route);
});

Deno.test("matches root route", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertEquals(await matchRoute({ "/": route }, "/", {}), route);
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

// This feature is not supported given the same routes could be written
// directly to configuration root
Deno.test("does not match a recursive route behind /", async () => {
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

  assertRejects(
    () => matchRoute({ "/": route1 }, "bar", {}),
    Error,
    `Route "bar" was not found!`,
  );
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

Deno.test("matches index of an expanded route", async () => {
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
    await matchRoute({ blog: route }, "blog", {
      index: () => [{ slug: "foo" }],
    }),
    route,
  );
});

Deno.test("matches index of an expanded route while root route exists", async () => {
  const blogRoute = {
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
  const indexRoute = {
    layout: "siteIndex",
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
      layout: "documentationPage",
    },
  };

  assertEquals(
    await matchRoute({ blog: blogRoute, "/": indexRoute }, "blog", {
      index: () => [{ slug: "foo" }],
    }),
    blogRoute,
  );
});

Deno.test("matches an expanded route behind a slash", async () => {
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
    await matchRoute({ "/": route }, "foo", { index: () => [{ slug: "foo" }] }),
    {
      layout: "blogPage",
      meta: {},
      context: {},
      scripts: undefined,
      url: "foo",
    },
  );
});

Deno.test("matches an expanded route of an expanded slash", async () => {
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
    await matchRoute({ "/": route }, "/", { index: () => [{ slug: "foo" }] }),
    route,
  );
});

Deno.test("fails to match", () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assertRejects(
    () => matchRoute({ foo: route }, "bar", {}),
    Error,
    `Route "bar" was not found!`,
  );
});
