import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("component with object props and render()", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: { children: "demo" } },
      },
      components: {
        BaseLayout: {
          element: "body",
          "==children": "render(content)",
        },
      },
    }),
    "<body>demo</body>",
  );
});

Deno.test("component with array props and render()", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: { children: "demo" } },
      },
      components: {
        BaseLayout: [
          {
            element: "body",
            "==children": "render(content)",
          },
        ],
      },
    }),
    "<body>demo</body>",
  );
});

Deno.test("component with array props, render(), and nested usage", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "BaseLayout",
        props: { content: { children: "demo" } },
      },
      components: {
        BaseLayout: [
          {
            element: "html",
            children: [
              {
                element: "body",
                "==children": "render(content)",
              },
            ],
          },
        ],
      },
    }),
    "<html><body>demo</body></html>",
  );
});

Deno.test("pass render() to ==children with context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        "==children": "render(context.demo)",
      },
      context: { demo: { element: "span", children: "foobar" } },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("pass render() to ==children with props", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "div",
        props: { demo: { element: "span", children: "foobar" } },
        "==children": "render(demo)",
      },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("pass render() to ==children with props in a component", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "Test",
        props: { demo: { element: "span", children: "foobar" } },
      },
      components: {
        Test: {
          element: "div",
          "==children": "render(demo)",
        },
      },
    }),
    "<div><span>foobar</span></div>",
  );
});
