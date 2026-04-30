import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
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
              chapters: "foo",
              documentationPages: [{ slug: "foo" }, { slug: "bar" }],
            },
            scripts: undefined,
          },
          foo: {
            context: {},
            dataSources: {},
            layout: "documentationPage",
            parentDataSources: {
              chapters: "foo",
              documentationPages: [{ slug: "foo" }, { slug: "bar" }],
            },
            scripts: undefined,
          },
        },
      },
    },
  );
});

test("expanded routes inherit parent scripts", async () => {
  const routes = {
    blog: {
      layout: "siteIndex",
      scripts: [{ name: "theme" }],
      expand: {
        matchBy: {
          name: "documentationPages",
          indexer: { operation: "indexBlog" },
          slug: "slug",
        },
        layout: "documentationPage",
        scripts: [{ name: "search" }],
      },
    },
  };

  assert.deepEqual(
    await expandRoutes({
      routes,
      dataSources: {
        indexBlog: () => [{ slug: "foo" }],
      },
    }),
    {
      blog: {
        ...routes.blog,
        routes: {
          foo: {
            context: {},
            dataSources: {},
            layout: "documentationPage",
            parentDataSources: {
              documentationPages: [{ slug: "foo" }],
            },
            scripts: [{ name: "theme" }, { name: "search" }],
          },
        },
      },
    },
  );
});

test("expanded routes inherit parent data sources and resolved data source context", async () => {
  const routes = {
    blog: {
      layout: "siteIndex",
      parentDataSources: {
        section: { slug: "guides" },
      },
      dataSources: {
        sectionPosts: { operation: "getSectionPosts" },
      },
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
        getSectionPosts: function (
          this: { parentDataSources: { section: { slug: string } } },
        ) {
          return this.parentDataSources.section.slug;
        },
        indexBlog: () => [{ slug: "foo" }],
      },
    }),
    {
      blog: {
        ...routes.blog,
        routes: {
          foo: {
            context: {},
            dataSources: {},
            layout: "documentationPage",
            parentDataSources: {
              section: { slug: "guides" },
              sectionPosts: "guides",
              documentationPages: [{ slug: "foo" }],
            },
            scripts: undefined,
          },
        },
      },
    },
  );
});

test("expands sibling routes in parallel", async () => {
  const routes = {
    blog: {
      layout: "siteIndex",
      expand: {
        matchBy: {
          name: "blogPages",
          indexer: { operation: "indexBlog" },
          slug: "slug",
        },
        layout: "blogPage",
      },
    },
    docs: {
      layout: "siteIndex",
      expand: {
        matchBy: {
          name: "docPages",
          indexer: { operation: "indexDocs" },
          slug: "slug",
        },
        layout: "docPage",
      },
    },
  };

  const startTime = performance.now();
  const expandedRoutes = await expandRoutes({
    routes,
    dataSources: {
      indexBlog: async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return [{ slug: "hello" }];
      },
      indexDocs: async () => {
        await new Promise((resolve) => setTimeout(resolve, 80));
        return [{ slug: "intro" }];
      },
    },
  });
  const duration = performance.now() - startTime;

  assert.ok(
    duration < 140,
    `expected sibling expansion to overlap, received ${duration} ms`,
  );
  assert.deepEqual(Object.keys(expandedRoutes.blog.routes || {}), ["hello"]);
  assert.deepEqual(Object.keys(expandedRoutes.docs.routes || {}), ["intro"]);
});
