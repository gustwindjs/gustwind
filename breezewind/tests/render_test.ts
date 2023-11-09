import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import breeze from "../mod.ts";

Deno.test("component with object props and rendering", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "BaseLayout",
        props: { content: "demo" },
      },
      components: {
        BaseLayout: {
          type: "body",
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
        type: "BaseLayout",
        props: { content: "demo" },
      },
      components: {
        BaseLayout: [
          {
            type: "body",
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
        type: "BaseLayout",
        props: { content: "demo" },
      },
      components: {
        BaseLayout: [
          {
            type: "html",
            children: [
              {
                type: "body",
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
        type: "div",
        children: {
          utility: "render",
          parameters: [{ utility: "get", parameters: ["context", "demo"] }],
        },
      },
      context: { demo: { type: "span", children: "foobar" } },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("allow rendering within an array with context", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        children: [{
          utility: "render",
          parameters: [{ utility: "get", parameters: ["context", "demo"] }],
        }],
      },
      context: { demo: { type: "span", children: "foobar" } },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("allow rendering with props", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        props: { demo: { type: "span", children: "foobar" } },
        children: {
          utility: "render",
          parameters: [{ utility: "get", parameters: ["props", "demo"] }],
        },
      },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("allow rendering within an array with props", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        props: { demo: { type: "span", children: "foobar" } },
        children: [{
          utility: "render",
          parameters: [{ utility: "get", parameters: ["props", "demo"] }],
        }],
      },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("allow combining render results", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "div",
        props: { demo: { type: "span", children: "foobar" } },
        children: [
          {
            utility: "render",
            parameters: [{ utility: "get", parameters: ["props", "demo"] }],
          },
          "foo",
        ],
      },
    }),
    "<div><span>foobar</span>foo</div>",
  );
});

Deno.test("allow rendering with props in a component", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "Test",
        props: { demo: { type: "span", children: "foobar" } },
      },
      components: {
        Test: {
          type: "div",
          children: {
            utility: "render",
            parameters: [{ utility: "get", parameters: ["props", "demo"] }],
          },
        },
      },
    }),
    "<div><span>foobar</span></div>",
  );
});

Deno.test("allow rendering without a type", async () => {
  assertEquals(
    await breeze({
      component: {
        children: {
          utility: "render",
          parameters: [{ utility: "get", parameters: ["props", "content"] }],
        },
      },
      props: {
        content: "demo",
      },
    }),
    "demo",
  );
});

Deno.test("allow rendering with props containing an array in a component", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "Test",
        props: {
          demo: [
            { type: "span", children: "foobar" },
            { type: "span", children: "barfoo" },
          ],
        },
      },
      components: {
        Test: {
          type: "div",
          children: {
            utility: "render",
            parameters: [{ utility: "get", parameters: ["props", "demo"] }],
          },
        },
      },
    }),
    "<div><span>foobar</span><span>barfoo</span></div>",
  );
});

Deno.test("allow rendering with props containing an array in a component inside a composition 1", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "BaseLayout",
        props: {
          content: {
            type: "Test",
            props: {
              demo: [
                { type: "span", children: "foobar" },
                { type: "span", children: "barfoo" },
              ],
            },
          },
        },
      },
      components: {
        BaseLayout: {
          type: "main",
          children: {
            utility: "render",
            parameters: [
              {
                utility: "get",
                parameters: ["props", "content"],
              },
            ],
          },
        },
        Test: {
          type: "div",
          children: {
            utility: "render",
            parameters: [{ utility: "get", parameters: ["props", "demo"] }],
          },
        },
      },
    }),
    "<main><div><span>foobar</span><span>barfoo</span></div></main>",
  );
});

Deno.test("allow rendering with props containing an array in a component inside a composition 2", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "BaseLayout",
        props: {
          content: [{
            type: "Test",
            props: {
              demo: [
                { type: "span", children: "foobar" },
                { type: "span", children: "barfoo" },
              ],
            },
          }, {
            type: "Test",
            props: {
              demo: [
                { type: "span", children: "foobar" },
                { type: "span", children: "barfoo" },
              ],
            },
          }],
        },
      },
      components: {
        BaseLayout: {
          type: "main",
          children: {
            utility: "render",
            parameters: [
              {
                utility: "get",
                parameters: ["props", "content"],
              },
            ],
          },
        },
        Test: {
          type: "div",
          children: {
            utility: "render",
            parameters: [{ utility: "get", parameters: ["props", "demo"] }],
          },
        },
      },
    }),
    "<main><div><span>foobar</span><span>barfoo</span></div><div><span>foobar</span><span>barfoo</span></div></main>",
  );
});

Deno.test("allow rendering pure strings", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "Test",
      },
      components: {
        Test: {
          type: "div",
          children: {
            utility: "render",
            parameters: ["barfoo"],
          },
        },
      },
    }),
    "<div>barfoo</div>",
  );
});
