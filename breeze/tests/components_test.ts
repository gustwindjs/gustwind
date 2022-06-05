import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";

import breeze from "../index.ts";

Deno.test("component lookup", async () => {
  assertEquals(
    await breeze({
      component: { element: "Button" },
      components: { Button: { element: "button", children: "demo" } },
    }),
    "<button>demo</button>",
  );
});

Deno.test("component lookup with an array", async () => {
  assertEquals(
    await breeze({
      component: { element: "Button" },
      components: {
        Button: [{ element: "button", children: "foo" }, {
          element: "button",
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
          "element": "head",
          "children": [
            {
              "element": "MetaFields",
            },
          ],
        },
      ],
      components: {
        MetaFields: [
          {
            "element": "link",
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
