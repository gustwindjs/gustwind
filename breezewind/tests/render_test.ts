import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("component with object props and rendering", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: "demo" },
      },
      components: {
        BaseLayout: {
          element: "body",
          children: { utility: "get", parameters: ["props", "content"] },
        },
      },
    }),
    "<body>demo</body>",
  );
});

Deno.test("component with array props and rendering", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: "demo" },
      },
      components: {
        BaseLayout: [
          {
            element: "body",
            children: { utility: "get", parameters: ["props", "content"] },
          },
        ],
      },
    }),
    "<body>demo</body>",
  );
});

Deno.test("component with array props, rendering, and nested usage", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: "demo" },
      },
      components: {
        BaseLayout: [
          {
            element: "html",
            children: [
              {
                element: "body",
                children: { utility: "get", parameters: ["props", "content"] },
              },
            ],
          },
        ],
      },
    }),
    "<html><body>demo</body></html>",
  );
});

Deno.test("allow rendering with context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        "##children": "context.demo",
      },
      context: { demo: { element: "span", children: "foobar" } },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("allow rendering with props", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        props: { demo: { element: "span", children: "foobar" } },
        "##children": "props.demo",
      },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("allow rendering with props in a component", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "Test",
        props: { demo: { element: "span", children: "foobar" } },
      },
      components: {
        Test: {
          element: "div",
          "##children": "props.demo",
        },
      },
    }),
    "<div><span>foobar</span></div>",
  );
});
