import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("context binding", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", __children: "context.test" },
      context: { test: "foobar" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", __children: "context.meta.title" },
      context: { meta: { title: "foobar" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context binding within an array", async () => {
  assertEquals(
    await breeze({
      component: [{ element: "span", __children: "context.meta.title" }],
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
        MetaFields: [{ element: "span", __children: "context.meta.title" }],
      },
      context: { meta: { title: "foobar" } },
    }),
    "<html><span>foobar</span></html>",
  );
});

Deno.test("context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { __children: "context.test" },
      context: { test: "foobar" },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { __children: "context.test.test" },
      context: { test: { test: "foobar" } },
    }),
    "foobar",
  );
});

Deno.test("context evaluation", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", "==children": "context.test + 'bar'" },
      context: { test: "foo" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("async context evaluation", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        "==children": "Promise.resolve('foobar')",
      },
      context: { test: "bar" },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("nested context evaluation", async () => {
  assertEquals(
    await breeze({
      component: { element: "span", "==children": "context.test.test + 'bar'" },
      context: { test: { test: "foo" } },
    }),
    "<span>foobar</span>",
  );
});

Deno.test("context evaluation without element", async () => {
  assertEquals(
    await breeze({
      component: { "==children": "context.test + 'bar'" },
      context: { test: "foo" },
    }),
    "foobar",
  );
});

Deno.test("nested context binding without element", async () => {
  assertEquals(
    await breeze({
      component: { "==children": "context.test.test + 'bar'" },
      context: { test: { test: "foo" } },
    }),
    "foobar",
  );
});

Deno.test("context binding for attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: { __title: "context.test" },
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
        attributes: { __title: "context.test.test" },
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
        attributes: { "==title": "context.test + 'bar'" },
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
        element: "span",
        attributes: { "==title": "Promise.resolve('foobar')" },
        "children": "test",
      },
      context: { test: "bar" },
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
          "==title": "context.test.test + 'bar'",
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
        element: "span",
        "==children": "Promise.resolve('foobar')",
      },
      context: { test: "bar" },
    }),
    "<span>foobar</span>",
  );
  assertEquals(
    await breeze({
      component: {
        element: "span",
        attributes: {
          "==title": "Promise.resolve('foobar')",
        },
        children: "test",
      },
      context: { test: { test: "foo" } },
    }),
    '<span title="foobar">test</span>',
  );
});
