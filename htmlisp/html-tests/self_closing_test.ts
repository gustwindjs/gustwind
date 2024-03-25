import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("self-closing element without whitespace", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<hr/>` }),
    `<hr></hr>`,
  );
});

Deno.test("self-closing element with whitespace", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<hr />` }),
    `<hr></hr>`,
  );
});

Deno.test("self-closing element with an attribute", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar"/>` }),
    `<div title="bar"></div>`,
  );
});

Deno.test("self-closing element with an attribute and whitespace", async () => {
  assertEquals(
    await htmlispToHTML({ htmlInput: `<div title="bar" />` }),
    `<div title="bar"></div>`,
  );
});
