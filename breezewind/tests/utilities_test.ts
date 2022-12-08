import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("pass utilities to children", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        children: {
          utility: "hello",
        },
      },
      utilities: {
        hello: () => "hello",
      },
    }),
    "<div>hello</div>",
  );
});

Deno.test("pass utilities to children with parameters", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        children: {
          utility: "hello",
          parameters: ["world"],
        },
      },
      utilities: {
        hello: (_, target: string) => `hello ${target}`,
      },
    }),
    "<div>hello world</div>",
  );
});

Deno.test("pass utilities to attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        attributes: {
          title: {
            utility: "hello",
          },
        },
        "children": "test",
      },
      utilities: {
        hello: () => "hello",
      },
    }),
    '<div title="hello">test</div>',
  );
});

Deno.test("pass utilities to attributes with parameters", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        attributes: {
          title: {
            utility: "hello",
            parameters: ["world"],
          },
        },
        "children": "test",
      },
      utilities: {
        hello: (_, target: string) => `hello ${target}`,
      },
    }),
    '<div title="hello world">test</div>',
  );
});

Deno.test("trigger _onRenderStart", async () => {
  const context = { test: 123 };
  let receivedContext;

  assertEquals(
    await breeze({
      component: {
        type: "div",
        children: {
          utility: "hello",
        },
      },
      context,
      utilities: {
        _onRenderStart: (ctx) => {
          receivedContext = ctx;
        },
        hello: () => "hello",
      },
    }),
    "<div>hello</div>",
  );

  assertEquals(receivedContext, context);
});

Deno.test("trigger _onRenderEnd", async () => {
  const context = { test: 123 };
  let receivedContext;

  assertEquals(
    await breeze({
      component: {
        type: "div",
        children: {
          utility: "hello",
        },
      },
      context,
      utilities: {
        _onRenderEnd: (ctx) => {
          receivedContext = ctx;
        },
        hello: () => "hello",
      },
    }),
    "<div>hello</div>",
  );

  assertEquals(receivedContext, context);
});
