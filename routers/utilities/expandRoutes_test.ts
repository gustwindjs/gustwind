import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.142.0/testing/asserts.ts";
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
  const routes = { blog: { layout: "siteIndex" } };

  assertEquals(
    await expandRoutes({ routes, dataSources: {} }),
    routes,
  );
});

Deno.test("does not expand routes within routes", async () => {
  const route = { layout: "siteIndex" };
  const routes = { blog: { ...route, routes: { more: route } } };

  assertEquals(
    await expandRoutes({ routes, dataSources: {} }),
    routes,
  );
});

Deno.test("indexer is not found", () => {
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

  assertRejects(
    () => expandRoutes({ routes, dataSources: {} }),
    Error,
    `Missing indexer`,
  );
});

Deno.test("expand a route", async () => {
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

  assertEquals(
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

Deno.test("expands a route within routes", async () => {
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

  assertEquals(
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

Deno.test("child routes inherit data sources", async () => {
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

  assertEquals(
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
