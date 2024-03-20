import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("component with render", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(render (get context button))"></div>`,
      components: {
        Button: '<button &children="(get props children)"></button>',
      },
      context: {
        button: '<Button children="demo" />',
      },
    }),
    `<div><button>demo</button></div>`,
  );
});

Deno.test("component with undefined render", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(render (get context button))"></div>`,
      components: {
        Button: "<div></div>",
      },
      context: {
        button: undefined,
      },
    }),
    `<div></div>`,
  );
});
