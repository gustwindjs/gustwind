import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { nanoid } from "https://esm.sh/nanoid@4.0.0";

import breeze from "../index.ts";
import * as extensions from "../extensions.ts";

Deno.test("injects an id for a component", async () => {
  const id = nanoid();

  assertEquals(
    await breeze({
      component: {
        element: "div",
        children: "demo",
      },
      extensions: [
        extensions.inject((c) => ({
          ...c,
          attributes: { ...c.attributes, "data-id": id },
        })),
      ],
    }),
    `<div data-id="${id}">demo</div>`,
  );
});

Deno.test("injects ids for multiple component", async () => {
  const id = nanoid();

  assertEquals(
    await breeze({
      component: {
        element: "div",
        children: [
          {
            element: "span",
            children: "foo",
          },
          {
            element: "span",
            children: "bar",
          },
        ],
      },
      extensions: [
        extensions.inject((c) => ({
          ...c,
          attributes: { ...c.attributes, "data-id": id },
        })),
      ],
    }),
    `<div data-id="${id}"><span data-id="${id}">foo</span><span data-id="${id}">bar</span></div>`,
  );
});
