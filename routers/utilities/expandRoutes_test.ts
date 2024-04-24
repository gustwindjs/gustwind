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

Deno.test("indexer is not found", async () => {
  const routes = {
    blog: {
      layout: "siteIndex",
      expand: {
        matchBy: {
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
            meta: {},
            scripts: undefined,
          },
        },
      },
    },
  );
});

// TODO: Test routes within routes case
// TODO: Test nested expand case
