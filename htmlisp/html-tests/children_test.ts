import { urlJoin } from "https://deno.land/x/url_join@1.0.0/mod.ts";
import { assertEquals } from "https://deno.land/std@0.142.0/testing/asserts.ts";
import { htmlispToHTML } from "../mod.ts";

Deno.test("element with an expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(get context href)" />`,
      context: { href: "foobar" },
    }),
    `<div>foobar</div>`,
  );
});

Deno.test("element with a nested expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(concat / (get context href))" />`,
      context: { href: "foobar" },
    }),
    `<div>/foobar</div>`,
  );
});

Deno.test("element with a complex nested expression shortcut for children", async () => {
  assertEquals(
    await htmlispToHTML({
      htmlInput: `<div &children="(urlJoin / (get context href) /)" />`,
      context: { href: "foobar" },
      utilities: { urlJoin },
    }),
    `<div>/foobar/</div>`,
  );
});
