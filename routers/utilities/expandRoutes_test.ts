import assert from "node:assert/strict";
import test from "node:test";
import { expandRoutes } from "./expandRoutes.ts";

test("converts empty data source ids to a context", async () => {
  assert.deepEqual(await expandRoutes({ routes: {}, dataSources: {} }), {});
});

test("does not expand a simple root route", async () => {
  const routes = { "/": { layout: "siteIndex" } };

  assert.deepEqual(
    await expandRoutes({ routes, dataSources: {} }),
    routes,
  );
});

test("does not expand a simple route", async () => {
  const routes = { blog: { layout: "siteIndex" } };

  assert.deepEqual(
    await expandRoutes({ routes, dataSources: {} }),
    routes,
  );
});

test("does not expand routes within routes", async () => {
  const route = { layout: "siteIndex" };
  const routes = { blog: { ...route, routes: { more: route } } };

  assert.deepEqual(
    await expandRoutes({ routes, dataSources: {} }),
    routes,
  );
});

test("indexer is not found", async () => {
  const routes = {
    blog: {
      layout: "siteIndex",
      expand: {
        matchBy: {
          name: "documentationPages",
          indexer: { operation: "indexMarkdown" },
          slug: "slug",
        },
        layout: "documentationPage",
      },
    },
  };

  await assert.rejects(
    () => expandRoutes({ routes, dataSources: {} }),
    /Missing indexer/,
  );
});

test("expand a route", async () => {
  const routes = {
    blog: {
      layout: "siteIndex",
      expand: {
        matchBy: {
          name: "documentationPages",
          indexer: { operation: "indexMarkdown" },
          slug: "slug",
        },
        layout: "documentationPage",
      },
    },
  };

  assert.deepEqual(
    await expandRoutes({
      routes,
      dataSources: { indexMarkdown: () => [{ slug: "foo" }] },
    }),
    {
      blog: {
        ...routes.blog,
        routes: {
          foo: {
            context: {},
            dataSources: {},
            layout: "documentationPage",
            scripts: undefined,
            parentDataSources: {
              documentationPages: [{ slug: "foo" }],
            },
          },
        },
      },
    },
  );
});

test("expands a route within routes", async () => {
  const routes = {
    blog: {
      layout: "blogIndex",
      routes: {
        more: {
          layout: "blogPage",
          expand: {
            matchBy: {
              name: "blogPages",
              indexer: { operation: "indexMarkdown" },
              slug: "slug",
            },
            layout: "documentationPage",
          },
        },
      },
    },
  };

  assert.deepEqual(
    await expandRoutes({
      routes,
      dataSources: { indexMarkdown: () => [{ slug: "foo" }] },
    }),
    {
      blog: {
        ...routes.blog,
        routes: {
          more: {
            ...routes.blog.routes.more,
            routes: {
              foo: {
                context: {},
                dataSources: {},
                layout: "documentationPage",
                parentDataSources: {
                  blogPages: [{ slug: "foo" }],
                },
                scripts: undefined,
              },
            },
          },
        },
      },
    },
  );
});

test("child routes inherit data sources", async () => {
  const dataSources = { chapters: { operation: "getChapters" } };
  const routes = {
    blog: {
      layout: "siteIndex",
      dataSources,
      expand: {
        matchBy: {
          name: "documentationPages",
          indexer: { operation: "indexBlog" },
          slug: "slug",
        },
        layout: "documentationPage",
      },
    },
  };

  assert.deepEqual(
    await expandRoutes({
      routes,
      dataSources: {
        getChapters: () => "foo",
        indexBlog: () => [{ slug: "foo" }, { slug: "bar" }],
      },
    }),
    {
      blog: {
        ...routes.blog,
        routes: {
          bar: {
            context: {},
            dataSources: {},
            layout: "documentationPage",
            parentDataSources: {
              documentationPages: [{ slug: "foo" }, { slug: "bar" }],
            },
            scripts: undefined,
          },
          foo: {
            context: {},
            dataSources: {},
            layout: "documentationPage",
            parentDataSources: {
              documentationPages: [{ slug: "foo" }, { slug: "bar" }],
            },
            scripts: undefined,
          },
        },
      },
    },
  );
});
