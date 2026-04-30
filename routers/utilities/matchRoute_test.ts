import assert from "node:assert/strict";
import test from "node:test";
import { matchRoute } from "./matchRoute.ts";

test("matches a basic route", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assert.deepEqual(await matchRoute({ foo: route }, "foo", {}), route);
});

test("matches root route", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assert.deepEqual(await matchRoute({ "/": route }, "/", {}), route);
});

test("matches a basic route with a slash prefix", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assert.deepEqual(await matchRoute({ foo: route }, "/foo", {}), route);
});

test("matches a basic route with a slash suffix", async () => {
  const route = {
    layout: "fooIndex",
    meta: {},
    context: {},
  };

  assert.deepEqual(await matchRoute({ foo: route }, "foo/", {}), route);
});

test("matches a recursive route", async () => {
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

  assert.deepEqual(await matchRoute({ foo: route1 }, "foo/bar", {}), route2);
});

test("matches a recursive route with a slash prefix", async () => {
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

  assert.deepEqual(await matchRoute({ foo: route1 }, "/foo/bar", {}), route2);
});

test("matches a recursive route with a slash suffix", async () => {
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

  assert.deepEqual(await matchRoute({ foo: route1 }, "foo/bar/", {}), route2);
});

// This feature is not supported given the same routes could be written
// directly to configuration root
test("does not match a recursive route behind /", async () => {
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

  await assert.rejects(
    () => matchRoute({ "/": route1 }, "bar", {}),
    /Route "bar" was not found!/,
  );
});

test("matches a two-order recursive route", async () => {
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

  assert.deepEqual(
    await matchRoute({ foo: route1 }, "foo/bar/baz", {}),
    route2,
  );
});

test("matches an expanded route", async () => {
  const route = {
    layout: "blogIndex",
    context: {},
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "blogPage",
    },
  };

  assert.deepEqual(
    await matchRoute({ blog: route }, "blog/foo", {
      index: () => [{ slug: "foo" }],
    }),
    {
      layout: "blogPage",
      context: {},
      dataSources: {},
      parentDataSources: { blogPosts: [{ slug: "foo" }] },
      scripts: undefined,
    },
  );
});

test("matched expanded routes inherit parent scripts", async () => {
  const route = {
    layout: "blogIndex",
    context: {},
    scripts: [{ name: "theme" }],
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "blogPage",
      scripts: [{ name: "search" }],
    },
  };

  assert.deepEqual(
    await matchRoute({ blog: route }, "blog/foo", {
      index: () => [{ slug: "foo" }],
    }),
    {
      layout: "blogPage",
      context: {},
      dataSources: {},
      parentDataSources: { blogPosts: [{ slug: "foo" }] },
      scripts: [{ name: "theme" }, { name: "search" }],
    },
  );
});

test("matched nested routes inherit parent scripts", async () => {
  const route = {
    layout: "blogIndex",
    scripts: [{ name: "theme" }],
    routes: {
      more: {
        layout: "blogPage",
        scripts: [{ name: "search" }],
      },
    },
  };

  assert.deepEqual(
    await matchRoute({ blog: route }, "blog/more", {}),
    {
      layout: "blogPage",
      scripts: [{ name: "theme" }, { name: "search" }],
    },
  );
});

test("expanded route retains data sources", async () => {
  const dataSources = {
    document: {
      operation: "processMarkdown",
      parameters: [
        { parseHeadmatter: true },
      ],
    },
  };

  const route = {
    layout: "blogIndex",
    meta: {},
    context: {},
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources,
      layout: "blogPage",
    },
  };

  assert.deepEqual(
    await matchRoute({ blog: route }, "blog/foo", {
      index: () => [{ slug: "foo" }],
    }),
    {
      layout: "blogPage",
      context: {},
      parentDataSources: { blogPosts: [{ slug: "foo" }] },
      dataSources: {
        document: {
          ...dataSources.document,
          parameters: [{ slug: "foo" }, { parseHeadmatter: true }],
        },
      },
      scripts: undefined,
    },
  );
});

test("matches index of an expanded route", async () => {
  const route = {
    layout: "blogIndex",
    context: {},
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "blogPage",
    },
  };

  assert.deepEqual(
    await matchRoute({ blog: route }, "blog", {
      index: () => [{ slug: "foo" }],
    }),
    route,
  );
});

test("matches index of an expanded route while root route exists", async () => {
  const blogRoute = {
    layout: "blogIndex",
    context: {},
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "blogPage",
    },
  };
  const indexRoute = {
    layout: "siteIndex",
    context: {},
    expand: {
      matchBy: {
        name: "documentationPages",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "documentationPage",
    },
  };

  assert.deepEqual(
    await matchRoute({ blog: blogRoute, "/": indexRoute }, "blog", {
      index: () => [{ slug: "foo" }],
    }),
    blogRoute,
  );
});

test("matches an expanded route behind a slash", async () => {
  const route = {
    layout: "blogIndex",
    context: {},
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "blogPage",
    },
  };

  assert.deepEqual(
    await matchRoute({ "/": route }, "foo", { index: () => [{ slug: "foo" }] }),
    {
      layout: "blogPage",
      context: {},
      parentDataSources: { blogPosts: [{ slug: "foo" }] },
      dataSources: {},
      scripts: undefined,
    },
  );
});

test("matches an expanded route of an expanded slash", async () => {
  const route = {
    layout: "blogIndex",
    context: {},
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "blogPage",
    },
  };

  assert.deepEqual(
    await matchRoute({ "/": route }, "/", { index: () => [{ slug: "foo" }] }),
    route,
  );
});

test("matches a recursive route when expansion is used on the same route", async () => {
  const route2 = {
    layout: "barIndex",
    context: {},
  };
  const route1 = {
    layout: "fooIndex",
    context: {},
    routes: { bar: route2 },
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "blogPage",
    },
  };

  assert.deepEqual(
    await matchRoute({ foo: route1 }, "foo/bar", {
      index: () => [{ slug: "foo" }],
    }),
    route2,
  );
});

test("matches an expanded route when recursive routes are used on the same route", async () => {
  const route2 = {
    layout: "barIndex",
    context: {},
  };
  const route1 = {
    layout: "fooIndex",
    context: {},
    routes: { bar: route2 },
    expand: {
      matchBy: {
        name: "blogPosts",
        indexer: {
          operation: "index",
          parameters: [],
        },
        slug: "slug",
      },
      dataSources: {},
      layout: "blogPage",
    },
  };

  assert.deepEqual(
    await matchRoute({ foo: route1 }, "foo/foo", {
      index: () => [{ slug: "foo" }],
    }),
    {
      context: {},
      dataSources: {},
      layout: "blogPage",
      parentDataSources: { blogPosts: [{ slug: "foo" }] },
      scripts: undefined,
    },
  );
});

test("fails to match", async () => {
  const route = {
    layout: "fooIndex",
    context: {},
  };

  await assert.rejects(
    () => matchRoute({ foo: route }, "bar", {}),
    /Route "bar" was not found!/,
  );
});
