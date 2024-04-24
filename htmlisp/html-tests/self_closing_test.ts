import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("self-closing element without whitespace", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<hr/>` }),
    `<hr></hr>`,
  );
});

Deno.test("self-closing element with whitespace", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<hr />` }),
    `<hr></hr>`,
  );
});

Deno.test("self-closing element with an attribute", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div title="bar"/>` }),
    `<div title="bar"></div>`,
  );
});

Deno.test("self-closing element with an attribute and whitespace", () => {
  assertEquals(
    htmlispToHTML({ htmlInput: `<div title="bar" />` }),
    `<div title="bar"></div>`,
  );
});
