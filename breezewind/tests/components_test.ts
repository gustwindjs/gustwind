import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import breeze from "../mod.ts";

Deno.test("component lookup", async () => {
  assertEquals(
    await breeze({
      component: { type: "Button" },
      components: { Button: { type: "button", children: "demo" } },
    }),
    "<button>demo</button>",
  );
});

Deno.test("component utility lookup", async () => {
  assertEquals(
    await breeze({
      component: { type: "Button" },
      components: {
        Button: {
          type: "button",
          children: {
            utility: "hello",
          },
        },
      },
      componentUtilities: {
        Button: {
          hello: () => "hello",
        },
      },
    }),
    "<button>hello</button>",
  );
});

Deno.test("component should have access to children", async () => {
  assertEquals(
    await breeze({
      component: { type: "Link", props: { href: "/foo" }, children: "demo" },
      components: {
        Link: {
          type: "a",
          attributes: {
            href: { utility: "get", parameters: ["props", "href"] },
          },
          children: { utility: "get", parameters: ["props", "children"] },
        },
      },
    }),
    '<a href="/foo">demo</a>',
  );
});

Deno.test("component lookup with an array", async () => {
  assertEquals(
    await breeze({
      component: { type: "Button" },
      components: {
        Button: [{ type: "button", children: "foo" }, {
          type: "button",
          children: "bar",
        }],
      },
    }),
    "<button>foo</button><button>bar</button>",
  );
});

Deno.test("component lookup with a complex structure", async () => {
  assertEquals(
    await breeze({
      component: [
        {
          "type": "head",
          "children": [
            {
              "type": "MetaFields",
            },
          ],
        },
      ],
      components: {
        MetaFields: [
          {
            "type": "link",
            "attributes": {
              "rel": "icon",
              "href": "bar",
            },
          },
        ],
      },
    }),
    '<head><link rel="icon" href="bar"></link></head>',
  );
});

Deno.test("component with bound children", async () => {
  assertEquals(
    await breeze({
      component: [
        {
          "type": "Markdown",
          "children": [],
          "props": {
            "type": "div",
          },
          "bindToProps": {
            "children": {
              "utility": "get",
              "parameters": ["context", "document.content"],
            },
          },
        },
      ],
      components: {
        Markdown: [
          {
            "type": { "utility": "get", "parameters": ["props", "type"] },
            "children": {
              "utility": "get",
              "parameters": ["props", "children"],
            },
          },
        ],
      },
      context: {
        document: {
          content: "foobar",
        },
      },
    }),
    "<div>foobar</div>",
  );
});
