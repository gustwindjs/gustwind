import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("context binding", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        children: { utility: "get", parameters: ["context", "test"] },
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
        type: "span",
        children: { utility: "get", parameters: ["context", "meta.title"] },
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
        type: "span",
        children: { utility: "get", parameters: ["context", "meta.title"] },
      }],
      context: { meta: { title: "foobar" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding within components", async () => {
  assertEquals(
    await breeze({
      component: { type: "BaseLayout" },
      components: {
        BaseLayout: [{
          type: "html",
          children: [{ type: "MetaFields" }],
        }],
        MetaFields: [{
          type: "span",
          children: { utility: "get", parameters: ["context", "meta.title"] },
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
      component: {
        children: { utility: "get", parameters: ["context", "test"] },
      },
      context: { test: "foobar" },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: {
        children: { utility: "get", parameters: ["context", "test.test"] },
      },
      context: { test: { test: "foobar" } },
    }),
    "foobar",
  );
});

Deno.test("context evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        children: {
          utility: "concat",
          parameters: [
            { utility: "get", parameters: ["context", "test"] },
            "bar",
          ],
        },
      },
      context: { test: "foo" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("async context evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        children: {
          utility: "demo",
        },
      },
      context: { test: "bar" },
      globalUtilities: {
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
        type: "span",
        children: {
          utility: "concat",
          parameters: [
            { utility: "get", parameters: ["context", "test.test"] },
            "bar",
          ],
        },
      },
      context: { test: { test: "foo" } },
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
          parameters: [
            { utility: "get", parameters: ["context", "test"] },
            "bar",
          ],
        },
      },
      context: { test: "foo" },
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
          parameters: [
            { utility: "get", parameters: ["context", "test.test"] },
            "bar",
          ],
        },
      },
      context: { test: { test: "foo" } },
    }),
    "foobar",
  );
});

Deno.test("context binding for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        attributes: {
          title: { utility: "get", parameters: ["context", "test"] },
        },
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
        type: "span",
        attributes: {
          title: { utility: "get", parameters: ["context", "test.test"] },
        },
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
        type: "span",
        attributes: {
          title: {
            utility: "concat",
            parameters: [
              { utility: "get", parameters: ["context", "test"] },
              "bar",
            ],
          },
        },
        children: "test",
      },
      context: { test: "foo" },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("async context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        attributes: {
          title: { utility: "demo" },
        },
        "children": "test",
      },
      context: { test: "bar" },
      globalUtilities: {
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
        type: "span",
        attributes: {
          title: {
            utility: "concat",
            parameters: [{
              utility: "get",
              parameters: ["context", "test.test"],
            }, "bar"],
          },
        },
        children: "test",
      },
      context: { test: { test: "foo" } },
    }),
    '<span title="foobar">test</span>',
  );
});

Deno.test("async context evaluation for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "span",
        children: { utility: "demo" },
      },
      context: { test: "bar" },
      globalUtilities: {
        demo: () => Promise.resolve("foobar"),
      },
    }),
    "<span>foobar</span>",
  );
  assertEquals(
    await breeze({
      component: {
        type: "span",
        attributes: {
          title: { utility: "demo" },
        },
        children: "test",
      },
      context: { test: { test: "foo" } },
      globalUtilities: {
        demo: () => Promise.resolve("foobar"),
      },
    }),
    '<span title="foobar">test</span>',
  );
});
