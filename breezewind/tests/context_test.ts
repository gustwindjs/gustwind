import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("context binding", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        children: { context: "context", property: "test" },
      },
      context: { test: "foobar" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        children: { context: "context", property: "meta.title" },
      },
      context: { meta: { title: "foobar" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding within an array", async () => {
  assertEquals(
    await breeze({
      component: [{
        element: "span",
        children: { context: "context", property: "meta.title" },
      }],
      context: { meta: { title: "foobar" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding within components", async () => {
  assertEquals(
    await breeze({
      component: { element: "BaseLayout" },
      components: {
        BaseLayout: [{
          element: "html",
          children: [{ element: "MetaFields" }],
        }],
        MetaFields: [{
          element: "span",
          children: { context: "context", property: "meta.title" },
        }],
      },
      context: { meta: { title: "foobar" } },
    }),
    "<html><span>foobar</span></html>",
  );
});

Deno.test("context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { children: { context: "context", property: "test" } },
      context: { test: "foobar" },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { children: { context: "context", property: "test.test" } },
      context: { test: { test: "foobar" } },
    }),
    "foobar",
  );
});

Deno.test("context evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        children: {
          utility: "concat",
          parameters: [{ context: "context", property: "test" }, "bar"],
        },
      },
      context: { test: "foo" },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("async context evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        children: {
          utility: "demo",
        },
      },
      context: { test: "bar" },
      utilities: {
        demo: () => Promise.resolve("foobar"),
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        children: {
          utility: "concat",
          parameters: [{ context: "context", property: "test.test" }, "bar"],
        },
      },
      context: { test: { test: "foo" } },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
      },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("context evaluation without element", async () => {
  assertEquals(
    await breeze({
      component: {
        children: {
          utility: "concat",
          parameters: [{ context: "context", "property": "test" }, "bar"],
        },
      },
      context: { test: "foo" },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
      },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: {
        children: {
          utility: "concat",
          parameters: [{ context: "context", property: "test.test" }, "bar"],
        },
      },
      context: { test: { test: "foo" } },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
      },
    }),
    "foobar",
  );
});

Deno.test("context binding for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { title: { context: "context", property: "test" } },
        children: "test",
      },
      context: { test: "foobar" },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("nested context binding for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { title: { context: "context", property: "test.test" } },
        children: "test",
      },
      context: { test: { test: "foobar" } },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: {
          title: {
            utility: "concat",
            parameters: [{ context: "context", property: "test" }, "bar"],
          },
        },
        children: "test",
      },
      context: { test: "foo" },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
      },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("async context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: {
          title: { utility: "demo" },
        },
        "children": "test",
      },
      context: { test: "bar" },
      utilities: {
        demo: () => Promise.resolve("foobar"),
      },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("nested context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: {
          title: {
            utility: "concat",
            parameters: [{ context: "context", property: "test.test" }, "bar"],
          },
        },
        children: "test",
      },
      context: { test: { test: "foo" } },
      utilities: {
        concat: (a: string, b: string) => `${a}${b}`,
      },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("async context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        children: { utility: "demo" },
      },
      context: { test: "bar" },
      utilities: {
        demo: () => Promise.resolve("foobar"),
      },
    }),
    "<span>foobar</span>",
  );
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: {
          title: { utility: "demo" },
        },
        children: "test",
      },
      context: { test: { test: "foo" } },
      utilities: {
        demo: () => Promise.resolve("foobar"),
      },
    }),
    '<span title="foobar">test</span>',
  );
});
