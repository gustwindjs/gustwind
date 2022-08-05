import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";
import * as extensions from "../extensions.ts";

Deno.test("foreach extension without context", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["items", {
          element: "li",
          children: { context: "props", property: "value" },
        }],
      },
      extensions: [extensions.foreach],
    }),
    "<ul></ul>",
  );
});

Deno.test("foreach extension with an array", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["context.items", {
          element: "li",
          children: { context: "props", property: "value" },
        }],
      },
      extensions: [extensions.foreach],
      context: { items: ["foo", "bar"] },
    }),
    "<ul><li>foo</li><li>bar</li></ul>",
  );
});

Deno.test("foreach extension with multiple children", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["context.items", [{
          element: "li",
          children: { context: "props", property: "value" },
        }, {
          element: "li",
          children: { context: "props", property: "value" },
        }]],
      },
      extensions: [extensions.foreach],
      context: { items: ["foo", "bar"] },
    }),
    "<ul><li>foo</li><li>foo</li><li>bar</li><li>bar</li></ul>",
  );
});

Deno.test("foreach extension with an array with a nested key", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["context.test.items", {
          element: "li",
          children: { context: "props", property: "value" },
        }],
      },
      extensions: [extensions.foreach],
      context: { test: { items: ["foo", "bar"] } },
    }),
    "<ul><li>foo</li><li>bar</li></ul>",
  );
});

Deno.test("foreach extension with an array of objects", async () => {
  assertEquals(
    await breeze({
      component: {
        element: "ul",
        foreach: ["context.items", {
          element: "li",
          children: { context: "props", property: "title" },
        }],
      },
      extensions: [extensions.foreach],
      context: { items: [{ title: "foo" }, { title: "bar" }] },
    }),
    "<ul><li>foo</li><li>bar</li></ul>",
  );
});

Deno.test("foreach extension with attributes", async () => {
  assertEquals(
    await breeze({
      component: {
        foreach: ["context.scripts", {
          element: "script",
          attributes: {
            type: {
              context: "props",
              property: "type",
            },
            src: {
              context: "props",
              property: "src",
            },
          },
        }],
      },
      extensions: [extensions.foreach],
      context: {
        scripts: [{
          "type": "text/javascript",
          "src": "sidewind.js",
        }],
      },
    }),
    '<script type="text/javascript" src="sidewind.js"></script>',
  );
});

Deno.test("foreach extension with multiple scripts", async () => {
  assertEquals(
    await breeze({
      component: {
        foreach: ["context.scripts", {
          element: "script",
          attributes: {
            type: {
              context: "props",
              property: "type",
            },
            src: {
              context: "props",
              property: "src",
            },
          },
        }],
      },
      extensions: [extensions.foreach],
      context: {
        scripts: [{
          "type": "text/javascript",
          "src": "sidewind.js",
        }, {
          "type": "module",
          "src": "gustwind.js",
        }],
      },
    }),
    '<script type="text/javascript" src="sidewind.js"></script><script type="module" src="gustwind.js"></script>',
  );
});

Deno.test("foreach extension with attributes and nesting", async () => {
  assertEquals(
    await breeze({
      component: {
        "element": "html",
        "children": [
          {
            "element": "body",
            "children": [
              {
                foreach: ["context.scripts", {
                  element: "script",
                  attributes: {
                    type: {
                      context: "props",
                      property: "type",
                    },
                    src: {
                      context: "props",
                      property: "src",
                    },
                  },
                }],
              },
            ],
          },
        ],
      },
      extensions: [extensions.foreach],
      context: {
        scripts: [{
          "type": "text/javascript",
          "src": "sidewind.js",
        }],
      },
    }),
    '<html><body><script type="text/javascript" src="sidewind.js"></script></body></html>',
  );
});
