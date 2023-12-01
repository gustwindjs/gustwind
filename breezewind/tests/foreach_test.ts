import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import breeze from "../mod.ts";
import * as extensions from "../extensions.ts";

Deno.test("foreach extension without context", async () => {
  let threw = false;

  try {
    await breeze({
      component: {
        type: "ul",
        foreach: [{ utility: "get", parameters: [] }, {
          type: "li",
          children: { utility: "get", parameters: ["props", "value"] },
        }],
      },
      extensions: [extensions.foreach],
    });
  } catch (_) {
    threw = true;
  }

  assertEquals(threw, true);
});

Deno.test("foreach extension with an array", async () => {
  assertEquals(
    await breeze({
      component: {
        type: "ul",
        foreach: [{ utility: "get", parameters: ["context", "items"] }, {
          type: "li",
          children: { utility: "get", parameters: ["props", "value"] },
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
        type: "ul",
        foreach: [{ utility: "get", parameters: ["context", "items"] }, [{
          type: "li",
          children: { utility: "get", parameters: ["props", "value"] },
        }, {
          type: "li",
          children: { utility: "get", parameters: ["props", "value"] },
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
        type: "ul",
        foreach: [{ utility: "get", parameters: ["context", "test.items"] }, {
          type: "li",
          children: { utility: "get", parameters: ["props", "value"] },
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
        type: "ul",
        foreach: [{ utility: "get", parameters: ["context", "items"] }, {
          type: "li",
          children: { utility: "get", parameters: ["props", "title"] },
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
        foreach: [{ utility: "get", parameters: ["context", "scripts"] }, {
          type: "script",
          attributes: {
            type: { utility: "get", parameters: ["props", "type"] },
            src: { utility: "get", parameters: ["props", "src"] },
          },
        }],
      },
      extensions: [extensions.foreach],
      context: {
        scripts: [{
          "type": "module",
          "src": "sidewind.js",
        }],
      },
    }),
    '<script type="module" src="sidewind.js"></script>',
  );
});

Deno.test("foreach extension with multiple scripts", async () => {
  assertEquals(
    await breeze({
      component: {
        foreach: [{ utility: "get", parameters: ["context", "scripts"] }, {
          type: "script",
          attributes: {
            type: { utility: "get", parameters: ["props", "type"] },
            src: { utility: "get", parameters: ["props", "src"] },
          },
        }],
      },
      extensions: [extensions.foreach],
      context: {
        scripts: [{
          "type": "module",
          "src": "sidewind.js",
        }, {
          "type": "module",
          "src": "gustwind.js",
        }],
      },
    }),
    '<script type="module" src="sidewind.js"></script><script type="module" src="gustwind.js"></script>',
  );
});

Deno.test("foreach extension with attributes and nesting", async () => {
  assertEquals(
    await breeze({
      component: {
        "type": "html",
        "children": [
          {
            "type": "body",
            "children": [
              {
                foreach: [{
                  utility: "get",
                  parameters: ["context", "scripts"],
                }, {
                  type: "script",
                  attributes: {
                    type: { utility: "get", parameters: ["props", "type"] },
                    src: { utility: "get", parameters: ["props", "src"] },
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
          "type": "module",
          "src": "sidewind.js",
        }],
      },
    }),
    '<html><body><script type="module" src="sidewind.js"></script></body></html>',
  );
});
