import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import breeze from "../mod.ts";
import * as extensions from "../extensions.ts";

Deno.test("injects an id for a component", async () => {
  const id = "123";

  assertEquals(
    await breeze({
      component: {
        type: "div",
        children: "demo",
      },
      extensions: [
        extensions.inject((c) =>
          Promise.resolve({
            ...c,
            attributes: { ...c.attributes, "data-id": id },
          })
        ),
      ],
    }),
    `<div data-id="${id}">demo</div>`,
  );
});

Deno.test("injects ids for multiple component", async () => {
  const id = "123";

  assertEquals(
    await breeze({
      component: {
        type: "div",
        children: [
          {
            type: "span",
            children: "foo",
          },
          {
            type: "span",
            children: "bar",
          },
        ],
      },
      extensions: [
        extensions.inject((c) =>
          Promise.resolve({
            ...c,
            attributes: { ...c.attributes, "data-id": id },
          })
        ),
      ],
    }),
    `<div data-id="${id}"><span data-id="${id}">foo</span><span data-id="${id}">bar</span></div>`,
  );
});
